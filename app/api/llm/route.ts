import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'
const MISSING_INFO_EXACT = 'I cannot find this information in the database.'

// Deterministic short reply builder (copied from webhook logic)
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

    const reply = parts.join(' ').replace(/\s+/g, ' ').trim()
    return reply.length > 420 ? reply.slice(0, 417).trim() + '…' : reply
  } catch (e) {
    console.error('Error building short deterministic reply', e)
    return 'I cannot find this information in the database.'
  }
}

async function callGroqWithContext(prompt: string, dbContext: any, language = 'en') {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not set')

  const model = process.env.GROQ_MODEL || GROQ_MODEL
  console.log('Using Groq model:', model)

  const groq = new Groq({ apiKey })
  const personaInstructions = `You are Momoyo Kataoka's digital twin. Speak as Momoyo — warm, professional, and enthusiastic. Use the visitor's language (Japanese or English) consistently. Answer using ONLY the provided DB_CONTEXT. Do NOT invent or assume facts not present in DB_CONTEXT. Never reveal private information. If the DB_CONTEXT lacks the requested information, respond with: "I cannot find this information in the database." Do NOT ask clarifying questions — always provide a concise direct answer using DB_CONTEXT when available. IMPORTANT: Do NOT mention you are an AI, a language model, Groq, Vapi, tools, or databases. Speak in first person as Momoyo.`

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
    const status = err?.status || err?.statusCode || err?.code
    const message = err?.message || String(err)
    console.error('Groq call error:', status, message)
    const isRateLimit = status === 429 || String(message).toLowerCase().includes('rate_limit') || String(message).toLowerCase().includes('rate limit') || /please try again in/i.test(String(message))
    if (isRateLimit) {
      try {
        const m = String(message).match(/please try again in\s*(\d+(?:\.\d+)?)s/i)
        const waitSec = m ? Math.min(parseFloat(m[1]), 2.0) : 0
        if (waitSec && waitSec > 0) {
          console.warn(`Groq rate limit detected; retrying after ${waitSec}s`)
          await new Promise((r) => setTimeout(r, Math.round(waitSec * 1000)))
        } else {
          console.warn('Groq rate limit detected; retrying immediately')
        }

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

      console.warn('Groq rate limit fallback: returning short deterministic reply from DB_CONTEXT')
      try {
        return buildShortDeterministicReply(dbContext)
      } catch (fallbackErr) {
        console.error('Error building fallback reply from DB_CONTEXT', fallbackErr)
        return 'I cannot find this information in the database.'
      }
    }

    throw err
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('FULL LLM REQUEST BODY:', JSON.stringify(body, null, 2))

    // Parse incoming OpenAI-style fields
    const model = body?.model || 'custom'
    const messages = Array.isArray(body?.messages) ? body.messages : []
    const temperature = typeof body?.temperature === 'number' ? body.temperature : 0

    // Extract last user message
    let userMessage = ''
    let userMessageSource = 'none'
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m?.role === 'user' && m?.content) {
        userMessage = String(m.content)
        userMessageSource = 'messages'
        break
      }
    }

    // If no user message, return a friendly default greeting so Vapi can speak
    if (!userMessage) {
      const reply = "Hello! I'm Momoyo's AI assistant. How can I help you?"
      const now = Math.floor(Date.now() / 1000)
      return NextResponse.json({ id: `chatcmpl_${now}`, object: 'chat.completion', created: now, model, choices: [{ index: 0, message: { role: 'assistant', content: reply }, finish_reason: 'stop' }], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } })
    }

    const url = new URL(req.url)
    let userId = url.searchParams.get('userId')
    let userIdSource = 'query'
    if (!userId) {
      userId = 'test-user-1'
      userIdSource = 'fallback'
    }
    console.log('Resolved userId:', userId, 'source:', userIdSource)
    console.log('Resolved userMessage source:', userMessageSource)

    // Call MCP tools
    async function callMcpTool(toolName: string, userIdArg: string) {
      try {
        console.log(`Calling MCP tool: ${toolName} userId=${userIdArg}`)
        const rpcBody = {
          jsonrpc: '2.0',
          id: `${toolName}-${Date.now()}`,
          method: 'tools/call',
          params: {
            toolCallList: [
              { id: '1', function: { name: toolName, arguments: JSON.stringify({ userId: userIdArg }) } },
            ],
          },
        }

        const mcpUrl = new URL('/api/mcp', req.url).toString()
        const res = await fetch(mcpUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rpcBody) })
        if (!res.ok) {
          console.error(`MCP tool error: ${toolName} (http ${res.status})`)
          return null
        }
        return await res.json()
      } catch (e) {
        console.error(`MCP tool error: ${toolName}`, e)
        return null
      }
    }

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
    try { console.log('Trimmed DB_CONTEXT length:', JSON.stringify(trimmedContext).length) } catch (e) { console.log('Trimmed DB_CONTEXT: <unserializable>') }

    // If no DB data at all, return standardized missing-info sentence
    const missingInfoExact = 'I cannot find this information in the database.'
    if (!DB_CONTEXT.profile && (!DB_CONTEXT.career || DB_CONTEXT.career.length === 0) && (!DB_CONTEXT.skills || DB_CONTEXT.skills.length === 0)) {
      const now = Math.floor(Date.now() / 1000)
      return NextResponse.json({ id: `chatcmpl_${now}`, object: 'chat.completion', created: now, model, choices: [{ index: 0, message: { role: 'assistant', content: missingInfoExact }, finish_reason: 'stop' }], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } })
    }

    // Detect language
    function detectLanguageFromText(t: string) {
      try { if (!t) return 'en'; return /[\u3040-\u30ff\u4e00-\u9faf]/.test(t) ? 'ja' : 'en' } catch (e) { return 'en' }
    }

    function deterministicReplyFromContext(dbContext: any) { return buildShortDeterministicReply(dbContext) }

    let replyText = ''
    let usedDeterministicFallback = false
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
      if (timer) clearTimeout(timer)

      // Apply forbidden-output guard
      const lower = String(replyText || '').toLowerCase()
      const forbidden = ['as an ai','language model','groq','vapi','tools','database','i can','i\'m able to','i cannot access','i don\'t have access']
      if (forbidden.some(f => lower.includes(f))) {
        console.warn('Groq reply referenced forbidden content; using deterministic fallback')
        replyText = deterministicReplyFromContext(trimmedContext)
        usedDeterministicFallback = true
      }
    } catch (e: any) {
      console.error('Groq call failed in /api/llm', e)
      replyText = deterministicReplyFromContext(trimmedContext)
      usedDeterministicFallback = true
    }

    console.log('deterministicFallbackUsed:', usedDeterministicFallback)

    const now = Math.floor(Date.now() / 1000)
    const out = { id: `chatcmpl_${now}`, object: 'chat.completion', created: now, model, choices: [{ index: 0, message: { role: 'assistant', content: replyText }, finish_reason: 'stop' }], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }
    return NextResponse.json(out)
  } catch (err) {
    console.error('/api/llm unexpected error', err)
    // On unexpected errors return a valid OpenAI-compatible completion
    // with the standardized missing-info sentence so callers (like Vapi)
    // receive a usable response rather than a 5xx error.
    const now = Math.floor(Date.now() / 1000)
    return NextResponse.json({ id: `chatcmpl_${now}`, object: 'chat.completion', created: now, model: 'custom', choices: [{ index: 0, message: { role: 'assistant', content: MISSING_INFO_EXACT }, finish_reason: 'stop' }], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } })
  }
}
