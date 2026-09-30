/*
 * The Faith Received — Most Read Works (the About page's sixth tab).
 *
 * Ian, 2026-09-30: "a live running list of the most read works on the
 * site", title and author, no numbers, never a landing page.
 *
 * mo-forms GET /tfr-most-read does the ranking and the filtering (see the
 * comment there): readers over the last 30 days, not raw opens, and only
 * slugs the library knows as works. It is rebuilt at most hourly.
 */
(function () {
  const root = document.querySelector("[data-faith-most-read]");
  if (!root) return;
  const listEl = root.querySelector("[data-mr-list]");

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

  fetch("https://mo-forms.mo-podcast-feed.workers.dev/tfr-most-read")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((res) => {
      const works = (res && res.works) || [];
      if (!works.length) throw new Error("empty");
      listEl.innerHTML = works.map(item).join("");
    })
    .catch(() => {
      listEl.innerHTML = `<li class="faith-mr-item faith-mr-empty">The list could not be loaded. Reload the page to try again.</li>`;
    });
}());
