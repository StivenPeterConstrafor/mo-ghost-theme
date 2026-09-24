/*
 * An author page for every author the ported room cannot open.
 *
 * Ian, 2026-09-24: "Boethius' author page is inaccessible to me through
 * links", then "EVERY author needs a page without exception." The room
 * (the corpus site's research shell) exists only for authors with mined
 * works: 6,000-odd authors in the catalogues have none, Boethius, Thomas
 * a Kempis and William Tyndale among them, and every EEBO writer whose
 * books have not been mined.
 *
 * author-address.js tries the nine shelf rosters first. When none of them
 * holds the name it asks the author directory (built by
 * scripts/build-author-directory.mjs) and publishes the answer as
 * MOAuthorAddress.miss:
 *   "@key"    one of our authors: draw their page from w-<c>.json;
 *   "@@base"  several people of one name, none undated: list them;
 *   "?"       nobody by that name: say so, and offer the nearest authors.
 * This replaces faith-author-curated.js, which drew the ten curated
 * authors the same way; they are in the directory like everyone else.
 *
 * It draws a plain page on purpose, in the library's thin-line manner:
 * the header names the author, then About (when the library has a
 * biography), then the works by collection, each opening the reader. It
 * is not a second room: no positions, no Scripture, no reception, because
 * nothing has been mined from these works. When a room is built for one
 * of them, the rosters match first and this never runs.
 */
(function () {
  "use strict";
  const A = window.MOAuthorAddress;
  if (!A || !A.miss) return;
  const json = (p) => fetch(A.dataUrl(p)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const want = new URLSearchParams(location.search).get("a") || "";

  const COLLECTIONS = [
    ["tfr", "The Faith Received"],
    ["mo", "English Editions"],
    ["augustine", "Augustine"],
    ["pld", "Patrologia Latina"],
    ["pg", "Patrologia Graeca"],
    ["po", "Patrologia Orientalis"],
    ["eebo", "Early English Books"],
  ];
  const PREFIXED = ["eebo", "pld", "pg", "po"];
  const readerHref = (c, id) => {
    const s = PREFIXED.includes(c) && !String(id).startsWith(`${c}-`) ? `${c}-${id}` : c === "augustine" ? `aq-${id}` : String(id);
    return `/the-faith-received/read/?w=${encodeURIComponent(s)}`;
  };
  const SERIES = { pld: "PL", pg: "PG", po: "PO" };
  const metaOf = (c, y) => {
    if (SERIES[c]) return y ? (/^Tome/i.test(String(y)) ? `${SERIES[c]} ${String(y).replace(/^Tome\s*/i, "")}` : `${SERIES[c]} ${y}`) : "";
    if (c === "mo") return "In English";
    return y ? String(y) : "";
  };
  // The shelf-plus-century rule faith-author-labels.js applies to rooms:
  // a writer before 1500 is not an "English writer" because EEBO printed
  // him in translation (Thomas a Kempis).
  const label = (trad, name, dates) => {
    const D = window.MODenom;
    const y = Number((String(dates || "").match(/\d{3,4}/) || [])[0] || 0);
    if (y && y < 1500 && /^(english divines|latin fathers|greek fathers)$/i.test(trad || "")) {
      return y < 800 ? "Early Church" : /^greek/i.test(trad) && y < 1453 ? "Byzantine" : "Medieval";
    }
    if (/^english divines$/i.test(trad || "")) {
      const body = D && D.loaded && D.loaded() ? D.body({ author: name, corpus: "eebo" }) : "";
      return body || "English writers";
    }
    return trad || "";
  };

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const link = (href, text, cls) => {
    const a = el("a", cls, text);
    a.setAttribute("href", href);
    return a;
  };

  // The header the template already has, retitled for this author.
  function header(name, sub) {
    const h1 = document.querySelector(".bhero h1");
    const p = document.querySelector(".bhero .bhero-sub");
    const kick = document.querySelector(".bhero .bhero-kicker");
    if (kick && !kick.querySelector('a[href="/the-faith-received/author/"]')) {
      kick.lastChild && kick.lastChild.nodeType === 3 && kick.removeChild(kick.lastChild);
      kick.appendChild(document.createTextNode(" "));
      kick.appendChild(link("/the-faith-received/author/", "Authors"));
    }
    if (h1) h1.textContent = name;
    if (p) { p.textContent = sub || ""; p.hidden = !sub; }
    document.title = `${name} | The Faith Received | Mere Orthodoxy`;
  }
  function host() {
    let s = document.getElementById("frAuthorOwn");
    if (s) { s.textContent = ""; return s; }
    s = el("section", "fr-own");
    s.id = "frAuthorOwn";
    const main = document.getElementById("page");
    main.parentNode.insertBefore(s, main);
    return s;
  }

  function drawAuthor(key, person, entry) {
    const [name, dates, trad] = person || [want, "", ""];
    const bio = (entry && entry.b) || null;
    const works = (entry && entry.w) || [];
    const lab = (bio && bio.t) || label(trad, name, dates) || "";
    header(name, [dates, lab].filter(Boolean).join("  ·  "));
    const s = host();

    if (bio && (bio.bio || bio.s)) {
      const about = el("div", "fr-own-block fr-own-about");
      about.appendChild(el("h2", "fr-own-h", "About"));
      if (bio.s) about.appendChild(el("p", "fr-own-lede", bio.s));
      if (bio.bio) about.appendChild(el("p", "fr-own-bio", bio.bio));
      s.appendChild(about);
    }

    const block = el("div", "fr-own-block");
    block.appendChild(el("h2", "fr-own-h", works.length === 1 ? "One work in the library" : `${works.length.toLocaleString()} works in the library`));
    for (const [c, title] of COLLECTIONS) {
      const rows = works.filter((w) => w[0] === c);
      if (!rows.length) continue;
      const group = el("div", "fr-own-group");
      group.appendChild(el("h3", "fr-own-coll", `${title}  ·  ${rows.length.toLocaleString()}`));
      const ul = el("ul", "fr-own-works");
      for (const [wc, id, t, y] of rows) {
        const li = el("li");
        const a = link(readerHref(wc, id), "", "fr-own-work");
        a.appendChild(el("span", "fr-own-t", t));
        const m = metaOf(wc, y);
        if (m) a.appendChild(el("span", "fr-own-m", m));
        li.appendChild(a);
        ul.appendChild(li);
      }
      group.appendChild(ul);
      block.appendChild(group);
    }
    s.appendChild(block);

    const more = el("p", "fr-own-more");
    more.appendChild(link(`/the-faith-received/all-works/?collection=all&q=${encodeURIComponent(name)}`, `${name} in All Works`, "fr-own-link"));
    more.appendChild(document.createTextNode("  ·  "));
    more.appendChild(link("/the-faith-received/author/", "Every author", "fr-own-link"));
    s.appendChild(more);

    // One address per person: the key, whatever spelling the link used.
    try {
      const u = new URL(location.href);
      if (u.searchParams.get("a") !== key) { u.searchParams.set("a", key); history.replaceState(history.state, "", u); }
    } catch (_) { /* the page still stands */ }
  }

  function drawList(title, sub, people, note) {
    header(title, sub);
    const s = host();
    const block = el("div", "fr-own-block");
    if (note) block.appendChild(el("p", "fr-own-bio", note));
    const ul = el("ul", "fr-own-works");
    for (const [href, name, meta] of people) {
      const li = el("li");
      const a = link(href, "", "fr-own-work");
      a.appendChild(el("span", "fr-own-t", name));
      if (meta) a.appendChild(el("span", "fr-own-m", meta));
      li.appendChild(a);
      ul.appendChild(li);
    }
    block.appendChild(ul);
    s.appendChild(block);
    const more = el("p", "fr-own-more");
    more.appendChild(link("/the-faith-received/author/", "Every author", "fr-own-link"));
    s.appendChild(more);
  }
  const personRow = (key, p) => [`/the-faith-received/author/?a=${encodeURIComponent(key)}`, p[0], [p[1], `${p[3].toLocaleString()} work${p[3] === 1 ? "" : "s"}`].filter(Boolean).join("  ·  ")];

  // The nearest names to one nobody has written: shared words, then a
  // shared start, from our authors and the rooms alike.
  function nearest(people, rosters) {
    const w = A.words(A.plain(want)).split(" ").filter((x) => x.length > 2);
    const f = A.fold(A.plain(want));
    const scored = [];
    const score = (name) => {
      const nw = A.words(name).split(" ");
      let n = w.filter((x) => nw.includes(x)).length * 10;
      const nf = A.fold(name);
      if (f.length > 3 && (nf.startsWith(f.slice(0, 5)) || nf.includes(f))) n += 5;
      return n;
    };
    for (const [key, p] of Object.entries(people || {})) {
      const n = score(p[0]);
      if (n) scored.push([n + Math.min(p[3], 50) / 100, personRow(key, p)]);
    }
    for (const r of rosters) {
      const n = score(r.a);
      if (n) scored.push([n + 0.6, [`/the-faith-received/author/?a=${encodeURIComponent(r.s)}`, r.a, [r.y ? `b. ${r.y}` : "", `${r.w} work${r.w === 1 ? "" : "s"}`].filter(Boolean).join("  ·  ")]]);
    }
    const seen = new Set();
    return scored.sort((a, b) => b[0] - a[0]).map((x) => x[1]).filter((r) => (seen.has(r[1]) ? false : seen.add(r[1]))).slice(0, 12);
  }

  A.miss.then(async (t) => {
    if (!t) return; // a room: the shell has it
    document.documentElement.classList.add("fr-author-own");
    if (window.MODenom && window.MODenom.ready) await window.MODenom.ready();
    if (t.startsWith("@@")) {
      const base = t.slice(2);
      const d = await json("people.json");
      const people = Object.entries((d && d.people) || {}).filter(([k]) => k.startsWith(`${base}-`) && /^\d+$/.test(k.slice(base.length + 1)));
      const name = people.length ? people[0][1][0] : want;
      drawList(name, "More than one author in the library has this name.", people.map(([k, p]) => personRow(k, p)));
      return;
    }
    if (t.startsWith("@")) {
      const key = t.slice(1);
      const shard = /^[a-z]/.test(key) ? key[0] : "0";
      const [d, w] = await Promise.all([json("people.json"), json(`w-${shard}.json`)]);
      const person = d && d.people && d.people[key];
      const entry = w && w.authors && w.authors[key];
      if (person || entry) { drawAuthor(key, person, entry); return; }
    }
    // Nobody by that name.
    const B = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
    const NS = ["pl", "gf", "po", "ed", "md", "rc", "lu", "rf", "hl"];
    const [d, ...rs] = await Promise.all([json("people.json"), ...NS.map((ns) => fetch(`${B}/v1/bible/${ns}/rooms/index.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null))]);
    const rosters = rs.flatMap((r) => (r && r.authors) || []).filter((r) => !/-anthology$/.test(r.s));
    const near = nearest(d && d.people, rosters);
    drawList(A.plain(want) || want, "No author by that name in the library.", near,
      near.length ? "The nearest names the library has:" : "Nothing close to it either. Every author is listed on the Authors page.");
  });
})();
