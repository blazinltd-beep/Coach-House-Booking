// All data goes through Supabase API — no localStorage

export async function loadBookings() {
  try {
    const res = await fetch('/api/bookings')
    if (!res.ok) throw new Error('Failed to load')
    const data = await res.json()
    // Normalise snake_case from DB to camelCase for the app
    return data.map(normalise)
  } catch (e) {
    console.error('loadBookings error:', e)
    return []
  }
}

export async function createBooking(booking) {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  })
  if (!res.ok) throw new Error('Failed to create booking')
  return normalise(await res.json())
}

export async function updateBooking(id, staffResponses, status) {
  const res = await fetch('/api/bookings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, staffResponses, status }),
  })
  if (!res.ok) throw new Error('Failed to update booking')
  return normalise(await res.json())
}

function normalise(b) {
  return {
    id: b.id,
    clientName: b.client_name,
    clientEmail: b.client_email,
    clientPhone: b.client_phone,
    room: b.room,
    service: b.service,
    date: b.date,
    startTime: b.start_time,
    hours: b.hours,
    notes: b.notes,
    staffNeeded: b.staff_needed,
    staffResponses: b.staff_responses,
    tokens: b.tokens,
    status: b.status,
    createdAt: b.created_at,
  }
}
