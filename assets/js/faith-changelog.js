/*
 * The Faith Received — the changelog of corrections.
 *
 * Ian, 2026-09-30: "a running changelog of all works" on the transparency
 * page, collapsible, compact, each entry with the work's title, author,
 * a link to it, the date and what changed.
 *
 * The rows are tfr_work_revisions, the same table each work's own
 * transparency panel reads, served newest first by mo-forms
 * GET /tfr-changes. Staff add to it when they settle a report in the
 * /admin/tfr/ inbox, so this list and the per-work panels cannot
 * disagree. Twenty-five at a time.
 */
(function () {
  const root = document.querySelector("[data-faith-changelog]");
  if (!root) return;

  const ENDPOINT = "https://mo-forms.mo-podcast-feed.workers.dev/tfr-changes";
  const PAGE = 25;
  const listEl = root.querySelector("[data-cl-list]");
  const countEl = root.querySelector("[data-cl-count]");
  const moreEl = root.querySelector("[data-cl-more]");
  let rows = [];
  let shown = 0;

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
    const c = r.corpus && r.corpus !== "tfr" ? `&c=${encodeURIComponent(r.corpus)}` : "";
    return `/the-faith-received/read/?w=${encodeURIComponent(r.work)}${c}`;
  }

  function item(r) {
    const title = escapeHtml(r.title || r.work);
    const author = r.author ? `<span class="faith-tp-log-author">${escapeHtml(r.author)}</span>` : "";
    return `<li class="faith-tp-log-item">`
      + `<time class="faith-tp-log-date" datetime="${escapeHtml(r.at)}">${escapeHtml(day(r.at))}</time>`
      + `<span class="faith-tp-log-main">`
      + `<a class="faith-tp-log-work" href="${escapeHtml(href(r))}">${title}</a>${author}`
      + `<span class="faith-tp-log-what">${escapeHtml(r.summary)}</span>`
      + `</span></li>`;
  }

  function paint() {
    const next = rows.slice(shown, shown + PAGE);
    listEl.insertAdjacentHTML("beforeend", next.map(item).join(""));
    shown += next.length;
    moreEl.hidden = shown >= rows.length;
  }

  moreEl.addEventListener("click", paint);

  fetch(ENDPOINT)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((res) => {
      rows = (res && res.changes) || [];
      const n = rows.length;
      countEl.textContent = n ? `${n.toLocaleString()} change${n === 1 ? "" : "s"}` : "No changes yet";
      if (!n) {
        listEl.insertAdjacentHTML("beforeend", `<li class="faith-tp-log-item faith-tp-log-empty">Nothing has been corrected yet.</li>`);
        return;
      }
      paint();
    })
    .catch(() => {
      // Never "No changes": a failed read must not look like a clean record.
      countEl.textContent = "Could not load";
      listEl.insertAdjacentHTML("beforeend", `<li class="faith-tp-log-item faith-tp-log-empty">The changelog could not be loaded. Reload the page to try again.</li>`);
    });
}());
