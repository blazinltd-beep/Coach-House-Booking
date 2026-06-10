export const STAFF = [
  { id: 'blaze',   name: 'Blaze',   role: 'Producer / Studio Manager' },
  { id: 'matthew', name: 'Matthew', role: 'Staff Engineer' },
  { id: 'sam',     name: 'Sam',     role: 'Staff Engineer' },
]

// Solid hourly rates
export const RATES = {
  a:    { dry: 75,  wet: 120 },
  b:    { dry: 45,  wet: 85  },
  both: { dry: 1100, wet: 1300, premium: 1500 }, // per day
}

export const OFF_PEAK_DISCOUNT = 0.15 // 15%

export const ADDONS = [
  { id: 'additional_engineer', label: 'Additional Engineer / Producer', rate: 30, unit: '/hr' },
  { id: 'assistant_engineer',  label: 'Assistant / 2nd Engineer',       rate: 20, unit: '/hr' },
  { id: 'mixing',              label: 'Mixing',                         rate: null, unit: 'POA' },
  { id: 'mastering',           label: 'Mastering',                      rate: null, unit: 'POA' },
]

export const ROOMS = [
  { id: 'a',    label: 'Studio A', desc: 'Main Room · Neve 1073x · U87i · Adam A77X · Yamaha Upright · Moog' },
  { id: 'b',    label: 'Studio B', desc: 'Secondary Room · Rode NT1-A · Pioneer XDJ-XZ · Yamaha HS8 · Vocal Booth' },
  { id: 'both', label: 'Both Rooms', desc: 'Full Lockout · Studio A + B + Booth · Private sessions' },
]

export const HIRE_TYPES = {
  a:    [{ id: 'dry', label: 'Dry Hire', desc: 'No engineer' }, { id: 'wet', label: 'Wet Hire', desc: 'Engineer included' }],
  b:    [{ id: 'dry', label: 'Dry Hire', desc: 'No engineer' }, { id: 'wet', label: 'Wet Hire', desc: 'Engineer included' }],
  both: [{ id: 'dry', label: 'Dry Hire', desc: 'No engineer' }, { id: 'wet', label: 'Wet Hire', desc: 'Engineer included' }, { id: 'premium', label: 'Premium Session', desc: 'Full team · ideal for label sessions' }],
}

export const SERVICES = [
  'Recording Session',
  'Production Session',
  'Mixing',
  'Mastering',
  'DJ / Live Rehearsal',
  'Podcast / Voice-over',
  'Writing Session',
]

export function calcPrice(room, hireType, hours, addons = [], offPeak = false) {
  const rates = RATES[room]
  if (!rates) return null

  const baseRate = rates[hireType]
  if (baseRate == null) return null

  let base = room === 'both' ? baseRate : baseRate * hours

  // Off-peak discount
  if (offPeak) base = Math.round(base * (1 - OFF_PEAK_DISCOUNT))

  // Add-ons (hourly)
  addons.forEach(id => {
    const addon = ADDONS.find(a => a.id === id)
    if (addon && addon.rate != null) base += addon.rate * hours
  })

  return base
}

export function genId() { return Math.random().toString(36).slice(2,10).toUpperCase() }
export function genToken() { return Math.random().toString(36).slice(2,18) }
