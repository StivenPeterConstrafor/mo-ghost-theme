/*
 * A ported page's body class, set on Ghost's body.
 *
 * The corpus site's pages carry their identity on the body tag:
 * <body class="web-page" data-view="browse"> on the atlas,
 * <body class="research-page"> on the Scripture room. Their stylesheets
 * key on it — constellations.css lays the whole atlas out from
 * body.web-page — and their scripts toggle further classes on
 * document.body as you use the page. Inside this site the body is
 * Ghost's, rendered as <body class="">, and a template cannot reach it.
 *
 * So the template names the classes on this script tag and this sets
 * them. It runs where the template places it, at the top of the page's
 * own content, after our masthead has parsed and before the page's
 * markup has, so the layout rules hold from the first paint. External
 * because the site's CSP admits no inline script; parameterised by
 * data attributes because a script tag may carry those.
 */
(() => {
  const s = document.currentScript;
  if (!s || !document.body) return;
  const d = s.dataset;
  if (d.bodyClass) d.bodyClass.split(/\s+/).forEach((c) => { if (c) document.body.classList.add(c); });
  if (d.view) document.body.dataset.view = d.view;
})();
