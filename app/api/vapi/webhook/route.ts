import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'

// Call Groq with a structured DB_CONTEXT provided as a system message.
async function callGroqWithContext(prompt: string, dbContext: any, language = 'en') {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not set')

  const model = process.env.GROQ_MODEL || GROQ_MODEL
  console.log('Using Groq model:', model)

  const groq = new Groq({ apiKey })
  // Strong system prompt derived from AGENT.md: speak as Momoyo, follow privacy rules,
  // answer only from DB_CONTEXT, and respond in the visitor's language.
  const personaInstructions = `You are Momoyo Kataoka's digital twin. Speak as Momoyo — warm, professional, and enthusiastic. Use the visitor's language (Japanese or English) consistently. Answer using ONLY the provided DB_CONTEXT. Do NOT invent or assume facts not present in DB_CONTEXT. Never reveal private information such as personal address, phone number, personal email, salary, bank details, passwords, or family information. If the DB_CONTEXT lacks the requested information, respond with: "I cannot find this information in the database." Offer to direct the visitor to the contact form or to book a meeting when appropriate. For booking flows, call the server booking tools (checkAvailability/createBooking) instead of providing private scheduling details.`

  const langInstruction = language === 'ja' ? '\nRespond in Japanese.' : '\nRespond in English.'

  const systemContent = `${personaInstructions}${langInstruction}\nDB_CONTEXT:${JSON.stringify(dbContext)}`

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
      return NextResponse.json({ messageResponse: { message: { role: 'assistant', content: 'I cannot find this information in the database.' } } })
    }

    // Test-only: allow forcing deterministic fallback via header, but only
    // in non-production or when ALLOW_TEST_HEADERS=true. In production the
    // header is ignored for safety.
    const allowTestHeaders = process.env.NODE_ENV !== 'production' || process.env.ALLOW_TEST_HEADERS === 'true'
    const forceLlmFail = allowTestHeaders && req.headers.get('x-force-llm-fail') === '1'
    if (forceLlmFail) {
      console.warn('x-force-llm-fail header present (test mode) — skipping LLM and returning deterministic fallback')
      const forced = deterministicReplyFromContext(trimmedContext)
      console.log('Sending deterministic fallback (forced) to Vapi')
      return NextResponse.json({ messageResponse: { message: { role: 'assistant', content: forced } } })
    }

    // Call LLM with strict DB_CONTEXT, but timeout after 15s and return deterministic fallback
    let replyText: string

    // Simple language detection: if text contains Japanese characters, prefer Japanese.
    function detectLanguageFromText(t: string) {
      try {
        if (!t) return 'en'
        return /[\u3040-\u30ff\u4e00-\u9faf]/.test(t) ? 'ja' : 'en'
      } catch (e) {
        return 'en'
      }
    }

    function deterministicReplyFromContext(dbContext: any) {
      try {
        const profile = dbContext?.profile ?? {}
        const career = Array.isArray(dbContext?.career) ? dbContext.career : []

        const workItems = career.filter((c: any) => (c?.type || '').toLowerCase() !== 'education')
        const topWork = workItems.slice(0, 3)
        const educationItem = career.find((c: any) => (c?.type || '').toLowerCase() === 'education') || career[0] || null

        const parts: string[] = []
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

        return parts.join('\n') || 'I cannot find this information in the database.'
      } catch (e) {
        console.error('Error building deterministic fallback', e)
        return 'I cannot find this information in the database.'
      }
    }

    try {
      const timeoutMs = 15000
      let timer: any = null
      const timeoutPromise = new Promise<string>((resolve) => {
        timer = setTimeout(() => {
          console.warn(`Groq call timed out after ${timeoutMs}ms; using deterministic fallback`)
          resolve(deterministicReplyFromContext(trimmedContext))
        }, timeoutMs)
      })

      const language = detectLanguageFromText(String(userMessage || ''))
      const groqPromise = callGroqWithContext(String(userMessage || ''), trimmedContext, language)

      replyText = await Promise.race([groqPromise, timeoutPromise])

      // If Groq resolved first, cancel the timeout so its callback doesn't run later
      if (timer) clearTimeout(timer)

      console.log('Groq response:', replyText)
      console.log('Groq reply:', replyText?.slice(0, 200))
      // If the LLM returns a clarification request instead of an answer,
      // prefer the deterministic DB-based fallback so Vapi always responds.
      try {
        const lower = String(replyText || '').toLowerCase()
        const clarificationPatterns = [
          'need more information',
          'what would you like to know',
          'what would you like to know about',
          'can you tell',
          'could you tell',
          'please provide',
          'i need more',
          'could you provide',
          'please clarify'
        ]
        if (clarificationPatterns.some((p) => lower.includes(p))) {
          console.warn('Groq returned a clarification request; using deterministic fallback instead')
          replyText = deterministicReplyFromContext(trimmedContext)
        }
      } catch (e) {
        console.warn('Error while evaluating Groq reply for clarification; continuing with original reply', e)
      }
    } catch (e: any) {
      console.error('Groq call failed in webhook', e)
      // Fallback deterministic reply if Groq errors
      replyText = deterministicReplyFromContext(trimmedContext)
    }

    console.log('Sending response to Vapi')
    return NextResponse.json({ messageResponse: { message: { role: 'assistant', content: replyText } } })
  } catch (err) {
    console.error('Vapi webhook error', err)
    return NextResponse.json({ messageResponse: { message: { role: 'assistant', content: "I'm sorry, I couldn't retrieve that information." } } }, { status: 500 })
  }
}
