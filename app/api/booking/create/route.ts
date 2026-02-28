import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import {
  sendBookingConfirmationToGuest,
  sendBookingNotificationToOwner,
} from '../../../../lib/email'
import { google } from 'googleapis'

export const runtime = 'nodejs'

// We'll use googleapis OAuth2 client with a refresh token (no service account)

function ensureOffset(dateTime: string): string {
  // If already contains Z or +HH:MM/-HH:MM, return as-is
  const hasOffset = /([zZ]|[+-]\d{2}:\d{2})$/.test(dateTime)
  if (hasOffset) return dateTime

  // Minimal, pragmatic approach: assume Australia/Sydney offset +11:00 for simplicity
  // TODO: replace with proper tz-aware conversion (Temporal or a timezone library)
  return `${dateTime}+11:00`
}

export async function POST(req: NextRequest) {
  try {
    const text = await req.text()
    let body: any = {}
    try {
      body = text ? JSON.parse(text) : {}
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { name, email, start, end, message } = body

    if (!name || !email || !start || !end) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const calendarId = process.env.GOOGLE_CALENDAR_ID
    if (!calendarId) {
      return NextResponse.json(
        { error: 'GOOGLE_CALENDAR_ID not set' },
        { status: 500 }
      )
    }

    // Use OAuth2 client with refresh token (googleapis)
    const {
      GOOGLE_OAUTH_CLIENT_ID,
      GOOGLE_OAUTH_CLIENT_SECRET,
      GOOGLE_OAUTH_REDIRECT_URI,
      GOOGLE_OAUTH_REFRESH_TOKEN,
    } = process.env

    if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET || !GOOGLE_OAUTH_REFRESH_TOKEN) {
      return NextResponse.json({ error: 'Missing Google OAuth env vars' }, { status: 500 })
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_OAUTH_CLIENT_ID,
      GOOGLE_OAUTH_CLIENT_SECRET,
      GOOGLE_OAUTH_REDIRECT_URI
    )
    oauth2Client.setCredentials({ refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN })
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // attendees removed to avoid 403 on some accounts
    // Normalize start/end to include timezone offset for Google Calendar
    const startDT = ensureOffset(String(start))
    const endDT = ensureOffset(String(end))

    const event = {
      summary: `Meeting with ${name}`,
      description: `Booked by: ${name}\nEmail: ${email}${
        message ? `\nMessage: ${message}` : ''
      }`,
      start: { dateTime: startDT, timeZone: 'Australia/Sydney' },
      end: { dateTime: endDT, timeZone: 'Australia/Sydney' },
    }

    // Add conferenceData.createRequest to ask Google to generate a Meet link.
    const crypto = await import('crypto')
    const requestId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const eventWithConference = {
      ...event,
      conferenceData: {
        createRequest: {
          requestId,
          // Use 'hangoutsMeet' per Google Calendar API requirement for Meet links
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }

    let calendarAttempt: 'oauthMeet' | 'fallbackNoMeet' = 'oauthMeet'
    let calData: any = null
    let eventId: string | undefined = undefined
    let meetLink: string | undefined = undefined

    // First try: insert with conferenceDataVersion=1 to create Meet
    try {
      const res = await calendar.events.insert({
        calendarId,
        conferenceDataVersion: 1,
        requestBody: eventWithConference,
      })
      calData = res.data
      eventId = calData?.id
      meetLink = calData?.hangoutLink || calData?.conferenceData?.entryPoints?.find((p: any) => p.entryPointType === 'video')?.uri

      if (!meetLink) {
        // Treat missing meet link as failure and fallback
        throw new Error('No meet link returned from calendar.events.insert')
      }

      console.log('Calendar insert success:', { eventId, meetLink, hasConferenceData: !!calData?.conferenceData })
    } catch (err: any) {
      // Log structured error for debugging
      console.error('Calendar insert error (meet attempt):', {
        status: err?.response?.status ?? err?.code ?? 'unknown',
        message: err?.response?.data ?? err?.message ?? String(err),
        requestBody: eventWithConference,
      })

      // Fallback: create event without conferenceData
      try {
        const res2 = await calendar.events.insert({
          calendarId,
          requestBody: event,
        })
        calData = res2.data
        eventId = calData?.id
        meetLink = calData?.hangoutLink || calData?.conferenceData?.entryPoints?.find((p: any) => p.entryPointType === 'video')?.uri
        calendarAttempt = 'fallbackNoMeet'
        console.log('Calendar insert success (fallback):', { eventId, meetLink, hasConferenceData: !!calData?.conferenceData })
      } catch (err2: any) {
        console.error('Calendar insert error (fallback):', {
          status: err2?.response?.status ?? err2?.code ?? 'unknown',
          message: err2?.response?.data ?? err2?.message ?? String(err2),
          requestBody: event,
        })
        return NextResponse.json({ error: 'Calendar insert failed', details: err2?.response?.data ?? err2?.message ?? String(err2) }, { status: 500 })
      }
    }

    // DB保存 - try to save `meetLink` if the schema supports it, otherwise retry without it
    let booking
    try {
      booking = await prisma.booking.create({
        data: {
          name,
          email,
          startTime: new Date(start),
          endTime: new Date(end),
          googleEventId: eventId ?? undefined,
          meetLink: meetLink ?? undefined,
        },
      })
    } catch (err: any) {
      const msg = String(err?.message ?? err)
      if (msg.includes('Unknown argument `meetLink`') || msg.includes('Unknown arg `meetLink`')) {
        console.warn('Prisma schema does not include meetLink; retrying create without meetLink')
        booking = await prisma.booking.create({
          data: {
            name,
            email,
            startTime: new Date(start),
            endTime: new Date(end),
            googleEventId: eventId ?? undefined,
          },
        })
      } else {
        throw err
      }
    }

    // メール送信（失敗しても予約は成功扱い）
    const guestEmailRes = await sendBookingConfirmationToGuest({
      guestName: name,
      guestEmail: email,
      startTime: start,
      endTime: end,
      timezone: 'Australia/Sydney',
      meetingLink: meetLink,
      googleEventId: eventId,
      bookingId: booking.id,
    })

    const ownerEmailRes = await sendBookingNotificationToOwner({
      guestName: name,
      guestEmail: email,
      startTime: start,
      endTime: end,
      timezone: 'Australia/Sydney',
      meetingLink: meetLink,
      googleEventId: eventId,
      bookingId: booking.id,
    })

    const emailStatus = {
      guest: guestEmailRes.ok ? 'sent' : 'failed',
      owner: ownerEmailRes.ok
        ? 'sent'
        : ownerEmailRes.error === 'RESEND_NOTIFY_TO not set'
          ? 'skipped'
          : 'failed',
    }

    return NextResponse.json({ success: true, eventId, meetLink, booking, emailStatus, calendarAttempt })
  } catch (err: any) {
    console.error('Booking error:', err?.message || err)
    return NextResponse.json(
      { error: `Failed to create booking: ${err?.message || 'Unknown'}` },
      { status: 500 }
    )
  }
}
