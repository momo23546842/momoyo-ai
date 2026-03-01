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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message: string = body?.message || ''

    const profile = await prisma?.profile?.findFirst?.() ?? null
    const resumes = await prisma?.resume?.findMany?.({ orderBy: { startDate: 'desc' } }) ?? []
    const skills = await prisma?.skill?.findMany?.() ?? []

    const parts: string[] = []
    if (profile) {
      parts.push(`Name: ${profile.name ?? ''}`)
      if (profile.catchphrase) parts.push(`Catchphrase: ${profile.catchphrase}`)
      if (profile.bio) parts.push(`Bio: ${profile.bio}`)
    }
    if (resumes.length) {
      const jobs = resumes
        .slice(0, 10)
        .map((r: any) => `${r.title ?? ''} at ${r.organization ?? ''} (${r.startDate ?? ''} - ${r.endDate ?? 'present'})`)
        .join('; ')
      parts.push(`Career: ${jobs}`)
    }
    if (skills.length) {
      parts.push(`Skills: ${skills.map((s: any) => s.name).join(', ')}`)
    }

    const systemPrompt = `You ARE Momoyo Kataoka. You speak as yourself in first person ("I", "my", "me"). You are friendly, warm, and professional. You use the factual data below about yourself to answer questions. If someone asks something not covered by the data, say you'd rather not share that or you're not sure.

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
