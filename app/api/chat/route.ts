import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Groq from 'groq-sdk'

const GROQ_MODEL = 'llama-3.3-70b-versatile'

async function callGroq(message: string, systemPrompt: string) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not set')

  const groq = new Groq({ apiKey })

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
  })

  const reply = response?.choices?.[0]?.message?.content ?? JSON.stringify(response)
  return String(reply)
}

// Generate a simple session ID from headers
function getSessionId(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const ua = req.headers.get('user-agent') || ''
  // Simple hash to create a session-like ID
  let hash = 0
  const str = ip + ua
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return `session_${Math.abs(hash).toString(36)}`
}

async function saveConversation(sessionId: string, role: string, message: string, mode: string) {
  try {
    await prisma.conversation.create({
      data: { sessionId, role, message, mode },
    })
  } catch (err) {
    console.error('Failed to save conversation:', err)
    // Don't fail the request if logging fails
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message: string = body?.message || ''
    const mode: string = body?.mode || 'chat'
    const sessionId = getSessionId(req)

    // Save user message
    await saveConversation(sessionId, 'user', message, mode)

    const profile = await prisma?.profile?.findFirst?.() ?? null
    const resumes = await prisma?.resume?.findMany?.({ orderBy: { startDate: 'desc' } }) ?? []
    const skills = await prisma?.skill?.findMany?.() ?? []
    const experiences = await prisma?.experience?.findMany?.({
      orderBy: { sortOrder: 'asc' },
      include: { techStack: { include: { tech: true } } },
    }) ?? []

    const parts: string[] = []
    if (profile) {
      parts.push(`Name: ${profile.name ?? ''}`)
      if (profile.catchphrase) parts.push(`Catchphrase: ${profile.catchphrase}`)
      if (profile.bio) parts.push(`Bio: ${profile.bio}`)
      if ((profile as any).summary) parts.push(`Summary: ${(profile as any).summary}`)
      if ((profile as any).focus) parts.push(`Focus areas: ${(profile as any).focus}`)
      if ((profile as any).vision) parts.push(`Vision: ${(profile as any).vision}`)
    }
    if (experiences.length) {
      const expLines = experiences.map((e: any) => {
        const techs = e.techStack?.map((et: any) => et.tech?.name).filter(Boolean).join(', ')
        const period = `${e.startDate?.toISOString?.().slice(0, 7) ?? '?'} – ${e.endDate?.toISOString?.().slice(0, 7) ?? 'present'}`
        return `${e.title} at ${e.org} (${e.type}, ${period})${e.description ? ': ' + e.description : ''}${techs ? ' [Tech: ' + techs + ']' : ''}`
      }).join('; ')
      parts.push(`Experiences: ${expLines}`)
    }
    if (resumes.length) {
      const jobs = resumes
        .slice(0, 10)
        .map((r: any) => `${r.title ?? ''} at ${r.organization ?? ''} (${r.startDate ?? ''} - ${r.endDate ?? 'present'})`)
        .join('; ')
      parts.push(`Career (legacy): ${jobs}`)
    }
    if (skills.length) {
      parts.push(`Skills: ${skills.map((s: any) => s.name).join(', ')}`)
    }

    const systemPrompt = `You ARE Momoyo Kataoka. You speak as yourself in first person ("I", "my", "me"). You are friendly, warm, and professional. You use the factual data below about yourself to answer questions. If someone asks something not covered by the data, say you'd rather not share that or you're not sure.

IMPORTANT IDENTITY RULES:
- You are an IT student currently studying in Sydney. NEVER call yourself a "Full-Stack Developer" or any senior engineering title. Always say "IT student with hands-on full-stack AI internship experience."
- You are a Japan-licensed Registered Dietitian. Your dietitian qualification is from Japan — NEVER imply you are licensed in Australia.
- You have hands-on internship experience in AI-driven full-stack web development (Next.js, TypeScript, Vercel AI SDK, MCP). Always frame this as internship experience, never as a job title.
- You work under contract with Japanese companies, providing Specific Health Guidance (Tokutei Hoken Shidou) to approximately 60–80 clients per month.
- Your long-term vision is to leverage your Japan-licensed dietitian background to contribute to IT roles in the health-tech field, building data-driven, scalable digital health solutions.
- Sound confident but realistic — you are early-career with genuine hands-on project experience.

SAMPLE INTRODUCTION (use as a guide, vary naturally):
"I'm an IT student based in Sydney with hands-on experience from a 10-week AI full-stack development internship where I led a team building intelligent web applications. I'm also a Japan-licensed Registered Dietitian — I currently work under contract with Japanese companies, providing Specific Health Guidance to around 60–80 clients a month. My goal is to bring these two backgrounds together and contribute to health-tech, building digital solutions that bridge clinical expertise and modern technology."

Keep responses concise and conversational — 2-3 sentences max unless more detail is needed. Don't start with "Hi, I'm Momoyo" every time — vary your responses naturally.

${parts.join('\n')}

BOOKING INSTRUCTIONS:
When someone wants to schedule a meeting, book an appointment, or mentions wanting to talk/meet/connect:
1. Respond warmly in first person and include EXACTLY the tag [BOOKING_LINK] — it becomes a clickable button.
   Example: "I'd love to chat! Pick a date and time here. [BOOKING_LINK]"
2. Available hours: Monday to Friday, 9:00-18:00 Sydney time.
3. Be enthusiastic — you love meeting new people!`

    let replyText: string
    try {
      const groqResp = await callGroq(message, systemPrompt)
      replyText = String(groqResp)
    } catch (e) {
      console.error('Groq call failed, falling back to local generator', e)
      replyText = generateReplyFromContext(message, parts.join('\n'))
    }

    // Save assistant reply
    await saveConversation(sessionId, 'assistant', replyText, mode)

    return NextResponse.json({ reply: replyText })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ reply: "Sorry, I couldn't process that right now. Please try again!" }, { status: 500 })
  }
}

function generateReplyFromContext(message: string, context: string) {
  const lower = message.toLowerCase()

  const bookingKeywords = ['book', 'schedule', 'meeting', 'appointment', 'reserve', 'call', 'meet', 'connect', 'talk to', 'chat with']
  if (bookingKeywords.some(k => lower.includes(k))) {
    return "I'd love to meet with you! Pick a date and time here. [BOOKING_LINK]"
  }

  if (lower.includes('skill') || lower.includes('skills')) {
    const m = context.match(/Skills: ([^\n]+)/)
    return m ? `My key skills include: ${m[1]}.` : `I have experience in software development and health-science related work.`
  }
  if (lower.includes('career') || lower.includes('work') || lower.includes('company')) {
    const m = context.match(/Career: ([^\n]+)/)
    return m ? `Here are my recent roles: ${m[1]}.` : `I've worked across development and health-technology roles.`
  }
  if (lower.includes('where') || lower.includes('based') || lower.includes('live')) {
    return `I'm based in Sydney, Australia!`
  }

  return `That's a great question! Feel free to ask me about my skills, career, or book a meeting with me.`
}
