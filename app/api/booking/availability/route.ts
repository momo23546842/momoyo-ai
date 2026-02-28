import { NextRequest, NextResponse } from 'next/server'

const WORK_START = 9
const WORK_END = 18

function getSydneyOffset(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  const month = d.getUTCMonth()
  if (month >= 3 && month <= 8) return '+10:00'
  return '+11:00'
}

function generateSlots(
  dateStr: string,
  offset: string,
  busyTimes: { start: string; end: string }[]
) {
  const slots = []
  for (let hour = WORK_START; hour < WORK_END; hour++) {
    const slotStart = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00${offset}`)
    const slotEnd = new Date(`${dateStr}T${String(hour + 1).padStart(2, '0')}:00:00${offset}`)

    const isBusy = busyTimes.some(busy => {
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

async function getAccessToken(): Promise<string> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_PRIVATE_KEY

  if (!clientEmail || !rawKey) {
    throw new Error(`Missing env: email=${!!clientEmail}, key=${!!rawKey}`)
  }

  const privateKey = rawKey.replace(/\\n/g, '\n')

  // Build JWT manually
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const encode = (obj: any) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')

  const headerB64 = encode(header)
  const payloadB64 = encode(payload)
  const signInput = `${headerB64}.${payloadB64}`

  // Sign with Node.js crypto
  const crypto = await import('crypto')
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signInput)
  const signature = sign.sign(privateKey, 'base64url')

  const jwt = `${signInput}.${signature}`

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!tokenRes.ok) {
    const errText = await tokenRes.text()
    throw new Error(`Token exchange failed: ${tokenRes.status} ${errText}`)
  }

  const tokenData = await tokenRes.json()
  return tokenData.access_token
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const dateStr = url.searchParams.get('date')

  if (!dateStr) {
    return NextResponse.json({ error: 'date required' }, { status: 400 })
  }

  const offset = getSydneyOffset(dateStr)
  const calendarId = process.env.GOOGLE_CALENDAR_ID

  if (!calendarId) {
    return NextResponse.json({
      slots: generateSlots(dateStr, offset, []),
      warning: 'GOOGLE_CALENDAR_ID not set – showing all slots as available',
    })
  }

  // Try to fetch real busy times from Google Calendar
  let busyTimes: { start: string; end: string }[] = []
  let warning: string | undefined

  try {
    const accessToken = await getAccessToken()

    const dayStart = new Date(`${dateStr}T${String(WORK_START).padStart(2, '0')}:00:00${offset}`)
    const dayEnd = new Date(`${dateStr}T${String(WORK_END).padStart(2, '0')}:00:00${offset}`)

    const calUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
      `timeMin=${dayStart.toISOString()}&timeMax=${dayEnd.toISOString()}&singleEvents=true&orderBy=startTime`

    const calRes = await fetch(calUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!calRes.ok) {
      const errText = await calRes.text()
      console.error('Calendar API error:', calRes.status, errText)
      warning = `Calendar API ${calRes.status}: ${errText.slice(0, 200)}`
    } else {
      const calData = await calRes.json()
      busyTimes = (calData.items || [])
        .filter((e: any) => e.start?.dateTime && e.end?.dateTime)
        .map((e: any) => ({ start: e.start.dateTime, end: e.end.dateTime }))
    }
  } catch (err: any) {
    console.error('Availability fetch error:', err?.message || err)
    warning = `Error: ${err?.message || 'Unknown'}`
  }

  const result: any = { slots: generateSlots(dateStr, offset, busyTimes) }
  if (warning) result.warning = warning

  return NextResponse.json(result)
}
