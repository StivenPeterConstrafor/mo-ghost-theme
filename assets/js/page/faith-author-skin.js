/*
 * The shelf names the ported author room prints, as the library prints
 * them (Ian, 2026-09-24, on the Reception tab: print "English writers",
 * not "English Divines"). The MOFaithLabel.shelf rule in
 * lib/faith-catalogue.js, which is not loaded here: "English Divines" is
 * a nationality, not a church. Display only, text nodes only, so the
 * port's filters and links, which compare on the source value, still
 * work. Runs as the room redraws.
 *
 * Two more, for a topic's evidence (Ian, 2026-09-24, on Anselm's Grace):
 * the engine's eyebrow "Summary of the cited passage — not a quotation"
 * is printed with a comma, as the house writes it; and the topics after
 * "Also discusses" become buttons carrying the rail's own data-t, so the
 * room's click handler on #pbody opens them. Only names the rail lists
 * are linked; any other name stays text, never a button that does
 * nothing.
 */
(function () {
  "use strict";
  const page = document.getElementById("page");
  if (!page) return;
  const FROM = /\bEnglish Divines\b/g;
  const TO = "English writers";
  const KIND = /^Summary of the cited passage\s+—\s+not a quotation$/;
  const ALSO = " · Also discusses ";
  const relabel = () => {
    const walk = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
    const hits = [];
    for (let n = walk.nextNode(); n; n = walk.nextNode()) if (FROM.test(n.nodeValue)) hits.push(n);
    for (const n of hits) { FROM.lastIndex = 0; n.nodeValue = n.nodeValue.replace(FROM, TO); }
    FROM.lastIndex = 0;
    for (const el of page.querySelectorAll(".rx-evidence-kind")) {
      if (KIND.test(el.textContent)) el.textContent = "Summary of the cited passage, not a quotation";
    }
  };
  const linkTopics = () => {
    const notes = page.querySelectorAll(".rx-annotation:not([data-fr-also])");
    if (!notes.length) return;
    const rail = new Set();
    for (const b of page.querySelectorAll("[data-t]")) if (!b.closest(".rx-annotation")) rail.add(b.dataset.t);
    if (!rail.size) return;
    for (const note of notes) {
      note.setAttribute("data-fr-also", "");
      const text = note.firstChild;
      if (note.childNodes.length !== 1 || !text || text.nodeType !== 3) continue;
      const at = text.nodeValue.indexOf(ALSO);
      if (at < 0) continue;
      const names = text.nodeValue.slice(at + ALSO.length).split(", ");
      if (!names.some((n) => rail.has(n))) continue;
      const out = document.createDocumentFragment();
      out.append(text.nodeValue.slice(0, at + ALSO.length));
      names.forEach((name, i) => {
        if (i) out.append(", ");
        if (!rail.has(name)) { out.append(name); return; }
        const b = document.createElement("button");
        b.type = "button";
        b.className = "fr-also";
        b.dataset.t = name;
        b.textContent = name;
        out.append(b);
      });
      note.replaceChildren(out);
    }
  };
  const fix = () => { relabel(); linkTopics(); };
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fix(); });
  }).observe(page, { childList: true, subtree: true });
  fix();
})();
