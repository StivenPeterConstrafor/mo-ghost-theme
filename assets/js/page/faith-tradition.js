/*
 * The Faith Received — a tradition's page, and the index of them.
 *
 * /the-faith-received/tradition/?t=<slug>. Ian, 2026-09-24, on the
 * Confessions page's "About Baptist" link, which opened an author page
 * that could not load: "Looks like we need tradition pages! ... an
 * overview of each tradition, feature their confessions and catechisms
 * and authors." And: "Everything should be listed in chronological
 * order."
 *
 * THREE SOURCES, EACH OWNED ELSEWHERE.
 *   assets/data/faith-received/traditions.json   the prose, the aliases,
 *     the family tree and the All Works filter. Hand-edited; Ian revises
 *     the overviews there.
 *   assets/data/faith-received/tradition-authors.json   the authors with
 *     rooms, filed by church. Built by scripts/build-tradition-authors.mjs
 *     from the same tables the author page labels with.
 *   The confessions collection and the curated English editions, loaded
 *     through MOCorpora exactly as the Confessions page loads them, so a
 *     document files under the same church on both pages.
 *
 * ONE COPY OF A DOCUMENT (Ian, 2026-09-24). Many creeds and confessions
 * exist twice: in the curated collection and in the confessions
 * collection. Where both hold one it is listed once, from the
 * confessions collection. A curated copy stays only where that
 * collection has none. Matched on the title's words and the year, not
 * on slugs, because the curated copies are being retired.
 *
 * No inline script (the theme's CSP), and nothing here reads a
 * site.min.js global: page scripts run before it. Text from the data
 * goes through esc() before it reaches innerHTML.
 */
(function () {
  "use strict";

  const root = document.querySelector("[data-trad-root]");
  if (!root) return;

  const BASE = "/the-faith-received/";
  const asset = (p) => (window.moAssetUrl ? window.moAssetUrl(p) : p);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slugify = (s) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const tradHref = (slug) => `${BASE}tradition/?t=${encodeURIComponent(slug)}`;
  const n = (k, one, many) => `${k.toLocaleString()} ${k === 1 ? one : many}`;

  const want = slugify(new URLSearchParams(location.search).get("t") || "");

  const dataP = Promise.all([
    fetch(asset("/assets/data/faith-received/traditions.json")).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    fetch(asset("/assets/data/faith-received/tradition-authors.json")).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);

  // ── The documents ────────────────────────────────────────────────
  // The year a document is dated to: its catalogue date, else a year its
  // eyebrow or title prints, else the middle of its century. Undated sorts
  // last. faith-room.js yearOf(), plus the bare number a papal heading
  // carries ("St. Clement I 90(?)- 99(?)").
  function realYear(w) {
    const hit = String(w.date || w.eyebrow || "").match(/\b(\d{3,4})\b/)
      || String(w.title || "").match(/\((?:c\.\s*)?(\d{2,4})\b[^)]*\)/)
      || String(w.title || "").match(/\b(\d{2,4})\b/);
    const y = hit ? parseInt(hit[1], 10) : 0;
    return y > 0 && y < 2100 ? y : 0;
  }
  function yearOf(w) {
    if (w._y !== undefined) return w._y;
    const y = realYear(w);
    // "c. 2nd–4th Century", as the curated creeds date themselves, files
    // at the first century it names.
    const ord = String(w.date || w.eyebrow || "").match(/\b(\d{1,2})(?:st|nd|rd|th)\b/);
    const c = ord ? parseInt(ord[1], 10) : (window.MOCentury ? window.MOCentury.of(w) : 0);
    w._y = y || (c ? c * 100 - 50 : 9999);
    return w._y;
  }
  const centuryOfYear = (y) => (y && y < 9999 ? Math.floor((y - 1) / 100) + 1 : 0);

  const STOP = new Set(["the", "of", "a", "an", "and", "st", "in", "on"]);
  function words(title) {
    return new Set(String(title || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
      .replace(/\([^)]*\)/g, " ").replace(/[^a-z]+/g, " ").trim().split(" ")
      .filter((x) => x && !STOP.has(x)));
  }
  function sameWords(a, b) {
    const [s, l] = a.size <= b.size ? [a, b] : [b, a];
    if (s.size < 2) return a.size === b.size && [...a].every((x) => b.has(x));
    return [...s].every((x) => l.has(x));
  }
  // The confessions collection's copy of a curated document, or null.
  // Same words, and the nearest year within fifteen: the curated 1689
  // is the text the collection dates to 1677, and its Thirty-nine
  // Articles are the English of 1571 where the collection has 1562/63.
  function twinOf(doc, pool) {
    const wd = words(doc.title);
    const yd = realYear(doc);
    let best = null;
    let gap = Infinity;
    pool.forEach((c) => {
      if (!sameWords(wd, c._words || (c._words = words(c.title)))) return;
      const yc = realYear(c);
      const d = yd && yc ? Math.abs(yd - yc) : (wd.size === c._words.size ? 0 : Infinity);
      if (d <= 15 && d < gap) { best = c; gap = d; }
    });
    return best;
  }

  const TYPE = { Synodal: "Synod", Creeds: "Creeds", Papal: "Papal" };
  function kindOf(w) {
    if (w.corpus === "confessions") {
      const t = String(w.eyebrow || "").split(" · ")[1] || "";
      return TYPE[t] || t;
    }
    const t = String(w.title || "");
    if (/creed/i.test(t)) return "Creed";
    if (/catechism/i.test(t)) return "Catechism";
    if (/confession/i.test(t)) return "Confession";
    if (/definition/i.test(t)) return "Definition";
    if (/articles/i.test(t)) return "Articles";
    if (/common prayer/i.test(t)) return "Prayer book";
    if (/covenant/i.test(t)) return "Covenant";
    if (/rerum novarum/i.test(t)) return "Papal";
    return "";
  }
  function whenOf(w) {
    if (w.corpus === "mo" && w.eyebrow && !/^\d{3,4}$/.test(w.eyebrow.trim())) {
      return w.eyebrow.replace(/\s*AD$/i, "").replace(/\s*Century$/i, " cent.").replace(/\s*\/\s*/g, "/");
    }
    const y = realYear(w);
    return y ? String(y) : "";
  }
  // "The Belgic Confession (1561)" reads "The Belgic Confession" beside
  // its year column. A parenthesis that is not the same year stays.
  function titleOf(w) {
    const t = String(w.title || w.id);
    const y = realYear(w);
    return y ? t.replace(new RegExp(`\\s*\\((?:c\\.\\s*)?${y}(?:[/–-]\\d{1,4})?\\)\\s*$`), "") : t;
  }

  let docsP = null;
  function loadDocs() {
    if (docsP) return docsP;
    const C = window.MOCorpora;
    if (!C) return (docsP = Promise.resolve([]));
    docsP = Promise.all([C.load("confessions"), C.load("mo")]).then(([conf, mo]) => {
      // MOCorpora answers a failed fetch with an empty list. The
      // confessions collection is never empty, so empty means it did not
      // load, and that must not read as "this church has no documents".
      if (!conf || !conf.length) throw new Error("confessions did not load");
      const curated = (mo || []).filter((w) => !w.author && !/Fathers$/.test(w.tradition || ""))
        .map((w) => Object.assign(w, {
          tradition: C.confessionTradition ? C.confessionTradition(w.title, w.tradition, w.id) : w.tradition,
        }))
        .filter((w) => !twinOf(w, conf));
      return conf.concat(curated);
    });
    return docsP;
  }

  // ── Rendering ────────────────────────────────────────────────────
  function docRow(w, tag) {
    const kind = [kindOf(w), tag].filter(Boolean).join(" · ");
    const inner = `<span class="tfr-trad-yr">${esc(whenOf(w))}</span>`
      + `<span class="tfr-trad-t">${esc(titleOf(w))}</span>${
       kind ? `<span class="tfr-trad-kind">${esc(kind)}</span>` : ""}`;
    return w.url
      ? `<li><a href="${esc(w.url)}">${inner}</a></li>`
      : `<li><span class="tfr-trad-row">${inner}</span></li>`;
  }

  function docsHtml(list, tagOf) {
    list.sort((a, b) => yearOf(a) - yearOf(b) || titleOf(a).localeCompare(titleOf(b)));
    const rows = (l) => `<ol class="tfr-trad-docs">${l.map((w) => docRow(w, tagOf(w))).join("")}</ol>`;
    if (list.length <= 24) return rows(list);
    // A long list folds by century, the way the Confessions page's
    // century view does. Open when there are only a few centuries, so
    // a fold never hides the whole list behind two headings.
    const groups = new Map();
    list.forEach((w) => {
      const c = centuryOfYear(yearOf(w));
      if (!groups.has(c)) groups.set(c, []);
      groups.get(c).push(w);
    });
    const open = groups.size <= 3 ? " open" : "";
    return `<div class="faith-room-blocks faith-room-blocks--fold tfr-trad-folds">${[...groups.entries()].map(([c, l]) => {
      const label = c ? (window.MOCentury ? window.MOCentury.label(c) : `Century ${c}`) : "Undated";
      return `<details class="btrad"${open}><summary class="btrad-sum"><h3>${esc(label.charAt(0).toUpperCase() + label.slice(1))}`
        + `<span class="btrad-n">${n(l.length, "document", "documents")}</span></h3></summary>${rows(l)}</details>`;
    }).join("")}</div>`;
  }

  function authorRow(a) {
    const bits = [a.x].filter(Boolean).join(" · ");
    return `<li><a href="${BASE}author/?a=${encodeURIComponent(a.s)}">`
      + `<span class="tfr-trad-an">${esc(a.n)}</span>${
       a.d ? ` <span class="tfr-trad-ad">${esc(a.d)}</span>` : ""
       }${bits ? `<span class="tfr-trad-ax">${esc(bits)}</span>` : ""
       }<span class="tfr-trad-aw">${n(a.w || 0, "work", "works")}</span></a></li>`;
  }
  const byBirth = (a, b) => (a.y || 9999) - (b.y || 9999) || a.n.localeCompare(b.n);

  function allWorksHref(t) {
    return t.allWorks && t.allWorks.q
      ? `${BASE}all-works/?${new URLSearchParams(t.allWorks.q).toString()}` : "";
  }

  // Every section folds (Ian, 2026-09-24: "make each section here
  // collapsible/expandable"). A <details> open to start; the heading is
  // the summary, and a thin terracotta chevron at the right turns when
  // it closes. The Topics page's fold, in this page's own classes.
  function sec(id, heading, body, cls) {
    return `<details class="tfr-trad-sec${cls ? ` ${cls}` : ""}" open>`
      + `<summary class="tfr-trad-sum"><h2 id="${id}">${heading}</h2></summary>`
      + `<div class="tfr-trad-secbody">${body}</div></details>`;
  }

  function authorsHtml(t, list, mergedFrom) {
    const cfg = t.authors || {};
    const heading = cfg.heading || "Authors";
    const all = allWorksHref(t);
    const browse = all
      ? `<p class="tfr-trad-more"><a class="btrad-all" href="${esc(all)}">Browse ${esc(t.allWorks.label || t.name)} in All Works &rarr;</a></p>` : "";
    if (!list.length) {
      return sec("trad-authors", esc(heading),
        `<p class="tfr-trad-note">No author of this tradition has a room in the library yet.</p>${browse}`);
    }
    const TOP = 30;
    const many = list.length > TOP + 10;
    const shown = many ? list.slice().sort((a, b) => (b.w || 0) - (a.w || 0)).slice(0, TOP).sort(byBirth) : list.slice().sort(byBirth);
    const lede = many
      ? `The ${TOP} most widely held of ${list.length.toLocaleString()} in order of birth.`
      : `${n(list.length, "author", "authors")} in order of birth.`;
    const note = [cfg.note, mergedFrom].filter(Boolean).join(" ");
    const full = many && cfg.fullList !== false
      ? `<div class="faith-room-blocks faith-room-blocks--fold tfr-trad-folds"><details class="btrad"><summary class="btrad-sum"><h3>All ${list.length.toLocaleString()} authors in order of birth</h3></summary>`
        + `<ol class="tfr-trad-authors">${list.slice().sort(byBirth).map(authorRow).join("")}</ol></details></div>` : "";
    return sec("trad-authors", esc(heading), `<p class="tfr-trad-note">${esc(lede)}${note ? ` ${esc(note)}` : ""}</p>`
      + `<ol class="tfr-trad-authors">${shown.map(authorRow).join("")}</ol>${full}${browse}`);
  }

  function setMeta(title, desc, slug) {
    document.title = title;
    const d = document.querySelector('meta[name="description"]');
    if (d && desc) d.setAttribute("content", desc);
    const canon = document.querySelector('link[rel="canonical"]');
    if (canon && slug) canon.setAttribute("href", `${location.origin}${tradHref(slug)}`);
  }

  function renderIndex(list, authors, counts) {
    const visible = list.filter((t) => t.showInIndex !== false);
    const top = visible.filter((t) => !t.parent);
    const row = (t) => {
      const a = (authors[t.slug] || []).length;
      const d = counts ? counts.get(t.slug) || 0 : null;
      const meta = [t.era, d ? n(d, "document", "documents") : "", a ? n(a, "author", "authors") : ""]
        .filter(Boolean).join(" · ");
      const kids = visible.filter((k) => k.parent === t.slug);
      return `<li><a class="tfr-trad-ix" href="${tradHref(t.slug)}"><span class="tfr-trad-ixn">${esc(t.name)}</span>`
        + `<span class="tfr-trad-ixd">${esc(t.dek)}</span>${meta ? `<span class="tfr-trad-ixm">${esc(meta)}</span>` : ""}</a>${
         kids.length ? `<ol class="tfr-trad-index tfr-trad-index--sub">${kids.map(row).join("")}</ol>` : ""
         }</li>`;
    };
    root.innerHTML = `<ol class="tfr-trad-index">${top.map(row).join("")}</ol>`;
  }

  function render(t, list, authorsBy) {
    const bySlug = new Map(list.map((x) => [x.slug, x]));
    const name = document.querySelector("[data-trad-name]");
    const dek = document.querySelector("[data-trad-dek]");
    if (name) name.textContent = t.name;
    if (dek) dek.textContent = t.dek;
    setMeta(`${t.name} | Traditions | The Faith Received | Mere Orthodoxy`, t.dek, t.slug);

    const kids = list.filter((k) => k.parent === t.slug);
    const family = list.filter((k) => k.family === t.slug);
    const parent = t.parent ? bySlug.get(t.parent) : null;
    const inFamily = t.family ? bySlug.get(t.family) : null;
    const related = [parent, inFamily].concat((t.related || []).map((s) => bySlug.get(s)))
      .filter((x, i, a) => x && a.indexOf(x) === i && x !== t);

    const overview = sec("trad-overview", "Overview",
      `<div class="tfr-trad-prose">${(t.overview || []).map((p) => `<p>${esc(p)}</p>`).join("")}</div>`, "tfr-trad-overview");
    const rel = related.length
      ? sec("trad-related", "Related traditions", `<nav class="tfr-trad-related" aria-labelledby="trad-related">`
        + `<span class="tfr-trad-joined">${related.map((r) => `<a href="${tradHref(r.slug)}">${esc(r.name)}</a>`).join("")}</span></nav>`)
      : "";
    const churches = kids.length
      ? sec("trad-churches", `The ${esc(t.name)} churches`,
        `<p class="tfr-trad-note">In the order they arose.</p><ol class="tfr-trad-index">${kids.map((k) => {
          const a = (authorsBy[k.slug] || []).length;
          const meta = [k.era, a ? n(a, "author", "authors") : ""].filter(Boolean).join(" · ");
          return `<li><a class="tfr-trad-ix" href="${tradHref(k.slug)}"><span class="tfr-trad-ixn">${esc(k.name)}</span>`
            + `<span class="tfr-trad-ixd">${esc(k.dek)}</span>${meta ? `<span class="tfr-trad-ixm">${esc(meta)}</span>` : ""}</a></li>`;
        }).join("")}</ol>`) : "";

    // Authors: this church's own, plus its family's where the page says
    // so (Reformed gathers Presbyterian and Congregational), or every
    // child's on a communion's page (Protestant).
    const cfg = t.authors || {};
    let authors = (authorsBy[t.slug] || []).slice();
    let mergedFrom = "";
    const pull = cfg.merge === "children" ? kids : cfg.merge === "family" ? family : [];
    pull.forEach((k) => {
      (authorsBy[k.slug] || []).forEach((a) => authors.push({ ...a, x: [k.name, a.x].filter(Boolean).join(", ")}));
    });
    if (cfg.merge === "family" && family.length) {
      mergedFrom = `With the ${family.map((f) => f.name).join(" and ")} writers.`;
    }
    const seen = new Set();
    authors = authors.filter((a) => (seen.has(a.s) ? false : seen.add(a.s)));

    const docsId = "trad-docs";
    root.innerHTML = `<div class="tfr-trad-page">${overview}${rel}${churches}`
      + `${sec(docsId, "Creeds, confessions and catechisms",
        `<div data-trad-docs><p class="tfr-trad-note">Loading the documents&hellip;</p></div>`)}`
      + `${authorsHtml(t, authors, mergedFrom)}</div>`;

    const docsBox = root.querySelector("[data-trad-docs]");
    const labelsOf = (x) => ((x.docs && x.docs.labels) || []).map((l) => l.toLowerCase());
    const own = new Set(labelsOf(t));
    const fam = new Map();
    if (t.docs && t.docs.merge) family.forEach((f) => labelsOf(f).forEach((l) => fam.set(l, f.name)));
    loadDocs().then((docs) => {
      const mine = docs.filter((w) => {
        const tr = String(w.tradition || "").toLowerCase();
        return own.has(tr) || fam.has(tr);
      });
      const tagOf = (w) => fam.get(String(w.tradition || "").toLowerCase()) || "";
      const note = t.docs && t.docs.note
        ? `<p class="tfr-trad-note">${esc(t.docs.note)}${t.docs.noteLink && bySlug.get(t.docs.noteLink)
          ? ` <a href="${tradHref(t.docs.noteLink)}">${esc(bySlug.get(t.docs.noteLink).name)} &rarr;</a>` : ""}</p>` : "";
      if (!mine.length) {
        docsBox.innerHTML = note || `<p class="tfr-trad-note">The library holds no creed or confession filed under this tradition yet.</p>`;
        return;
      }
      const lede = `<p class="tfr-trad-note">${esc(n(mine.length, "document", "documents"))} in the order they were written.`
        + `${fam.size ? " Documents of the churches in its family are marked with their church." : ""}</p>`;
      docsBox.innerHTML = note + lede + docsHtml(mine, tagOf);
    }).catch(() => {
      docsBox.innerHTML = `<p class="tfr-trad-note">The documents could not load. Please reload the page.</p>`;
    });
  }

  dataP.then(([d, a]) => {
    const list = (d && d.traditions) || [];
    const authorsBy = (a && a.traditions) || {};
    const alias = new Map();
    list.forEach((t) => {
      alias.set(t.slug, t);
      alias.set(slugify(t.name), t);
      (t.aliases || []).forEach((x) => alias.set(slugify(x), t));
    });
    if (!want) {
      renderIndex(list, authorsBy, null);
      // Document counts once the collections are in. The index is usable
      // before they arrive.
      loadDocs().then((docs) => {
        const counts = new Map();
        const labelTo = new Map();
        list.forEach((t) => ((t.docs && t.docs.labels) || []).forEach((l) => labelTo.set(l.toLowerCase(), t.slug)));
        docs.forEach((w) => {
          const s = labelTo.get(String(w.tradition || "").toLowerCase());
          if (s) counts.set(s, (counts.get(s) || 0) + 1);
        });
        renderIndex(list, authorsBy, counts);
      }).catch(() => { /* the index stands without document counts */ });
      return;
    }
    const t = alias.get(want);
    if (!t) {
      renderIndex(list, authorsBy, null);
      root.insertAdjacentHTML("afterbegin", `<p class="tfr-trad-note">There is no page for that tradition yet. These are the traditions the library covers.</p>`);
      return;
    }
    // One address per page: an alias forwards to the canonical slug.
    if (t.slug !== want) {
      history.replaceState(null, "", `${tradHref(t.slug)}${location.hash}`);
    }
    render(t, list, authorsBy);
  }).catch(() => {
    root.innerHTML = `<p class="tfr-trad-note">The traditions could not load. Please reload the page.</p>`;
  });
})();
