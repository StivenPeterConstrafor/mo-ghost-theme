/*
 * /the-faith-received/compare/ → the Research desk's Compare tab.
 *
 * WAS INLINE, AND THEREFORE DEAD. This ran as an inline <script> in
 * custom-faith-compare.hbs until 2026-09-22, and the site's CSP has no
 * 'unsafe-inline' in script-src, so the browser refused it on every
 * load. Every reader who followed a shared comparison landed on a page
 * telling them it had moved and had to click, and the fragment
 * transform below, which is the entire reason this route still exists,
 * never ran at all: the state was dropped on the floor.
 *
 * THE TRANSFORM. Compare kept its whole view in the fragment, and the
 * Research page keeps a mode first and the panel's state after the
 * first "&" (the grammar is at the top of assets/js/page/faith-research.js):
 *
 *   /the-faith-received/compare/                -> /research/#compare
 *   /the-faith-received/compare/#a=x,y&sel=sin  -> /research/#compare&a=x,y&sel=sin
 *
 * A fragment never reaches the server, so no 301 in routes.yaml could
 * do this. It has to be a script, which is why it has to be a file.
 *
 * location.replace, not assign: this page must not sit in the back
 * stack, or Back from the Research desk bounces the reader through here
 * and straight forward again.
 */
(function () {
  const hash = String(window.location.hash || "").replace(/^#/, "");
  const state = hash && hash !== "compare" ? `&${hash}` : "";
  const target = `/the-faith-received/research/#compare${state}`;

  // The link is corrected before the redirect fires, so a reader whose
  // navigation is blocked or slow still has the right one under the
  // cursor.
  const a = document.querySelector("[data-cmp-forward]");
  if (a) a.setAttribute("href", target);

  // NOT MOSafeRedirect.go: that helper exists to validate a destination
  // a WORKER handed us, it only accepts an absolute https URL on an
  // allowlisted host, and it uses assign(). This target is a literal
  // same-origin path written here, carrying a fragment from the address
  // bar, and a fragment cannot introduce a scheme. replace() is the
  // point: see the note above about the back stack.
  // eslint-disable-next-line no-restricted-syntax -- same-origin literal path, and replace() is required
  window.location.replace(target);
})();
