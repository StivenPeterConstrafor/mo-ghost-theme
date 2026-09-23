/*
 * The Authors directory counts every work the library holds.
 *
 * Ian, 2026-09-23: "fix the Authors list counts too". The directory's
 * numbers come from each shelf's roster (v1/bible/<sh>/rooms/index.json),
 * whose `w` is the author's RESEARCH record: mined works only. Justin
 * Martyr was listed with 1 work where the library holds 7. The works a
 * room leaves out are counted ahead of time by
 * scripts/build-room-extra-works.mjs into room-extras/counts.json.
 *
 * WHY AT THE FETCH. The port reads the roster in one place and then
 * derives everything from it: each author's "N works", the shelf totals
 * ("472 authors · 2,835 works"), the "Most works" order, and the "Also
 * on Latin Fathers (N works)" lines. Correcting `w` as the roster
 * arrives fixes all of them at once, and nothing the port computes
 * afterwards can disagree with the room. Rewriting the painted numbers
 * instead would leave the sort order and the totals wrong.
 *
 * Narrow on purpose: only a GET of exactly a shelf roster URL is
 * touched, only `w` is changed, and on any failure (the counts file,
 * the parse) the port gets the untouched response it asked for.
 * Must load BEFORE the port's scripts: the roster is fetched while
 * authors.in03.js first runs.
 */
(function () {
  "use strict";

  const ROSTER = /^https:\/\/mo-tfr-library\.mo-podcast-feed\.workers\.dev\/v1\/bible\/([a-z]{2})\/rooms\/index\.json(?:\?|$)/;
  const original = window.fetch;
  if (typeof original !== "function") return;

  let counts = null;
  function loadCounts() {
    if (!counts) {
      const path = "/assets/data/faith-received/room-extras/counts.json";
      const url = window.moAssetUrl ? window.moAssetUrl(path) : path;
      counts = original.call(window, url)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => (d && d.counts) || null)
        .catch(() => null);
    }
    return counts;
  }

  window.fetch = function (...args) {
    const [input, init] = args;
    const url = typeof input === "string" ? input : (input && input.url) || "";
    const method = ((init && init.method) || (input && input.method) || "GET").toUpperCase();
    const m = method === "GET" ? ROSTER.exec(url) : null;
    if (!m) return original.apply(this, args);
    const sh = m[1];
    return Promise.all([original.apply(this, args), loadCounts()]).then(([res, all]) => {
      const add = all && all[sh];
      if (!res.ok || !add) return res;
      return res.clone().json().then((d) => {
        if (!d || !Array.isArray(d.authors)) return res;
        d.authors.forEach((a) => {
          const n = add[a && a.s];
          if (n > 0 && typeof a.w === "number") a.w += n;
        });
        return new Response(JSON.stringify(d), {
          status: res.status,
          statusText: res.statusText,
          headers: { "content-type": "application/json" },
        });
      }).catch(() => res);
    });
  };
})();
