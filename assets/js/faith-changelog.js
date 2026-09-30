/*
 * The Faith Received — the changelog of corrections and open reports.
 *
 * Ian, 2026-09-30, on the transparency page:
 *   - a running changelog of every change made to a work, requested or
 *     not, with the work's title, author, link, date and what changed;
 *   - site-wide fixes and features too, labeled so ("All works");
 *   - a toggle between Open reports and Closed reports;
 *   - a thumbs up and a thumbs down on each open report, with counts
 *     under them (closed ones take no votes);
 *   - sortable by date, up votes and down votes; paged.
 *   - one change is one entry: rows written at the same moment with the
 *     same description (one fix across eight volumes) are grouped, and
 *     the works it touched are listed on it.
 *
 * Everything comes from mo-forms GET /tfr-changes:
 *   changes  tfr_work_revisions, the same rows each work's own
 *            transparency panel shows. Staff add to it from the
 *            /admin/tfr/ inbox.
 *   open     reports still open that the hourly health check has given a
 *            one-line public summary. Nothing a reader typed and nothing
 *            about who they are reaches this page.
 * Votes go to POST /tfr-vote; this browser remembers its own vote so the
 * button shows it and a second tap takes it back.
 */
(function () {
  const root = document.querySelector("[data-faith-changelog]");
  if (!root) return;

  const API = "https://mo-forms.mo-podcast-feed.workers.dev";
  const PAGE = 20;
  const MINE_KEY = "tfr_votes_v1";
  const $ = (sel) => root.querySelector(sel);
  const listEl = $("[data-cl-list]");
  const countEl = $("[data-cl-count]");
  const sortEl = $("[data-cl-sort]");
  const pagerEl = $("[data-cl-pager]");
  const atEl = $("[data-cl-at]");
  const prevEl = $("[data-cl-prev]");
  const nextEl = $("[data-cl-next]");
  const tabs = [...root.querySelectorAll("[data-cl-view]")];

  const data = { closed: [], open: [] };
  let view = "closed";
  let page = 0;
  let mine = {};
  try { mine = JSON.parse(localStorage.getItem(MINE_KEY) || "{}") || {}; } catch (_) { mine = {}; }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // D1 writes "YYYY-MM-DD HH:MM:SS" in UTC.
  function day(at) {
    const d = new Date(`${String(at || "").replace(" ", "T")}Z`);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function href(r) {
    if (!r.work || r.corpus === "site") return "";
    const c = r.corpus && r.corpus !== "tfr" ? `&c=${encodeURIComponent(r.corpus)}` : "";
    return `/the-faith-received/read/?w=${encodeURIComponent(r.work)}${c}`;
  }

  /* One label per change, saying who made it (Ian, 2026-09-30: "Any fix
     I make is a staff fix"). Whether it touched one work or all of them
     is already in the title ("All works"), so scope is not a label. */
  function label(r) {
    if (r.source === "report") return "Reported";
    if (r.source === "committee") return "Committee";
    if (r.source === "feature") return "Feature";
    return "Staff";
  }

  const THUMB = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">'
    + '<path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" '
    + 'd="M7 10v10H4V10h3Zm0 0 4-7c1.5 0 2.5 1.1 2.2 2.6L12.6 9H18a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 16.8 20H7"/></svg>';

  function votes(kind, r) {
    const key = `${kind}:${r.id}`;
    const my = mine[key] || 0;
    const btn = (v, n, name) => `<span class="faith-tp-vote">`
      + `<button type="button" class="faith-tp-vote-btn${v < 0 ? " is-down" : ""}" data-vote="${v}" data-key="${key}"`
      + ` aria-pressed="${my === v}" aria-label="${name}">${THUMB}</button>`
      + `<span class="faith-tp-vote-n" data-n="${v}">${n}</span></span>`;
    return `<span class="faith-tp-votes">${btn(1, r.up || 0, "Thumbs up")}${btn(-1, r.down || 0, "Thumbs down")}</span>`;
  }

  function workName(r) {
    const link = href(r);
    const title = escapeHtml(r.title || r.work || "All works");
    return link ? `<a class="faith-tp-log-work" href="${escapeHtml(link)}">${title}</a>`
      : `<span class="faith-tp-log-work">${title}</span>`;
  }
  const byLine = (a) => (a ? `<span class="faith-tp-log-author">${escapeHtml(a)}</span>` : "");

  /* The works one change touched. Volumes of one set fold into one line:
     "Annotations on the New Testament · Hugo Grotius (Vol. 1, Vol. 2, …)",
     each volume its own link. */
  function worksLine(items) {
    if (items.length === 1) return workName(items[0]) + byLine(items[0].author);
    const sets = new Map();
    items.forEach((r) => {
      const m = /^(.*) \(([^()]+)\)$/.exec(r.title || "");
      const base = m ? m[1] : (r.title || r.work);
      const key = `${base}|${r.author}`;
      if (!sets.has(key)) sets.set(key, { base, author: r.author, vols: [] });
      sets.get(key).vols.push({ r, vol: m ? m[2] : "" });
    });
    return [...sets.values()].map((set) => {
      if (set.vols.length === 1) return workName(set.vols[0].r) + byLine(set.author);
      const vols = set.vols
        .sort((x, y) => x.vol.localeCompare(y.vol, "en", { numeric: true }))
        .map(({ r, vol }) => `<a href="${escapeHtml(href(r))}">${escapeHtml(vol)}</a>`).join(", ");
      return `<span class="faith-tp-log-work">${escapeHtml(set.base)}</span>${byLine(set.author)}`
        + ` <span class="faith-tp-log-vols">(${vols})</span>`;
    }).join('<span class="faith-tp-log-sep">; </span>');
  }

  function item(r) {
    const open = view === "open";
    const tag = open ? "" : `<span class="faith-tp-log-tag">${label(r)}</span>`;
    return `<li class="faith-tp-log-item${open ? "" : " is-closed"}">`
      + `<time class="faith-tp-log-date" datetime="${escapeHtml(r.at)}">${escapeHtml(day(r.at))}</time>`
      + `<span class="faith-tp-log-main">${open ? workName(r) + byLine(r.author) : worksLine(r.items)}${tag}`
      + `<span class="faith-tp-log-what">${escapeHtml(r.summary)}</span></span>`
      + `${open ? votes("report", r) : ""}</li>`;
  }

  // One change, one entry: same moment, same description.
  function group(rows) {
    const out = new Map();
    rows.forEach((r) => {
      const key = `${r.at}|${r.summary}`;
      if (!out.has(key)) out.set(key, { at: r.at, summary: r.summary, corpus: r.corpus, source: r.source, items: [] });
      const g = out.get(key);
      g.items.push(r);
      if (r.source === "report") g.source = "report";
    });
    return [...out.values()];
  }

  function sorted() {
    const rows = data[view].slice();
    const by = sortEl.value;
    const date = (x, y) => String(y.at).localeCompare(String(x.at));
    if (by === "old") rows.sort((x, y) => -date(x, y));
    else if (view === "closed") rows.sort(date);
    else if (by === "up") rows.sort((x, y) => (y.up - x.up) || date(x, y));
    else if (by === "down") rows.sort((x, y) => (y.down - x.down) || date(x, y));
    else rows.sort(date);
    return rows;
  }

  function paint() {
    const rows = sorted();
    const pages = Math.max(1, Math.ceil(rows.length / PAGE));
    page = Math.min(page, pages - 1);
    listEl.innerHTML = rows.length
      ? rows.slice(page * PAGE, (page + 1) * PAGE).map(item).join("")
      : `<li class="faith-tp-log-item faith-tp-log-empty">${view === "open"
        ? "No open reports right now." : "Nothing has been changed yet."}</li>`;
    pagerEl.hidden = pages < 2;
    atEl.textContent = `Page ${page + 1} of ${pages}`;
    prevEl.disabled = page === 0;
    nextEl.disabled = page >= pages - 1;
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.clView === view)));
  }

  // Votes, and so the vote sorts, belong to open reports only.
  function sortOptions() {
    sortEl.querySelectorAll('option[value="up"], option[value="down"]').forEach((o) => {
      o.hidden = view !== "open";
      o.disabled = view !== "open";
    });
    if (view !== "open" && (sortEl.value === "up" || sortEl.value === "down")) sortEl.value = "new";
  }

  tabs.forEach((t) => t.addEventListener("click", () => { view = t.dataset.clView; page = 0; sortOptions(); paint(); }));
  sortEl.addEventListener("change", () => { page = 0; paint(); });
  prevEl.addEventListener("click", () => { page -= 1; paint(); });
  nextEl.addEventListener("click", () => { page += 1; paint(); });

  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-vote]");
    if (!btn || btn.disabled) return;
    const key = btn.dataset.key;
    const [kind, id] = key.split(":");
    if (kind !== "report") return;
    const pressed = Number(btn.dataset.vote);
    const vote = mine[key] === pressed ? 0 : pressed;
    const row = btn.closest(".faith-tp-votes");
    row.querySelectorAll("button").forEach((b) => { b.disabled = true; });
    fetch(`${API}/tfr-vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, id: Number(id), vote }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (!res || !res.ok) throw new Error("vote");
        if (vote) mine[key] = vote; else delete mine[key];
        try { localStorage.setItem(MINE_KEY, JSON.stringify(mine)); } catch (_) { /* private mode */ }
        const rec = data.open.find((x) => String(x.id) === id);
        if (rec) { rec.up = res.up; rec.down = res.down; }
        row.querySelector('[data-n="1"]').textContent = res.up;
        row.querySelector('[data-n="-1"]').textContent = res.down;
        row.querySelectorAll("button").forEach((b) => {
          b.setAttribute("aria-pressed", String(Number(b.dataset.vote) === vote));
        });
      })
      .catch(() => { /* the count stays as it was */ })
      .finally(() => { row.querySelectorAll("button").forEach((b) => { b.disabled = false; }); });
  });

  fetch(`${API}/tfr-changes`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((res) => {
      data.closed = group((res && res.changes) || []);
      data.open = (res && res.open) || [];
      const n = data.closed.length;
      const o = data.open.length;
      countEl.textContent = `${n.toLocaleString()} change${n === 1 ? "" : "s"} · ${o.toLocaleString()} open report${o === 1 ? "" : "s"}`;
      tabs.forEach((t) => {
        const c = t.querySelector("[data-cl-n]");
        if (c) c.textContent = (t.dataset.clView === "open" ? o : n).toLocaleString();
      });
      sortOptions();
      paint();
    })
    .catch(() => {
      // Never "no changes": a failed read must not look like a clean record.
      countEl.textContent = "Could not load";
      listEl.innerHTML = `<li class="faith-tp-log-item faith-tp-log-empty">The changelog could not be loaded. Reload the page to try again.</li>`;
    });
}());
