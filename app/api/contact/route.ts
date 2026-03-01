import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, message } = body

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // Save to database
    try {
      await prisma.contactMessage.create({
        data: { name, email, message },
      })
    } catch (dbErr) {
      console.error('DB save failed (table may not exist yet):', dbErr)
      // Continue to send email even if DB fails
    }

    // Send email notification via Resend
    const resendKey = process.env.RESEND_API_KEY
    const notifyEmail = process.env.CONTACT_NOTIFY_EMAIL || 'm.kataoka53@gmail.com'

    if (resendKey) {
      try {
        const resend = new Resend(resendKey)
        await resend.emails.send({
          from: 'Momoyo Portfolio <onboarding@resend.dev>',
          to: notifyEmail,
          subject: `New message from ${name}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p style="color:#888;font-size:12px">Sent from momoyo-ai portfolio</p>
          `,
        })
      } catch (emailErr) {
        console.error('Email send failed:', emailErr)
        // Don't fail the request if email fails
      }
    } else {
      console.warn('RESEND_API_KEY not set - skipping email notification')
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Contact form error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
