/*
 * The ten authors the ported author room cannot show.
 *
 * author-address.js folds ?a=<name> against the nine shelf rosters on the
 * library worker and sets the hash the corpus shell routes on. That works
 * for anyone in the bulk corpus. It cannot work for an author who is only
 * in OUR curated set, because the shell has no room for them: there is no
 * roster entry, so there is no slug, so the shell renders its empty shell
 * and the page is 612 characters of nothing.
 *
 * Measured on 2026-09-21, after the port landed: 10 of the 21 curated
 * authors fall in this hole, and they are not obscure ones. Charnock,
 * Athanasius, Irenaeus of Lyons, Clement of Rome, Polycarp, Papias,
 * Theophilus of Antioch, Athenagoras, Jonathan Edwards, Thomas a Kempis.
 *
 * Neither library deep link rescues them either: /the-faith-received/ and
 * /all-works/ both read works-index.json, and the curated works are not in
 * it. They are in v1/mo/index.json, a separate catalogue.
 *
 * So this draws the small thing that is true: who the author is, and what
 * of theirs we hold, each title linking into the reader. It is not a
 * second author room and should not grow into one. If a curated author
 * ever gains a roster entry, the shell will resolve them and this steps
 * aside on its own.
 */
(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const want = params.get("a");
  if (!want) return;

  const MO_INDEX = "/v1/mo/index.json";
  const AUTHORS = "/v1/authors.json";
  const fold = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = fold(want);
  if (!target) return;

  function blobBase() {
    // The same base every other port module reads, set by the boot script.
    return String(window.__FR_BLOB_BASE__ || "").replace(/\/$/, "");
  }

  function json(path) {
    return fetch(blobBase() + path, { credentials: "omit" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }

  /* Did the shell find a room? It sets a slug hash and fills the page.
   * Checking BOTH, because the bridge writes the raw name as a hash when
   * it finds nothing, and a raw name is not a slug. */
  function shellResolved() {
    const hash = decodeURIComponent(window.location.hash || "").replace(/^#/, "");
    if (hash && fold(hash) === target && /\s/.test(hash)) return false; // raw name, not a slug
    return document.body.innerText.trim().length > 1200;
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function draw(name, meta, works) {
    if (document.getElementById("frCuratedAuthor")) return;
    const host = document.querySelector("main") || document.body;

    const wrap = el("section", "fr-curated-author");
    wrap.id = "frCuratedAuthor";

    wrap.appendChild(el("h1", "fr-ca-name", name));

    // Dates and tradition only. The affiliation line is the thing the
    // About panel was just simplified to drop; it does not come back here.
    const bits = [meta && meta.dates, meta && meta.tradition].filter(Boolean);
    if (bits.length) wrap.appendChild(el("p", "fr-ca-meta", bits.join("  ·  ")));

    wrap.appendChild(el("p", "fr-ca-count",
      works.length === 1 ? "One work in this library." : `${works.length} works in this library.`));

    const list = el("ul", "fr-ca-works");
    works.forEach((w) => {
      const li = el("li");
      const a = el("a", "fr-ca-work", w.title || w.slug);
      // Same-origin reader path built from a fixed prefix and an encoded slug.
      a.setAttribute("href", `/the-faith-received/read/?w=${encodeURIComponent(w.slug)}`);
      li.appendChild(a);
      list.appendChild(li);
    });
    wrap.appendChild(list);

    host.appendChild(wrap);
    document.documentElement.classList.add("fr-curated-author-on");
  }

  function run() {
    if (shellResolved()) return;
    Promise.all([json(MO_INDEX), json(AUTHORS)]).then(([mo, authors]) => {
      const works = ((mo && mo.works) || []).filter((w) => fold(w.author) === target);
      if (!works.length) return; // not ours either; leave the page alone
      const name = works[0].author || want;
      const meta = (authors && (authors[name] || authors[want])) || null;
      draw(name, meta, works);
    });
  }

  // After the shell has had its chance to route, so this only fills a gap.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.setTimeout(run, 1200), { once: true });
  } else {
    window.setTimeout(run, 1200);
  }
})();
