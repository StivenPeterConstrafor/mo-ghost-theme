/*
 * Old addresses of a retired work land on the copy that replaced it.
 *
 * Retired works and their new homes are in
 * assets/js/lib/faith-work-forwards.js (MOWorkForwards), which must load
 * first. Two kinds of page load this file:
 *
 * THE READER (/the-faith-received/read/, and /review/ on the same
 * template). /read/?w=westminster-shorter&p=33 becomes
 * /read/?w=rc-115-westminster-shorter-catechism-1647&p=3#b3-12, which is
 * Q. 33 in the new copy. The address is rewritten in place with
 * history.replaceState, before the engine reads ?w=, so there is no
 * reload and nothing to loop: the new slug is never itself retired (the
 * build script refuses a chain). This file therefore loads in the head,
 * after the lib and before reader-core.js.
 *
 * Ghost's 301 for an old per-work page sends /the-faith-received/belgic/
 * to /read/?w=<new>&from=belgic, keeping the browser's #article-23.
 * `from` names the retired work whose division ids the fragment uses;
 * it is read here and dropped from the address.
 *
 * A reader who had been part-way through the old copy is put back at the
 * same division: the engine keeps its last page per slug in
 * localStorage fr_lastread, and an old slug's page is carried across
 * when the new slug has none of its own.
 *
 * THE OLD PER-WORK PAGES (/the-faith-received/<old slug>/), for as long
 * as they still render (until Ghost's redirects are uploaded, and for
 * anyone holding a cached copy). They send the reader to the new copy,
 * with #q-33 or #article-23 mapped to the same division.
 */
(function () {
  "use strict";

  const F = window.MOWorkForwards;
  if (!F) return;

  const READERS = ["/the-faith-received/read/", "/the-faith-received/review/"];
  const path = window.location.pathname.replace(/\/?$/, "/");

  if (READERS.indexOf(path) >= 0) {
    const q = new URLSearchParams(window.location.search);
    const w = q.get("w") || q.get("ws") || "";
    const from = q.get("from") || "";
    let old = "";
    if (F.get(w)) old = w;
    else if (from && F.get(from) && F.get(from).to === w) old = from;
    if (!old) {
      if (from) {
        q.delete("from");
        const qs = q.toString();
        history.replaceState(history.state, "", `${path}${qs ? `?${qs}` : ""}${window.location.hash}`);
      }
      return;
    }
    let p = q.get("p") || "";
    const hash = window.location.hash;
    // No locator at all: carry the old copy's last-read page across.
    if (!p && hash.length < 2) {
      try {
        const lr = JSON.parse(window.localStorage.getItem("fr_lastread") || "{}");
        const to = F.get(old).to;
        if (lr && lr[old] && lr[old].page != null && !lr[to]) p = String(lr[old].page);
      } catch (_) { /* no storage: land at the top */ }
    }
    const r = F.resolve(old, { p, hash });
    q.delete("from");
    q.delete("ws");
    q.set("w", r.w);
    if (r.p) q.set("p", r.p); else q.delete("p");
    const tail = r.hash ? `#${encodeURIComponent(r.hash)}` : "";
    history.replaceState(history.state, "", `${path}?${q.toString()}${tail}`);
    document.documentElement.setAttribute("data-fr-forwarded-from", old);
    return;
  }

  // /the-faith-received/<slug>/ and nothing below it (the memorize pages
  // at /the-faith-received/<slug>/memorize/ stay where they are).
  const m = /^\/the-faith-received\/([^/]+)\/$/.exec(path);
  if (m && F.get(decodeURIComponent(m[1]))) {
    // Same-origin by construction: a fixed path and an encoded slug.
    const next = F.url(decodeURIComponent(m[1]), "", window.location.hash);
    if (next) location.replace(next);
  }
})();
