import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_REDIRECT_URI' }, { status: 500 })
  }

  const state = (await import('crypto')).randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  const res = NextResponse.redirect(url)
  // set a short-lived cookie for state (basic CSRF protection)
  res.headers.set('Set-Cookie', `oauth_state=${state}; HttpOnly; Path=/; Max-Age=300; SameSite=Lax`)
  return res
}
