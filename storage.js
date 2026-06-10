const BK = 'chms_bookings'
export const loadBookings = () => { try { const r = localStorage.getItem(BK); return r ? JSON.parse(r) : []; } catch { return []; } }
export const saveBookings = (b) => { try { localStorage.setItem(BK, JSON.stringify(b)); } catch {} }
