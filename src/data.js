export const STAFF = [
  { id: 'blaze',   name: 'Blaze',   role: 'Producer / Studio Manager' },
  { id: 'matthew', name: 'Matthew', role: 'Staff Engineer' },
  { id: 'sam',     name: 'Sam',     role: 'Staff Engineer' },
]

// Pricing: [min, max] per hour
export const PRICING = {
  a: {
    dry: { hourly: [55, 70], halfDay: [240, 320], fullDay: [500, 650] },
    wet: { hourly: [90, 120], halfDay: [400, 520], fullDay: [800, 1000] },
  },
  b: {
    dry: { hourly: [35, 50], halfDay: [160, 220], fullDay: [320, 420] },
    wet: { hourly: [65, 85], halfDay: [280, 360], fullDay: [550, 700] },
  },
  both: {
    dry:     { fullDay: [1000, 1000] },
    wet:     { fullDay: [1200, 1200] },
    premium: { fullDay: [1300, 1400] },
  },
}

export const ADDONS = [
  { id: 'additional_engineer', label: 'Additional Engineer / Producer', rate: [25, 30], unit: '/hr' },
  { id: 'assistant_engineer',  label: 'Assistant / 2nd Engineer',       rate: [15, 20], unit: '/hr' },
  { id: 'mixing',              label: 'Mixing',                         rate: null,     unit: 'POA' },
  { id: 'mastering',           label: 'Mastering',                      rate: null,     unit: 'POA' },
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

// Calculate price estimate based on selections
export function calcPrice(room, hireType, hours, addons = [], offPeak = false) {
  const p = PRICING[room]?.[hireType]
  if (!p) return null

  let min, max
  if (hours >= 10) {
    min = p.fullDay?.[0]; max = p.fullDay?.[1]
  } else if (hours >= 5) {
    min = p.halfDay?.[0] || p.hourly?.[0] * hours; max = p.halfDay?.[1] || p.hourly?.[1] * hours
  } else {
    if (!p.hourly) { min = p.fullDay?.[0]; max = p.fullDay?.[1] }
    else { min = p.hourly[0] * hours; max = p.hourly[1] * hours }
  }

  if (!min) return null

  // Off-peak discount 10-15%
  if (offPeak) { min = Math.round(min * 0.875); max = Math.round(max * 0.875) }

  // Add-ons with hourly rates
  addons.forEach(id => {
    const addon = ADDONS.find(a => a.id === id)
    if (addon?.rate) {
      min += addon.rate[0] * hours
      max += addon.rate[1] * hours
    }
  })

  return { min, max, same: min === max }
}

export function genId() { return Math.random().toString(36).slice(2,10).toUpperCase() }
export function genToken() { return Math.random().toString(36).slice(2,18) }
