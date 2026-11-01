import gsap from 'gsap'
const files = import.meta.glob('./assets/gallery/*.{jpg,jpeg,png,webp,avif}', { eager: true, query: '?url', import: 'default' })
// Optional larger versions (same file name) used only by the fullscreen viewer
const fulls = import.meta.glob('./assets/gallery-full/*.{jpg,jpeg,png,webp,avif}', { eager: true, query: '?url', import: 'default' })
const base = p => p.split('/').pop().replace(/\.[^.]+$/, '')
const logo = new URL('./assets/logo.webp', import.meta.url).href

export function initGallery(lenis) {
  const g = document.getElementById('gal'), keys = Object.keys(files).sort(), srcs = keys.map(k => files[k]), real = srcs.length > 0
  const fullMap = Object.fromEntries(Object.entries(fulls).map(([k, v]) => [base(k), v]))
  const bigs = keys.map((k, i) => fullMap[base(k)] || srcs[i])
  const open = real ? lightbox(bigs, lenis) : null
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { rootMargin: '0px 0px -8% 0px' })

  // Every photo keeps its own proportions (nothing is cropped). Photos are dealt into columns,
  // each going to the currently shortest column, so the columns finish at nearly the same height.
  const items = (real ? srcs : Array(8).fill(0)).map((s, i) => {
    const f = document.createElement('figure'), w = document.createElement('div'); w.className = 'im'
    f.style.setProperty('--j', i % 3); f.ratio = real ? 1.5 : .8
    if (real) {
      const im = new Image(); im.src = s; im.alt = 'Wedding photo ' + (i + 1); im.decoding = 'async'; w.append(im); f.onclick = () => open(i)
      const done = () => { if (im.naturalWidth) f.ratio = im.naturalWidth / im.naturalHeight; place() }
      im.decode ? im.decode().then(done, done) : (im.onload = done)
    } else { f.className = 'ph'; w.innerHTML = '<div class="ph"><img src="' + logo + '" alt=""></div>' }
    f.append(w); io.observe(f); return f
  })

  let cols = 0, t
  function place(force) {
    const n = innerWidth <= 620 ? 2 : 3
    if (!force && n === cols && !place.dirty) { /* ratios may have changed */ }
    cols = n; g.textContent = ''
    const cs = Array.from({ length: n }, () => { const c = document.createElement('div'); c.className = 'col'; g.append(c); return c }), hs = Array(n).fill(0)
    items.forEach(f => { const k = hs.indexOf(Math.min(...hs)); cs[k].append(f); hs[k] += 1 / f.ratio + .03 })
  }
  place()
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if ((innerWidth <= 620 ? 2 : 3) !== cols) place() }, 150) })
}

function lightbox(srcs, lenis) {
  const lb = document.createElement('div'); lb.id = 'lb'; lb.hidden = true
  lb.innerHTML = '<button class="x" aria-label="Close">×</button><button class="p" aria-label="Previous">‹</button><img alt=""><button class="n" aria-label="Next">›</button><span class="ct"></span>'
  document.body.append(lb)
  const im = lb.querySelector('img'), ct = lb.querySelector('.ct'); let i = 0, x0 = 0
  const show = (k, d = 0) => { i = (k + srcs.length) % srcs.length; im.src = srcs[i]; ct.textContent = (i + 1) + ' / ' + srcs.length; gsap.fromTo(im, { opacity: 0, x: d * 70, scale: .94 }, { opacity: 1, x: 0, scale: 1, duration: .8, ease: 'power3.out' }) }
  const open = k => { lb.hidden = false; lenis.stop(); gsap.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: .5 }); show(k) }
  const close = () => gsap.to(lb, { opacity: 0, duration: .4, onComplete: () => { lb.hidden = true; lenis.start() } })
  lb.querySelector('.x').onclick = close; lb.querySelector('.p').onclick = () => show(i - 1, -1); lb.querySelector('.n').onclick = () => show(i + 1, 1)
  lb.onclick = e => { if (e.target === lb) close() }
  addEventListener('keydown', e => { if (lb.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(i - 1, -1); if (e.key === 'ArrowRight') show(i + 1, 1) })
  lb.addEventListener('touchstart', e => x0 = e.touches[0].clientX, { passive: true })
  lb.addEventListener('touchend', e => { const d = e.changedTouches[0].clientX - x0; if (Math.abs(d) > 50) show(i + (d < 0 ? 1 : -1), d < 0 ? 1 : -1) })
  return open
}
