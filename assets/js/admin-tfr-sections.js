/*
 * /admin/tfr/ and /admin/tfr-survey/ — every section folds, every long
 * list pages (Ian, 2026-10-01: "make these sections collapsible and
 * paginated").
 *
 * Runs after the page's own scripts. Each .admin-tfr-section's title
 * becomes a button that folds the rest of the section; sections start
 * folded (the report inbox and review queue start open, since they are
 * work to do), and the page remembers what you opened. Any list of bars
 * longer than ten rows shows ten at a time with Previous / Next; lists
 * are re-paged whenever a section redraws (a new window, a reload).
 */
(function () {
  const sections = [...document.querySelectorAll(".admin-tfr-section")];
  if (!sections.length) return;
  const PAGE = 10;
  const KEY = "mo_admin_tfr_open_v1";
  let open = {};
  try { open = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (_) { open = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(open)); } catch (_) { /* private mode */ } };
  const setters = [];

  sections.forEach((sec) => {
    const h = sec.querySelector(":scope > .admin-tfr-section-title");
    if (!h) return;
    const id = `${location.pathname}|${h.textContent.trim().slice(0, 80)}`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "admin-tfr-fold";
    while (h.firstChild) btn.appendChild(h.firstChild);
    h.appendChild(btn);
    const body = document.createElement("div");
    body.className = "admin-tfr-section-body";
    while (h.nextSibling) body.appendChild(h.nextSibling);
    sec.appendChild(body);
    const set = (v) => {
      body.hidden = !v;
      btn.setAttribute("aria-expanded", String(v));
      sec.classList.toggle("is-open", v);
    };
    const startOpen = sec.hasAttribute("data-tfr-issues") || sec.hasAttribute("data-tfr-review");
    set(id in open ? !!open[id] : startOpen);
    btn.addEventListener("click", () => { const v = body.hidden; set(v); open[id] = v; save(); });
    setters.push((v) => { set(v); open[id] = v; });
  });

  // Expand all / Collapse all, above the first section.
  const bar = document.createElement("div");
  bar.className = "admin-tfr-foldall";
  bar.innerHTML = '<button type="button" data-fold="1">Expand all</button><button type="button" data-fold="0">Collapse all</button>';
  sections[0].parentNode.insertBefore(bar, sections[0]);
  bar.addEventListener("click", (e) => {
    const b = e.target.closest("[data-fold]");
    if (!b) return;
    setters.forEach((s) => s(b.dataset.fold === "1"));
    save();
  });

  function page(list) {
    const rows = [...list.children].filter((li) => li.tagName === "LI");
    const n = Math.ceil(rows.length / PAGE);
    let pager = list.nextElementSibling && list.nextElementSibling.classList.contains("admin-tfr-pager")
      ? list.nextElementSibling : null;
    if (n < 2) { if (pager) pager.remove(); rows.forEach((li) => { li.hidden = false; }); return; }
    if (!pager) {
      pager = document.createElement("div");
      pager.className = "admin-tfr-pager";
      pager.innerHTML = '<button type="button" data-pg="-1">Previous</button><span></span><button type="button" data-pg="1">Next</button>';
      list.after(pager);
      pager.addEventListener("click", (e) => {
        const b = e.target.closest("[data-pg]");
        if (!b) return;
        list.__pg = Math.max(0, Math.min(list.__pgN - 1, (list.__pg || 0) + Number(b.dataset.pg)));
        show(list);
      });
    }
    list.__pgN = n;
    if (!(list.__pg < n)) list.__pg = 0;
    show(list);
  }
  function show(list) {
    const rows = [...list.children].filter((li) => li.tagName === "LI");
    const at = list.__pg || 0;
    rows.forEach((li, i) => { li.hidden = i < at * PAGE || i >= (at + 1) * PAGE; });
    const pager = list.nextElementSibling;
    pager.querySelector("span").textContent = `Page ${at + 1} of ${list.__pgN}`;
    pager.querySelector('[data-pg="-1"]').disabled = at === 0;
    pager.querySelector('[data-pg="1"]').disabled = at >= list.__pgN - 1;
  }

  // Lists are drawn (and redrawn) by the page's own scripts after load.
  let queued = false;
  const scan = () => {
    queued = false;
    document.querySelectorAll(".admin-tfr-section .admin-tfr-bars").forEach((list) => {
      const count = list.children.length;
      if (list.__pgCount === count && list.__pgSeen === list.firstElementChild) return;
      list.__pgCount = count;
      list.__pgSeen = list.firstElementChild;
      list.__pg = 0;
      page(list);
    });
  };
  // setTimeout, not requestAnimationFrame: a tab in the background never
  // paints, so a frame callback would leave every list unpaged there.
  new MutationObserver(() => { if (!queued) { queued = true; setTimeout(scan, 30); } })
    .observe(sections[0].parentNode, { childList: true, subtree: true });
  scan();
}());
