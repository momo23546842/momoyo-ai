import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'

// Call Groq with a structured DB_CONTEXT provided as a system message.
async function callGroqWithContext(prompt: string, dbContext: any) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not set')

  const model = process.env.GROQ_MODEL || GROQ_MODEL
  console.log('Using Groq model:', model)

  const groq = new Groq({ apiKey })
  const systemContent = `You are Momoyo Kataoka's digital twin. Answer using ONLY DB_CONTEXT. If missing, say 'I cannot find this information in the database.'\nDB_CONTEXT:${JSON.stringify(
    dbContext
  )}`

  try {
    const response = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt },
      ],
    })

    const reply = response?.choices?.[0]?.message?.content ?? JSON.stringify(response)
    return String(reply)
  } catch (err: any) {
    // Handle rate limit (429) gracefully by returning a deterministic fallback
    const status = err?.status || err?.statusCode || err?.code
    const message = err?.message || String(err)
    console.error('Groq call error:', status, message)
    if (status === 429 || String(message).toLowerCase().includes('rate_limit') || String(message).toLowerCase().includes('rate limit') || String(message).toLowerCase().includes('rate_limit_exceeded')) {
      console.warn('Groq rate limit detected; returning deterministic fallback from DB_CONTEXT')
      // Build a deterministic reply from DB_CONTEXT (no LLM)
      try {
        const profile = dbContext?.profile ?? {}
        const career = Array.isArray(dbContext?.career) ? dbContext.career : []

        // top work items (prefer items without type 'education')
        const workItems = career.filter((c: any) => (c?.type || '').toLowerCase() !== 'education')
        const topWork = workItems.slice(0, 3)

        // top education item
        const educationItem = career.find((c: any) => (c?.type || '').toLowerCase() === 'education') || career[0] || null

        let parts: string[] = []
        if (profile?.name) parts.push(String(profile.name))
        if (profile?.catchphrase) parts.push(String(profile.catchphrase))
        if (profile?.bio) parts.push(String(profile.bio))

        if (topWork.length > 0) {
          parts.push('Top roles:')
          for (const item of topWork) {
            const title = item?.title || item?.position || item?.role || ''
            const org = item?.company || item?.organization || ''
            parts.push(`${title}${org ? ' at ' + org : ''}`.trim())
          }
        }

        if (educationItem) {
          const edu = educationItem?.title || educationItem?.degree || educationItem?.school || ''
          if (edu) parts.push(`Education: ${edu}`)
        }

        const fallback = parts.join('\n') || "I cannot find this information in the database."
        return fallback
      } catch (fallbackErr) {
        console.error('Error building fallback reply from DB_CONTEXT', fallbackErr)
        return "I cannot find this information in the database."
      }
    }

    // Re-throw non-rate-limit errors to be handled by caller
    throw err
  }
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
        return data
      } catch (e) {
        console.error(`MCP tool error: ${toolName}`, e)
        return null
      }
    }

    // Helper to parse MCP tool result into JSON when possible
    function parseMcpResult(result: any) {
      try {
        if (result?.result?.content?.[0]?.text) {
          return JSON.parse(result.result.content[0].text)
        }
        return null
      } catch (e) {
        try {
          console.log('MCP parse failed, raw:', JSON.stringify(result).slice(0, 500))
        } catch (ee) {
          console.log('MCP parse failed, raw: <unserializable>')
        }
        return null
      }
    }

    // Call MCP tools for profile, career, skills and parse results
    const rawProfile = await callMcpTool('getProfile', userId)
    const parsedProfile = parseMcpResult(rawProfile)
    if (parsedProfile) console.log('MCP tool success: getProfile')
    else console.error('MCP tool error: getProfile')

    const rawCareer = await callMcpTool('getCareer', userId)
    const parsedCareer = parseMcpResult(rawCareer)
    if (parsedCareer) console.log('MCP tool success: getCareer')
    else console.error('MCP tool error: getCareer')

    const rawSkills = await callMcpTool('getSkills', userId)
    const parsedSkills = parseMcpResult(rawSkills)
    if (parsedSkills) console.log('MCP tool success: getSkills')
    else console.error('MCP tool error: getSkills')

    const DB_CONTEXT = { profile: parsedProfile ?? null, career: parsedCareer ?? [], skills: parsedSkills ?? [] }

    // Trim DB_CONTEXT to reduce token usage: career top 3, skills top 20, truncate long strings
    function truncateString(s: any, max = 200) {
      if (typeof s !== 'string') return s
      return s.length > max ? s.slice(0, max) + '…' : s
    }

    function trimItemStrings(item: any) {
      if (!item || typeof item !== 'object') return item
      const out: any = {}
      for (const k of Object.keys(item)) {
        const v = item[k]
        if (typeof v === 'string') out[k] = truncateString(v, 200)
        else out[k] = v
      }
      return out
    }

    const trimmedCareer = Array.isArray(DB_CONTEXT.career) ? DB_CONTEXT.career.slice(0, 3).map(trimItemStrings) : []
    let trimmedSkills: any[] = []
    if (Array.isArray(DB_CONTEXT.skills)) {
      trimmedSkills = DB_CONTEXT.skills.slice(0, 20).map((s: any) => (typeof s === 'string' ? truncateString(s, 200) : trimItemStrings(s)))
    }

    const trimmedContext = { profile: DB_CONTEXT.profile ? trimItemStrings(DB_CONTEXT.profile) : null, career: trimmedCareer, skills: trimmedSkills }

    // Log DB_CONTEXT truncated before calling Groq
    try {
      console.log('DB_CONTEXT:', JSON.stringify(trimmedContext).slice(0, 2000))
    } catch (e) {
      console.log('DB_CONTEXT: <unserializable>')
    }

    // If there's no data, respond with the standardized missing-info message
    if (!DB_CONTEXT.profile && (!DB_CONTEXT.career || DB_CONTEXT.career.length === 0) && (!DB_CONTEXT.skills || DB_CONTEXT.skills.length === 0)) {
      return NextResponse.json({ response: { message: { role: 'assistant', content: 'I cannot find this information in the database.' } } })
    }

    // Call LLM with strict DB_CONTEXT
    let replyText: string
    try {
      replyText = await callGroqWithContext(String(userMessage || ''), trimmedContext)
      console.log('Groq response:', replyText)
    } catch (e: any) {
      console.error('Groq call failed in webhook', e)
      // If non-rate-limit error propagated, fall back to deterministic message
      return NextResponse.json({ messageResponse: { message: { role: 'assistant', content: 'I cannot find this information in the database.' } } })
    }

    return NextResponse.json({ messageResponse: { message: { role: 'assistant', content: replyText } } })
  } catch (err) {
    console.error('Vapi webhook error', err)
    return NextResponse.json({ response: { message: { role: 'assistant', content: "I'm sorry, I couldn't retrieve that information." } } }, { status: 500 })
  }
}
