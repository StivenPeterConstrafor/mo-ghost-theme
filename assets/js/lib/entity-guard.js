/*
 * Entity guard: literal HTML entities never reach the reader as text.
 *
 * Ian, 2026-09-23: "Thomas &agrave; Kempis" on a Continue reading card,
 * after it had been fixed on the shelves, in the reader, in the previews
 * and at the source. "It's not just Thomas A Kempis. I need this kind of
 * mistake to be fixed everywhere it appears."
 *
 * THE BUG, IN GENERAL. Some text arrives with an HTML entity already in
 * it: a catalogue field, a chapter title, a migrated excerpt, a record a
 * browser saved last week. Every renderer escapes what it prints, which
 * is right, so "&agrave;" is printed as the six characters & a g r a v e
 * ; rather than as à. The text came in wrong; the renderer did its job.
 *
 * Fixing it where the text comes in is the real fix, and has been done
 * for every source found (faith-corpora.js decodeWork, faith-reader.js
 * decodedMeta, the mo-tfr-meta worker, the R2 records, the Ghost posts).
 * But there are more than forty places on this site that render stored
 * or fetched text, several in the ported code, and one missed renderer is
 * exactly how this card survived. So this is the net under all of them.
 *
 * WHAT IT DOES. Watches the page and, in TEXT NODES only, turns a known
 * entity into its character: à for &agrave;, & for &amp;, and so on, and
 * unwinds twice-escaped text (&amp;agrave;). A text node cannot contain
 * markup, and assigning nodeValue never parses HTML, so nothing here can
 * turn "&lt;script&gt;" into a script: it becomes the visible characters
 * "<script>", which is what the text meant. The same for the handful of
 * attributes a reader sees (title, alt, aria-label, placeholder) and for
 * the document title in the tab.
 *
 * WHAT IT LEAVES ALONE. Code and preformatted text (an essay that shows
 * "&amp;" on purpose will show it inside <code>), form fields, scripts and
 * styles, anything contenteditable, anything under [data-keep-entities],
 * and every entity name not in the table below ("R&D;" stays "R&D;").
 *
 * SAVED READING STATE. The reading records a browser keeps (fr_lastread,
 * fr_recent, fr_positions, fr_marks) were written from text that carried
 * the entity, and several things read them without going near the DOM (a
 * copied citation, for one). Their plain-text fields are decoded in place
 * once per page load. ONLY those fields: other fr_ records hold HTML (a
 * saved Ask answer), and decoding HTML would turn escaped text into tags.
 *
 * Loaded first in <head> (default.hbs), before any script that renders.
 */
(function () {
  "use strict";

  const NAMED = {
    amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ",
    agrave: "à", aacute: "á", acirc: "â", atilde: "ã", auml: "ä", aring: "å", aelig: "æ",
    Agrave: "À", Aacute: "Á", Acirc: "Â", Atilde: "Ã", Auml: "Ä", Aring: "Å", AElig: "Æ",
    egrave: "è", eacute: "é", ecirc: "ê", euml: "ë", Egrave: "È", Eacute: "É", Ecirc: "Ê", Euml: "Ë",
    igrave: "ì", iacute: "í", icirc: "î", iuml: "ï", Igrave: "Ì", Iacute: "Í", Icirc: "Î", Iuml: "Ï",
    ograve: "ò", oacute: "ó", ocirc: "ô", otilde: "õ", ouml: "ö", oslash: "ø", oelig: "œ",
    Ograve: "Ò", Oacute: "Ó", Ocirc: "Ô", Otilde: "Õ", Ouml: "Ö", Oslash: "Ø", OElig: "Œ",
    ugrave: "ù", uacute: "ú", ucirc: "û", uuml: "ü", Ugrave: "Ù", Uacute: "Ú", Ucirc: "Û", Uuml: "Ü",
    ccedil: "ç", Ccedil: "Ç", ntilde: "ñ", Ntilde: "Ñ", szlig: "ß", yacute: "ý", yuml: "ÿ",
    middot: "·", ndash: "–", mdash: "—", hellip: "…", lsquo: "‘", rsquo: "’", sbquo: "‚",
    ldquo: "“", rdquo: "”", bdquo: "„", laquo: "«", raquo: "»", sect: "§", para: "¶",
    deg: "°", copy: "©", reg: "®", trade: "™", times: "×", divide: "÷", larr: "←", rarr: "→",
    dagger: "†", Dagger: "‡", bull: "•", prime: "′", Prime: "″",
    // What one catalogue actually wrote for &aelig;.
    ealig: "æ", Ealig: "Æ",
  };
  const ENTITY = /&(#\d{1,7}|#[xX][0-9a-fA-F]{1,6}|[A-Za-z]{2,8});/g;
  const ANY = /&(#\d{1,7}|#[xX][0-9a-fA-F]{1,6}|[A-Za-z]{2,8});/;

  function decode(value) {
    if (typeof value !== "string" || value.indexOf("&") === -1 || !ANY.test(value)) return value;
    let out = value;
    for (let pass = 0; pass < 3; pass++) {
      const next = out.replace(ENTITY, (whole, body) => {
        if (body.charAt(0) === "#") {
          const hex = body.charAt(1) === "x" || body.charAt(1) === "X";
          const code = hex ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
          return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : whole;
        }
        return Object.prototype.hasOwnProperty.call(NAMED, body) ? NAMED[body] : whole;
      });
      if (next === out) break;
      out = next;
    }
    return out;
  }
  // One decoder for the site; faith-corpora.js and others may use it.
  window.MOEntities = { decode };

  // ── Saved reading state ─────────────────────────────────────────
  const PLAIN_KEYS = ["fr_lastread", "fr_recent", "fr_positions", "fr_marks"];
  const PLAIN_FIELDS = { title: 1, author: 1, c: 1, label: 1, work: 1, name: 1, eyebrow: 1, cite: 1, heading: 1 };
  function cleanRecord(o) {
    let changed = false;
    if (Array.isArray(o)) {
      for (let i = 0; i < o.length; i++) if (o[i] && typeof o[i] === "object" && cleanRecord(o[i])) changed = true;
    } else if (o && typeof o === "object") {
      for (const k in o) {
        if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
        const v = o[k];
        if (typeof v === "string" && PLAIN_FIELDS[k]) {
          const d = decode(v);
          if (d !== v) { o[k] = d; changed = true; }
        } else if (v && typeof v === "object" && cleanRecord(v)) {
          changed = true;
        }
      }
    }
    return changed;
  }
  try {
    PLAIN_KEYS.forEach((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw || raw.indexOf("&") === -1) return;
      const data = JSON.parse(raw);
      if (cleanRecord(data)) window.localStorage.setItem(key, JSON.stringify(data));
    });
  } catch (e) { /* storage blocked or a record we do not understand: leave it */ }

  // ── The page ────────────────────────────────────────────────────
  const SKIP = { CODE: 1, PRE: 1, KBD: 1, SAMP: 1, SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, TEMPLATE: 1 };
  const ATTRS = ["title", "alt", "aria-label", "placeholder"];

  function skipped(el) {
    for (let n = el; n && n.nodeType === 1; n = n.parentNode) {
      if (SKIP[n.nodeName]) return true;
      if (n.isContentEditable || (n.hasAttribute && n.hasAttribute("data-keep-entities"))) return true;
    }
    return false;
  }
  function fixText(node) {
    const v = node.nodeValue;
    if (!v || v.indexOf("&") === -1) return;
    const d = decode(v);
    if (d !== v && !skipped(node.parentNode)) node.nodeValue = d;
  }
  function fixAttrs(el) {
    for (let i = 0; i < ATTRS.length; i++) {
      const a = el.getAttribute(ATTRS[i]);
      if (a && a.indexOf("&") !== -1) {
        const d = decode(a);
        if (d !== a && !skipped(el)) el.setAttribute(ATTRS[i], d);
      }
    }
  }
  function sweep(root) {
    if (!root) return;
    if (root.nodeType === 3) { fixText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) {
      if (SKIP[root.nodeName]) return;
      fixAttrs(root);
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null);
    let n;
    while ((n = walker.nextNode())) {
      if (n.nodeType === 3) fixText(n);
      else fixAttrs(n);
    }
  }
  function fixTitle() {
    const t = document.title;
    if (t && t.indexOf("&") !== -1) {
      const d = decode(t);
      if (d !== t) document.title = d;
    }
  }

  const obs = new MutationObserver((records) => {
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (r.type === "characterData") fixText(r.target);
      else if (r.type === "attributes") fixAttrs(r.target);
      else for (let j = 0; j < r.addedNodes.length; j++) sweep(r.addedNodes[j]);
    }
    fixTitle();
  });
  obs.observe(document.documentElement, {
    childList: true, subtree: true, characterData: true,
    attributes: true, attributeFilter: ATTRS,
  });

  function all() { sweep(document.body || document.documentElement); fixTitle(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", all);
  else all();
})();
