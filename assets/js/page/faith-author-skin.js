/*
 * The shelf names the ported author room prints, as the library prints
 * them (Ian, 2026-09-24, on the Reception tab: print "English writers",
 * not "English Divines"). The MOFaithLabel.shelf rule in
 * lib/faith-catalogue.js, which is not loaded here: "English Divines" is
 * a nationality, not a church. Display only, text nodes only, so the
 * port's filters and links, which compare on the source value, still
 * work. Runs as the room redraws.
 */
(function () {
  "use strict";
  const page = document.getElementById("page");
  if (!page) return;
  const FROM = /\bEnglish Divines\b/g;
  const TO = "English writers";
  const fix = () => {
    const walk = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
    const hits = [];
    for (let n = walk.nextNode(); n; n = walk.nextNode()) if (FROM.test(n.nodeValue)) hits.push(n);
    for (const n of hits) { FROM.lastIndex = 0; n.nodeValue = n.nodeValue.replace(FROM, TO); }
    FROM.lastIndex = 0;
  };
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fix(); });
  }).observe(page, { childList: true, subtree: true });
  fix();
})();
