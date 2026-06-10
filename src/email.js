async function sendEmail({ apiKey, from, to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'Email send failed')
  }
  return res.json()
}

function bookingDetailsHtml(booking, rooms) {
  const room = rooms.find(r => r.id === booking.room)
  const total = room ? room.rate * booking.hours : 0
  const dateStr = new Date(booking.date).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
  const rows = [
    ['Booking Ref', `#${booking.id}`],
    ['Client', booking.clientName],
    ['Email', booking.clientEmail],
    ['Phone', booking.clientPhone || '—'],
    ['Room', room?.label],
    ['Service', booking.service],
    ['Date', dateStr],
    ['Time', `${booking.startTime} · ${booking.hours} hour${booking.hours > 1 ? 's' : ''}`],
    ['Estimated Total', `£${total.toLocaleString()}`],
    ['Notes', booking.notes || '—'],
  ]
  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${rows.map(([k, v]) => `
        <tr>
          <td style="padding:8px 12px;background:#f5f5f5;font-size:12px;color:#666;font-family:monospace;white-space:nowrap;width:140px;border-bottom:1px solid #eee;">${k}</td>
          <td style="padding:8px 12px;font-size:13px;color:#111;font-family:sans-serif;border-bottom:1px solid #eee;">${v}</td>
        </tr>`).join('')}
    </table>`
}

function emailWrapper(content) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0ede8;font-family:sans-serif;">
    <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
      <div style="background:#0d0d0d;padding:24px 32px;">
        <span style="display:inline-block;width:36px;height:36px;background:#C8A96E;border-radius:6px;text-align:center;line-height:36px;font-weight:900;color:#0d0d0d;font-size:14px;vertical-align:middle;">CH</span>
        <span style="display:inline-block;margin-left:10px;vertical-align:middle;">
          <span style="display:block;color:#F0EDE8;font-weight:800;font-size:16px;">Coach House Music Studios</span>
          <span style="display:block;color:#666;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;font-family:monospace;">Studio Booking System</span>
        </span>
      </div>
      <div style="padding:32px;">${content}</div>
      <div style="padding:20px 32px;background:#f9f9f9;font-size:11px;color:#aaa;font-family:monospace;border-top:1px solid #eee;">
        Coach House Music Studios · London · coachhousemusic.uk
      </div>
    </div>
  </body></html>`
}

export async function sendStaffInviteEmail({ apiKey, fromEmail, staff, booking, appUrl, rooms }) {
  const room = rooms.find(r => r.id === booking.room)
  const total = room ? room.rate * booking.hours : 0
  const acceptUrl = `${appUrl}?action=accept&booking=${booking.id}&staff=${staff.id}&token=${booking.tokens[staff.id]}`
  const declineUrl = `${appUrl}?action=decline&booking=${booking.id}&staff=${staff.id}&token=${booking.tokens[staff.id]}`

  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#0d0d0d;font-weight:800;">New Booking Request</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">Hi ${staff.name}, a new studio booking request needs your response.</p>
    ${bookingDetailsHtml(booking, rooms)}
    <div style="margin-top:28px;">
      <a href="${acceptUrl}" style="display:inline-block;padding:14px 28px;background:#22c55e;color:#fff;font-weight:700;font-size:14px;border-radius:8px;text-decoration:none;margin-right:12px;">✓ Accept Booking</a>
      <a href="${declineUrl}" style="display:inline-block;padding:14px 28px;background:#ef4444;color:#fff;font-weight:700;font-size:14px;border-radius:8px;text-decoration:none;">✕ Decline</a>
    </div>
    <p style="margin-top:20px;font-size:12px;color:#aaa;">These links are unique to you. Total estimated fee: £${total.toLocaleString()}</p>
  `)

  return sendEmail({
    apiKey, from: fromEmail, to: staff.email,
    subject: `[Coach House] Booking Request #${booking.id} — ${booking.clientName}`,
    html
  })
}

export async function sendClientPendingEmail({ apiKey, fromEmail, booking, rooms }) {
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#0d0d0d;font-weight:800;">Booking Request Received</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">Hi ${booking.clientName}, we've received your booking request and the team has been notified. We'll confirm within 24 hours.</p>
    ${bookingDetailsHtml(booking, rooms)}
    <p style="margin-top:20px;font-size:12px;color:#aaa;">Booking reference: #${booking.id} · Keep this for your records.</p>
  `)
  return sendEmail({
    apiKey, from: fromEmail, to: booking.clientEmail,
    subject: `Booking Request Received — Coach House Music Studios (#${booking.id})`,
    html
  })
}

export async function sendClientConfirmEmail({ apiKey, fromEmail, booking, rooms }) {
  const dateStr = new Date(booking.date).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#0d0d0d;font-weight:800;">Your Session is Confirmed ✓</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">Hi ${booking.clientName}, your booking at Coach House Music Studios has been confirmed.</p>
    ${bookingDetailsHtml(booking, rooms)}
    <div style="margin-top:24px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;">
      <p style="margin:0;font-size:13px;color:#14532d;">
        <strong>What to bring:</strong> Any hard drives, reference tracks, or session files you need. Arrive 10 minutes before your start time.<br><br>
        <strong>Questions?</strong> Reply to this email and we'll get back to you.
      </p>
    </div>
    <p style="margin-top:20px;font-size:12px;color:#aaa;">Booking reference: #${booking.id}</p>
  `)
  return sendEmail({
    apiKey, from: fromEmail, to: booking.clientEmail,
    subject: `Booking Confirmed — Coach House Music Studios (${dateStr})`,
    html
  })
}

export async function sendClientDeclineEmail({ apiKey, fromEmail, booking, rooms }) {
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#0d0d0d;font-weight:800;">Booking Update</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">Hi ${booking.clientName}, unfortunately we're unable to accommodate your booking request on the requested date.</p>
    ${bookingDetailsHtml(booking, rooms)}
    <p style="font-size:14px;color:#444;margin-top:24px;">We'd love to find another time that works. Please visit our booking page to request an alternative date, or reply to this email.</p>
    <p style="margin-top:20px;font-size:12px;color:#aaa;">Booking reference: #${booking.id}</p>
  `)
  return sendEmail({
    apiKey, from: fromEmail, to: booking.clientEmail,
    subject: `Re: Your Booking Request — Coach House Music Studios`,
    html
  })
}
