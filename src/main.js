import Lenis from 'lenis'
import gsap from 'gsap'
import { initEnvelope } from './envelope.js'
import { saveRsvp } from './rsvp.js'
import { initGuestType } from './guesttype.js'
import { initAttire } from './attire.js'
import { initEntourage } from './entourage.js'
import { initGallery } from './gallery.js'
import { initFx } from './fx.js'
import { WEDDING_DATE, GIFT } from './config.js'
import musicUrl from './assets/music.mp3'
const $ = id => document.getElementById(id)

// Smooth scrolling (locked until the invitation is opened)
const lenis = new Lenis({ lerp: .085 }); lenis.stop()
gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0)
// Position a panel would have if nothing were stuck (sticky panels report their pinned position)
const flowTop = el => { let y = 0; for (let s = el.previousElementSibling; s; s = s.previousElementSibling) { const cs = getComputedStyle(s); if (cs.position === 'fixed' || cs.position === 'absolute' || cs.display === 'none') continue; y += s.offsetHeight } return y }
document.querySelectorAll('nav a').forEach(a => a.addEventListener('click', e => {
  e.preventDefault(); let h = document.querySelector(a.getAttribute('href')); if (!h) return
  while (h.parentElement && h.parentElement !== document.body) h = h.parentElement
  lenis.scrollTo(flowTop(h), { duration: 1.6 })
}))

// Background music: starts only when the envelope is opened (invitation page only; the admin page never loads this)
const audio = new Audio(musicUrl); audio.loop = true; audio.preload = 'auto'; audio.volume = 0; let playing = false
const MUSIC_VOL = .5
const fadeTo = v => gsap.to(audio, { volume: v, duration: 2.5, ease: 'power1.inOut', overwrite: true })
const startMusic = () => audio.play().then(() => { playing = true; fadeTo(MUSIC_VOL); $('music').classList.remove('off') }).catch(() => { playing = false; $('music').classList.add('off') })
$('music').addEventListener('click', () => {
  if (playing) { playing = false; audio.pause(); $('music').classList.add('off') }
  else startMusic()
})

initEnvelope({
  onOpen: () => { $('music').hidden = false; startMusic() },
  onReveal: () => { document.body.classList.add('show'); lenis.start(); scrollTo(0, 0) }
});

// Split names into letters (grouped by word so the title wraps cleanly on small screens)
;(function(){const el=$('names'),t=el.textContent;el.textContent='';let i=0;
t.split(' ').forEach((word,wi,arr)=>{const w=document.createElement('span');w.className='w';
[...word].forEach(c=>{const s=document.createElement('span');s.className='ch';s.textContent=c;s.style.setProperty('--i',i++);w.appendChild(s)});
el.appendChild(w);if(wi<arr.length-1){el.appendChild(document.createTextNode(' '));i++}})})();

// Scroll progress (transform only: no layout work while scrolling)
;(function(){const bar=$('bar');let tick=0;
const upd=()=>{tick=0;const m=document.documentElement.scrollHeight-innerHeight;bar.style.transform='scaleX('+(m>0?Math.min(1,scrollY/m):0)+')'};
addEventListener('scroll',()=>{if(!tick)tick=requestAnimationFrame(upd)},{passive:true});upd()})();

// Countdown
(function(){
  if(!WEDDING_DATE)return;
  const t=new Date(WEDDING_DATE).getTime();if(isNaN(t))return;
  $('cd').hidden=false;$('cdmsg').textContent='Until we say “I do”.';
  const pad=n=>String(n).padStart(2,'0');
  function tick(){
    let s=Math.max(0,Math.floor((t-Date.now())/1000));
    $('d').textContent=Math.floor(s/86400);$('h').textContent=pad(Math.floor(s%86400/3600));
    $('m').textContent=pad(Math.floor(s%3600/60));$('s').textContent=pad(s%60);
    if(s===0)$('cdmsg').textContent='Today is the day.';
  }
  tick();setInterval(tick,1000);
})();

// Gallery + map
initGallery(lenis)
{const m=$('map');m.addEventListener('click',()=>m.classList.add('on'));m.addEventListener('mouseleave',()=>m.classList.remove('on'))}

// Gift details
{const p=$('pay');GIFT.forEach(g=>{const d=document.createElement('div');d.innerHTML=`<b>${g.label}</b><span>${g.name}</span><em>${g.number}</em><button class="btn">Copy</button>`;d.querySelector('button').onclick=async e=>{try{await navigator.clipboard.writeText(g.number.replace(/\s/g,''))}catch(_){}e.target.textContent='Copied'};p.append(d)});if(!GIFT.length)p.remove()}

initFx()

// Stacked "curtain" sections: each panel stays pinned while the next one slides over it
;(function () {
  const panels = [...document.querySelectorAll('body>.hero,body>.panel,body>.band,body>.dark')]
  const foot = document.querySelector('footer')
  panels.forEach((p, i) => { p.classList.add('stack'); p.style.setProperty('--z', i + 1); const s = document.createElement('i'); s.className = 'shade'; s.setAttribute('aria-hidden', 'true'); p.append(s); p._s = s })
  if (foot) { foot.classList.add('over'); foot.style.setProperty('--z', panels.length + 1) }
  // A tall panel pins once its bottom edge reaches the bottom of the screen, so all of it can be read first
  const size = () => panels.forEach(p => { p.style.top = Math.min(0, innerHeight - p.offsetHeight) + 'px' })
  size(); addEventListener('resize', size)
  if (window.ResizeObserver) { const ro = new ResizeObserver(size); panels.forEach(p => ro.observe(p)) }
  // Darken a panel as the next one covers it. Runs only while scrolling, and only for panels near the screen.
  const nxt = panels.map((_, i) => panels[i + 1] || foot)
  let queued = 0
  const shade = () => {
    queued = 0
    panels.forEach((p, i) => {
      const n = nxt[i]; if (!n) return
      const t = n.getBoundingClientRect().top
      const c = t >= innerHeight ? 0 : t <= 0 ? 1 : 1 - t / innerHeight
      const v = (c * .45).toFixed(2)
      if (p._v !== v) { p._v = v; p._s.style.opacity = v }
    })
  }
  addEventListener('scroll', () => { if (!queued) queued = requestAnimationFrame(shade) }, { passive: true })
  addEventListener('resize', shade); shade()
})()

// Scroll reveal
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:0,rootMargin:'0px 0px -12% 0px'});
document.querySelectorAll('.rv').forEach(el=>{[...el.children].forEach((c,i)=>c.style.setProperty('--i',i));el.querySelectorAll('.sw figure,.cd div,.two>div,.rsvp>*,.poem span,.pay>div').forEach((c,i)=>c.style.setProperty('--j',i));io.observe(el)});


initAttire(lenis)
initEntourage()

// Coming back from the gift page: skip the envelope and land on the gift section (RSVP is right below)
try {
  if (sessionStorage.getItem('jl-skip-intro')) {
    sessionStorage.removeItem('jl-skip-intro')
    $('intro').remove(); document.body.classList.add('show'); lenis.start()
    setTimeout(() => document.querySelector('nav a[href="#gift"]')?.click(), 200)
  }
} catch (e) {}

// RSVP
const gt = initGuestType()
$('rsend').addEventListener('click', async () => {
  const name = $('rn').value.trim()
  if (!name) { $('err').textContent = 'Please enter your full name.'; $('rn').focus(); return }
  const bad = gt.validate(); if (bad) { $('err').textContent = bad; return }
  const v = gt.value()
  const r = { name, answer: $('ra').value, guest_type: v.guest_type, companions: v.companions, guests: 1 + v.companions.length, message: $('rm').value.trim() }
  const b = $('rsend'); b.disabled = true; b.textContent = 'Sending…'; $('err').textContent = ''
  try { await saveRsvp(r) } catch (e) { b.disabled = false; b.textContent = 'Send reply'; $('err').textContent = 'We could not send your reply. Please try again.'; return }
  $('rform').style.display = 'none'; $('thanks').style.display = 'block'
  $('tmsg').textContent = r.answer === 'Joyfully accepts' ? name + ', we can’t wait to celebrate with you.' : name + ', you will be missed. Thank you for letting us know.'
  $('tseat').textContent = gt.thanks()
})
