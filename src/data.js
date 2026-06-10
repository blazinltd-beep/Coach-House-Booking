export const STAFF = [
  { id: 'blaze',   name: 'Blaze',   role: 'Producer / Studio Manager' },
  { id: 'matthew', name: 'Matthew', role: 'Staff Engineer' },
  { id: 'sam',     name: 'Sam',     role: 'Staff Engineer' },
]
export const ROOMS = [
  { id: 'a',    label: 'Room A',     desc: 'Neve 1073x · U87i · Adam A77X · Yamaha Upright · Moog', rate: 65  },
  { id: 'b',    label: 'Room B',     desc: 'Rode NT1-A · Pioneer XDJ-XZ · Yamaha HS8 · Vocal Booth', rate: 45 },
  { id: 'both', label: 'Both Rooms', desc: 'Full studio takeover',                                   rate: 100 },
]
export const SERVICES = ['Recording Session','Mixing','Mastering','Production Session','DJ / Live Rehearsal','Dry Hire','Podcast / Voice-over']
export const genId = () => Math.random().toString(36).slice(2,10).toUpperCase()
export const genToken = () => Math.random().toString(36).slice(2,18)
