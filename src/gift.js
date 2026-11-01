// Returning to the invitation: skip the envelope intro and land on the Gift / RSVP area.
document.querySelectorAll('[data-back]').forEach(a => a.addEventListener('click', () => {
  try { sessionStorage.setItem('jl-skip-intro', '1') } catch (e) {}
}))
