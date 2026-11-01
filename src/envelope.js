import gsap from 'gsap'
const q = s => document.querySelector(s)

export function initEnvelope({ onOpen, onReveal }) {
  const intro = q('#intro'), stage = q('#stage'), scene = q('#scene'), env = q('#env'), scroll = q('#scroll'), sheet = q('#sheet'), sin = q('#sin'),
    tie = q('.tie'), flapw = q('#flapw'), flap = q('#flap'), seal = q('#seal'), L = q('.half.l'), R = q('.half.r'),
    fF = q('.face.f'), fB = q('.face.b'), shadow = q('.eshadow'), pieces = ['#pBack', '#flapw', '#pFront'].map(q)
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  let opened = false, tiltOn = true

  // Arrival
  gsap.set(flap, { transformPerspective: 1300 })
  gsap.from('.pre', { y: 30, opacity: 0, duration: 1.8, ease: 'power3.out', delay: .2 })
  gsap.from('#env', { y: 90, rotationX: -22, opacity: 0, duration: 2.2, ease: 'power3.out', delay: .5 })
  gsap.from('.hint', { opacity: 0, duration: 1.2, delay: 2 })
  const idle = gsap.to(scene, { y: -5, duration: 3.2, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 2.6 })

  // Light pointer tilt, like holding the envelope
  const tx = gsap.quickTo(scene, 'rotationY', { duration: 1.2, ease: 'power3.out' })
  const ty = gsap.quickTo(scene, 'rotationX', { duration: 1.2, ease: 'power3.out' })
  addEventListener('pointermove', e => { if (!tiltOn) return; tx((e.clientX / innerWidth - .5) * 8); ty(-(e.clientY / innerHeight - .5) * 5) })

  function open() {
    if (opened) return; opened = true; tiltOn = false; idle.kill(); onOpen && onOpen()
    seal.classList.add('opened'); q('.hint').style.animation = 'none'; env.classList.add('open')

    // Geometry: the scroll lies in the envelope pocket; it rises, settles at the centre, then unrolls downward.
    const envH = env.offsetHeight
    const H = Math.round(Math.min(Math.max(innerHeight * .56, 340), 520))   // unrolled sheet height
    const yRise = -envH * .36, yMid = envH * .12                              // rolled centre sits at 38% of the envelope
    sin.style.height = H + 'px'
    const p = { h: 0 }
    gsap.set(scroll, { y: 0 })

    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } })
    tl.to('.hint', { opacity: 0, duration: .4 }, 0)
      .to(scene, { rotationX: 0, rotationY: 0, y: 0, duration: .8, ease: 'power3.out' }, 0)
      // wax seal cracks in two
      .to(L, { x: -30, y: 90, rotation: -26, opacity: 0, duration: 1.2, ease: 'power2.in' }, .4)
      .to(R, { x: 30, y: 110, rotation: 30, opacity: 0, duration: 1.2, ease: 'power2.in' }, .4)
      .to(seal, { opacity: 0, duration: .5, ease: 'none' }, 1.1)
      // flap swings open
      .to(flap, {
        rotationX: 180, duration: 1.9, ease: 'power2.inOut', onUpdate() {
          const k = this.progress()
          gsap.set(flapw, { zIndex: k > .5 ? 2 : 5 })
          fF.style.filter = `brightness(${1 - k * .4})`
          fB.style.filter = `brightness(${.72 + k * .33})`
        }
      }, .55)
      .to(scene, { rotationX: 8, duration: 1, ease: 'sine.inOut' }, .6)
      .to(scene, { rotationX: 0, duration: 1.4, ease: 'power2.out' }, 1.6)
      // the rolled scroll slides up out of the envelope
      .to(scroll, { y: yRise, duration: 2, ease: 'power3.inOut' }, 2)
      .to(shadow, { opacity: 0, duration: 1.2 }, 3.6)
      .to('.pre', { opacity: 0, y: -18, duration: 1.1, ease: 'power2.out' }, 3.4)
      // the envelope drops away and the scroll glides to the centre of the screen
      .to(pieces, { y: '75vh', rotationX: 28, opacity: 0, duration: 1.8, ease: 'power2.in', stagger: .06 }, 3.8)
      .to(scroll, { y: yMid, duration: 1.8, ease: 'power3.inOut' }, 3.8)
      // untie the ribbon
      .to(tie, { scaleY: 0, scaleX: 1.6, opacity: 0, duration: .8, ease: 'power2.in' }, 5.7)
      // unroll: the lower rod travels down, revealing the invitation as it goes
      .to(p, {
        h: H, duration: 2.8, ease: 'power2.inOut', onUpdate() {
          sheet.style.height = p.h + 'px'
          gsap.set(scroll, { y: yMid - p.h / 2 })
        }
      }, 6.3)
      .from('.sin > *', { opacity: 0, y: 10, duration: 1, ease: 'power2.out', stagger: .16 }, 7.3)
      // the page opens: we move through the scroll into the invitation
      .add(() => onReveal && onReveal(), 10.4)
      .set(scroll, { transformOrigin: '50% 50%' }, 10.3)
      .to(scroll, { scale: 2.4, duration: 1.9, ease: 'power2.in' }, 10.4)
      .to(scroll, { opacity: 0, duration: .9, ease: 'power1.inOut' }, 10.8)
      .to(intro, { opacity: 0, duration: 1.3, ease: 'power1.inOut' }, 10.9)
      .add(() => intro.remove(), 12.4)
    if (reduce) tl.timeScale(4)
  }
  seal.addEventListener('click', open)
}
