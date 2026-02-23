import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const GROQ_MODEL = 'llama-3.3-70b-versatile'

// Call Groq with a structured DB_CONTEXT provided as a system message.
async function callGroqWithContext(prompt: string, dbContext: any) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not set')

  const groq = new Groq({ apiKey })
  const systemContent = `You are Momoyo Kataoka's digital twin. Answer using ONLY DB_CONTEXT. If missing, say 'I cannot find this information in the database.'\nDB_CONTEXT:${JSON.stringify(
    dbContext
  )}`

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: prompt },
    ],
  })

  const reply = response?.choices?.[0]?.message?.content ?? JSON.stringify(response)
  return String(reply)
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text()
    const payload = raw ? JSON.parse(raw) : {}

    // Log full payload safely
    try {
      console.log('FULL VAPI PAYLOAD:', JSON.stringify(payload, null, 2))
    } catch (e) {
      console.log('FULL VAPI PAYLOAD: <unserializable>')
    }

    // UserId handling: try query param first, then fallback
    const url = new URL(req.url)
    let userId = url.searchParams.get('userId')
    let userIdSource = 'query'
    if (!userId) {
      userId = 'test-user-1'
      userIdSource = 'fallback'
    }
    console.log('Resolved userId:', userId, 'source:', userIdSource)

    // Extract user's prompt from webhook payload
    const userMessage = payload?.message?.content || payload?.message?.text || payload?.text || payload?.user?.message || ''

    // MCP helper: call the local MCP JSON-RPC /api/mcp endpoint
    async function callMcpTool(toolName: string, userIdArg: string) {
      try {
        console.log(`Calling MCP tool: ${toolName} userId=${userIdArg}`)
        const rpcBody = {
          jsonrpc: '2.0',
          id: `${toolName}-${Date.now()}`,
          method: 'tools/call',
          params: {
            toolCallList: [
              {
                id: '1',
                function: { name: toolName, arguments: JSON.stringify({ userId: userIdArg }) },
              },
            ],
          },
        }

        const mcpUrl = new URL('/api/mcp', req.url).toString()
        const res = await fetch(mcpUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rpcBody),
        })

        if (!res.ok) {
          console.error(`MCP tool error: ${toolName} (http ${res.status})`)
          return null
        }

        const data = await res.json()
        const text = data?.result?.content?.[0]?.text
        if (!text) {
          console.error(`MCP tool error: ${toolName} (no content)`)
          return null
        }

        // Attempt to parse JSON result; fall back to raw text
        try {
          const parsed = JSON.parse(text)
          console.log(`MCP tool success: ${toolName}`)
          return parsed
        } catch (e) {
          console.log(`MCP tool success (raw): ${toolName}`)
          return text
        }
      } catch (e) {
        console.error(`MCP tool error: ${toolName}`, e)
        return null
      }
    }

    // Call MCP tools for profile, career, skills
    const profile = await callMcpTool('getProfile', userId)
    const career = await callMcpTool('getCareer', userId)
    const skills = await callMcpTool('getSkills', userId)

    const DB_CONTEXT = { profile: profile ?? null, career: career ?? [], skills: skills ?? [] }

    // If there's no data, respond with the standardized missing-info message
    if (!DB_CONTEXT.profile && (!DB_CONTEXT.career || DB_CONTEXT.career.length === 0) && (!DB_CONTEXT.skills || DB_CONTEXT.skills.length === 0)) {
      return NextResponse.json({ response: { message: { role: 'assistant', content: 'I cannot find this information in the database.' } } })
    }

    // Call LLM with strict DB_CONTEXT
    let replyText: string
    try {
      replyText = await callGroqWithContext(String(userMessage || ''), DB_CONTEXT)
    } catch (e) {
      console.error('Groq call failed in webhook', e)
      return NextResponse.json({ response: { message: { role: 'assistant', content: 'I cannot find this information in the database.' } } })
    }

    return NextResponse.json({ response: { message: { role: 'assistant', content: replyText } } })
  } catch (err) {
    console.error('Vapi webhook error', err)
    return NextResponse.json({ response: { message: { role: 'assistant', content: "I'm sorry, I couldn't retrieve that information." } } }, { status: 500 })
  }
}
