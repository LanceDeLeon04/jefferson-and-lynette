import { SUPABASE_URL, SUPABASE_KEY } from './config.js'
export async function saveRsvp(r) {
  if (SUPABASE_URL && SUPABASE_KEY) {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
    const { error } = await sb.from('rsvps').insert({ name: r.name, attending: r.answer === 'Joyfully accepts', guests: r.guests, guest_type: r.guest_type, companions: r.companions, message: r.message })
    if (error) throw error
    return 'cloud'
  }
  try { const k = 'jl-rsvp', a = JSON.parse(localStorage.getItem(k) || '[]'); a.push({ ...r, at: new Date().toISOString() }); localStorage.setItem(k, JSON.stringify(a)) } catch (e) {}
  return 'local'
}
