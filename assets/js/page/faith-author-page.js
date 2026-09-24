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
 * An author page is drawn in the room's own markup and classes, so it
 * reads exactly as a room does (see drawAuthor): the shared Authors
 * hero, crumbs, name, the profile card with its stat boxes, and the
 * joined tabs. Only tabs with a real source appear: Works always,
 * Scripture and Reception when the library has data for them, Search.
 * When a room is built for one of these authors, the rosters match
 * first and this never runs.
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

  // ── An author's page, in the room's own dress ─────────────────────
  // Ian, 2026-09-24, on Boethius: "Why is his author page like this and
  // not like everyone else's?" So it is drawn with the room's markup and
  // classes (crumbs, .ridbar h1, the .rx-profile card with its .ar-stat
  // boxes and the About disclosure, the joined .pseg tabs, .rx-work-row,
  // .bkrow, .rrow), inside a <main class="research research-room"> of
  // its own, so every rule of the room's skin applies unchanged. Only
  // tabs with a real source are drawn:
  //   Works      always, from the directory, by collection;
  //   Scripture  when the works' research files (v1/mine/work/<slug>.json,
  //              the reader's Research panel) carry Scripture citations;
  //   Reception  when the citation graph (v1/graph/nb/<key>.json) names
  //              authors who cite him, or whom he cites;
  //   Search     his name as the author filter on the search page.
  // No Positions, Topics or Connections: those are the room's own mined
  // surfaces. The tab is kept in ?tab=, never the hash, because a hash
  // is the port's room address and would send it looking for a room.
  const LIB = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
  const MINE_CAP = 60; // research files fetched for one author, at most
  const SHELF_OF = { "Latin Fathers": "pl", "Greek Fathers": "gf", "English Divines": "ed", "Eastern Fathers": "po", Reformed: "rf" };
  const SHELF_NAME = { pl: "Latin Fathers", gf: "Greek Fathers", ed: "English writers", po: "Eastern Fathers", rf: "Continental Reformed" };
  const workSlug = (c, id) => new URL(readerHref(c, id), location.origin).searchParams.get("w");
  const libJson = (k) => fetch(`${LIB}/${k}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const n0 = (n) => Number(n || 0).toLocaleString();

  function ownMain() {
    let m = document.getElementById("frAuthorOwn");
    if (m) m.remove();
    m = el("main", "research research-room fr-own-room");
    m.id = "frAuthorOwn";
    const page = document.getElementById("page");
    page.parentNode.insertBefore(m, page);
    return m;
  }
  function statBox(value, label, word) {
    const d = el("div", word ? "ar-stat ar-stat--word" : "ar-stat");
    const b = el("b");
    if (value instanceof Node) b.appendChild(value); else b.textContent = value;
    d.append(b, el("span", "", label));
    return d;
  }

  function drawAuthor(key, person, entry) {
    const [name, dates, trad] = person || [want, "", ""];
    const bio = (entry && entry.b) || null;
    const works = (entry && entry.w) || [];
    const sh = SHELF_OF[trad] || "";
    document.title = `${name} | The Faith Received | Mere Orthodoxy`;
    const room = ownMain();

    // Crumbs and name, as the room prints them.
    const crumbs = el("div", "crumbs");
    crumbs.appendChild(link("/the-faith-received/author/", "Authors"));
    const shelfName = SHELF_NAME[sh];
    if (shelfName) {
      crumbs.appendChild(document.createTextNode(" · "));
      crumbs.appendChild(link(`/the-faith-received/author/?sh=${sh}`, shelfName));
    }
    room.appendChild(crumbs);
    const bar = el("div", "ridbar");
    bar.appendChild(el("h1", "", name));
    room.appendChild(bar);

    // The card: dates, the short dek, the boxes, the biography.
    const card = el("details", "rx-profile");
    // Open on a wide screen, closed on a phone, as the room's card is.
    card.open = !(window.matchMedia && window.matchMedia("(max-width: 640px)").matches);
    card.appendChild(el("summary", "", "About this author"));
    const deckText = dates || (bio && bio.d) || "";
    if (deckText) card.appendChild(el("div", "deck", deckText));
    if (bio && bio.s) card.appendChild(el("p", "fr-own-dek", bio.s));
    const stats = el("div", "stats");
    const grid = el("div", "ar-stats");
    grid.appendChild(statBox(n0(works.length), works.length === 1 ? "work" : "works"));
    const pagesBox = statBox("", "pages");
    pagesBox.hidden = true;
    grid.appendChild(pagesBox);
    const citesBox = statBox("", "Scripture citations");
    citesBox.hidden = true;
    grid.appendChild(citesBox);
    const L = window.MOAuthorLabels ? window.MOAuthorLabels.labelFor(name, sh, dates) : { tradition: "", detail: "", detailLabel: "" };
    // "English writers" is the shelf, not a tradition: the directory's own
    // rule (a writer before 1500 is Medieval or Early Church, whatever
    // shelf EEBO put him on; else his church) says it better when it can.
    if (!L.tradition || L.tradition === SHELF_NAME.ed) L.tradition = label(trad, name, dates) || L.tradition;
    if (L.tradition) {
      const b = el("span");
      if (window.MOAuthorLabels) window.MOAuthorLabels.writeLabel(b, L.tradition); else b.textContent = L.tradition;
      grid.appendChild(statBox(b, "Tradition", true));
    }
    if (L.detail) {
      const b = el("span");
      if (window.MOAuthorLabels && L.detailLabel === "Denomination") window.MOAuthorLabels.writeLabel(b, L.detail); else b.textContent = L.detail;
      const box = statBox(b, L.detailLabel, true);
      box.classList.add("ar-stat--detail");
      grid.appendChild(box);
    }
    const y = Number((String(dates || "").match(/\d{3,4}/) || [])[0] || 0);
    if (y) {
      const c = Math.floor((y - 1) / 100) + 1;
      const sfx = c % 10 === 1 && c !== 11 ? "st" : c % 10 === 2 && c !== 12 ? "nd" : c % 10 === 3 && c !== 13 ? "rd" : "th";
      grid.appendChild(statBox(`${c}${sfx}`, "Century", true));
    }
    stats.appendChild(grid);
    card.appendChild(stats);
    if (bio && bio.bio) {
      const more = el("details", "rx-author-bio");
      more.appendChild(el("summary", "", bio.s ? `More about ${name}` : `About ${name}`));
      more.appendChild(el("p", "", bio.bio));
      card.appendChild(more);
    }
    room.appendChild(card);

    // The tabs.
    const pane = el("section", "pane");
    const seg = el("div", "pseg");
    seg.setAttribute("role", "tablist");
    const body = el("div", "pbody");
    body.id = "frOwnBody";
    body.setAttribute("role", "tabpanel");
    pane.append(seg, body);
    const grid2 = el("div", "rgrid fr-own-grid");
    grid2.appendChild(pane);
    room.appendChild(grid2);

    const tabs = [];
    function addTab(id, text, draw) {
      const b = el("button", "", text);
      b.type = "button";
      b.id = `frSeg-${id}`;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-controls", "frOwnBody");
      b.addEventListener("click", () => show(id, true));
      tabs.push({ id, b, draw });
      seg.appendChild(b);
      return b;
    }
    function show(id, user) {
      const t = tabs.find((x) => x.id === id) || tabs[0];
      for (const x of tabs) {
        const on = x === t;
        x.b.classList.toggle("on", on);
        x.b.setAttribute("aria-selected", on ? "true" : "false");
      }
      body.setAttribute("aria-labelledby", t.b.id);
      body.textContent = "";
      const view = el("div", "view");
      t.draw(view);
      body.appendChild(view);
      try {
        const u = new URL(location.href);
        if (u.searchParams.get("a") !== key) u.searchParams.set("a", key);
        if (t.id === "works") u.searchParams.delete("tab"); else u.searchParams.set("tab", t.id);
        if (u.href !== location.href) history.replaceState(history.state, "", u);
      } catch (_) { /* the page still stands */ }
      if (user) t.b.focus({ preventScroll: true });
    }

    // Works, by collection, in the room's rows.
    const pagesOf = {};
    addTab("works", `Works · ${n0(works.length)}`, (view) => {
      view.appendChild(el("h2", "", "Works"));
      view.appendChild(el("p", "pane-meta", `${works.length === 1 ? "One work" : `${n0(works.length)} works`} in the library. Open a work to begin reading.`));
      const filters = el("div", "rx-filters");
      const lab = el("label", "rx-search", "Find a work");
      const q = el("input");
      q.type = "search";
      q.placeholder = "Search titles";
      lab.appendChild(q);
      filters.appendChild(lab);
      if (works.length > 6) view.appendChild(filters);
      const count = el("p", "rx-note", "");
      count.setAttribute("role", "status");
      const list = el("div", "fr-own-works-list");
      view.append(count, list);
      const draw = () => {
        const f = A.fold(q.value);
        list.textContent = "";
        let shown = 0;
        for (const [c, title] of COLLECTIONS) {
          const rows = works.filter((w) => w[0] === c && (!f || A.fold(w[2]).includes(f)));
          if (!rows.length) continue;
          shown += rows.length;
          const head = el("div", "volhead", `${title} `);
          head.appendChild(el("span", "", `· ${n0(rows.length)}`));
          list.appendChild(head);
          const ul = el("div", "rx-work-list");
          for (const [wc, id, t, yv] of rows) {
            const href = readerHref(wc, id);
            const row = el("article", "rx-work-row");
            const main = el("div");
            const h3 = el("h3");
            h3.appendChild(link(href, t));
            main.appendChild(h3);
            const np = pagesOf[workSlug(wc, id)];
            const ref = [metaOf(wc, yv), np ? `${n0(np)} indexed page${np === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ");
            if (ref) main.appendChild(el("p", "rx-work-reference", ref));
            const act = el("div", "rx-work-actions");
            const read = link(href, "Read work", "rx-text-link");
            read.setAttribute("aria-label", `Read ${t}`);
            act.appendChild(read);
            row.append(main, act);
            ul.appendChild(row);
          }
          list.appendChild(ul);
        }
        count.textContent = `${shown === 1 ? "1 matching work" : `${n0(shown)} matching works`}`;
        count.hidden = !f;
      };
      q.addEventListener("input", draw);
      draw();
    });

    // Scripture and Reception arrive with their data; drawn only if it is there.
    const wantTab = new URLSearchParams(location.search).get("tab") || "works";
    show("works");
    const books = new Map();
    let cites = 0;
    let indexed = 0;
    const targets = works.slice(0, MINE_CAP).map((w) => workSlug(w[0], w[1]));
    const mine = (async () => {
      let i = 0;
      const next = async () => {
        while (i < targets.length) {
          const slug = targets[i++];
          const d = await libJson(`v1/mine/work/${encodeURIComponent(slug)}.json`);
          if (!d) continue;
          indexed++;
          if (d.np) pagesOf[slug] = d.np;
          for (const bk of d.books || []) {
            const nm = bk.name || bk.b;
            if (!nm || !bk.n) continue;
            const had = books.get(nm) || { n: 0, works: [] };
            had.n += bk.n;
            had.works.push([slug, d.t, bk.n]);
            books.set(nm, had);
            cites += bk.n;
          }
        }
      };
      await Promise.all(Array.from({ length: 6 }, next));
    })();
    const graph = libJson(`v1/graph/nb/${encodeURIComponent(key)}.json`);

    Promise.all([mine, graph]).then(([, nb]) => {
      const allPages = works.length && works.length <= MINE_CAP && works.every((w) => pagesOf[workSlug(w[0], w[1])]);
      if (allPages) {
        pagesBox.querySelector("b").textContent = n0(Object.values(pagesOf).reduce((a, b) => a + b, 0));
        pagesBox.hidden = false;
      }
      if (cites) {
        citesBox.querySelector("b").textContent = n0(cites);
        citesBox.hidden = false;
        addTab("scripture", "Scripture", (view) => {
          view.appendChild(el("div", "pane-topic", "Scripture"));
          const partial = works.length > indexed;
          view.appendChild(el("div", "pane-meta", `${n0(books.size)} book${books.size === 1 ? "" : "s"} · ${n0(cites)} citation${cites === 1 ? "" : "s"}${partial ? ` · from the ${n0(indexed)} of ${n0(works.length)} works indexed so far` : ""}`));
          const g = el("div", "bkgrid");
          const rows = [...books.entries()].sort((a, b) => b[1].n - a[1].n);
          const max = rows.length ? rows[0][1].n : 1;
          rows.forEach(([nm, v], k) => {
            const r = el("div", "bkrow");
            r.title = v.works.sort((a, b) => b[2] - a[2]).map(([, t, n]) => `${t} · ${n}`).join("\n");
            r.appendChild(el("b", "", nm));
            const bar = el("i");
            bar.style.width = `${Math.max(1, Math.round((v.n / max) * 50))}%`;
            bar.style.animationDelay = `${Math.min(k, 30) * 20}ms`;
            r.appendChild(bar);
            r.appendChild(el("span", "n", n0(v.n)));
            g.appendChild(r);
          });
          view.appendChild(g);
        });
      }
      const inb = ((nb && nb.cited_by) || []).filter((x) => x && x.a && x.w);
      const outb = ((nb && nb.cites) || []).filter((x) => x && x.a && x.w);
      if (inb.length || outb.length) {
        const sum = (xs) => xs.reduce((a, x) => a + x.w, 0);
        addTab("reception", inb.length ? `Reception · ${n0(sum(inb))}` : "Reception", (view) => {
          view.appendChild(el("div", "pane-topic", "Reception"));
          const meta = el("div", "pane-meta");
          const parts = [];
          if (inb.length) parts.push(`cited ${n0(sum(inb))} times by ${n0(inb.length)} author${inb.length === 1 ? "" : "s"}`);
          if (outb.length) parts.push(`draws on ${n0(outb.length)} author${outb.length === 1 ? "" : "s"} across ${n0(sum(outb))} citation${sum(outb) === 1 ? "" : "s"}`);
          meta.textContent = parts.join(" · ");
          view.appendChild(meta);
          const bar = el("div", "fr-own-rbar");
          const rin = el("button", "chip", `His reception · ${n0(sum(inb))}`);
          rin.id = "rin";
          const rout = el("button", "chip", `His sources · ${n0(sum(outb))}`);
          rout.id = "rout";
          const rq = el("input");
          rq.type = "search";
          rq.id = "rq";
          rq.placeholder = "Find an author…";
          bar.append(rin, rout, rq);
          view.appendChild(bar);
          const paneR = el("div", "rx-pane rx-reception-pane");
          view.appendChild(paneR);
          let dir = inb.length ? "in" : "out";
          const paint = () => {
            rin.classList.toggle("on", dir === "in");
            rout.classList.toggle("on", dir === "out");
            rin.setAttribute("aria-pressed", dir === "in" ? "true" : "false");
            rout.setAttribute("aria-pressed", dir === "out" ? "true" : "false");
            const f = A.fold(rq.value);
            const xs = (dir === "in" ? inb : outb).filter((x) => !f || A.fold(x.a).includes(f)).sort((a, b) => b.w - a.w);
            paneR.textContent = "";
            const head = el("div", "volhead", dir === "in" ? `Cited by · ${n0(sum(xs))} ` : `His sources · ${n0(sum(xs))} `);
            head.appendChild(el("span", "", `${n0(xs.length)} author${xs.length === 1 ? "" : "s"}`));
            paneR.appendChild(head);
            for (const x of xs) {
              const row = el("div", "rrow fr-own-rrow");
              const line = el("div", "fr-own-rline");
              const nm = el("span", "nm");
              nm.appendChild(link(`/the-faith-received/author/?a=${encodeURIComponent(x.s || x.a)}`, x.a));
              line.appendChild(nm);
              if (x.opp) line.appendChild(el("span", "rera", `refutes ${dir === "in" ? "him" : ""} ${n0(x.opp)}`.replace("  ", " ")));
              line.appendChild(el("span", "rn", `${n0(x.w)} citation${x.w === 1 ? "" : "s"}`));
              row.appendChild(line);
              paneR.appendChild(row);
            }
            if (!xs.length) paneR.appendChild(el("p", "rx-note", "No author by that name here."));
          };
          rin.disabled = !inb.length;
          rout.disabled = !outb.length;
          rin.addEventListener("click", () => { dir = "in"; paint(); });
          rout.addEventListener("click", () => { dir = "out"; paint(); });
          rq.addEventListener("input", paint);
          paint();
        });
      }
      addTab("search", "Search", (view) => {
        view.appendChild(el("div", "pane-topic", `Search ${name}`));
        view.appendChild(el("div", "pane-meta", `Searches the passages of ${works.length === 1 ? "this one work" : `these ${n0(works.length)} works`} on the library's search page.`));
        const form = el("form", "srow");
        form.action = "/the-faith-received/search/";
        form.method = "get";
        const q = el("input");
        q.type = "search";
        q.name = "q";
        q.required = true;
        q.placeholder = "A word, a phrase, a question…";
        q.setAttribute("aria-label", `Search ${name}`);
        const au = el("input");
        au.type = "hidden";
        au.name = "author";
        au.value = name;
        const go = el("button", "", "Find");
        go.type = "submit";
        form.append(q, au, go);
        view.appendChild(form);
      });
      // The tab the address asked for, once it exists; otherwise the
      // works again, so their rows carry the page counts (unless the
      // reader has moved on or started typing a filter).
      const on = tabs.find((x) => x.b.classList.contains("on"));
      const typing = body.querySelector(".rx-search input");
      if (wantTab !== "works" && tabs.some((x) => x.id === wantTab)) show(wantTab);
      else if (on && on.id === "works" && !(typing && typing.value) && document.activeElement !== typing) show("works");
    });
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
    if (window.MOAuthorLabels) await window.MOAuthorLabels.ready.catch(() => null);
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
