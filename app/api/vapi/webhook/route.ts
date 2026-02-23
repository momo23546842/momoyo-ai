import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'

// Short, voice-friendly deterministic reply builder used when the LLM
// must be bypassed. Keeps replies concise (2-4 short sentences) and
// follows persona rules (first person, no system/tool references).
function buildShortDeterministicReply(dbContext: any) {
  const missing = 'I cannot find this information in the database.'
  try {
    const profile = dbContext?.profile ?? {}
    const career = Array.isArray(dbContext?.career) ? dbContext.career : []

    const name = profile?.name ? String(profile.name).trim() : ''
    const catchphrase = profile?.catchphrase ? String(profile.catchphrase).trim() : ''
    const bio = profile?.bio ? String(profile.bio).replace(/\s+/g, ' ').trim() : ''

    const workItems = career.filter((c: any) => (c?.type || '').toLowerCase() !== 'education')
    const topWork = workItems.slice(0, 2).map((item: any) => {
      const title = item?.title || item?.position || item?.role || ''
      const org = item?.company || item?.organization || ''
      const s = `${title}${org ? ' at ' + org : ''}`.trim()
      return s
    }).filter(Boolean)

    // If there's essentially no DB info, return the exact missing-info sentence.
    const hasAny = Boolean(name || catchphrase || bio || topWork.length > 0)
    if (!hasAny) return missing

    const parts: string[] = []
    if (name) parts.push(`I'm ${name}.`)
    if (catchphrase) parts.push(`${catchphrase}.`)
    if (bio) {
      const bioShort = bio.length > 180 ? bio.slice(0, 177).trim() + '…' : bio
      parts.push(`${bioShort}.`)
    }
    if (topWork.length > 0) {
      if (topWork.length === 1) parts.push(`I have experience as ${topWork[0]}.`)
      else parts.push(`I have experience as ${topWork[0]} and ${topWork[1]}.`)
    }

    // Keep total reply short: join and then truncate to ~420 chars if needed
    const reply = parts.join(' ').replace(/\s+/g, ' ').trim()
    return reply.length > 420 ? reply.slice(0, 417).trim() + '…' : reply
  } catch (e) {
    console.error('Error building short deterministic reply', e)
    return 'I cannot find this information in the database.'
  }
}

// Call Groq with a structured DB_CONTEXT provided as a system message.
async function callGroqWithContext(prompt: string, dbContext: any, language = 'en') {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not set')

  const model = process.env.GROQ_MODEL || GROQ_MODEL
  console.log('Using Groq model:', model)

  const groq = new Groq({ apiKey })
  // Strong system prompt derived from AGENT.md: speak as Momoyo, follow privacy rules,
  // answer only from DB_CONTEXT, and respond in the visitor's language.
  const personaInstructions = `You are Momoyo Kataoka's digital twin. Speak as Momoyo — warm, professional, and enthusiastic. Use the visitor's language (Japanese or English) consistently. Answer using ONLY the provided DB_CONTEXT. Do NOT invent or assume facts not present in DB_CONTEXT. Never reveal private information such as personal address, phone number, personal email, salary, bank details, passwords, or family information. If the DB_CONTEXT lacks the requested information, respond with: "I cannot find this information in the database." Do NOT ask clarifying questions — always provide a concise direct answer using DB_CONTEXT when available; if information is missing, return the exact missing-info sentence. Offer to direct the visitor to the contact form or to book a meeting when appropriate. For booking flows, call the server booking tools (checkAvailability/createBooking) instead of providing private scheduling details. IMPORTANT: Do NOT mention you are an AI, a language model, Groq, Vapi, tools, or databases. Never say phrases like "as an AI" or "as a language model". Speak in first person as Momoyo ("I", not "the assistant").`

  const langInstruction = language === 'ja' ? '\nRespond in Japanese.' : '\nRespond in English.'

  const systemContent = `${personaInstructions}${langInstruction}\nDB_CONTEXT:${JSON.stringify(dbContext)}`

  try {
    const response = await groq.chat.completions.create({
      model,
      temperature: 0.0,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt },
      ],
    })

    const reply = response?.choices?.[0]?.message?.content ?? JSON.stringify(response)
    return String(reply)
  } catch (err: any) {
    // Handle rate limit (429): attempt single retry if Groq suggests wait time, else fall back deterministically
    const status = err?.status || err?.statusCode || err?.code
    const message = err?.message || String(err)
    console.error('Groq call error:', status, message)
    const isRateLimit = status === 429 || String(message).toLowerCase().includes('rate_limit') || String(message).toLowerCase().includes('rate limit') || String(message).toLowerCase().includes('rate_limit_exceeded') || /please try again in/i.test(String(message))
    if (isRateLimit) {
      try {
        // parse suggested wait from message like "Please try again in Xs"
        const m = String(message).match(/please try again in\s*(\d+(?:\.\d+)?)s/i)
        const waitSec = m ? Math.min(parseFloat(m[1]), 2.0) : 0
        if (waitSec && waitSec > 0) {
          console.warn(`Groq rate limit detected; retrying after ${waitSec}s`) 
          await new Promise((r) => setTimeout(r, Math.round(waitSec * 1000)))
        } else {
          console.warn('Groq rate limit detected; retrying immediately')
        }

        // retry once
        try {
          const resp2 = await groq.chat.completions.create({
            model,
            temperature: 0.0,
            messages: [
              { role: 'system', content: systemContent },
              { role: 'user', content: prompt },
            ],
          })
          const reply2 = resp2?.choices?.[0]?.message?.content ?? JSON.stringify(resp2)
          return String(reply2)
        } catch (err2: any) {
          console.error('Groq retry failed:', err2?.status || err2?.message || err2)
        }
      } catch (retryErr) {
        console.error('Error during Groq retry wait', retryErr)
      }

      // fallback deterministic reply from DB_CONTEXT (short, voice-friendly)
      console.warn('Groq rate limit fallback: returning short deterministic reply from DB_CONTEXT')
      try {
        return buildShortDeterministicReply(dbContext)
      } catch (fallbackErr) {
        console.error('Error building fallback reply from DB_CONTEXT', fallbackErr)
        return 'I cannot find this information in the database.'
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

    // Extract user's prompt from webhook payload.
    // Prefer the last user message from artifact.messagesOpenAIFormatted, then artifact.messages, then fallback fields.
    let userMessage = ''
    let userMessageSource = 'fallback'

    try {
      const formatted = payload?.message?.artifact?.messagesOpenAIFormatted
      if (Array.isArray(formatted) && formatted.length > 0) {
        for (let i = formatted.length - 1; i >= 0; i--) {
          const itm = formatted[i]
          if (itm?.role === 'user' && itm?.content) {
            userMessage = String(itm.content)
            userMessageSource = 'artifact.messagesOpenAIFormatted'
            break
          }
        }
      }

      if (!userMessage) {
        const msgs = payload?.message?.artifact?.messages
        if (Array.isArray(msgs) && msgs.length > 0) {
          for (let i = msgs.length - 1; i >= 0; i--) {
            const itm = msgs[i]
            if (itm?.role === 'user') {
              const body = itm?.message
              if (typeof body === 'string') userMessage = body
              else if (body && typeof body === 'object') userMessage = body.message || body.text || ''
              if (userMessage) {
                userMessageSource = 'artifact.messages'
                break
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error extracting userMessage from artifact arrays', e)
    }

    if (!userMessage) {
      userMessage = payload?.message?.content || payload?.message?.text || payload?.text || payload?.user?.message || ''
      userMessageSource = userMessage ? 'fallback-fields' : 'empty'
    }
    console.log('Resolved userMessage source:', userMessageSource)

    // If extraction didn't find a user message, try once more by scanning
    // the artifact arrays for the last user content (robust fallback).
    if (!userMessage) {
      try {
        const formatted = payload?.message?.artifact?.messagesOpenAIFormatted
        if (Array.isArray(formatted) && formatted.length > 0) {
          for (let i = formatted.length - 1; i >= 0; i--) {
            const itm = formatted[i]
            if (itm?.role === 'user' && itm?.content) {
              userMessage = String(itm.content)
              userMessageSource = 'artifact.messagesOpenAIFormatted-fallback'
              break
            }
          }
        }
        if (!userMessage) {
          const msgs = payload?.message?.artifact?.messages
          if (Array.isArray(msgs) && msgs.length > 0) {
            for (let i = msgs.length - 1; i >= 0; i--) {
              const itm = msgs[i]
              if (itm?.role === 'user') {
                const body = itm?.message
                if (typeof body === 'string') userMessage = body
                else if (body && typeof body === 'object') userMessage = body.message || body.text || ''
                if (userMessage) {
                  userMessageSource = 'artifact.messages-fallback'
                  break
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('Fallback extraction from artifact failed', e)
      }
      console.log('Resolved userMessage (after artifact fallback) source:', userMessageSource)
    }

    // Prefer artifact-derived user message; if none exists, skip MCP/Groq entirely.
    const trimmedUserMessage = String(userMessage || '').trim()
    console.log('User message detected:', userMessage)
    if (!trimmedUserMessage) {
      console.log('No user message found in artifact or payload; skipping MCP/Groq and returning empty content')
      const empty = ''
      return NextResponse.json({ response: { message: { role: 'assistant', content: empty } }, messageResponse: { message: { role: 'assistant', content: empty } } })
    }

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

    // Trim DB_CONTEXT to reduce token usage: career top 2, skills top 10, truncate long strings
    function truncateString(s: any, max = 120) {
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

    const trimmedCareer = Array.isArray(DB_CONTEXT.career) ? DB_CONTEXT.career.slice(0, 2).map(trimItemStrings) : []
    let trimmedSkills: any[] = []
    if (Array.isArray(DB_CONTEXT.skills)) {
      trimmedSkills = DB_CONTEXT.skills.slice(0, 10).map((s: any) => (typeof s === 'string' ? truncateString(s, 120) : trimItemStrings(s)))
    }

    const trimmedContext = { profile: DB_CONTEXT.profile ? trimItemStrings(DB_CONTEXT.profile) : null, career: trimmedCareer, skills: trimmedSkills }

    // Log DB_CONTEXT truncated before calling Groq
    try {
      console.log('DB_CONTEXT:', JSON.stringify(trimmedContext).slice(0, 2000))
    } catch (e) {
      console.log('DB_CONTEXT: <unserializable>')
    }

    // If there's no data at all, respond with the standardized missing-info message
    if (!DB_CONTEXT.profile && (!DB_CONTEXT.career || DB_CONTEXT.career.length === 0) && (!DB_CONTEXT.skills || DB_CONTEXT.skills.length === 0)) {
      const content = 'I cannot find this information in the database.'
      return NextResponse.json({
        response: { message: { role: 'assistant', content } },
        messageResponse: { message: { role: 'assistant', content } },
      })
    }

    // Heuristic: if the user's request is about background/profile and DB lacks profile.bio and career, skip LLM and return missing-info
    try {
      const asksForBackground = /\b(background|about you|your background|bio|experience|career|work history|what did you do)\b/i.test(String(userMessage || ''))
      const hasProfileInfo = Boolean(trimmedContext.profile && (trimmedContext.profile.bio || trimmedContext.profile.catchphrase))
      const hasCareerInfo = Array.isArray(trimmedContext.career) && trimmedContext.career.length > 0
      if (asksForBackground && !hasProfileInfo && !hasCareerInfo) {
        const content = 'I cannot find this information in the database.'
        console.log('Skipping LLM: background requested but DB_CONTEXT lacks profile/career')
        return NextResponse.json({ response: { message: { role: 'assistant', content } }, messageResponse: { message: { role: 'assistant', content } } })
      }
    } catch (e) {
      console.warn('Error while checking DB sufficiency for userMessage', e)
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
      return NextResponse.json({
        response: { message: { role: 'assistant', content: forced } },
        messageResponse: { message: { role: 'assistant', content: forced } },
      })
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
      return buildShortDeterministicReply(dbContext)
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
      // Output guard: prevent the model from referring to itself or internal systems.
      try {
        const forbiddenPatterns = [
            'as an ai',
            "i am an ai",
            "i'm an ai",
            'language model',
            'i cannot access',
            "i don't have access",
            'as a language model',
            'i do not have access',
            'i have no access',
            'groq',
            'vapi',
            'tools',
            'mcp',
            'db_context',
            'database context',
            // Prevent the model from mentioning voice provider or talent details
            'voice actress',
            'voice actor',
            '11labs',
            'eleven',
            'voiceid',
            'voice id',
            // Prevent references to training data or datasets
            'trained on',
            'training data',
            'dataset'
          ]
        const low = String(replyText || '').toLowerCase()
        const missingInfoExact = 'i cannot find this information in the database.'
        // If the reply is exactly the standardized missing-info sentence, allow it.
        if (low.trim() !== missingInfoExact && forbiddenPatterns.some((p) => low.includes(p))) {
          console.warn('Groq reply referenced being an AI or internal system; replacing with deterministic DB reply')
          replyText = deterministicReplyFromContext(trimmedContext)
        }
      } catch (e) {
        console.warn('Error while applying output guard; continuing with original reply', e)
      }
    } catch (e: any) {
      console.error('Groq call failed in webhook', e)
      // Fallback deterministic reply if Groq errors
      replyText = deterministicReplyFromContext(trimmedContext)
    }

    console.log('Sending response to Vapi')
    return NextResponse.json({
      response: { message: { role: 'assistant', content: replyText } },
      messageResponse: { message: { role: 'assistant', content: replyText } },
    })
  } catch (err) {
    console.error('Vapi webhook error', err)
    return NextResponse.json({ messageResponse: { message: { role: 'assistant', content: "I'm sorry, I couldn't retrieve that information." } } }, { status: 500 })
  }
}
