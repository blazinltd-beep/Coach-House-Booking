import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // GET — fetch all bookings
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // POST — create new booking
  if (req.method === 'POST') {
    const booking = req.body
    const { data, error } = await supabase
      .from('bookings')
      .insert([{
        id: booking.id,
        client_name: booking.clientName,
        client_email: booking.clientEmail,
        client_phone: booking.clientPhone,
        room: booking.room,
        service: booking.service,
        date: booking.date,
        start_time: booking.startTime,
        hours: booking.hours,
        notes: booking.notes,
        staff_needed: booking.staffNeeded,
        staff_responses: booking.staffResponses,
        tokens: booking.tokens,
        status: 'pending',
        created_at: booking.createdAt,
      }])
      .select()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data[0])
  }

  // PATCH — update booking (staff response / status / cancel)
  if (req.method === 'PATCH') {
    const { id, staffResponses, status } = req.body
    const { data, error } = await supabase
      .from('bookings')
      .update({ staff_responses: staffResponses, status })
      .eq('id', id)
      .select()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data[0])
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
