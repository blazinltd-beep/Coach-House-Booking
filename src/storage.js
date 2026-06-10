const BOOKINGS_KEY = 'chms_bookings'
const SETTINGS_KEY = 'chms_settings'

export async function loadBookings() {
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export async function saveBookings(bookings) {
  try { localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings)) } catch {}
}

export async function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export async function saveSettings(settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) } catch {}
}
