import { Resend } from 'resend'

type SendResult = { ok: true } | { ok: false; error: string }

export type BookingEmailParams = {
  guestName: string
  guestEmail: string
  startTime: string | Date
  endTime: string | Date
  timezone?: string
  meetingLink?: string
  googleEventId?: string
  bookingId?: number | string
}

const API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.RESEND_FROM
const NOTIFY_TO = process.env.RESEND_NOTIFY_TO

let resendClient: Resend | null = null
function getResendClient(): Resend | null {
  if (!API_KEY) return null
  if (!resendClient) resendClient = new Resend(API_KEY)
  return resendClient
}

function formatForEmail(dateLike: string | Date, tz = 'Australia/Sydney') {
  const d = typeof dateLike === 'string' ? new Date(dateLike) : dateLike
  try {
    return new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: tz,
    }).format(d)
  } catch (err) {
    return d.toISOString()
  }
}

function buildCommonHtml(params: BookingEmailParams) {
  const { guestName, guestEmail, meetingLink, googleEventId, bookingId } = params
  const start = formatForEmail(params.startTime, params.timezone)
  const end = formatForEmail(params.endTime, params.timezone)

  return `
    <div>
      <p><strong>Guest:</strong> ${escapeHtml(guestName)} &lt;${escapeHtml(guestEmail)}&gt;</p>
      <p><strong>Start:</strong> ${start} (${params.timezone ?? 'Australia/Sydney'})</p>
      <p><strong>End:</strong> ${end} (${params.timezone ?? 'Australia/Sydney'})</p>
      ${meetingLink ? `<p><strong>Join via Google Meet:</strong> <a href="${escapeHtml(meetingLink)}">${escapeHtml(meetingLink)}</a></p>` : ''}
      ${googleEventId ? `<p><strong>Google event:</strong> ${escapeHtml(googleEventId)}</p>` : ''}
      ${bookingId ? `<p><strong>Booking ID:</strong> ${escapeHtml(String(bookingId))}</p>` : ''}
    </div>
  `
}

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function sendBookingConfirmationToGuest(params: BookingEmailParams): Promise<SendResult> {
  try {
    if (!API_KEY) return { ok: false, error: 'RESEND_API_KEY not set' }
    if (!FROM) return { ok: false, error: 'RESEND_FROM not set' }

    const client = getResendClient()!

    const subject = 'Booking confirmed ✅'
    const html = `
      <h3>Booking confirmed</h3>
      <p>Hi ${escapeHtml(params.guestName)},</p>
      <p>Your booking is confirmed. Details below:</p>
      ${buildCommonHtml(params)}
      <p>Thanks — Momoyo</p>
    `

    await client.emails.send({
      from: FROM,
      to: params.guestEmail,
      subject,
      html,
    })

    return { ok: true }
  } catch (err: any) {
    console.error('sendBookingConfirmationToGuest error:', {
      error: String(err?.message ?? err),
      guestEmail: params?.guestEmail,
      guestName: params?.guestName,
      bookingId: params?.bookingId,
    })
    return { ok: false, error: String(err?.message ?? err) }
  }
}

export async function sendBookingNotificationToOwner(params: BookingEmailParams): Promise<SendResult> {
  try {
    if (!API_KEY) return { ok: false, error: 'RESEND_API_KEY not set' }
    if (!FROM) return { ok: false, error: 'RESEND_FROM not set' }
    if (!NOTIFY_TO) return { ok: false, error: 'RESEND_NOTIFY_TO not set' }

    const client = getResendClient()!

    const subject = `New booking: ${params.guestName}`
    const html = `
      <h3>New booking</h3>
      ${buildCommonHtml(params)}
    `

    await client.emails.send({
      from: FROM,
      to: NOTIFY_TO,
      subject,
      html,
    })

    return { ok: true }
  } catch (err: any) {
    console.error('sendBookingNotificationToOwner error:', {
      error: String(err?.message ?? err),
      guestEmail: params?.guestEmail,
      guestName: params?.guestName,
      bookingId: params?.bookingId,
    })
    return { ok: false, error: String(err?.message ?? err) }
  }
}
