/*
 * The Faith Received — Most Read Works (the About page's sixth tab).
 *
 * Ian, 2026-09-30: "a live running list of the most read works on the
 * site", title and author, no numbers, never a landing page. The top 150
 * (Ian: "which will probably populate over time"), 25 to a page.
 *
 * mo-forms GET /tfr-most-read does the ranking and the filtering (see the
 * comment there): readers over the last 30 days, not raw opens, and only
 * slugs the library knows as works. It is rebuilt at most hourly.
 */
(function () {
  const root = document.querySelector("[data-faith-most-read]");
  if (!root) return;
  const listEl = root.querySelector("[data-mr-list]");
  const pagerEl = root.querySelector("[data-mr-pager]");
  const atEl = root.querySelector("[data-mr-at]");
  const prevEl = root.querySelector("[data-mr-prev]");
  const nextEl = root.querySelector("[data-mr-next]");
  const PAGE = 25;
  let works = [];
  let page = 0;

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function item(w) {
    const title = escapeHtml(w.title) + (w.volume ? `, ${escapeHtml(w.volume)}` : "");
    const author = w.author ? `<span class="faith-mr-author">${escapeHtml(w.author)}</span>` : "";
    return `<li class="faith-mr-item"><a class="faith-mr-work" href="/the-faith-received/read/?w=${encodeURIComponent(w.slug)}">${title}</a>${author}</li>`;
  }

  function paint() {
    const pages = Math.max(1, Math.ceil(works.length / PAGE));
    page = Math.max(0, Math.min(page, pages - 1));
    listEl.innerHTML = works.slice(page * PAGE, (page + 1) * PAGE).map(item).join("");
    pagerEl.hidden = pages < 2;
    atEl.textContent = `Page ${page + 1} of ${pages}`;
    prevEl.disabled = page === 0;
    nextEl.disabled = page >= pages - 1;
  }
  function turn(by) {
    page += by;
    paint();
    root.scrollIntoView({ block: "start" });
  }
  prevEl.addEventListener("click", () => turn(-1));
  nextEl.addEventListener("click", () => turn(1));

  fetch("https://mo-forms.mo-podcast-feed.workers.dev/tfr-most-read")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((res) => {
      works = (res && res.works) || [];
      if (!works.length) throw new Error("empty");
      paint();
    })
    .catch(() => {
      listEl.innerHTML = `<li class="faith-mr-item faith-mr-empty">The list could not be loaded. Reload the page to try again.</li>`;
    });
}());
