// Attire guide: tabs (Guest / Principal / Secondary) + tap-to-enlarge sample images.
export function initAttire(lenis) {
  const tabs = [...document.querySelectorAll('.at-tabs [role=tab]')]
  const show = t => {
    tabs.forEach(b => { const on = b === t; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; document.getElementById(b.getAttribute('aria-controls')).hidden = !on })
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t))
    t.addEventListener('keydown', e => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!k) return
      const n = tabs[(i + k + tabs.length) % tabs.length]; show(n); n.focus(); e.preventDefault()
    })
  })

  const z = document.createElement('div'); z.id = 'az'; z.hidden = true
  z.innerHTML = '<button aria-label="Close">×</button><img alt="">'
  document.body.append(z)
  const im = z.querySelector('img')
  const close = () => { z.hidden = true; lenis?.start() }
  document.querySelectorAll('.at-img').forEach(f => f.addEventListener('click', () => { const i = f.querySelector('img'); im.src = i.src; im.alt = i.alt; z.hidden = false; lenis?.stop() }))
  z.addEventListener('click', close)
  addEventListener('keydown', e => { if (!z.hidden && e.key === 'Escape') close() })
}
