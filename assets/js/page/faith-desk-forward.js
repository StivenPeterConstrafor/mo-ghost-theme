/*
 * /the-faith-received/desk/ → the Research desk's Desk tab.
 *
 * WAS INLINE, AND THEREFORE DEAD, exactly as the Compare forward was:
 * the CSP has no 'unsafe-inline' in script-src, so this never ran and
 * every reader had to click the link by hand. See
 * assets/js/page/faith-compare-forward.js for the whole story.
 *
 * ?doc= names a paper and travels as it is. The old address carried
 * nothing in its fragment, so nothing is preserved from it.
 */
(function () {
  const search = String(window.location.search || "");
  const target = `/the-faith-received/research/${search}#desk`;

  const a = document.querySelector("[data-desk-forward]");
  if (a) a.setAttribute("href", target);

  // See faith-compare-forward.js for why this is replace() and not
  // MOSafeRedirect.go().
  // eslint-disable-next-line no-restricted-syntax -- same-origin literal path, and replace() is required
  window.location.replace(target);
})();
