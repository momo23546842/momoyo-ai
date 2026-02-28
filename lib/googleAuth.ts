async function postForm(url: string, body: Record<string, string>) {
  const form = new URLSearchParams(body)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
  const text = await res.text()
  let data: any = undefined
  try { data = JSON.parse(text) } catch {}
  return { ok: res.ok, status: res.status, text, data }
}

export async function getGoogleOAuthAccessToken(): Promise<string> {
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error('Missing Google OAuth env vars (GOOGLE_OAUTH_REFRESH_TOKEN, CLIENT_ID, CLIENT_SECRET)')
  }

  const tokenRes = await postForm('https://oauth2.googleapis.com/token', {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  })

  if (!tokenRes.ok) {
    const err = tokenRes.data ?? tokenRes.text
    throw new Error(`Google token refresh failed: ${tokenRes.status} ${String(err).slice(0,300)}`)
  }

  const accessToken = tokenRes.data?.access_token
  if (!accessToken) throw new Error('No access_token in token response')
  return accessToken
}

export default getGoogleOAuthAccessToken
