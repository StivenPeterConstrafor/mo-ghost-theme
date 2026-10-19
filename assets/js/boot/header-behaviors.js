/*
 * Header scroll-pin + mobile nav behaviors.
 *
 *   1. Site header is fixed-position. We measure its rendered height
 *      and add equivalent body padding-top + scroll-padding so anchor
 *      jumps land at the right offset and content doesn't slide under
 *      the header. Resize-observed so font-loading and viewport
 *      changes recompute.
 *
 *   2. Header hides on scroll-down past a small threshold. On a desktop it
 *      re-appears on any upward scroll; on a phone only after a deliberate
 *      upward run (see REVEAL_UP). Pinned at top of page.
 *
 *   3. Mobile nav: tap toggles the slide-in panel. Pressing Escape,
 *      tapping the backdrop, or following a link inside the panel
 *      closes it. Body overflow is locked while open.
 */
/*
 * Reveal-on-scroll rules, shared by the site header (window scroll, here) and
 * the reader's chrome (the #scroll element; reader-core.js reads these from
 * window.moScrollReveal). All distances are CSS pixels of scroll.
 *
 *   TOP_ZONE       within this far of the top the header is always shown.
 *   HIDE_DELTA     one scroll step down by more than this hides it (as before).
 *   JITTER_PHONE   steps smaller than this are ignored on a phone (iOS
 *                  rubber-band, finger tremor), so they cannot reset a run.
 *   REVEAL_UP_PHONE  a phone must scroll UP this far in one unbroken run before
 *                  the header returns (it used to return on the first pixel).
 *                  A step down resets the run. A desktop keeps 0: any upward
 *                  step reveals, as before.
 */
const TOP_ZONE = 80;
const HIDE_DELTA = 10;
const JITTER_PHONE = 4;
const REVEAL_UP_PHONE = 140;
const PHONE_QUERY = '(max-width: 880px)'; // the line the reader calls g-mobile
const PHONE = { revealUp: REVEAL_UP_PHONE, jitter: JITTER_PHONE };
const DESKTOP = { revealUp: 0, jitter: 0 };

/* Pure: state in, state out. state = { lastY, upRun, hidden }. */
function stepReveal(state, rawY, cfg) {
  const y = Math.max(0, rawY); // iOS overscroll reports negative offsets
  if (y < TOP_ZONE) return { lastY: y, upRun: 0, hidden: false };
  const d = y - state.lastY;
  // Ignored steps leave lastY alone, so a slow drag still adds up.
  if (d === 0 || Math.abs(d) < cfg.jitter) return state;
  if (d > 0) {
    return { lastY: y, upRun: 0, hidden: state.hidden || d > HIDE_DELTA };
  }
  const upRun = state.upRun - d;
  return { lastY: y, upRun, hidden: state.hidden && upRun < cfg.revealUp };
}

if (typeof window !== 'undefined') {
  window.moScrollReveal = { TOP_ZONE, HIDE_DELTA, JITTER: JITTER_PHONE, REVEAL_UP: REVEAL_UP_PHONE, PHONE_QUERY, stepReveal };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TOP_ZONE, HIDE_DELTA, JITTER_PHONE, REVEAL_UP_PHONE, PHONE, DESKTOP, stepReveal };
}

(function () {
  if (typeof document === 'undefined') return;
  const header = document.querySelector('.site-header');
  if (!header) return;

  const isFixed = () => getComputedStyle(header).position === 'fixed';

  function syncOffset() {
    // Only a fixed header needs paying for. /welcome/ puts the header back in
    // the flow so a full-height page needs no offset constant, and adding one
    // there reserves the header's height a SECOND time: an empty band above
    // the header, and that much less room for the survey. Clear the inline
    // styles rather than just skipping, or a page that starts fixed and goes
    // static keeps a stale offset.
    if (!isFixed()) {
      document.body.style.paddingTop = '';
      document.documentElement.style.scrollPaddingTop = '';
      return;
    }
    const h = header.getBoundingClientRect().height;
    document.body.style.paddingTop = `${h}px`;
    /* The TFR rail sits first on every TFR page and sticks under this
       header (faith-received.css). It needs the header's height to park
       at, and anything else that parks under the chrome needs the rail's
       too; both are published here, where the header is measured. */
    const root = document.documentElement;
    root.style.setProperty("--mo-mast", `${h}px`);
    const rail = document.querySelector(".tfr-rail");
    const railH = rail ? rail.getBoundingClientRect().height : 0;
    root.style.setProperty("--tfr-rail-h", `${railH}px`);
    // Anchor jumps (href="#x") should land the target at the bottom
    // edge of the fixed nav, and of the rail under it.
    root.style.scrollPaddingTop = `${h + railH}px`;
  }
  syncOffset();
  window.addEventListener('resize', syncOffset);
  if (window.ResizeObserver) {
    new ResizeObserver(syncOffset).observe(header);
  }
  // This file is loaded before {{{body}}} on purpose (see default.hbs), which
  // means the page's own markup is not in the DOM yet. A rule keyed to it —
  // body:has(.welcome-page) makes the header static — therefore cannot match
  // on the first call, so the header reads as fixed and gets an offset it
  // does not want. The ResizeObserver does not save us: fixed-to-static does
  // not change the header's height, so it never fires. Re-check once the rest
  // of the document exists.
  document.addEventListener('DOMContentLoaded', syncOffset);
  window.addEventListener('load', syncOffset);

  const phone = window.matchMedia ? window.matchMedia(PHONE_QUERY) : { matches: false };
  let st = { lastY: Math.max(0, window.pageYOffset || window.scrollY || 0), upRun: 0, hidden: false };
  let ticking = false;
  function onScroll() {
    ticking = false;
    // An in-flow header must not be transformed away: it would take its space
    // with it and drag the page up under nothing.
    if (!isFixed()) return;
    const y = window.pageYOffset || window.scrollY || 0;
    st = stepReveal(st, y, phone.matches ? PHONE : DESKTOP);
    // Only touch the class when the answer changed: no style work per event.
    if (st.hidden !== header.classList.contains('is-hidden')) {
      header.classList.toggle('is-hidden', st.hidden);
    }
  }
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
})();

(function () {
  if (typeof document === 'undefined') return;
  const toggle = document.querySelector('.nav-toggle');
  const panel = document.getElementById('mobile-nav');
  if (!toggle || !panel) return;
  const closeBtn = panel.querySelector('.mobile-nav-close');
  const backdrop = panel.querySelector('.mobile-nav-backdrop');
  const links = panel.querySelectorAll('a, [data-portal]');

  function open() {
    panel.hidden = false;
    requestAnimationFrame(() => { panel.setAttribute('data-open', 'true'); });
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    panel.removeAttribute('data-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(() => { panel.hidden = true; }, 260);
  }

  toggle.addEventListener('click', () => {
    toggle.getAttribute('aria-expanded') === 'true' ? close() : open();
  });
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') close();
  });
  links.forEach((l) => {
    l.addEventListener('click', () => { setTimeout(close, 50); });
  });
})();
