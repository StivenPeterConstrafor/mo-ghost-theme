/*
 * A retired room forwards to the whole library (owner, 2026-09-23: "take out the whole latin library vs english
 * things"). /the-faith-received/latin-library/ was a room for "The Latin Library", the name of a pipeline rather than a
 * collection a reader should meet. Old links keep working: the reader lands on the whole library with their own
 * filters (?q=, ?letter=, ?century=, ?tradition=) carried over. External file, because the theme's CSP forbids
 * inline scripts; the page's <noscript> refresh covers a browser without JavaScript.
 */
(function () {
  "use strict";
  const q = new URLSearchParams(window.location.search);
  q.delete("collection");
  q.delete("in");
  const to = new URL("/the-faith-received/all-works/", window.location.origin);
  to.search = `collection=all${q.toString() ? `&${q.toString()}` : ""}`;
  // A path this file writes itself, built against location.origin; only the reader's own search and hash come from the
  // current URL, so no scheme can be smuggled through (the faith-reader.js pattern; MOSafeRedirect wants an absolute
  // https URL on an allowlist and would refuse a same-site path on localhost).
  // eslint-disable-next-line no-restricted-syntax
  window.location.replace(to.pathname + to.search + window.location.hash);
})();
