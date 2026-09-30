/*
 * The Faith Received — the changelog of corrections and open reports.
 *
 * Ian, 2026-09-30, on the transparency page:
 *   - a running changelog of every change made to a work, requested or
 *     not, with the work's title, author, link, date and what changed;
 *   - site-wide fixes and features too, labeled so ("All works");
 *   - a toggle between Open reports and Closed reports;
 *   - a thumbs up and a thumbs down on each item, with counts under them;
 *   - sortable by date, up votes and down votes; collapsible and paged.
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

  // One label per change, from where it came from.
  function label(r) {
    if (r.source === "report") return "Reported";
    if (r.source === "committee") return "Committee";
    if (r.source === "feature") return "Feature";
    if (r.corpus === "site") return "Site fix";
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

  function item(r) {
    const kind = view === "open" ? "report" : "change";
    const link = href(r);
    const title = escapeHtml(r.title || r.work || "All works");
    const name = link ? `<a class="faith-tp-log-work" href="${escapeHtml(link)}">${title}</a>`
      : `<span class="faith-tp-log-work">${title}</span>`;
    const author = r.author ? `<span class="faith-tp-log-author">${escapeHtml(r.author)}</span>` : "";
    const tag = view === "closed" ? `<span class="faith-tp-log-tag">${label(r)}</span>` : "";
    return `<li class="faith-tp-log-item">`
      + `<time class="faith-tp-log-date" datetime="${escapeHtml(r.at)}">${escapeHtml(day(r.at))}</time>`
      + `<span class="faith-tp-log-main">${name}${author}${tag}`
      + `<span class="faith-tp-log-what">${escapeHtml(r.summary)}</span></span>`
      + `${votes(kind, r)}</li>`;
  }

  function sorted() {
    const rows = data[view].slice();
    const by = sortEl.value;
    const date = (x, y) => String(y.at).localeCompare(String(x.at));
    if (by === "old") rows.sort((x, y) => -date(x, y));
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

  tabs.forEach((t) => t.addEventListener("click", () => { view = t.dataset.clView; page = 0; paint(); }));
  sortEl.addEventListener("change", () => { page = 0; paint(); });
  prevEl.addEventListener("click", () => { page -= 1; paint(); });
  nextEl.addEventListener("click", () => { page += 1; paint(); });

  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-vote]");
    if (!btn || btn.disabled) return;
    const key = btn.dataset.key;
    const [kind, id] = key.split(":");
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
        const rec = data[kind === "report" ? "open" : "closed"].find((x) => String(x.id) === id);
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
      data.closed = (res && res.changes) || [];
      data.open = (res && res.open) || [];
      const n = data.closed.length;
      const o = data.open.length;
      countEl.textContent = `${n.toLocaleString()} change${n === 1 ? "" : "s"} · ${o.toLocaleString()} open report${o === 1 ? "" : "s"}`;
      tabs.forEach((t) => {
        const c = t.querySelector("[data-cl-n]");
        if (c) c.textContent = (t.dataset.clView === "open" ? o : n).toLocaleString();
      });
      paint();
    })
    .catch(() => {
      // Never "no changes": a failed read must not look like a clean record.
      countEl.textContent = "Could not load";
      listEl.innerHTML = `<li class="faith-tp-log-item faith-tp-log-empty">The changelog could not be loaded. Reload the page to try again.</li>`;
    });
}());
