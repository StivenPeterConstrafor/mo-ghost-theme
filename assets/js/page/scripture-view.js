/* THE SCRIPTURE PAGE'S VIEW BAR (2026-10-19): the Dark mode button, and on the reader the five layout buttons.

   scripture-view-boot.js (in the head) has already put data-sd-theme and data-sd-view on <html>; this file keeps the buttons in step
   with them, writes a choice to localStorage (fr_sd_theme, fr_sd_layout) and tells the reader when the panel is hidden under a verse.

   The CSS does the layout (scripture-dev.css, "Layout modes"). Nothing here touches the reader's or the commentary pane's code: a verse
   chosen in Scripture Only still opens (its panel is only not shown), and in Panel Only the pane's own Close and verse rows still
   work, because the hidden text is hidden with CSS, not removed. */
(function () {
  'use strict';
  const V = window.SDView;
  const bar = document.querySelector('[data-sd-viewbar]');
  if (!V || !bar) return;
  const html = document.documentElement;

  // ── Dark mode ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  const themeBtn = bar.querySelector('[data-sd-theme-toggle]');
  const systemQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  let chosen = V.get(V.THEME_KEY) !== null;
  const apply = (t) => html.setAttribute('data-sd-theme', t);
  const theme = () => (html.getAttribute('data-sd-theme') === 'dark' ? 'dark' : 'light');
  const paintTheme = () => { if (themeBtn) themeBtn.setAttribute('aria-pressed', String(theme() === 'dark')); };
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = theme() === 'dark' ? 'light' : 'dark';
      chosen = true;
      apply(next);
      V.set(V.THEME_KEY, next);
      paintTheme();
    });
  }
  // With no choice made, the page keeps following the system setting while it is open.
  if (systemQuery && systemQuery.addEventListener) {
    systemQuery.addEventListener('change', (e) => {
      if (chosen) return;
      html.setAttribute('data-sd-theme', V.resolveTheme(null, e.matches));
      paintTheme();
    });
  }
  paintTheme();

  // ── Layout (the reader only; the Verse Desk has no columns) ────────────────────────────────────────────────────────────
  const group = bar.querySelector('[data-sd-layout-group]');
  if (!group) return;
  const opts = Array.from(group.querySelectorAll('[data-sd-layout-opt]'));
  const hint = bar.querySelector('[data-sd-view-hint]');
  const hintText = bar.querySelector('[data-sd-view-hint-text]');
  const wide = window.matchMedia('(min-width: 900px)');
  const stored = () => V.parseLayout(html.getAttribute('data-sd-view'));
  const shown = () => stored();

  function refreshHint() {
    if (!hint) return;
    const verse = document.querySelector('.sd-text .bible-verse.is-active');
    const on = !!verse && shown() === 'scripture' && wide.matches && document.body.classList.contains('cp-on');
    hint.hidden = !on;
    if (on && hintText) hintText.textContent = `Verse ${verse.dataset.v} is open. The panel is hidden.`;
  }

  function paintLayout() {
    const now = shown();
    opts.forEach((b) => {
      const on = b.dataset.sdLayoutOpt === now;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    refreshHint();
  }

  function choose(layout) {
    const next = V.parseLayout(layout);
    html.setAttribute('data-sd-view', next);
    V.set(V.LAYOUT_KEY, next);
    paintLayout();
  }

  group.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sd-layout-opt]');
    if (b) choose(b.dataset.sdLayoutOpt);
  });
  // A radio group: arrows move the choice and the focus together (Home and End jump), skipping a split that is not offered.
  group.addEventListener('keydown', (e) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: 'first', End: 'last' };
    if (!(e.key in keys)) return;
    const live = opts.filter((b) => b.offsetParent !== null);
    if (!live.length) return;
    const at = live.indexOf(document.activeElement);
    let to;
    if (keys[e.key] === 'first') to = 0;
    else if (keys[e.key] === 'last') to = live.length - 1;
    else to = (Math.max(at, 0) + keys[e.key] + live.length) % live.length;
    e.preventDefault();
    choose(live[to].dataset.sdLayoutOpt);
    live[to].focus();
  });

  const showPanel = bar.querySelector('[data-sd-show-panel]');
  if (showPanel) {
    showPanel.addEventListener('click', () => {
      choose('50-50');
      const checked = opts.find((b) => b.getAttribute('aria-checked') === 'true');
      if (checked) checked.focus();
    });
  }

  // Which verse is open changes by class on the text, and the text is redrawn for each chapter: watch it once, coalesced.
  const text = document.querySelector('[data-sd-text]');
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; refreshHint(); }); };
  if (text && window.MutationObserver) {
    new MutationObserver(later).observe(text, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  }
  // The pane adds cp-on to <body> some moments after the text is drawn; the hint is only ever wanted once it has.
  if (window.MutationObserver) new MutationObserver(later).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('sd:verse', later);
  if (wide.addEventListener) wide.addEventListener('change', paintLayout);
  paintLayout();
}());
