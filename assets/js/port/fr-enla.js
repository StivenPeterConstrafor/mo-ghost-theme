/* THE ENGLISH OF MIGNE'S LATIN -- an optional second English (owner 2026-10-06: "yes to two english now ... make sure it can be an optional
   thing to take out or add in the reader"). The PG works whose English is made from the Greek (Chrysostom, PG 47-64) keep the English made
   from Migne's Latin translation as v1/pgenla/<id>.json ({page: text, '## ' opening a heading}). It is never in the TEI, so search, the word
   tables and Ask never count a passage twice. A toggle beside English / Latin / Scan -- shown only on a work that has it -- adds it under
   each printed page and takes it out again; off by default, remembered in this browser (localStorage fr_enla). Nothing else in the reader
   changes: the blocks are added to the rendered pages (section.folio[data-page]) and removed again. */
(function () {
  "use strict";
  var KEY = "fr_enla", DATA = null, ID = null, ON = false, busy = false;
  function lsGet() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
  function lsSet(v) { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {} }
  function workId() {
    var q = new URLSearchParams(location.search), ws = (q.get("ws") || q.get("w") || "").trim(), m = /^pg-(\d+)$/.exec(ws);
    return m ? m[1] : null;
  }
  function base() {
    var b = (typeof BLOB !== "undefined" && BLOB) ? BLOB : (window.__FR_BLOB_BASE__ || "");
    return String(b).replace(/\/+$/, "");
  }
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function rich(t) { return esc(t).replace(/&lt;(\/?)i&gt;/g, "<$1i>"); }      // the reads mark italics <i>...</i>: kept, nothing else
  function css() {
    if (document.getElementById("fr-enla-css")) return;
    var s = document.createElement("style"); s.id = "fr-enla-css";
    s.textContent =
      ".fr-enla{margin:.7em 0 1.6em;padding:.55em 1em .65em;border-left:3px solid color-mix(in srgb,currentColor 28%,transparent);" +
      "background:color-mix(in srgb,currentColor 5%,transparent);font-size:.94em;line-height:1.55}" +
      ".fr-enla-lab{font-variant:small-caps;letter-spacing:.05em;font-size:.82em;opacity:.72;margin:0 0 .35em}" +
      ".fr-enla p{margin:.35em 0;text-indent:0}.fr-enla .fr-enla-hd{font-weight:600;margin:.45em 0 .2em}" +
      "button.fr-enla-btn[aria-pressed=false]{opacity:.75}";
    document.head.appendChild(s);
  }
  function block(page, text) {
    var d = document.createElement("div"); d.className = "fr-enla"; d.lang = "en";
    var h = '<div class="fr-enla-lab">English of Migne’s Latin · col. ' + esc(page) + "</div>";
    String(text).split(/\n\s*\n+/).forEach(function (t) {
      t = t.trim(); if (!t) return;
      h += t.indexOf("## ") === 0 ? '<p class="fr-enla-hd">' + rich(t.slice(3)) + "</p>" : "<p>" + rich(t) + "</p>";
    });
    d.innerHTML = h; return d;
  }
  function inject() {
    if (!ON || !DATA) return;
    var secs = document.querySelectorAll("section.folio[data-page]:not([data-fr-enla])");
    for (var i = 0; i < secs.length; i++) {
      var s = secs[i], p = s.getAttribute("data-page"); s.setAttribute("data-fr-enla", "1");
      if (DATA[p]) s.appendChild(block(p, DATA[p]));
    }
  }
  function clear() {
    var b = document.querySelectorAll(".fr-enla"); for (var i = 0; i < b.length; i++) b[i].remove();
    var s = document.querySelectorAll("section.folio[data-fr-enla]"); for (var j = 0; j < s.length; j++) s[j].removeAttribute("data-fr-enla");
  }
  function button() {
    if (!DATA || document.querySelector("button.fr-enla-btn")) return;
    var par = document.getElementById("m-par"); if (!par || !par.parentElement) return;
    var b = document.createElement("button"); b.type = "button"; b.className = "fr-enla-btn";
    b.textContent = "English of the Latin";
    b.title = "A second English, made from Migne’s Latin translation (the main English is made from the Greek), shown under each page. Click again to take it out.";
    b.setAttribute("aria-pressed", ON ? "true" : "false");
    b.addEventListener("click", function () {
      ON = !ON; lsSet(ON); b.setAttribute("aria-pressed", ON ? "true" : "false");
      if (ON) inject(); else clear();
    });
    par.parentElement.appendChild(b);
  }
  function tick() { busy = false; if (workId() !== ID) { start(); return; } button(); inject(); }
  function schedule() { if (!busy) { busy = true; requestAnimationFrame(tick); } }
  function start() {
    clear(); DATA = null; ID = workId();
    var old = document.querySelector("button.fr-enla-btn"); if (old) old.remove();
    if (!ID || !base()) return;
    var id = ID;
    fetch(base() + "/v1/pgenla/" + id + ".json?v=" + Math.floor(Date.now() / 6e5))
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
      .then(function (d) { if (id !== ID || !d || !Object.keys(d).length) return; DATA = d; ON = lsGet(); css(); schedule(); });
  }
  function boot() {
    start();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
