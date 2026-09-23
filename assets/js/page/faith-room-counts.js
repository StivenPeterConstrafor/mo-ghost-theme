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
 * THE WORKS DIRECTORY (/author/#works) gets the same treatment: each
 * shelf's v1/works-dir/<sh>.json.gz is the research record's list, and
 * the works it leaves out (room-extras/dir.json) are appended as rows
 * under their author, so the directory lists every work (Ian,
 * 2026-09-23: "make the Works list show every work too"). Editorial
 * matter (indexes, notices) is not added, as on the author's page.
 *
 * Must load BEFORE the port's scripts: the roster is fetched while
 * authors.in03.js first runs.
 */
(function () {
  "use strict";

  const ROSTER = /^https:\/\/mo-tfr-library\.mo-podcast-feed\.workers\.dev\/v1\/bible\/([a-z]{2})\/rooms\/index\.json(?:\?|$)/;
  const WORKS_DIR = /^https:\/\/mo-tfr-library\.mo-podcast-feed\.workers\.dev\/v1\/works-dir\/([a-z]{2})\.json\.gz(?:\?|$)/;
  const original = window.fetch;
  if (typeof original !== "function") return;

  const files = {};
  function load(name, field) {
    if (!files[name]) {
      const path = `/assets/data/faith-received/room-extras/${name}`;
      const url = window.moAssetUrl ? window.moAssetUrl(path) : path;
      files[name] = original.call(window, url)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => (d && d[field]) || null)
        .catch(() => null);
    }
    return files[name];
  }
  const loadCounts = () => load("counts.json", "counts");
  const loadDir = () => load("dir.json", "dir");

  // The works added to the Works directory, by key, so their cards can
  // lose "Explore work": that page is the research record, which these
  // works do not have yet.
  const added = new Set();

  function rewrite(res, edit) {
    return res.clone().json().then((d) => {
      if (!d || !edit(d)) return res;
      return new Response(JSON.stringify(d), {
        status: res.status,
        statusText: res.statusText,
        headers: { "content-type": "application/json" },
      });
    }).catch(() => res);
  }

  window.fetch = function (...args) {
    const [input, init] = args;
    const url = typeof input === "string" ? input : (input && input.url) || "";
    const method = ((init && init.method) || (input && input.method) || "GET").toUpperCase();
    if (method !== "GET") return original.apply(this, args);
    const roster = ROSTER.exec(url);
    if (roster) {
      const sh = roster[1];
      return Promise.all([original.apply(this, args), loadCounts()]).then(([res, all]) => {
        const add = all && all[sh];
        if (!res.ok || !add) return res;
        return rewrite(res, (d) => {
          if (!Array.isArray(d.authors)) return false;
          d.authors.forEach((a) => {
            const n = add[a && a.s];
            if (n > 0 && typeof a.w === "number") a.w += n;
          });
          return true;
        });
      });
    }
    const works = WORKS_DIR.exec(url);
    if (works) {
      const sh = works[1];
      return Promise.all([original.apply(this, args), loadDir()]).then(([res, all]) => {
        const rows = all && all[sh];
        if (!res.ok || !rows || !rows.length) return res;
        return rewrite(res, (d) => {
          if (!Array.isArray(d.works)) return false;
          const have = new Set(d.works.map((w) => w && w.w));
          rows.forEach((r) => {
            if (!r || have.has(r.w)) return;
            d.works.push({ w: r.w, t: r.t, a: r.a, vs: r.vs, np: 0, nc: 0 });
            added.add(r.w);
          });
          return true;
        });
      });
    }
    return original.apply(this, args);
  };

  /* On the Works directory: the added works have no research page, so
     their "Explore work" link is removed; and the intro no longer says
     the list is only works with research records. */
  function tidy() {
    if (added.size) {
      document.querySelectorAll("main.research-works .rx-work-row a[href*='#w/']").forEach((a) => {
        const key = decodeURIComponent((a.getAttribute("href") || "").split("#w/")[1] || "");
        if (added.has(key)) a.remove();
      });
    }
    document.querySelectorAll("main.research-works .research-intro p").forEach((p) => {
      const t = p.textContent;
      if (t.indexOf("Browse works with research records") === 0) {
        p.textContent = t.replace("Browse works with research records", "Browse every work in the library");
      }
    });
  }
  function watch() {
    const page = document.getElementById("page") || document.body;
    if (!page) return;
    new MutationObserver(tidy).observe(page, { childList: true, subtree: true });
    tidy();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watch);
  else watch();
})();
