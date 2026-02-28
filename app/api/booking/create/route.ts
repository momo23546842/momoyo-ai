import { NextRequest, NextResponse } from 'next/server'

async function getAccessToken(): Promise<string> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_PRIVATE_KEY

  if (!clientEmail || !rawKey) {
    throw new Error(`Missing env: email=${!!clientEmail}, key=${!!rawKey}`)
  }

  const privateKey = rawKey.replace(/\\n/g, '\n')

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

  const crypto = await import('crypto')
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signInput)
  const signature = sign.sign(privateKey, 'base64url')

  const jwt = `${signInput}.${signature}`

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, start, end, message } = body

    if (!name || !email || !start || !end) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const calendarId = process.env.GOOGLE_CALENDAR_ID
    if (!calendarId) {
      return NextResponse.json({ error: 'GOOGLE_CALENDAR_ID not set' }, { status: 500 })
    }

    const accessToken = await getAccessToken()

    const event = {
      summary: `Meeting with ${name}`,
      description: `Email: ${email}\n${message ? `Message: ${message}` : ''}`,
      start: { dateTime: start, timeZone: 'Australia/Sydney' },
      end: { dateTime: end, timeZone: 'Australia/Sydney' },
      attendees: [{ email }],
    }

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )

    if (!calRes.ok) {
      const errText = await calRes.text()
      console.error('Calendar insert error:', calRes.status, errText)
      return NextResponse.json(
        { error: `Calendar error: ${calRes.status}` },
        { status: 500 }
      )
    }

    const calData = await calRes.json()
    return NextResponse.json({ success: true, eventId: calData.id })
  } catch (err: any) {
    console.error('Booking error:', err?.message || err)
    return NextResponse.json(
      { error: `Failed to create booking: ${err?.message || 'Unknown'}` },
      { status: 500 }
    )
  }
}
