// Guest-type module for the RSVP form.
// Owns: the type rules, the REMINDER note, the companion (plus-one) names and
// the reserved / free-seating assignment. Nothing else in the form touches these rules.

// `**bold**` marks the phrase to emphasise in the reminder.
const MORE = 'Additional companions are most welcome and may be seated in our free-seating area.'
export const GUEST_TYPES = {
  principal: {
    label: 'Principal Sponsor',
    reserved: 4,
    lead: 'Each pair of Principal Sponsors is graciously provided **4 reserved seats** for companions, in addition to your own.',
    more: MORE
  },
  secondary: {
    label: 'Secondary Sponsor',
    reserved: 2,
    lead: 'Each member of our entourage is graciously provided **2 reserved seats** for companions, in addition to your own.',
    more: MORE
  },
  guest: {
    label: 'Guest',
    reserved: 0,
    lead: 'Seating for our guests is **free seating**, on a **first come, first served** basis.',
    more: 'We kindly invite you to arrive early to choose your preferred seat.'
  }
}

const MAX_PLUS = 9
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const fmt = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
const $ = id => document.getElementById(id)

export function initGuestType() {
  const sel = $('rt'), note = $('rnote'), att = $('ra'), plus = $('rplus'), cnt = $('rp'), box = $('rcomp')
  let comps = [] // [{ name, seat: 'reserved' | 'free' }]

  const type = () => GUEST_TYPES[sel.value]
  const cap = () => type()?.reserved || 0
  const accepting = () => att.value === 'Joyfully accepts'
  const reservedCount = () => comps.filter(c => c.seat === 'reserved').length

  // Reserved seats are capped by the guest type; everything over the cap is free seating.
  function enforce() { let used = 0; comps.forEach(c => { if (c.seat === 'reserved' && used < cap()) used++; else c.seat = 'free' }) }
  const defaults = () => comps.forEach((c, i) => { c.seat = i < cap() ? 'reserved' : 'free' })

  function summary() {
    const t = type(), r = reservedCount(), f = comps.length - r
    if (!t || !comps.length) return ''
    if (!t.reserved) return 'Free seating, first come, first served.'
    return `Reserved: you + ${r} of ${t.reserved} companion seat${t.reserved > 1 ? 's' : ''}` + (f ? ` · Free seating: ${f}` : '')
  }

  function drawSummary() { const s = box.querySelector('.gt-sum'); if (s) s.textContent = summary() }

  function draw() {
    const full = reservedCount() >= cap()
    box.hidden = !comps.length
    box.innerHTML = comps.map((c, i) => `<div class="comp"><label>Companion ${i + 1} name<input data-n="${i}" value="${esc(c.name)}" maxlength="120" autocomplete="off"></label>` +
      (cap()
        ? `<label>Seating<select data-s="${i}"${c.name.trim() ? '' : ' disabled'}><option value="reserved"${c.seat === 'reserved' ? ' selected' : ''}${full && c.seat !== 'reserved' ? ' disabled' : ''}>Reserved seat</option><option value="free"${c.seat === 'free' ? ' selected' : ''}>Free seating</option></select></label>`
        : '<span class="fs">Free seating</span>') + '</div>').join('') +
      (comps.length ? `<p class="gt-sum" aria-live="polite">${esc(summary())}</p>` : '')
  }

  function sync() {
    const t = type(), show = !!t && accepting()
    note.hidden = !t
    note.innerHTML = t ? `<b>Reminder</b><p class="lead">${fmt(t.lead)}</p><p class="more">${fmt(t.more)}</p>` : ''
    plus.hidden = !show
    if (!show) { comps = []; cnt.value = 0 }
    draw()
  }

  function resize() {
    const n = Math.max(0, Math.min(MAX_PLUS, Math.floor(+cnt.value) || 0))
    while (comps.length < n) comps.push({ name: '', seat: reservedCount() < cap() ? 'reserved' : 'free' })
    comps.length = n
    draw()
  }

  sel.addEventListener('change', () => { comps.forEach(c => c.seat = 'free'); defaults(); sync() })
  att.addEventListener('change', sync)
  cnt.addEventListener('input', resize)
  cnt.addEventListener('change', () => { cnt.value = comps.length })
  box.addEventListener('input', e => {
    const n = e.target.dataset.n; if (n == null) return
    comps[+n].name = e.target.value
    const s = box.querySelector(`[data-s="${n}"]`); if (s) s.disabled = !e.target.value.trim() // seating is chosen after the name is typed
  })
  box.addEventListener('change', e => {
    const s = e.target.dataset.s; if (s == null) return
    comps[+s].seat = e.target.value; enforce(); draw()
  })
  sync()

  return {
    // Returns an error message, or '' when the guest-type section is complete.
    validate() {
      if (!sel.value) { sel.focus(); return 'Please select your guest type.' }
      if (accepting()) {
        const i = comps.findIndex(c => !c.name.trim())
        if (i >= 0) { box.querySelector(`[data-n="${i}"]`)?.focus(); return `Please enter the name of companion ${i + 1}.` }
      }
      return ''
    },
    value() {
      const list = accepting() ? comps.map(c => ({ name: c.name.trim(), seating: c.seat })) : []
      return { guest_type: sel.value, companions: list }
    },
    // Short confirmation shown on the thank-you panel.
    thanks() {
      const t = type(); if (!t || !accepting()) return ''
      const r = reservedCount(), f = comps.length - r, bits = []
      if (t.reserved) bits.push('Your seat is reserved' + (comps.length ? `, with ${r} reserved seat${r === 1 ? '' : 's'} for your companions` : '') + '.')
      if (f) bits.push(`${f} companion${f === 1 ? '' : 's'} will be in the free-seating area, first come, first served.`)
      if (!t.reserved) bits.push('Seating is free, first come, first served.')
      return bits.join(' ')
    }
  }
}
