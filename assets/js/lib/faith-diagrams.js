/*
 * Diagrams in an answer.
 *
 * WHY. Asked to show a structure, a model draws it in ASCII inside a code
 * fence: boxes made of pipes and dashes, arrows made of hyphens. It is
 * unreadable at our body measure, it does not reflow on a phone, and our
 * code-block rule paints alternating rows behind art that was never meant
 * to sit in a code block (Ian, 2026-09-14: "is it possible to produce
 * actual graphics for this kind of stuff"). The worker now asks for
 * Mermaid instead, and this renders it.
 *
 * WHY MERMAID COMES FROM A CDN. It is 5.6MB unminified-by-us, and this
 * theme already loads React this way in custom-digest-gen.hbs: an exact
 * version, a Subresource Integrity hash, and crossorigin. That is the
 * house pattern and cdn.jsdelivr.net is already in the CSP's script-src.
 * Vendoring the file instead would put 5.6MB in every theme zip we upload
 * to Ghost, for a library most page views never touch.
 *
 * The integrity hash PINS THE BYTES. If the version below changes, the
 * hash must be recomputed or the script is refused and diagrams quietly
 * stop rendering:
 *   curl -sL https://cdn.jsdelivr.net/npm/mermaid@<v>/dist/mermaid.min.js \
 *     | openssl dgst -sha384 -binary | openssl base64 -A
 *
 * WHY IT LOADS LATE. Nothing is fetched until an answer actually contains
 * a diagram, so the ordinary case pays nothing.
 *
 * WHY THE CACHE. The Ask thread re-renders from innerHTML on every
 * streamed delta, so the same diagram is asked for many times a second
 * while an answer is being written. Rendering is expensive and
 * asynchronous; the SVG is kept by source text so every re-render after
 * the first is a synchronous string assignment.
 *
 * SECURITY. securityLevel 'strict' keeps Mermaid's own sanitiser on and
 * refuses click handlers and inline HTML in labels. The diagram source is
 * model output and is treated as untrusted: it is never inserted as HTML,
 * only handed to Mermaid as text.
 */
(function () {
  "use strict";

  const VERSION = "12.0.0";
  const SRC = `https://cdn.jsdelivr.net/npm/mermaid@${VERSION}/dist/mermaid.min.js`;
  const INTEGRITY = "sha384-xzghz1GQ5u9HCpVskeDPqMsdogD1yvuMQbEK53+wi+G70+6J1AG0L2cfi9PHjDWI";

  // Diagram kinds the answer is allowed to draw. Anything else is left as
  // text rather than handed to Mermaid, so a model that invents a syntax
  // shows its source instead of an error box.
  const ALLOWED = /^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|mindmap|timeline|journey|quadrantChart)\b/;

  let loading = null;
  const cache = new Map();
  let seq = 0;

  function cssVar(name, fallback) {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name);
      return (v && v.trim()) || fallback;
    } catch (e) { return fallback; }
  }

  function load() {
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      if (window.mermaid) { resolve(window.mermaid); return; }
      const s = document.createElement("script");
      s.src = SRC;
      s.integrity = INTEGRITY;
      s.crossOrigin = "anonymous";
      s.async = true;
      s.onload = function () {
        if (!window.mermaid) { reject(new Error("mermaid did not register")); return; }
        try {
          window.mermaid.initialize({
            startOnLoad: false,
            securityLevel: "strict",
            // Our page, not Mermaid's. The defaults are a blue-grey
            // palette in Trebuchet; this is the library's warm page, the
            // tan rule and the burnt-orange accent, in the body face.
            theme: "base",
            fontFamily: cssVar("--font-body", "Source Serif Pro, Georgia, serif"),
            themeVariables: {
              background: cssVar("--color-page", "#fdfaf4"),
              primaryColor: cssVar("--color-cream", "#f5efe3"),
              primaryTextColor: cssVar("--color-dark", "#2d2927"),
              primaryBorderColor: cssVar("--color-card-border", "#ddd2bd"),
              secondaryColor: cssVar("--color-page", "#fdfaf4"),
              tertiaryColor: cssVar("--color-cream", "#f5efe3"),
              lineColor: cssVar("--color-secondary", "#c1593c"),
              textColor: cssVar("--color-dark", "#2d2927"),
              mainBkg: cssVar("--color-cream", "#f5efe3"),
              nodeBorder: cssVar("--color-card-border", "#ddd2bd"),
              clusterBkg: cssVar("--color-page", "#fdfaf4"),
              clusterBorder: cssVar("--color-card-border", "#ddd2bd"),
              titleColor: cssVar("--color-dark", "#2d2927"),
              edgeLabelBackground: cssVar("--color-page", "#fdfaf4"),
              fontSize: "15px"
            }
          });
        } catch (e) { /* initialize is best-effort; render still works */ }
        resolve(window.mermaid);
      };
      s.onerror = function () { reject(new Error("mermaid failed to load")); };
      document.head.appendChild(s);
    });
    return loading;
  }

  // A diagram that will not parse must not leave an empty hole, and must
  // not leave Mermaid's red error card either: that card is Mermaid's
  // design, not ours, and it says nothing a reader can act on. The source
  // is shown instead, which is exactly what they would have seen before.
  function fallback(node, source) {
    const pre = document.createElement("pre");
    pre.className = "fra-diagram-source";
    pre.textContent = source;
    node.replaceChildren(pre);
    node.dataset.rendered = "fallback";
  }

  function paint(node, svg) {
    node.innerHTML = svg;
    const el = node.querySelector("svg");
    if (el) {
      // Mermaid writes a fixed width; let it scale to the column instead.
      el.removeAttribute("width");
      el.setAttribute("role", "img");
      const title = node.getAttribute("data-title");
      if (title) el.setAttribute("aria-label", title);
    }
    node.dataset.rendered = "1";
  }

  function render(root) {
    const scope = root || document;
    const nodes = scope.querySelectorAll ? scope.querySelectorAll(".fra-diagram:not([data-rendered])") : [];
    if (!nodes.length) return;

    const pending = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const source = node.getAttribute("data-diagram") || "";
      if (!source.trim()) { node.dataset.rendered = "empty"; continue; }
      if (!ALLOWED.test(source)) { fallback(node, source); continue; }
      const hit = cache.get(source);
      if (hit) { paint(node, hit); continue; } // the streaming case
      pending.push({ node, source });
    }
    if (!pending.length) return;

    load().then((mermaid) => {
      pending.forEach((job) => {
        if (!job.node.isConnected || job.node.dataset.rendered) return;
        const again = cache.get(job.source);
        if (again) { paint(job.node, again); return; }
        mermaid.render(`fra-d${++seq}`, job.source).then((out) => {
          const svg = out && out.svg;
          if (!svg) { fallback(job.node, job.source); return; }
          cache.set(job.source, svg);
          if (job.node.isConnected) paint(job.node, svg);
        }).catch(() => {
          fallback(job.node, job.source);
        });
      });
    }).catch(() => {
      pending.forEach((job) => { fallback(job.node, job.source); });
    });
  }

  window.MODiagrams = { render, ALLOWED };
})();
