// Renders the Entourage section on the invitation.
import { PARTS, loadEntourage } from './entourage-data.js'

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// "Name & Name" is shown as a couple; anything else as a single name.
const name = n => {
  const p = n.split(/\s+&\s+/)
  return p.length > 1 ? `<li class="pair">${esc(p[0])}<i>&amp;</i>${p.slice(1).map(esc).join('<i>&amp;</i>')}</li>` : `<li>${esc(n)}</li>`
}
const group = g => `<div class="en-card${g.items.some(i => /\s&\s/.test(i)) ? ' pairs' : ''}">${g.title ? `<h4>${esc(g.title)}</h4>` : ''}<ul>${g.items.map(name).join('')}</ul></div>`

// The wedding party is shown as partners: each groomsman with a bridesmaid, and the best man with the maid of honor.
// Partners are matched by their order in the two lists (edit the order in the admin to change who is paired with whom).
function pairUp(list, aId, bId, id, title) {
  const a = list.find(g => g.id === aId), b = list.find(g => g.id === bId)
  if (!a || !b || a.part !== b.part || [...a.items, ...b.items].some(i => /\s&\s/.test(i))) return list
  const n = Math.max(a.items.length, b.items.length), items = []
  for (let i = 0; i < n; i++) items.push([a.items[i], b.items[i]].filter(Boolean).join(' & '))
  const merged = { id, part: a.part, title, items }
  return list.flatMap(g => g === a ? [merged] : g === b ? [] : [g])
}

export function renderEntourage(list, host) {
  list = pairUp(pairUp(list, 'groomsmen', 'bridesmaids', 'wedding-party', 'Groomsmen & Bridesmaids'), 'best-man', 'maid-of-honor', 'honor-party', 'Best Man & Maid of Honor')
  const parts = Object.keys(PARTS).map(k => ({ k, groups: list.filter(g => g.part === k && g.items.length) })).filter(p => p.groups.length)
  host.innerHTML = parts.map((p, i) =>
    (i && p.k === 'secondary' && parts[i - 1].k === 'principal' ? '<div class="en-amp" aria-hidden="true">&amp;</div>' : '') +
    `<div class="en-part en-${p.k}"><h3>${esc(PARTS[p.k])}</h3><div class="en-grid">${p.groups.map(group).join('')}</div></div>`).join('')
  host.closest('section').hidden = !parts.length
}

export async function initEntourage() {
  const host = document.getElementById('en-body'); if (!host) return
  renderEntourage(await loadEntourage(), host)
}
