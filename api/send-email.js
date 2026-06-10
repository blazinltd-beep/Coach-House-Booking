import { Resend } from 'resend';

const ROOMS = [
  { id: 'a',    label: 'Room A',     rate: 65  },
  { id: 'b',    label: 'Room B',     rate: 45  },
  { id: 'both', label: 'Both Rooms', rate: 100 },
];

const STAFF = [
  { id: 'blaze',   name: 'Blaze',   email: process.env.EMAIL_BLAZE   || 'blaze@coachhousemusic.uk' },
  { id: 'matthew', name: 'Matthew', email: process.env.EMAIL_MATTHEW || 'matthew@coachhousemusic.uk' },
  { id: 'sam',     name: 'Sam',     email: process.env.EMAIL_SAM     || 'sam@coachhousemusic.uk' },
];

const FROM = process.env.FROM_EMAIL || 'bookings@coachhousemusic.uk';
const APP_URL = process.env.APP_URL || 'https://coach-house-booking.vercel.app';

function bookingRows(booking) {
  const room = ROOMS.find(r => r.id === booking.room);
  const total = room ? room.rate * booking.hours : 0;
  const dateStr = new Date(booking.date).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const rows = [
    ['Ref', `#${booking.id}`],
    ['Client', booking.clientName],
    ['Email', booking.clientEmail],
    ['Phone', booking.clientPhone || '—'],
    ['Room', room?.label],
    ['Service', booking.service],
    ['Date', dateStr],
    ['Time', `${booking.startTime} · ${booking.hours} hour${booking.hours > 1 ? 's' : ''}`],
    ['Total', `£${total.toLocaleString()}`],
    ['Notes', booking.notes || '—'],
  ];
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows.map(([k,v]) => `<tr><td style="padding:8px 12px;background:#f5f5f5;font-size:12px;color:#666;font-family:monospace;white-space:nowrap;width:100px;border-bottom:1px solid #eee;">${k}</td><td style="padding:8px 12px;font-size:13px;color:#111;border-bottom:1px solid #eee;">${v}</td></tr>`).join('')}</table>`;
}

function wrap(content) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0ede8;font-family:sans-serif;"><div style="max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);"><div style="background:#0d0d0d;padding:24px 32px;"><span style="display:inline-block;width:36px;height:36px;background:#C8A96E;border-radius:6px;text-align:center;line-height:36px;font-weight:900;color:#0d0d0d;font-size:14px;vertical-align:middle;">CH</span><span style="display:inline-block;margin-left:10px;vertical-align:middle;"><span style="display:block;color:#F0EDE8;font-weight:800;font-size:16px;">Coach House Music Studios</span><span style="display:block;color:#666;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;font-family:monospace;">Studio Booking System</span></span></div><div style="padding:32px;">${content}</div><div style="padding:20px 32px;background:#f9f9f9;font-size:11px;color:#aaa;font-family:monospace;border-top:1px solid #eee;">Coach House Music Studios · London · coachhousemusic.uk</div></div></body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Email not configured' });

  const resend = new Resend(apiKey);
  const { type, booking } = req.body;
  const errors = [];

  try {
    if (type === 'new_booking') {
      // Email client: request received
      await resend.emails.send({
        from: FROM, to: booking.clientEmail,
        subject: `Booking Request Received — Coach House (#${booking.id})`,
        html: wrap(`<h2 style="margin:0 0 8px;font-size:22px;color:#0d0d0d;font-weight:800;">Booking Request Received</h2><p style="color:#666;font-size:14px;margin:0 0 24px;">Hi ${booking.clientName}, we've received your request and the team has been notified. We'll confirm within 24 hours.</p>${bookingRows(booking)}<p style="margin-top:20px;font-size:12px;color:#aaa;">Reference: #${booking.id} — keep this for your records.</p>`)
      });

      // Email each requested staff member
      for (const sid of booking.staffNeeded) {
        const staff = STAFF.find(s => s.id === sid);
        if (!staff) continue;
        const acceptUrl = `${APP_URL}?action=accept&booking=${booking.id}&staff=${sid}&token=${booking.tokens[sid]}`;
        const declineUrl = `${APP_URL}?action=decline&booking=${booking.id}&staff=${sid}&token=${booking.tokens[sid]}`;
        const room = ROOMS.find(r => r.id === booking.room);
        const total = room ? room.rate * booking.hours : 0;
        try {
          await resend.emails.send({
            from: FROM, to: staff.email,
            subject: `[Coach House] Booking #${booking.id} — ${booking.clientName}`,
            html: wrap(`<h2 style="margin:0 0 8px;font-size:22px;color:#0d0d0d;font-weight:800;">New Booking Request</h2><p style="color:#666;font-size:14px;margin:0 0 24px;">Hi ${staff.name}, a new studio booking needs your response.</p>${bookingRows(booking)}<div style="margin-top:28px;"><a href="${acceptUrl}" style="display:inline-block;padding:14px 28px;background:#22c55e;color:#fff;font-weight:700;font-size:14px;border-radius:8px;text-decoration:none;margin-right:12px;">✓ Accept Booking</a><a href="${declineUrl}" style="display:inline-block;padding:14px 28px;background:#ef4444;color:#fff;font-weight:700;font-size:14px;border-radius:8px;text-decoration:none;">✕ Decline</a></div><p style="margin-top:20px;font-size:12px;color:#aaa;">Estimated fee: £${total.toLocaleString()}</p>`)
          });
        } catch(e) { errors.push(`${staff.name}: ${e.message}`); }
      }
    }

    else if (type === 'confirmed') {
      const dateStr = new Date(booking.date).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
      await resend.emails.send({
        from: FROM, to: booking.clientEmail,
        subject: `Confirmed — Coach House Music Studios (${dateStr})`,
        html: wrap(`<h2 style="margin:0 0 8px;font-size:22px;color:#0d0d0d;font-weight:800;">Your Session is Confirmed ✓</h2><p style="color:#666;font-size:14px;margin:0 0 24px;">Hi ${booking.clientName}, your booking at Coach House Music Studios is confirmed.</p>${bookingRows(booking)}<div style="margin-top:24px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;"><p style="margin:0;font-size:13px;color:#14532d;"><strong>Arrive 10 minutes early.</strong> Bring any hard drives, reference tracks or session files. Questions? Reply to this email.</p></div>`)
      });
    }

    else if (type === 'declined') {
      await resend.emails.send({
        from: FROM, to: booking.clientEmail,
        subject: `Re: Your Booking — Coach House Music Studios`,
        html: wrap(`<h2 style="margin:0 0 8px;font-size:22px;color:#0d0d0d;font-weight:800;">Booking Update</h2><p style="color:#666;font-size:14px;margin:0 0 24px;">Hi ${booking.clientName}, unfortunately we can't accommodate your request on this date.</p>${bookingRows(booking)}<p style="font-size:14px;color:#444;margin-top:24px;">Please get in touch to find an alternative date.</p>`)
      });
    }

    return res.status(200).json({ ok: true, errors: errors.length ? errors : undefined });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
