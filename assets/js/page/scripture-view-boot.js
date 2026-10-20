/* THE SCRIPTURE PAGE'S VIEW: DARK OR LIGHT, AND HOW THE WIDTH IS SPLIT (2026-10-19, owner: "Dark Mode" and "5 Configuration buttons").

   This file is linked in the <head>, before anything paints, because the site's CSP has no 'unsafe-inline' and an inline script
   cannot do this job. It sets two attributes on <html> and nothing else:
     data-sd-theme  "dark" or "light"
     data-sd-view   "50-50" | "40-60" | "60-40" | "scripture" | "panel"   (the Scripture page only; the Verse Desk has no columns)

   THEME. This page's own choice is fr_sd_theme ("dark" | "light"), written only by the button here. Without it the reader's
   fr_theme ("light" | "dark" | "sepia") is READ, never written (a toggle here must not turn a stored sepia into light); sepia is a
   light ground. With neither the page follows the system (prefers-color-scheme).
   It is NOT html[data-theme]: faith-site-theme.js forces that attribute to "light" on every Faith Received page except the reader
   (a MutationObserver puts it back), so the attribute the reader and the article pages use cannot carry the choice here.

   VIEW. fr_sd_layout. A value saved by the first version (25-75, 75-25) reads as 40-60 and 60-40 (MIGRATED), so no saved choice is a
   broken state. All five are offered from 900px up.

   Pure functions are exported for scripts/check-scripture-view.mjs; scripture-view.js (deferred) wires the buttons. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.SDView = api; api.boot(root); }
}(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const READER_THEME_KEY = 'fr_theme';
  const THEME_KEY = 'fr_sd_theme';
  const LAYOUT_KEY = 'fr_sd_layout';
  const LAYOUTS = ['50-50', '40-60', '60-40', 'scripture', 'panel'];
  const MIGRATED = { '25-75': '40-60', '75-25': '60-40' };

  const parseLayout = (v) => (LAYOUTS.includes(v) ? v : (Object.prototype.hasOwnProperty.call(MIGRATED, v) ? MIGRATED[v] : '50-50'));
  // own: this page's choice (fr_sd_theme), which wins; reader: the reader's fr_theme, read and never written here
  const resolveTheme = (stored, systemDark, own) => {
    if (own === 'dark' || own === 'light') return own;
    if (stored === 'dark') return 'dark';
    if (stored === 'light' || stored === 'sepia') return 'light';
    return systemDark ? 'dark' : 'light';
  };
  const get = (key) => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const set = (key, value) => { try { localStorage.setItem(key, value); } catch (_) { /* private window or blocked storage: the choice lasts for this page view */ } };
  const systemDark = (win) => !!(win.matchMedia && win.matchMedia('(prefers-color-scheme: dark)').matches);

  function boot(win) {
    const html = win.document.documentElement;
    html.setAttribute('data-sd-theme', resolveTheme(get(READER_THEME_KEY), systemDark(win), get(THEME_KEY)));
    html.setAttribute('data-sd-view', parseLayout(get(LAYOUT_KEY)));
  }

  return { READER_THEME_KEY, THEME_KEY, LAYOUT_KEY, LAYOUTS, parseLayout, resolveTheme, get, set, systemDark, boot };
}));
