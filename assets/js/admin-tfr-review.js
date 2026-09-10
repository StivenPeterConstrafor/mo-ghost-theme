/*
 * The Faith Received — the review desk.
 *
 * Ported from the corpus owner's review surface. His is a mode of his
 * reader: an owner flag turns it on, every page of the open work gets
 * a bar with OK / Needs work / Redo, a summary strip counts how many
 * pages are in each state, and one key jumps to the next page nobody
 * has looked at. That last part is the whole idea. Reviewing a library
 * is not browsing it; it is working through a queue, and the queue has
 * to tell you where you stopped.
 *
 * ── What changed, and why ───────────────────────────────────────────
 *
 * His unit is a page inside a work. Ours is a work, because that is
 * what our database records. tfr_work_review holds one row per work
 * with a status of "needs" or "reviewed"; tfr_work_revisions is an
 * append-only list of what has been corrected in it; tfr_issue_reports
 * holds what readers have complained about. There is no per-page
 * review state anywhere in this estate and no route that would write
 * one, so the desk counts works, not folios.
 *
 * Three things of his that survive the change of unit intact:
 *   - the running tally, with "nobody has checked this" as the
 *     default rather than as an error state;
 *   - "next unreviewed", which here has to page the catalogue to find
 *     one and says so while it does;
 *   - the keyboard, so a reviewer working a queue is not clicking.
 *
 * Three things of his that are dropped rather than faked:
 *   - editing the text in place. His posts a replacement page to a
 *     dev worker. We have no route that writes work text and should
 *     not invent one from a browser.
 *   - re-running an agent over a page. Same reason, plus it spends
 *     money on an LLM from an admin page with no budget in front of
 *     it.
 *   - his "viewed" and "agent-redone" states. Our table has two
 *     states. A pill for a state nothing can ever set is a lie in the
 *     shape of a feature.
 *
 * ── The gate ────────────────────────────────────────────────────────
 *
 * His gate is a client-side owner flag from an ungated dev worker,
 * which is not a gate. Ours is the one every other admin board uses:
 * window.MOAuth.fetch carries the Ghost member JWT, and mo-admin
 * decides. POST /tfr/review and POST /tfr/revisions are both claimed
 * by the "tfr" tool in the admin registry (_shared/admin-tools.js), so
 * a caller is either Ghost staff or holds that grant, and neither is
 * something this file can assert on its own behalf. Nothing here is
 * hidden as a security measure: the controls render, the writes are
 * refused server-side, and a 401 or 403 is reported as what it is.
 *
 * Reads come from GET /v1/work-status on the library worker, which is
 * public on purpose (a reader judging a machine translation should not
 * need an account to see how far it has been checked) and takes up to
 * sixty work ids at a time, which is what makes a page of the desk one
 * request instead of sixty.
 */
(function () {
  "use strict";

  const root = document.querySelector("[data-tfr-review]");
  if (!root) return;

  const adminUrl = (root.getAttribute("data-admin-url") || "").replace(/\/$/, "");
  const baseMeta = document.querySelector('meta[name="tfr-library-base"]');
  const LIBRARY = ((baseMeta && baseMeta.getAttribute("content"))
    || "https://mo-tfr-library.mo-podcast-feed.workers.dev").replace(/\/+$/, "");

  const pickEl = root.querySelector("[data-review-corpus]");
  const searchEl = root.querySelector("[data-review-search]");
  const statusEl = root.querySelector("[data-review-status]");
  const tallyEl = root.querySelector("[data-review-tally]");
  const listEl = root.querySelector("[data-review-list]");
  const pagerEl = root.querySelector("[data-review-pager]");
  const nextEl = root.querySelector("[data-review-next]");
  const filterEls = root.querySelectorAll("[data-review-filter]");

  // Only the two catalogues the library worker serves itself. Early
  // English Books and the Patrologias keep their catalogues on the
  // corpus owner's own hosts, and an admin board is the wrong place to
  // start talking to those: one backend, or none.
  const COLLECTIONS = {
    tfr: {
      label: "The Latin Library",
      path: "/v1/works-index.json",
      pick: (d) => (d && d.works) || [],
      // 17,064 rows in this catalogue are pointers at the four sister
      // collections and carry a title with no text behind it. Reviewing
      // one would be reviewing nothing. Same predicate faith-corpora.js
      // uses to keep them off the shelves.
      exclude: (w) => /^(pld|pg|po|eebo)-\d+$/.test(w.slug || ""),
      row: (w) => ({
        id: w.slug,
        title: w.title || w.slug,
        by: [w.author, w.volume].filter(Boolean).join(" · "),
      }),
    },
    confessions: {
      label: "Creeds, Confessions & Catechisms",
      path: "/v1/confessions-index.json",
      pick: (d) => (d && d.confessions) || [],
      exclude: () => false,
      row: (c) => ({
        id: c.slug,
        title: c.title || c.slug,
        by: [c.tradition, c.year ? String(c.year) : ""].filter(Boolean).join(" · "),
      }),
    },
  };

  // The worker's own cap on /v1/work-status is sixty ids, which is
  // what sets the page size here.
  const PER_PAGE = 60;
  // How many pages "next unreviewed" will pull through before it stops
  // and says so, rather than walking a whole catalogue in the
  // background.
  const SCAN_LIMIT = 40;

  let corpus = "tfr";
  // The whole collection, sorted; the search narrows a view of it.
  let catalogue = [];
  let page = 1;
  let filter = "all";
  // Work id to status row, kept across pages so the tally and the
  // filters can see everything this session has looked at.
  const status = new Map();
  let busy = false;

  const me = (document.body && document.body.getAttribute("data-member-email")) || "";

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function say(text, isError) {
    if (!statusEl) return;
    statusEl.textContent = text || "";
    statusEl.classList.toggle("is-error", !!isError);
  }

  function when(iso) {
    if (!iso) return "";
    // SQLite's datetime('now') carries no zone marker; it is UTC.
    const d = new Date(/[Zz+]|\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`);
    if (isNaN(d)) return String(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function fold(s) {
    return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  // ── The catalogue ───────────────────────────────────────────

  const catalogueCache = new Map();

  function loadCatalogue(id) {
    if (catalogueCache.has(id)) return catalogueCache.get(id);
    const spec = COLLECTIONS[id];
    const p = fetch(`${LIBRARY}${spec.path}`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((d) => spec.pick(d).filter((w) => !spec.exclude(w)).map(spec.row).filter((r) => r.id))
      .then((rows) => rows.sort((a, b) => a.title.localeCompare(b.title)));
    catalogueCache.set(id, p);
    return p;
  }

  function searched() {
    const q = fold(searchEl && searchEl.value || "").trim();
    if (!q) return catalogue;
    return catalogue.filter((r) => fold(`${r.title} ${r.by} ${r.id}`).indexOf(q) >= 0);
  }

  function pageRows() {
    const all = searched();
    const start = (page - 1) * PER_PAGE;
    return { all, rows: all.slice(start, start + PER_PAGE) };
  }

  // ── Status ──────────────────────────────────────────────────
  //
  // A work with no row has not been reviewed. That is the default and
  // the honest one: silence means nobody has checked it, never that it
  // is fine.
  const BLANK = { review: "needs", reviewedAt: null, reviewer: null, reports: { open: 0, done: 0 } };

  function loadStatus(ids) {
    const want = ids.filter((id) => !status.has(id));
    if (!want.length) return Promise.resolve();
    const q = `c=${encodeURIComponent(corpus)}&w=${encodeURIComponent(want.join(","))}`;
    return fetch(`${LIBRARY}/v1/work-status?${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const works = (data && data.works) || {};
        want.forEach((id) => {
          const w = works[id];
          status.set(id, w ? {
            review: w.review || "needs",
            reviewedAt: w.reviewedAt || null,
            reviewer: w.reviewer || null,
            reports: w.reports || { open: 0, done: 0 },
          } : { ...BLANK, reports: { open: 0, done: 0 } });
        });
      })
      .catch(() => {
        // A failed lookup must not read as "reviewed". Leave the ids
        // unset so the row says the status is unknown.
      });
  }

  function stateOf(id) {
    return status.get(id) || null;
  }

  // ── Drawing ─────────────────────────────────────────────────

  function tally() {
    if (!tallyEl) return;
    tallyEl.innerHTML = "";
    let reviewed = 0;
    let needs = 0;
    let reported = 0;
    status.forEach((s) => {
      if (s.review === "reviewed") reviewed += 1; else needs += 1;
      if (s.reports && s.reports.open) reported += 1;
    });
    const checked = status.size;
    const pills = [
      ["is-reviewed", reviewed, "reviewed"],
      ["is-needs", needs, "not yet reviewed"],
      ["is-reported", reported, "with an open report"],
    ];
    pills.forEach(([cls, n, label]) => {
      const pill = el("span", `tfr-review-pill ${cls}`);
      pill.appendChild(el("b", null, n.toLocaleString()));
      pill.appendChild(document.createTextNode(` ${label}`));
      tallyEl.appendChild(pill);
    });
    // Said plainly, because these are not collection totals and must
    // never be read as any. Nothing sweeps the whole catalogue: the
    // desk knows about the works it has looked at.
    tallyEl.appendChild(el("span", "tfr-review-tally-note",
      `of ${checked.toLocaleString()} looked at so far, in a collection of ${catalogue.length.toLocaleString()}`));
  }

  function pillFor(s) {
    if (!s) return el("span", "tfr-review-pill is-unknown", "Status unavailable");
    const reviewed = s.review === "reviewed";
    const pill = el("span", `tfr-review-pill ${reviewed ? "is-reviewed" : "is-needs"}`,
      reviewed ? "Reviewed" : "Needs review");
    if (reviewed && s.reviewedAt) pill.title = `Marked reviewed ${when(s.reviewedAt)}${s.reviewer ? ` by ${s.reviewer}` : ""}`;
    return pill;
  }

  function matchesFilter(s) {
    if (filter === "all") return true;
    if (!s) return false;
    if (filter === "needs") return s.review !== "reviewed";
    if (filter === "reviewed") return s.review === "reviewed";
    if (filter === "reported") return !!(s.reports && s.reports.open);
    return true;
  }

  function row(item) {
    const s = stateOf(item.id);
    const li = el("li", "tfr-review-row");
    li.setAttribute("data-review-work", item.id);

    const head = el("div", "tfr-review-head");
    const name = el("div", "tfr-review-name");
    name.appendChild(el("p", "tfr-review-title", item.title));
    if (item.by) name.appendChild(el("p", "tfr-review-by", item.by));
    head.appendChild(name);

    const marks = el("div", "tfr-review-marks");
    marks.appendChild(pillFor(s));
    if (s && s.reports && (s.reports.open || s.reports.done)) {
      const r = el("span", `tfr-review-pill ${s.reports.open ? "is-reported" : "is-quiet"}`);
      r.appendChild(el("b", null, String(s.reports.open)));
      r.appendChild(document.createTextNode(` open · ${s.reports.done} settled`));
      marks.appendChild(r);
    }
    head.appendChild(marks);
    li.appendChild(head);

    const acts = el("div", "tfr-review-acts");

    const reviewed = !!(s && s.review === "reviewed");
    const mark = el("button", "tfr-review-btn", reviewed ? "Mark not reviewed" : "Mark reviewed");
    mark.type = "button";
    mark.addEventListener("click", () => setReview(item.id, reviewed ? "needs" : "reviewed", mark, li));
    acts.appendChild(mark);

    const record = el("button", "tfr-review-btn", "Record a correction");
    record.type = "button";
    record.addEventListener("click", () => openCorrection(item, li, record));
    acts.appendChild(record);

    const history = el("button", "tfr-review-btn", "History");
    history.type = "button";
    history.addEventListener("click", () => openHistory(item, li, history));
    acts.appendChild(history);

    const open = el("a", "tfr-review-btn tfr-review-btn--link", "Open in the reader");
    open.target = "_blank";
    open.rel = "noopener";
    window.MOSafeHref.set(
      open,
      `/the-faith-received/reader/?w=${encodeURIComponent(item.id)}`,
      "/the-faith-received/"
    );
    acts.appendChild(open);

    li.appendChild(acts);
    li.appendChild(el("p", "tfr-review-msg"));
    return li;
  }

  function draw() {
    const { all, rows } = pageRows();
    listEl.innerHTML = "";

    const shown = rows.filter((r) => matchesFilter(stateOf(r.id)));
    if (!shown.length) {
      listEl.appendChild(el("p", "tfr-review-empty", rows.length
        ? "Nothing on this page is in that state."
        : "Nothing in this collection matches that search."));
    } else {
      const ol = el("ul", "tfr-review-list");
      shown.forEach((item) => ol.appendChild(row(item)));
      listEl.appendChild(ol);
    }

    const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    pagerEl.innerHTML = "";
    if (pages > 1) {
      const prev = el("button", "tfr-review-page", "‹ Previous");
      prev.type = "button";
      prev.disabled = page <= 1;
      prev.addEventListener("click", () => { page -= 1; load(); });
      const at = el("span", "tfr-review-page-at",
        `Page ${page.toLocaleString()} of ${pages.toLocaleString()}`);
      const next = el("button", "tfr-review-page", "Next ›");
      next.type = "button";
      next.disabled = page >= pages;
      next.addEventListener("click", () => { page += 1; load(); });
      pagerEl.appendChild(prev);
      pagerEl.appendChild(at);
      pagerEl.appendChild(next);
    }

    tally();
  }

  function load() {
    const { all, rows } = pageRows();
    if (!all.length) { draw(); say(""); return; }
    say("Loading the status of this page…");
    loadStatus(rows.map((r) => r.id)).then(() => {
      say(`${all.length.toLocaleString()} works in view.`);
      draw();
    });
  }

  // ── Next unreviewed ─────────────────────────────────────────
  //
  // His keyboard jump, which on his page only had to look inside one
  // work's pages. Here it has to page a catalogue, so it says what it
  // is doing and stops rather than pulling thousands of rows through
  // in the background.
  function nextUnreviewed() {
    if (busy) return;
    const all = searched();
    if (!all.length) return;
    busy = true;
    const startPage = page;
    const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));

    function step(offset) {
      if (offset > Math.min(pages, SCAN_LIMIT)) {
        busy = false;
        say(`Nothing unreviewed in the ${Math.min(pages, SCAN_LIMIT).toLocaleString()} pages searched. `
          + "Move further into the collection and try again.", false);
        return;
      }
      const at = ((startPage - 1 + offset) % pages) + 1;
      const rows = all.slice((at - 1) * PER_PAGE, at * PER_PAGE);
      say(`Looking for the next unreviewed work, page ${at.toLocaleString()} of ${pages.toLocaleString()}…`);
      loadStatus(rows.map((r) => r.id)).then(() => {
        const hit = rows.find((r) => {
          const s = stateOf(r.id);
          return s && s.review !== "reviewed";
        });
        if (!hit) { step(offset + 1); return; }
        busy = false;
        page = at;
        draw();
        say(`Next unreviewed: ${hit.title}`);
        // Found by walking the rendered rows rather than by building a
        // selector out of a slug that came from a catalogue file.
        const node = Array.prototype.slice
          .call(listEl.querySelectorAll("[data-review-work]"))
          .find((n) => n.getAttribute("data-review-work") === hit.id);
        if (node) {
          node.scrollIntoView({ block: "center", behavior: "smooth" });
          node.classList.add("is-found");
          window.setTimeout(() => node.classList.remove("is-found"), 1600);
        }
      });
    }
    step(0);
  }

  // ── Writes ──────────────────────────────────────────────────
  //
  // Every one of these is refused by mo-admin unless the caller is
  // staff or holds the "tfr" grant. Nothing below assumes it will
  // succeed, and a refusal is printed on the row rather than swallowed.

  function msgOn(li, text, bad) {
    const p = li.querySelector(".tfr-review-msg");
    if (!p) return;
    p.textContent = text || "";
    p.classList.toggle("is-bad", !!bad);
  }

  function refusal(r) {
    if (r.status === 401) return "You are not signed in.";
    if (r.status === 403) return "You do not have access to the review desk.";
    return `That did not save (${r.status}).`;
  }

  function setReview(id, next, btn, li) {
    if (!adminUrl) { msgOn(li, "The admin worker URL is not configured.", true); return; }
    btn.disabled = true;
    msgOn(li, "Saving…");
    window.MOAuth.fetch(`${adminUrl}/tfr/review`, {
      method: "POST",
      credentials: "omit",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ corpus, workId: id, status: next, reviewer: me }),
    })
      .then((r) => {
        if (!r.ok) { msgOn(li, refusal(r), true); btn.disabled = false; return null; }
        return r.json();
      })
      .then((res) => {
        if (!res || !res.ok) { btn.disabled = false; return; }
        const s = stateOf(id) || { ...BLANK, reports: { open: 0, done: 0 } };
        status.set(id, {
          ...s,
          review: next,
          reviewedAt: next === "reviewed" ? new Date().toISOString() : null,
          reviewer: next === "reviewed" ? me : null,
        });
        draw();
      })
      .catch(() => { msgOn(li, "That did not save. Try again.", true); btn.disabled = false; });
  }

  // A correction is append-only, and it is published: the reader's
  // Translation Transparency panel prints this list on the work's own
  // page. So the field says so, and there is no edit and no delete.
  function openCorrection(item, li, btn) {
    if (li.querySelector("[data-review-correction]")) return;
    btn.disabled = true;
    const form = el("form", "tfr-review-correction");
    form.setAttribute("data-review-correction", "");

    const label = el("label", "tfr-review-label", "What was corrected?");
    const input = el("input", "tfr-review-input");
    input.type = "text";
    input.maxLength = 500;
    input.required = true;
    input.placeholder = "One sentence, published on the work's page";
    label.appendChild(input);
    form.appendChild(label);

    const acts = el("div", "tfr-review-correction-acts");
    const save = el("button", "tfr-review-btn tfr-review-btn--primary", "Record it");
    save.type = "submit";
    const cancel = el("button", "tfr-review-btn", "Cancel");
    cancel.type = "button";
    cancel.addEventListener("click", () => { form.remove(); btn.disabled = false; });
    acts.appendChild(save);
    acts.appendChild(cancel);
    form.appendChild(acts);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const summary = input.value.trim();
      if (!summary) { msgOn(li, "Say what changed.", true); return; }
      if (!adminUrl) { msgOn(li, "The admin worker URL is not configured.", true); return; }
      save.disabled = true;
      msgOn(li, "Saving…");
      window.MOAuth.fetch(`${adminUrl}/tfr/revisions`, {
        method: "POST",
        credentials: "omit",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ corpus, workId: item.id, summary, source: "editorial", author: me }),
      })
        .then((r) => {
          if (!r.ok) { msgOn(li, refusal(r), true); save.disabled = false; return null; }
          return r.json();
        })
        .then((res) => {
          if (!res || !res.ok) { save.disabled = false; return; }
          form.remove();
          btn.disabled = false;
          msgOn(li, "Recorded. It is now on the work's page.");
        })
        .catch(() => { msgOn(li, "That did not save. Try again.", true); save.disabled = false; });
    });

    li.insertBefore(form, li.querySelector(".tfr-review-msg"));
    input.focus();
  }

  // /v1/work-status returns the correction history only when a single
  // work is asked for: a page of the desk wants badges, not every
  // change ever made to sixty books. So the history is a second call,
  // made when somebody asks for it.
  function openHistory(item, li, btn) {
    const existing = li.querySelector("[data-review-history]");
    if (existing) { existing.remove(); btn.classList.remove("is-active"); return; }
    btn.classList.add("is-active");
    const box = el("div", "tfr-review-history");
    box.setAttribute("data-review-history", "");
    box.appendChild(el("p", "tfr-review-history-loading", "Loading…"));
    li.insertBefore(box, li.querySelector(".tfr-review-msg"));

    const q = `c=${encodeURIComponent(corpus)}&w=${encodeURIComponent(item.id)}`;
    fetch(`${LIBRARY}/v1/work-status?${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        box.innerHTML = "";
        const w = data && data.works && data.works[item.id];
        const revs = (w && w.revisions) || [];
        if (!revs.length) {
          box.appendChild(el("p", "tfr-review-history-empty", "Nothing has been changed in this work yet."));
          return;
        }
        const ol = el("ol", "tfr-review-history-list");
        revs.forEach((r) => {
          const entry = el("li");
          entry.appendChild(el("span", "tfr-review-history-date", when(r.at)));
          entry.appendChild(el("span", "tfr-review-history-what", r.summary || ""));
          if (r.author) entry.appendChild(el("span", "tfr-review-history-who", r.author));
          ol.appendChild(entry);
        });
        box.appendChild(ol);
      })
      .catch(() => {
        box.innerHTML = "";
        box.appendChild(el("p", "tfr-review-history-empty", "The history could not be loaded."));
      });
  }

  // ── Wiring ──────────────────────────────────────────────────

  function openCorpus(id) {
    corpus = COLLECTIONS[id] ? id : "tfr";
    page = 1;
    status.clear();
    listEl.innerHTML = "";
    pagerEl.innerHTML = "";
    say(`Loading ${COLLECTIONS[corpus].label}…`);
    loadCatalogue(corpus)
      .then((rows) => {
        catalogue = rows;
        load();
      })
      .catch(() => {
        catalogue = [];
        say("That collection's catalogue could not be loaded.", true);
        draw();
      });
  }

  if (pickEl) {
    Object.keys(COLLECTIONS).forEach((id) => {
      const opt = el("option", null, COLLECTIONS[id].label);
      opt.value = id;
      pickEl.appendChild(opt);
    });
    pickEl.addEventListener("change", () => openCorpus(pickEl.value));
  }

  let searchTimer = null;
  if (searchEl) {
    searchEl.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => { page = 1; load(); }, 220);
    });
  }

  filterEls.forEach((btn) => {
    btn.addEventListener("click", () => {
      filter = btn.getAttribute("data-review-filter") || "all";
      filterEls.forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-current", on);
        b.setAttribute("aria-pressed", String(on));
      });
      draw();
    });
  });

  if (nextEl) nextEl.addEventListener("click", nextUnreviewed);

  // His one key, kept. A reviewer working a queue should not be
  // reaching for the mouse between works.
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key !== "u") return;
    const t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || "")) return;
    if (!root.contains(document.activeElement) && document.activeElement !== document.body) return;
    e.preventDefault();
    nextUnreviewed();
  });

  openCorpus("tfr");
}());
