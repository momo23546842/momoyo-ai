import { NextRequest, NextResponse } from 'next/server'

function parseCookies(cookieHeader: string | null) {
  const out: Record<string,string> = {}
  if (!cookieHeader) return out
  cookieHeader.split(';').forEach((kv) => {
    const [k,v] = kv.split('=')
    if (!k) return
    out[k.trim()] = (v ?? '').trim()
  })
  return out
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const cookieHeader = req.headers.get('cookie')
  const cookies = parseCookies(cookieHeader)
  const savedState = cookies['oauth_state']

  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  if (!state || state !== savedState) return NextResponse.json({ error: 'Invalid state' }, { status: 400 })

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: 'Missing OAuth env vars' }, { status: 500 })
  }

  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const text = await tokenRes.text()
  let data: any = undefined
  try { data = JSON.parse(text) } catch {}

  const refreshToken = data?.refresh_token

  if (!tokenRes.ok) {
    return NextResponse.json({ error: `Token exchange failed: ${tokenRes.status}`, detail: data ?? text }, { status: 500 })
  }

  // In development, return refresh_token so developer can copy it into .env.local.
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.json({ success: true, refresh_token: refreshToken ?? null, data })
  }

  // In production, do not return secrets. Show a simple page.
  return new NextResponse('<html><body><h1>OAuth complete</h1><p>Refresh token obtained. Store it in your server environment.</p></body></html>', { headers: { 'Content-Type': 'text/html' } })
}
