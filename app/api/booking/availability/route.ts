import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const WORK_START = 9
const WORK_END = 18

function getServiceAccountAuth() {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL

  if (!rawKey || !clientEmail) {
    throw new Error(`Missing credentials: email=${!!clientEmail}, key=${!!rawKey}`)
  }

  // Handle different formats of the private key from env vars
  const privateKey = rawKey.replace(/\\n/g, '\n')

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
  return auth
}

function getSydneyOffset(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  const month = d.getUTCMonth()
  if (month >= 3 && month <= 8) return '+10:00'
  return '+11:00'
}

function generateSlots(
  dateStr: string,
  offset: string,
  busyTimes: { start: string | null | undefined; end: string | null | undefined }[]
) {
  const slots = []
  for (let hour = WORK_START; hour < WORK_END; hour++) {
    const slotStart = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00${offset}`)
    const slotEnd = new Date(`${dateStr}T${String(hour + 1).padStart(2, '0')}:00:00${offset}`)

    const isBusy = busyTimes.some(busy => {
      if (!busy.start || !busy.end) return false
      const busyStart = new Date(busy.start)
      const busyEnd = new Date(busy.end)
      return slotStart < busyEnd && slotEnd > busyStart
    })

    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      label: `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00`,
      available: !isBusy,
    })
  }
  return slots
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const dateStr = url.searchParams.get('date')

    if (!dateStr) {
      return NextResponse.json({ error: 'date required' }, { status: 400 })
    }

    const calendarId = process.env.GOOGLE_CALENDAR_ID
    if (!calendarId) {
      console.error('GOOGLE_CALENDAR_ID is not set')
      // Still return slots so the UI works
      const offset = getSydneyOffset(dateStr)
      return NextResponse.json({
        slots: generateSlots(dateStr, offset, []),
        warning: 'GOOGLE_CALENDAR_ID not configured',
      })
    }

    let auth
    try {
      auth = getServiceAccountAuth()
    } catch (authErr: any) {
      console.error('Auth error:', authErr?.message)
      const offset = getSydneyOffset(dateStr)
      return NextResponse.json({
        slots: generateSlots(dateStr, offset, []),
        warning: `Auth error: ${authErr?.message}`,
      })
    }

    const calendar = google.calendar({ version: 'v3', auth })
    const offset = getSydneyOffset(dateStr)
    const dayStart = new Date(`${dateStr}T${String(WORK_START).padStart(2, '0')}:00:00${offset}`)
    const dayEnd = new Date(`${dateStr}T${String(WORK_END).padStart(2, '0')}:00:00${offset}`)

    let busyTimes: { start: string | null | undefined; end: string | null | undefined }[] = []

    try {
      const eventsRes = await calendar.events.list({
        calendarId,
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      })
      busyTimes = (eventsRes.data.items || []).map(event => ({
        start: event.start?.dateTime,
        end: event.end?.dateTime,
      }))
    } catch (calErr: any) {
      console.error('Google Calendar API error:', calErr?.message || calErr)
      return NextResponse.json({
        slots: generateSlots(dateStr, offset, []),
        warning: `Calendar API error: ${calErr?.message || 'Unknown'}`,
      })
    }

    return NextResponse.json({ slots: generateSlots(dateStr, offset, busyTimes) })
  } catch (err: any) {
    console.error('Availability error:', err?.message || err)
    return NextResponse.json(
      { error: `Server error: ${err?.message || 'Unknown'}`, slots: [] },
      { status: 500 }
    )
  }
}
