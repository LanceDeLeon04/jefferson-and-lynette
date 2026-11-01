import { SUPABASE_URL as SU, SUPABASE_KEY as SK } from './config.js'
import { PARTS, loadEntourage, saveEntourage } from './entourage-data.js'
const cloud = !!(SU && SK), logo = new URL('./assets/logo.webp', import.meta.url).href
const $ = (s, r = document) => r.querySelector(s)
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const uid = () => Math.random().toString(36).slice(2, 9)
const LS = (k, v) => v === undefined ? JSON.parse(localStorage.getItem(k) || 'null') : localStorage.setItem(k, JSON.stringify(v))
const app = $('#app')
let sb
const S = { tab: 'guests', guests: [], plan: null, dirty: false, saved: '', sel: null, pick: null, q: '', f: 'all', gq: '', un: true, exp: {}, zoom: 0, edit: null, ent: [], edirty: false, esaved: '' }

// ---------- data ----------
const TYPES = { principal: 'Principal Sponsor', secondary: 'Secondary Sponsor', guest: 'Guest' }
const map = r => ({ id: r.id, name: r.name, attending: r.attending, guests: r.guests, type: r.guest_type || 'guest', comps: r.companions || [], message: r.message || '', at: r.created_at })
const db = {
  async guests() {
    if (cloud) { const { data, error } = await sb.from('rsvps').select('*').order('created_at'); if (error) throw error; return data.map(map) }
    const own = LS('jl-admin-guests') || [], seen = new Set(own.map(g => g.src))
    ;(LS('jl-rsvp') || []).forEach(r => { const src = r.at + '|' + r.name; if (!seen.has(src)) own.push({ id: uid(), src, name: r.name, attending: r.answer === 'Joyfully accepts', guests: +r.guests || 1, type: r.guest_type || 'guest', comps: r.companions || [], message: r.message || '', at: r.at }) })
    LS('jl-admin-guests', own); return own
  },
  async plan() { if (cloud) { const { data, error } = await sb.from('seating').select('plan').eq('id', 1).maybeSingle(); if (error) throw error; return data?.plan } return LS('jl-seating') },
  async savePlan(p) { if (cloud) { const { error } = await sb.from('seating').upsert({ id: 1, plan: p, updated_at: new Date().toISOString() }); if (error) throw error } else LS('jl-seating', p) }
}
const pl = () => !cloud && LS('jl-admin-guests', S.guests)
async function addGuest(g) {
  if (cloud) { const { data, error } = await sb.from('rsvps').insert({ name: g.name, attending: g.attending, guests: g.guests, guest_type: g.type, companions: g.comps, message: g.message }).select().single(); if (error) throw error; S.guests.push(map(data)) }
  else { S.guests.push({ ...g, id: uid(), at: new Date().toISOString() }); pl() }
}
async function saveGuest(g) {
  if (cloud) { const { error } = await sb.from('rsvps').update({ name: g.name, attending: g.attending, guests: g.guests, guest_type: g.type, companions: g.comps, message: g.message }).eq('id', g.id); if (error) throw error }
  Object.assign(guest(g.id), g); pl()
}
async function delGuest(id) {
  if (cloud) { const { error } = await sb.from('rsvps').delete().eq('id', id); if (error) throw error }
  S.guests = S.guests.filter(g => g.id !== id); pl()
}

// ---------- model ----------
const guest = id => S.guests.find(g => g.id === id), tbl = id => S.plan.tables.find(t => t.id === id), obj = id => tbl(id) || S.plan.items.find(i => i.id === id)
const defPlan = () => ({
  w: 1400, h: 900, names: {}, seats: {},
  items: [{ id: 'i1', kind: 'stage', label: 'Stage', x: 480, y: 20, w: 440, h: 90 }, { id: 'i2', kind: 'dance', label: 'Dance floor', x: 520, y: 380, w: 360, h: 260 }, { id: 'i3', kind: 'door', label: 'Entrance', x: 600, y: 830, w: 200, h: 50 }],
  tables: [0, 1, 2, 3, 4, 5].map(i => ({ id: 't' + (i + 1), name: 'Table ' + (i + 1), shape: 'round', seats: 8, rot: 0, x: i < 3 ? 100 : 1120, y: 150 + (i % 3) * 220 }))
})
const norm = p => { p = p && p.tables ? p : defPlan(); p.items ??= []; p.seats ??= {}; p.names ??= {}; p.w ??= 1400; p.h ??= 900; Object.keys(p.seats).forEach(k => p.tables.some(t => t.id === k) || delete p.seats[k]); return p }
const seatsOf = id => { const t = tbl(id), a = S.plan.seats[id] ||= []; a.length = t.seats; for (let i = 0; i < t.seats; i++) a[i] ??= null; return a }
const key2 = k => { const i = k.lastIndexOf(':'); return [k.slice(0, i), +k.slice(i + 1)] }
const cname = (G, n) => (G?.comps?.[n - 1]?.name || '').trim()
const who = k => { const [g, n] = key2(k), G = guest(g); return S.plan.names[k] || (G ? (n ? cname(G, n) || G.name + ' +' + n : G.name) : '') }
const ini = s => s.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
const lab = k => { const [g, n] = key2(k), nm = S.plan.names[k] || cname(guest(g), n); return nm ? ini(nm) : n ? '+' + n : ini(guest(g)?.name || '') }
const hue = id => (S.guests.findIndex(g => g.id === id) * 67 + 20) % 360
const seated = () => { const s = new Set(); Object.values(S.plan.seats).forEach(a => a.forEach(v => v && s.add(v))); return s }
const missing = id => { const g = guest(id), s = seated(), r = []; for (let k = 0; k < g.guests; k++) s.has(id + ':' + k) || r.push(k); return r }
const clean = () => { let c = 0; Object.values(S.plan.seats).forEach(a => a.forEach((v, i) => { if (v) { const [g, k] = key2(v), G = guest(g); if (!G || !G.attending || k >= G.guests) { a[i] = null; c = 1 } } })); return c }
const geo = t => {
  const n = t.seats, p = []
  if (t.shape === 'round') { const R = Math.max(34, n * 7), r = R + 18, w = 2 * (r + 14); for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; p.push([w / 2 + r * Math.cos(a), w / 2 + r * Math.sin(a)]) } return { w, h: w, p, b: { x: w / 2 - R, y: w / 2 - R, w: 2 * R, h: 2 * R } } }
  const top = n >> 1, bot = n - top, bw = Math.max(110, Math.max(top, bot, 1) * 40 + 16)
  for (let j = 0; j < top; j++) p.push([bw * (j + .5) / top, 15])
  for (let j = 0; j < bot; j++) p.push([bw * (j + .5) / bot, 99])
  return t.rot ? { w: 114, h: bw, p: p.map(([x, y]) => [y, x]), b: { x: 30, y: 0, w: 54, h: bw } } : { w: bw, h: 114, p, b: { x: 0, y: 30, w: bw, h: 54 } }
}
const dirty = () => { S.dirty = true; status() }
const status = () => { const s = $('#st'); if (!s) return; s.textContent = S.tab === 'ent' ? (S.edirty ? '● Unsaved entourage changes' : S.esaved ? 'Entourage saved ' + S.esaved : '') : (S.dirty ? '● Unsaved layout changes' : S.saved ? 'Layout saved ' + S.saved : '') }
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600) }

// ---------- shell ----------
function login(msg = '') {
  app.innerHTML = `<form class="login" id="lf"><img src="${logo}" alt=""><h1>Admin sign in</h1><input name="e" type="email" placeholder="Email" autocomplete="username" required><input name="p" type="password" placeholder="Password" autocomplete="current-password" required><div class="err">${esc(msg)}</div><button class="btn">Sign in</button></form>`
  $('#lf').onsubmit = async e => { e.preventDefault(); const f = e.target, { error } = await sb.auth.signInWithPassword({ email: f.e.value.trim(), password: f.p.value }); error ? login(error.message) : init() }
}
function shell() {
  app.innerHTML = `<header class="top"><div class="brand"><img src="${logo}" alt=""><b>Jefferson &amp; Lynette</b><span>Admin</span></div>
<nav class="tabs"><button data-act="tab" data-v="guests">Guests</button><button data-act="tab" data-v="plan">Seating plan</button><button data-act="tab" data-v="ent">Entourage</button></nav>
<div class="act"><span id="st"></span><button class="btn" data-act="save" id="sv">Save layout</button>${cloud ? '<button class="btn ghost" data-act="out">Sign out</button>' : ''}</div></header>
${cloud ? '' : '<div class="note">Supabase isn’t configured – data is kept in this browser only.</div>'}
<main id="main"></main>
<dialog id="dlg"><form id="gf"><h3 id="gt">Guest</h3><label>Name<input name="name" required maxlength="120"></label><label>Guest type<select name="type"><option value="principal">Principal Sponsor</option><option value="secondary">Secondary Sponsor</option><option value="guest">Guest</option></select></label><label>Reply<select name="att"><option value="1">Attending</option><option value="0">Declined</option></select></label><label>Party size<input name="n" type="number" min="1" max="10" value="1"></label><label>Message<textarea name="msg" rows="3" maxlength="600"></textarea></label><div class="row"><button type="button" class="btn ghost" data-act="dclose">Cancel</button><button class="btn">Save</button></div></form></dialog><div id="toast"></div>`
  $('#gf').onsubmit = async e => {
    e.preventDefault(); const f = e.target, g = { name: f.name.value.trim(), attending: f.att.value === '1', guests: Math.min(10, Math.max(1, +f.n.value || 1)), type: f.type.value, message: f.msg.value.trim() }
    const old = S.edit ? guest(S.edit).comps || [] : []; g.comps = Array.from({ length: g.guests - 1 }, (_, i) => old[i] || { name: '', seating: 'free' })
    try { S.edit ? await saveGuest({ ...g, id: S.edit }) : await addGuest(g); if (clean()) dirty(); $('#dlg').close(); render() } catch (er) { toast(er.message) }
  }
}
async function init() {
  shell()
  try { const [g, p, e] = await Promise.all([db.guests(), db.plan(), loadEntourage(sb)]); S.guests = g; S.plan = norm(p); S.ent = e }
  catch (e) { $('#main').innerHTML = `<div class="empty">Couldn’t load data${cloud ? ' – this account may not be an authorised admin (run <b>supabase/admin.sql</b> with your email).' : '.'}<br><br><button class="btn" data-act="out">Sign out</button></div>`; return }
  if (clean()) S.dirty = true
  render()
}
function render() {
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === S.tab))
  const sv = $('#sv'); sv.hidden = S.tab === 'guests'; sv.textContent = S.tab === 'ent' ? 'Save entourage' : 'Save layout'; status()
  S.tab === 'guests' ? viewGuests() : S.tab === 'ent' ? viewEnt() : viewPlan()
}

// ---------- guests ----------
function where() { const m = {}; S.plan.tables.forEach(t => (S.plan.seats[t.id] || []).forEach(v => { if (v) { const g = key2(v)[0]; m[g] ||= {}; m[g][t.name] = (m[g][t.name] || 0) + 1 } })); return m }
const seatTxt = (g, w) => { if (!g.attending) return '—'; const e = Object.entries(w[g.id] || {}), n = e.reduce((a, [, c]) => a + c, 0); return n ? e.map(([t, c]) => esc(t) + (c > 1 ? ' ×' + c : '')).join(', ') + (n < g.guests ? ` · ${g.guests - n} unseated` : '') : '<em>Unassigned</em>' }
const compTxt = g => (g.comps || []).length ? '<div class="cm">' + g.comps.map(c => esc(c.name || '—') + ' <em>(' + (c.seating === 'reserved' ? 'reserved' : 'free seating') + ')</em>').join('<br>') + '</div>' : ''
function viewGuests() {
  const att = S.guests.filter(g => g.attending), head = att.reduce((a, g) => a + g.guests, 0), w = where(), sd = [...seated()].length
  const rows = S.guests.filter(g => { const q = S.q.toLowerCase(); return (!q || (g.name + ' ' + g.message).toLowerCase().includes(q)) && (S.f === 'all' || (S.f === 'yes' && g.attending) || (S.f === 'no' && !g.attending) || (S.f === 'un' && g.attending && missing(g.id).length)) }).sort((a, b) => (b.at || '').localeCompare(a.at || ''))
  $('#main').innerHTML = `<div class="stats">${[['Replies', S.guests.length], ['Attending parties', att.length], ['Guests attending', head], ['Declined', S.guests.length - att.length], ['Seated', sd + ' / ' + head]].map(([a, b]) => `<div><b>${b}</b><span>${a}</span></div>`).join('')}</div>
<div class="bar"><input id="q" placeholder="Search name or message" value="${esc(S.q)}"><select id="fl">${[['all', 'All replies'], ['yes', 'Attending'], ['no', 'Declined'], ['un', 'Needs seats']].map(([v, t]) => `<option value="${v}"${S.f === v ? ' selected' : ''}>${t}</option>`).join('')}</select><button class="btn" data-act="new">+ Add guest</button><button class="btn ghost" data-act="csv">Export CSV</button></div>
<div class="tw"><table><thead><tr><th>Name</th><th>Type</th><th>Reply</th><th>Party</th><th>Seating</th><th>Message</th><th>Received</th><th></th></tr></thead><tbody>${rows.map(g => `<tr><td>${esc(g.name)}${compTxt(g)}</td><td>${TYPES[g.type] || 'Guest'}</td><td><span class="tag ${g.attending ? 'y' : 'n'}">${g.attending ? 'Attending' : 'Declined'}</span></td><td>${g.guests}</td><td>${seatTxt(g, w)}</td><td class="m">${esc(g.message)}</td><td>${g.at ? new Date(g.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</td><td style="white-space:nowrap"><button class="btn ghost sm" data-act="edit" data-id="${g.id}">Edit</button> <button class="btn danger sm" data-act="del" data-id="${g.id}">Delete</button></td></tr>`).join('')}</tbody></table>${rows.length ? '' : '<div class="empty">No replies yet.</div>'}</div>`
  $('#q').oninput = e => { S.q = e.target.value; const p = e.target.selectionStart; viewGuests(); const q = $('#q'); q.focus(); q.setSelectionRange(p, p) }
  $('#fl').onchange = e => { S.f = e.target.value; viewGuests() }
}
function openDlg(id) {
  const g = id ? guest(id) : { name: '', attending: true, guests: 1, type: 'guest', message: '' }, f = $('#gf'); S.edit = id || null
  $('#gt').textContent = id ? 'Edit guest' : 'Add guest'; f.name.value = g.name; f.type.value = g.type || 'guest'; f.att.value = g.attending ? '1' : '0'; f.n.value = g.guests; f.msg.value = g.message; $('#dlg').showModal()
}
function csv() {
  const w = where(), q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const out = [['Name', 'Type', 'Reply', 'Party', 'Companions', 'Seating', 'Message', 'Received'], ...S.guests.map(g => [g.name, TYPES[g.type] || 'Guest', g.attending ? 'Attending' : 'Declined', g.guests, (g.comps || []).map(c => c.name + ' (' + (c.seating === 'reserved' ? 'reserved' : 'free') + ')').join('; '), g.attending ? Object.entries(w[g.id] || {}).map(([t, c]) => t + ' x' + c).join('; ') : '', g.message, g.at || ''])].map(r => r.map(q).join(',')).join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + out], { type: 'text/csv' })); a.download = 'guest-list.csv'; a.click()
}

// ---------- entourage ----------
const eg = el => S.ent[+el.closest('[data-g]').dataset.g], ei = el => +el.closest('li').dataset.i
const move = (a, i, d) => { const j = i + d; if (j < 0 || j >= a.length) return false;[a[i], a[j]] = [a[j], a[i]]; return true }
const edirty = () => { S.edirty = true; status() }
function viewEnt() {
  $('#main').innerHTML = `<div class="ent"><p class="tip" style="margin:0 0 1rem">Edit, add, delete or reorder names. For a couple, type both names with “ & ” between them (e.g. <i>Mr. Juan Cruz &amp; Mrs. Ana Cruz</i>). A group with no title shows without a heading. Click <b>Save entourage</b> to publish to the invitation.</p>` +
    S.ent.map((g, gi) => `<section class="eg" data-g="${gi}"><div class="eh"><select data-eg="part">${Object.entries(PARTS).map(([k, v]) => `<option value="${k}"${g.part === k ? ' selected' : ''}>${v}</option>`).join('')}</select><input data-eg="title" value="${esc(g.title)}" placeholder="Group title (e.g. Candle, Best Man)" maxlength="80"><span class="ea"><button class="btn ghost sm" data-act="gup" title="Move group up">↑</button><button class="btn ghost sm" data-act="gdn" title="Move group down">↓</button><button class="btn danger sm" data-act="gdel">Delete group</button></span></div>
<ol class="en">${g.items.map((it, ii) => `<li data-i="${ii}"><input data-ei value="${esc(it)}" maxlength="160" placeholder="Name"><button class="btn ghost sm" data-act="iup" title="Move up">↑</button><button class="btn ghost sm" data-act="idn" title="Move down">↓</button><button class="btn danger sm" data-act="idel" title="Delete name">×</button></li>`).join('')}</ol>
<button class="btn ghost sm" data-act="iadd">+ Add name</button></section>`).join('') +
    `<div class="bar" style="margin-top:1rem"><button class="btn" data-act="gadd">+ Add group</button></div>${S.ent.length ? '' : '<div class="empty">No groups yet. The Entourage section is hidden on the invitation until you add one.</div>'}</div>`
}
async function saveEnt() {
  try { S.ent = await saveEntourage(sb, S.ent); S.edirty = false; S.esaved = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); viewEnt(); status(); toast('Entourage saved') }
  catch (e) { toast('Save failed: ' + (e.message || e) + (cloud ? ' (has supabase/migration-entourage.sql been run?)' : '')) }
}

// ---------- seating plan ----------
const KINDS = { stage: ['Stage', 440, 90], dance: ['Dance floor', 360, 260], door: ['Entrance', 200, 50], buffet: ['Buffet', 300, 60], bar: ['Bar', 200, 60], cake: ['Cake', 90, 90], photo: ['Photo booth', 140, 100], label: ['Label', 160, 40] }
const fit = () => Math.min(1, (($('#stage')?.clientWidth || 1200) - 26) / S.plan.w), sc = () => S.zoom || fit()
function viewPlan() {
  $('#main').innerHTML = `<div class="pl"><aside class="gl"><h4>Guests to seat</h4><input id="gq" placeholder="Search" value="${esc(S.gq)}"><label style="font-size:.9rem;display:block;margin-bottom:.6rem"><input type="checkbox" id="un" ${S.un ? 'checked' : ''} style="width:auto;display:inline;margin-right:.3rem">Unseated only</label><div id="glist"></div></aside>
<section class="ctr"><div class="tb"><button class="btn sm" data-act="addt" data-v="round">+ Round table</button><button class="btn sm" data-act="addt" data-v="rect">+ Long table</button><select id="adde"><option value="">+ Add element…</option>${Object.entries(KINDS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select><button class="btn ghost sm" data-act="auto">Auto-seat</button><button class="btn ghost sm" data-act="clr">Clear seats</button><button class="btn ghost sm" data-act="zo">−</button><button class="btn ghost sm" data-act="zf">Fit</button><button class="btn ghost sm" data-act="zi">+</button><button class="btn ghost sm" data-act="print">Print</button><span id="hint" hidden></span></div>
<div id="stage"><div id="fw"><div id="floor"></div></div></div></section><aside class="insp" id="insp"></aside></div><div id="plist"></div>`
  $('#gq').oninput = e => { S.gq = e.target.value; glist() }
  $('#un').onchange = e => { S.un = e.target.checked; glist() }
  $('#adde').onchange = e => { addItem(e.target.value); e.target.value = '' }
  const fl = $('#floor')
  fl.onpointerdown = down
  fl.ondragover = e => e.preventDefault()
  fl.ondrop = e => { e.preventDefault(); const g = e.dataTransfer.getData('text/plain'), el = e.target.closest('.tbl'), s = e.target.closest('.seat'); if (g && pgood(g) && el) seatPick(g, el.dataset.id, s ? +s.dataset.i : undefined) }
  glist(); floor(); insp(); plist()
}
const pgood = p => p.includes(':') ? !!guest(key2(p)[0]) : !!guest(p)
const pname = p => p.includes(':') ? who(p) : guest(p)?.name || ''
const isExp = g => g.guests > 1 && (S.exp[g.id] ?? g.type !== 'guest')
const seatedAt = k => { for (const t of S.plan.tables) if (seatsOf(t.id).includes(k)) return t.name; return '' }
const memName = (g, k) => k ? cname(g, k) || g.name + ' +' + k : g.name
function members(g) {
  return Array.from({ length: g.guests }, (_, k) => {
    const key = g.id + ':' + k, at = seatedAt(key), c = k ? g.comps?.[k - 1] : null
    return `<div class="mem${S.pick === key ? ' pick' : ''}${at ? ' done' : ''}" draggable="true" data-act="pick" data-id="${key}" style="--c:hsl(${hue(g.id)} 55% 62%)"><i class="dot"></i><span>${esc(S.plan.names[key] || memName(g, k))}</span>${c ? `<small>${c.seating === 'reserved' ? 'reserved' : 'free'}</small>` : '<small>host</small>'}<b>${at ? esc(at) : 'drag to seat'}</b></div>`
  }).join('')
}
function glist() {
  const q = S.gq.toLowerCase(), l = S.guests.filter(g => g.attending && (!q || g.name.toLowerCase().includes(q) || (g.comps || []).some(c => (c.name || '').toLowerCase().includes(q)))).map(g => ({ g, m: missing(g.id).length })).filter(x => !S.un || x.m).sort((a, b) => (!a.m) - (!b.m) || a.g.name.localeCompare(b.g.name))
  $('#glist').innerHTML = l.map(({ g, m }) => `<div class="gw"><div class="chip${S.pick === g.id ? ' pick' : ''}${m ? '' : ' done'}" draggable="true" data-act="pick" data-id="${g.id}" style="--c:hsl(${hue(g.id)} 55% 62%)">${g.guests > 1 ? `<button class="tg" data-act="exp" data-id="${g.id}" title="Show / seat individually">${isExp(g) ? '▾' : '▸'}</button>` : ''}<i class="dot"></i><span>${esc(g.name)}</span><em>×${g.guests}</em><b>${m ? m + ' to seat' : '✓'}</b></div>${isExp(g) ? `<div class="mems">${members(g)}</div>` : ''}</div>`).join('') || '<div class="tip">Nobody to show.</div>'
  const h = $('#hint'); if (h) { h.hidden = !S.pick || !pgood(S.pick); if (!h.hidden) h.innerHTML = `Seating ${esc(pname(S.pick))} – click a table or a seat <button class="btn sm" data-act="pick" data-id="${S.pick}">Cancel</button>` }
}
function floor() {
  const p = S.plan, s = sc(), fw = $('#fw'), fl = $('#floor')
  fw.style.cssText = `width:${p.w * s}px;height:${p.h * s}px`; fl.style.cssText = `width:${p.w}px;height:${p.h}px;transform:scale(${s})`
  fl.innerHTML = p.items.map(i => `<div class="itm k-${i.kind}" data-id="${i.id}" style="left:${i.x}px;top:${i.y}px;width:${i.w}px;height:${i.h}px;${S.sel === i.id ? 'outline:3px solid #B98A3E;' : ''}">${esc(i.label)}</div>`).join('') +
    p.tables.map(t => {
      const g = geo(t), a = seatsOf(t.id), n = a.filter(Boolean).length
      return `<div class="tbl${S.sel === t.id ? ' sel' : ''}" data-id="${t.id}" style="left:${t.x}px;top:${t.y}px;width:${g.w}px;height:${g.h}px"><div class="body ${t.shape}" style="left:${g.b.x}px;top:${g.b.y}px;width:${g.b.w}px;height:${g.b.h}px"><b>${esc(t.name)}</b><small>${n}/${t.seats}</small></div>${g.p.map(([x, y], i) => { const k = a[i]; return `<i class="seat${k ? ' on' : ''}" data-i="${i}" data-t="${t.id}" style="left:${x}px;top:${y}px${k ? ';--c:hsl(' + hue(key2(k)[0]) + ' 55% 62%)' : ''}" title="${esc(k ? who(k) : 'Seat ' + (i + 1))}">${k ? esc(lab(k)) : ''}</i>` }).join('')}</div>`
    }).join('')
}
function insp() {
  const el = $('#insp'), o = S.sel && obj(S.sel), p = S.plan
  if (!o) { el.innerHTML = `<h3>Room</h3><label>Width (px)<input type="number" data-room="w" value="${p.w}" min="600" max="3000" step="50"></label><label>Height (px)<input type="number" data-room="h" value="${p.h}" min="400" max="2400" step="50"></label><p class="tip">Drag a guest onto a table to seat their whole party, or expand a sponsor (▸) and drag each companion to any table or seat. Drag a seated dot onto another seat to move or swap, or back onto the guest list to unseat. Drag tables to arrange them. Don’t forget to save.</p>`; return }
  if (tbl(o.id)) {
    const a = seatsOf(o.id)
    el.innerHTML = `<h3>Table</h3><label>Name<input data-p="name" value="${esc(o.name)}"></label><label>Shape<select data-p="shape"><option value="round"${o.shape === 'round' ? ' selected' : ''}>Round</option><option value="rect"${o.shape === 'rect' ? ' selected' : ''}>Long</option></select></label><label>Seats<input type="number" data-p="seats" min="1" max="24" value="${o.seats}"></label><div class="row">${o.shape === 'rect' ? '<button class="btn ghost sm" data-act="rot">Rotate</button>' : ''}<button class="btn ghost sm" data-act="dup">Duplicate</button><button class="btn danger sm" data-act="delsel">Delete</button></div><h4>Seated (${a.filter(Boolean).length}/${o.seats})</h4><ol class="occ">${a.map((v, i) => `<li><span>${i + 1}</span>${v ? `<input data-sn="${v}" value="${esc(who(v))}"><button data-act="unseat" data-t="${o.id}" data-i="${i}" title="Unseat">×</button>` : '<em>Empty</em>'}</li>`).join('')}</ol>`
  } else el.innerHTML = `<h3>Element</h3><label>Label<input data-p="label" value="${esc(o.label)}"></label><label>Width<input type="number" data-p="w" min="20" max="1400" step="10" value="${o.w}"></label><label>Height<input type="number" data-p="h" min="20" max="1400" step="10" value="${o.h}"></label><div class="row"><button class="btn ghost sm" data-act="dup">Duplicate</button><button class="btn danger sm" data-act="delsel">Delete</button></div>`
}
function plist() {
  const un = S.guests.filter(g => g.attending).flatMap(g => missing(g.id).map(k => k ? cname(g, k) || g.name + ' +' + k : g.name))
  $('#plist').innerHTML = S.plan.tables.map(t => `<section><h4>${esc(t.name)}</h4><ol>${seatsOf(t.id).filter(Boolean).map(k => `<li>${esc(who(k))}</li>`).join('')}</ol></section>`).join('') + (un.length ? `<section class="un"><h4>Unseated</h4>${esc(un.join(', '))}</section>` : '')
}
const refresh = () => { glist(); floor(); insp(); plist() }
const select = id => { S.sel = id; floor(); insp() }

function seatParty(gid, tid, at, quiet, only) {
  const g = guest(gid), t = tbl(tid), a = seatsOf(tid); if (!g || !t) return 0
  const need = only ? missing(gid).filter(k => only.includes(k)) : missing(gid); if (!need.length) return 0
  const free = a.map((v, i) => v ? -1 : i).filter(i => i >= 0)
  if (at != null && free.includes(at)) free.push(...free.splice(0, free.indexOf(at)))
  const n = Math.min(need.length, free.length); need.slice(0, n).forEach((k, j) => a[free[j]] = gid + ':' + k)
  if (n < need.length && !quiet) toast(`${t.name} is full – ${need.length - n} still unseated`)
  if (n) { dirty(); if (!quiet) { if (only || !missing(gid).length) S.pick = null; refresh() } }
  return n
}
// a pick is either a party id ("gid") or one person ("gid:k")
function seatPick(p, tid, at) { if (p.includes(':')) { const [g, k] = key2(p); return seatParty(g, tid, at, 0, [k]) } return seatParty(p, tid, at) }
function autoSeat() {
  S.guests.filter(g => g.attending).sort((a, b) => b.guests - a.guests).forEach(g => {
    for (let need = missing(g.id).length; need > 0;) {
      const fr = t => seatsOf(t.id).filter(v => !v).length, ts = [...S.plan.tables].filter(t => fr(t)).sort((a, b) => fr(a) - fr(b)), t = ts.find(t => fr(t) >= need) || ts[ts.length - 1]
      if (!t) break; const n = seatParty(g.id, t.id, undefined, 1); if (!n) break; need -= n
    }
  })
  S.pick = null; refresh(); toast('Guests seated – adjust anything you like')
}
function addTable(shape) {
  const n = Math.max(0, ...S.plan.tables.map(t => +(/\d+$/.exec(t.name) || [0])[0])) + 1, k = S.plan.tables.length
  const t = { id: 't' + uid(), name: 'Table ' + n, shape, seats: shape === 'round' ? 8 : 10, rot: 0, x: 60 + (k * 40) % 320, y: 140 + (k * 40) % 240 }
  S.plan.tables.push(t); S.sel = t.id; dirty(); refresh()
}
function addItem(kind) { if (!kind) return; const [label, w, h] = KINDS[kind], i = { id: 'i' + uid(), kind, label, x: 200, y: 200, w, h }; S.plan.items.push(i); S.sel = i.id; dirty(); refresh() }

// pointer interactions on the floor
function down(e) {
  const el = e.target.closest('.tbl,.itm'), seat = e.target.closest('.seat'); if (!el) { if (S.sel) select(null); return }
  const id = el.dataset.id, o = obj(id)
  if (seat?.classList.contains('on') && !S.pick) return seatDrag(e, seat)
  const sx = e.clientX, sy = e.clientY, x0 = o.x, y0 = o.y; let mv = 0
  const m = ev => {
    const dx = (ev.clientX - sx) / sc(), dy = (ev.clientY - sy) / sc(); if (!mv && Math.hypot(dx, dy) * sc() < 4) return; mv = 1
    o.x = Math.round(Math.min(Math.max(0, x0 + dx), S.plan.w - el.offsetWidth) / 10) * 10; o.y = Math.round(Math.min(Math.max(0, y0 + dy), S.plan.h - el.offsetHeight) / 10) * 10
    el.style.left = o.x + 'px'; el.style.top = o.y + 'px'
  }
  const u = () => { removeEventListener('pointermove', m); removeEventListener('pointerup', u); if (mv) { dirty(); if (S.sel !== id) select(id) } else if (S.pick && pgood(S.pick) && tbl(id)) seatPick(S.pick, id, seat ? +seat.dataset.i : undefined); else select(id) }
  addEventListener('pointermove', m); addEventListener('pointerup', u)
}
function seatDrag(e, seat) {
  const t = seat.dataset.t, i = +seat.dataset.i; let gh = null
  const m = ev => { if (!gh) { if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 5) return; gh = seat.cloneNode(true); gh.classList.add('ghost'); document.body.append(gh) } gh.style.left = ev.clientX - 13 + 'px'; gh.style.top = ev.clientY - 13 + 'px' }
  const u = ev => {
    removeEventListener('pointermove', m); removeEventListener('pointerup', u)
    if (!gh) return select(t)
    gh.remove(); const at = document.elementFromPoint(ev.clientX, ev.clientY), d = at?.closest('.seat')
    if (!d && at?.closest('.gl')) { seatsOf(t)[i] = null; dirty(); refresh() }
    else if (d) { const A = seatsOf(t), B = seatsOf(d.dataset.t), j = +d.dataset.i;[A[i], B[j]] = [B[j], A[i]]; dirty(); refresh() }
  }
  addEventListener('pointermove', m); addEventListener('pointerup', u)
}

// ---------- events ----------
const acts = {
  tab: b => { S.tab = b.dataset.v; render() },
  save: async () => { if (S.tab === 'ent') return saveEnt(); try { await db.savePlan(S.plan); S.dirty = false; S.saved = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); status(); toast('Layout saved') } catch (e) { toast('Save failed: ' + e.message) } },
  out: async () => { await sb?.auth.signOut(); location.reload() },
  new: () => openDlg(), edit: b => openDlg(b.dataset.id), dclose: () => $('#dlg').close(), csv,
  del: async b => { const g = guest(b.dataset.id); if (!confirm('Delete the reply from ' + g.name + '?')) return; try { await delGuest(g.id); if (clean()) dirty(); render() } catch (e) { toast(e.message) } },
  pick: b => { S.pick = S.pick === b.dataset.id ? null : b.dataset.id; glist() },
  exp: b => { const g = guest(b.dataset.id); S.exp[g.id] = !isExp(g); glist() },
  addt: b => addTable(b.dataset.v), auto: autoSeat,
  clr: () => { if (confirm('Remove everyone from their seats?')) { S.plan.seats = {}; dirty(); refresh() } },
  zi: () => { S.zoom = Math.min(2, +(sc() + .1).toFixed(2)); floor() }, zo: () => { S.zoom = Math.max(.2, +(sc() - .1).toFixed(2)); floor() }, zf: () => { S.zoom = 0; floor() },
  print: () => { plist(); print() },
  gadd: () => { S.ent.push({ id: uid(), part: 'secondary', title: '', items: [''] }); edirty(); viewEnt(); document.querySelector('.eg:last-of-type [data-eg=title]')?.focus() },
  gdel: b => { const g = eg(b); if (!confirm('Delete the group “' + (g.title || PARTS[g.part]) + '” and all its names?')) return; S.ent.splice(S.ent.indexOf(g), 1); edirty(); viewEnt() },
  gup: b => { move(S.ent, S.ent.indexOf(eg(b)), -1) && (edirty(), viewEnt()) }, gdn: b => { move(S.ent, S.ent.indexOf(eg(b)), 1) && (edirty(), viewEnt()) },
  iadd: b => { const g = eg(b); g.items.push(''); edirty(); viewEnt(); const l = document.querySelectorAll('.eg')[S.ent.indexOf(g)]; l?.querySelector('li:last-child input')?.focus() },
  idel: b => { eg(b).items.splice(ei(b), 1); edirty(); viewEnt() },
  iup: b => { move(eg(b).items, ei(b), -1) && (edirty(), viewEnt()) }, idn: b => { move(eg(b).items, ei(b), 1) && (edirty(), viewEnt()) },
  rot: () => { const t = tbl(S.sel); t.rot = t.rot ? 0 : 1; dirty(); refresh() },
  unseat: b => { seatsOf(b.dataset.t)[+b.dataset.i] = null; dirty(); refresh() },
  dup: () => { const o = obj(S.sel), c = { ...JSON.parse(JSON.stringify(o)), id: (tbl(o.id) ? 't' : 'i') + uid(), x: o.x + 30, y: o.y + 30 }; if (tbl(o.id)) { c.name = o.name + ' copy'; S.plan.tables.push(c) } else S.plan.items.push(c); S.sel = c.id; dirty(); refresh() },
  delsel: () => { const o = obj(S.sel); if (!o) return; if (tbl(o.id)) { if (seatsOf(o.id).some(Boolean) && !confirm('Seated guests at this table will become unseated. Delete it?')) return; S.plan.tables = S.plan.tables.filter(t => t.id !== o.id); delete S.plan.seats[o.id] } else S.plan.items = S.plan.items.filter(i => i.id !== o.id); S.sel = null; dirty(); refresh() }
}
app.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) acts[b.dataset.act]?.(b) })
app.addEventListener('dragstart', e => { const c = e.target.closest('.mem,.chip'); if (c) { e.dataTransfer.setData('text/plain', c.dataset.id); e.dataTransfer.effectAllowed = 'move' } })
app.addEventListener('input', e => {
  const el = e.target, d = el.dataset; if (!el.closest('.ent')) return
  if (d.ei !== undefined) eg(el).items[ei(el)] = el.value
  else if (d.eg === 'title') eg(el).title = el.value
  else return
  edirty()
})
app.addEventListener('change', e => {
  const el = e.target, d = el.dataset
  if (d.eg === 'part') { eg(el).part = el.value; edirty(); return }
  if (d.room) { S.plan[d.room] = Math.min(3000, Math.max(400, +el.value || 900)); dirty(); floor() }
  else if (d.sn) { const dflt = (g => key2(d.sn)[1] ? cname(g, key2(d.sn)[1]) || g.name + ' +' + key2(d.sn)[1] : g.name)(guest(key2(d.sn)[0])), v = el.value.trim(); v && v !== dflt ? S.plan.names[d.sn] = v : delete S.plan.names[d.sn]; dirty(); refresh() }
  else if (d.p && S.sel) { const o = obj(S.sel); let v = el.value; if (el.type === 'number') v = Math.max(+el.min, Math.min(+el.max, Math.round(+v) || +el.min)); o[d.p] = v; dirty(); refresh() }
})
addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); (S.tab === 'plan' || S.tab === 'ent') && acts.save() }
  else if (e.key === 'Escape') { S.pick = null; S.tab === 'plan' && glist() }
  else if ((e.key === 'Delete' || e.key === 'Backspace') && S.tab === 'plan' && S.sel && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) acts.delsel()
})
addEventListener('resize', () => S.tab === 'plan' && $('#floor') && floor())
addEventListener('beforeunload', e => { if (S.dirty || S.edirty) { e.preventDefault(); e.returnValue = '' } })

// ---------- boot ----------
;(async () => {
  if (!cloud) return init()
  const { createClient } = await import('@supabase/supabase-js')
  sb = createClient(SU, SK)
  const { data } = await sb.auth.getSession(); data.session ? init() : login()
})()
