/*
 * /the-faith-received/topics-dev/ — a systematic theology from the
 * primary sources (Ian, 2026-09-22).
 *
 * TWO VIEWS, ONE ROUTE.
 *   no ?t=     the contents: ten parts in the classic order of the loci
 *              (Prolegomena to Last Things), every locus and its children.
 *   ?t=<id>    one locus: the contents down the left, the locus in the
 *              middle, and a sidebar on the right for whichever author or
 *              source is open. &view= picks the tab.
 *
 * THE ORDER IS AN EDITORIAL DECISION, stated once in
 * assets/data/faith-received/loci.json: the Reformed-scholastic sequence
 * (Turretin, Heppe), with all 43 of the library's loci and all 179 mined
 * topics placed in it (the small ones as aliases). Ian delegated the call.
 *
 * A LOCUS PAGE, TOP TO BOTTOM.
 *   1. What the church confessed: the confession articles on the locus,
 *      earliest first, each previewable in its own words.
 *   2. Four tabs:
 *        Read       the tradition in its own words (verified quotations
 *                   only, filterable), then the works that treat it.
 *        Compare    two or three traditions side by side.
 *        Trace      the locus century by century, by tradition.
 *        Scripture  the passages cited where the locus is treated, each
 *                   one step from its Verse Desk.
 *
 * QUOTATIONS ARE QUOTATIONS. The worker returns only quotations verified
 * against the page (the mined position statements are machine-written
 * and never shown as a quote; Ian's ruling, 2026-09-11). "More context"
 * reads the page itself.
 *
 * Data: mo-tfr-verse /v1/topic, /v1/topic/sources, /v1/topic/scripture,
 * /v1/verse/passage. Shared parts (filters, buttons, charts, the panel)
 * come from scripture-dev-core.js, so Topics works like the Scripture
 * reader and the Verse Desk.
 */
(function () {
  "use strict";
  const S = window.MOScriptureDev;
  if (!S) return;
  const { esc, fmt, plural } = S;
  const $root = document.querySelector("[data-td-root]");
  if (!$root) return;

  const BASE = "/the-faith-received/topics-dev/";
  const VIEWS = [["read", "Read"], ["compare", "Compare"], ["trace", "Trace"], ["scripture", "Scripture"]];
  const TRADS = [["rc", "Roman Catholic"], ["lu", "Lutheran"], ["rf", "Continental Reformed"], ["ed", "English Divines"],
    ["pl", "Latin Fathers"], ["gf", "Greek Fathers"], ["md", "Medieval"], ["po", "Eastern Fathers"]];
  const narrow = window.matchMedia("(max-width: 899px)");
  // The contents are a column only at 1100px and up (topics-dev.css);
  // below that they are a drawer and must start closed, or a 1024px
  // screen opens on 1,900px of contents above the topic.
  const wide = window.matchMedia("(min-width: 1100px)");

  const topicHref = (id, view) => `${BASE}?t=${encodeURIComponent(id)}${view && view !== "read" ? `&view=${view}` : ""}`;
  const compact = (n) => {
    const x = Number(n || 0);
    if (x >= 1e6) return `${(x / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
    if (x >= 1e4) return `${Math.round(x / 1e3)}k`;
    return fmt(x);
  };
  const confessionTitle = (c) => c.article_display || c.article || "";

  // ── The taxonomy ──────────────────────────────────────────────
  let LOCI = null;
  const INDEX = new Map(); // id -> {locus, part, parent}
  function loadLoci() {
    const url = window.moAssetUrl ? window.moAssetUrl("/assets/data/faith-received/loci.json") : "/assets/data/faith-received/loci.json";
    return fetch(url, { credentials: "omit" }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))).then((d) => {
      LOCI = d;
      d.parts.forEach((part) => part.loci.forEach((l) => {
        INDEX.set(l.id, { locus: l, part, parent: null });
        (l.children || []).forEach((ch) => INDEX.set(ch.id, { locus: ch, part, parent: l }));
      }));
      return d;
    });
  }

  function contentsList(currentId) {
    return LOCI.parts.map((p) =>
      `<li class="td-toc-part"><span class="td-toc-part-label"><span class="td-roman">${esc(p.n)}</span> ${esc(p.label)}</span><ol>${
        p.loci.map((l) => {
          const kids = (l.children || []).map((ch) =>
            `<li><a href="${esc(topicHref(ch.id))}"${ch.id === currentId ? ' aria-current="page"' : ""}>${esc(ch.label)}</a></li>`).join("");
          return `<li><a href="${esc(topicHref(l.id))}"${l.id === currentId ? ' aria-current="page"' : ""}>${esc(l.label)}</a>${kids ? `<ol class="td-toc-kids">${kids}</ol>` : ""}</li>`;
        }).join("")
      }</ol></li>`).join("");
  }

  // ── The contents page ─────────────────────────────────────────
  function renderContents() {
    document.title = "Topics (dev) | The Faith Received | Mere Orthodoxy";
    $root.classList.remove("has-topic");
    $root.innerHTML =
      `<header class="td-head td-head--contents">` +
        `<p class="sd-eyebrow">The Faith Received</p>` +
        `<h1 class="td-title">Topics</h1>` +
        `<p class="td-lede">The whole of Christian doctrine in the classic order of the loci, from Scripture and God to the Last Things, told in the words of the creeds, the confessions, and the church's teachers across twenty centuries.</p>` +
        `<label class="sd-search td-find"><span class="sd-filter-label">Find a topic</span><input type="search" data-td-find placeholder="Justification, the Trinity, baptism…" autocomplete="off"></label>` +
        `<p class="sd-muted td-find-empty" data-td-find-empty hidden>No topic matches. Try a broader word.</p>` +
      `</header>` +
      `<div class="td-parts">${LOCI.parts.map((p) =>
        `<section class="td-part" aria-labelledby="td-part-${esc(p.id)}">` +
          `<h2 class="td-part-h" id="td-part-${esc(p.id)}"><span class="td-roman">${esc(p.n)}</span> ${esc(p.label)}</h2>` +
          `<ol class="td-loci">${p.loci.map((l) => locusRow(l, false)).join("")}</ol>` +
        `</section>`).join("")}</div>`;
    const $find = $root.querySelector("[data-td-find]");
    const $empty = $root.querySelector("[data-td-find-empty]");
    $find.addEventListener("input", () => {
      const q = $find.value.trim().toLowerCase();
      let shown = 0;
      $root.querySelectorAll(".td-locus").forEach((li) => {
        const hit = !q || li.dataset.find.includes(q);
        li.hidden = !hit;
        if (hit) shown += 1;
      });
      // A child that matches keeps its parent row visible.
      $root.querySelectorAll(".td-locus > .td-loci").forEach((ol) => {
        if (ol.querySelector(".td-locus:not([hidden])")) ol.parentElement.hidden = false;
      });
      $root.querySelectorAll(".td-part").forEach((sec) => { sec.hidden = !sec.querySelector(".td-locus:not([hidden])"); });
      $empty.hidden = shown > 0;
    });
  }

  function locusRow(l, child) {
    const words = [l.label, l.id.replace(/^de-/, "").replace(/-/g, " "), ...(l.aliases || []).map((a) => a.replace(/-/g, " ")), ...(l.find || [])].join(" ").toLowerCase();
    const kids = (l.children || []).map((ch) => locusRow(ch, true)).join("");
    return `<li class="td-locus${child ? " td-locus--child" : ""}" data-find="${esc(words)}">` +
      `<a class="td-locus-link" href="${esc(topicHref(l.id))}">${esc(l.label)}</a>${ 
      kids ? `<ol class="td-loci">${kids}</ol>` : "" 
    }</li>`;
  }

  // ── A locus ───────────────────────────────────────────────────
  const state = { id: "", view: "read", data: null };
  let pendingPreset = null; // a filter to apply as Read opens (Trace sets it)
  let $main = null;
  let $side = null;
  const $panel = document.createElement("section");
  $panel.className = "sd-panel td-panel";

  function renderLocus(id, view) {
    const hit = INDEX.get(id);
    if (!hit) { renderContents(); return; }
    const { locus, part, parent } = hit;
    state.id = id;
    state.view = VIEWS.some((v) => v[0] === view) ? view : "read";
    state.data = null;
    document.title = `${locus.label} | Topics (dev) | The Faith Received | Mere Orthodoxy`;
    $root.classList.add("has-topic");
    $root.innerHTML =
      `<nav class="td-toc" aria-label="Topics">` +
        `<details class="td-toc-drawer"${wide.matches ? " open" : ""}><summary>Contents</summary>` +
          `<ol class="td-toc-list">${contentsList(id)}</ol>` +
          `<p class="td-toc-all"><a href="${BASE}">All topics</a></p>` +
        `</details>` +
      `</nav>` +
      `<div class="td-main" data-td-main>` +
        `<header class="td-head">` +
          `<p class="sd-eyebrow">Part ${esc(part.n)} · ${esc(part.label)}${parent ? ` · <a href="${esc(topicHref(parent.id))}">${esc(parent.label)}</a>` : ""}</p>` +
          `<h1 class="td-title">${esc(locus.label)}</h1>` +
          `<p class="td-counts sd-muted" data-td-counts>Gathering the sources…</p>${ 
          (locus.children || []).length ? `<p class="td-kids">Within this topic: ${locus.children.map((ch) => `<a href="${esc(topicHref(ch.id))}">${esc(ch.label)}</a>`).join(" · ")}</p>` : "" 
        }</header>` +
        `<section class="td-confessions" aria-labelledby="td-h-conf">` +
          `<h2 class="sd-h2" id="td-h-conf">What the church confessed</h2>` +
          `<div data-td-conf><p class="sd-muted">Loading the confessions…</p></div>` +
        `</section>` +
        // Real links that change the URL, so a nav with aria-current
        // rather than a half-built ARIA tab widget.
        `<nav class="td-tabs" aria-label="Ways to read ${esc(locus.label)}">${VIEWS.map(([k, lab]) =>
          `<a class="td-tab" href="${esc(topicHref(id, k))}" data-view="${k}"${k === state.view ? ' aria-current="page"' : ""}>${lab}</a>`).join("")}</nav>` +
        `<div class="td-view" data-td-view></div>` +
      `</div>` +
      `<aside class="td-side sd-side" data-td-side hidden aria-label="Source"></aside>`;
    $main = $root.querySelector("[data-td-main]");
    $side = $root.querySelector("[data-td-side]");
    $root.querySelector(".td-tabs").addEventListener("click", (e) => {
      const a = e.target.closest(".td-tab");
      if (!a) return;
      e.preventDefault();
      setView(a.dataset.view, true);
    });
    const cur = $root.querySelector('.td-toc a[aria-current="page"]');
    if (cur && wide.matches) cur.scrollIntoView({ block: "center" });

    S.api("/v1/topic", { id, t2: locus.t2 }).then((d) => {
      if (state.id !== id) return;
      if (!d) throw new Error("no topic");
      state.data = d;
      const c = d.counts || {};
      $main.querySelector("[data-td-counts]").textContent =
        [c.quotations ? `${fmt(c.quotations)} verified quotations` : "", c.authors ? plural(c.authors, "author", "authors") : "",
          c.works ? plural(c.works, "treatise", "treatises") : ""].filter(Boolean).join(" · ");
      renderConfessions(d.confessions || []);
      setView(state.view, false);
    }).catch(() => {
      if (state.id !== id) return;
      $main.querySelector("[data-td-counts]").innerHTML = `This topic did not load. <button type="button" class="sd-clear" data-td-retry>Try again</button>`;
      $main.querySelector("[data-td-retry]").addEventListener("click", () => renderLocus(id, state.view));
      $main.querySelector("[data-td-conf]").innerHTML = "";
    });
  }

  function setView(view, push) {
    state.view = view;
    $root.querySelectorAll(".td-tab").forEach((a) => {
      if (a.dataset.view === view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    const url = topicHref(state.id, view);
    if (location.pathname + location.search !== url) history[push ? "pushState" : "replaceState"](null, "", url);
    const $view = $main.querySelector("[data-td-view]");
    if (!state.data) { $view.innerHTML = `<p class="sd-muted">Loading…</p>`; return; }
    if (view === "compare") renderCompare($view);
    else if (view === "trace") renderTrace($view);
    else if (view === "scripture") renderScripture($view);
    else { renderRead($view, pendingPreset); pendingPreset = null; }
  }

  // ── Confessions ───────────────────────────────────────────────
  function renderConfessions(list, from) {
    const $c = $main.querySelector("[data-td-conf]");
    if (!list.length) {
      // A child locus falls back to its parent's articles (Simplicity to
      // the Divine Attributes), labelled as such.
      const hit = INDEX.get(state.id);
      if (!from && hit && hit.parent) {
        const pid = state.id;
        $c.innerHTML = `<p class="sd-muted">Loading…</p>`;
        S.api("/v1/topic", { id: hit.parent.id, t2: hit.parent.t2 }).then((d) => {
          if (state.id !== pid) return;
          renderConfessions((d && d.confessions) || [], hit.parent);
        }).catch(() => renderConfessions([], hit.parent));
        return;
      }
      // The gap is in the mapping, not the library: say so.
      $c.innerHTML = `<p class="sd-muted">No confession article is linked to this topic yet. The sources below are the teachers of the church.</p>`;
      return;
    }
    const trads = [...new Set(list.map((x) => x.trad).filter(Boolean))];
    $c.innerHTML =
      `${trads.length > 1 ? `<div class="td-chips" role="group" aria-label="Filter confessions by tradition">` +
        `<button type="button" class="td-chip" aria-pressed="true" data-trad="">All (${list.length})</button>${
          trads.map((t) => `<button type="button" class="td-chip" aria-pressed="false" data-trad="${esc(t)}">${esc(t)} (${list.filter((x) => x.trad === t).length})</button>`).join("")}</div>` : "" 
      }${from ? `<p class="sd-muted td-note">From <a href="${esc(topicHref(from.id))}">${esc(from.label)}</a>, which this topic belongs to.</p>` : ""}` +
      `<ol class="sd-sources td-conf-list"></ol>` +
      `<p class="sd-muted td-conf-note">These are the articles linked to this topic so far; not every confession's article on it is mapped yet.</p>`;
    const $list = $c.querySelector(".td-conf-list");
    list.forEach((cf) => {
      const li = previewItem({
        title: `${cf.year ? `${cf.year} · ` : ""}${cf.doc || ""}`,
        sub: confessionTitle(cf),
        meta: cf.trad || "",
        heading: cf.article || "",
        w: cf.w, p: cf.p, href: cf.href,
      });
      li.dataset.trad = cf.trad || "";
      $list.appendChild(li);
    });
    $c.querySelectorAll(".td-chip").forEach((b) => b.addEventListener("click", () => {
      $c.querySelectorAll(".td-chip").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $list.querySelectorAll("li").forEach((li) => { li.hidden = Boolean(b.dataset.trad) && li.dataset.trad !== b.dataset.trad; });
    }));
  }

  /* A titled item that opens the text at its page, in place. Used for
   * confession articles and for the sections of works: both are real
   * places in real texts, so the preview is the text itself. */
  function previewItem(o) {
    const li = document.createElement("li");
    li.className = "sd-source";
    const pid = `tdp-${Math.random().toString(36).slice(2, 9)}`;
    const href = S.sourceHref(o.href, o.w, o.p);
    li.innerHTML =
      `<div class="sd-source-head"><div class="sd-source-id">` +
        `<span class="sd-source-title">${esc(o.title)}</span>${ 
        o.sub ? `<span class="td-source-sub">${esc(o.sub)}</span>` : "" 
        }${o.meta ? `<span class="sd-source-meta">${esc(o.meta)}</span>` : "" 
      }</div><button type="button" class="sd-preview-btn" aria-expanded="false" aria-controls="${pid}">Preview</button></div>` +
      `<div class="sd-preview" id="${pid}" hidden></div>`;
    // t= lets the worker start the window at this heading: a confession
    // page often holds several articles, and conf_topics can be a page off.
    wirePreview(li, () => S.api("/v1/verse/passage", { w: o.w, p: o.p, t: o.heading }), href);
    return li;
  }

  function wirePreview(li, load, href) {
    const $btn = li.querySelector(".sd-preview-btn");
    const $pv = li.querySelector(".sd-preview");
    let loaded = false;
    $btn.addEventListener("click", () => {
      const open = $btn.getAttribute("aria-expanded") !== "true";
      $btn.setAttribute("aria-expanded", String(open));
      $btn.textContent = open ? "Hide" : ($btn.dataset.label || "Preview");
      $pv.hidden = !open;
      if (!open || loaded) return;
      loaded = true;
      $pv.innerHTML = `<p class="sd-muted">Finding the passage…</p>`;
      load().then((d) => {
        const link = S.sourceHref(d && d.href) || href;
        const read = link ? `<a class="sd-read-link" href="${esc(link)}">Read in context</a>` : "";
        if (d && d.found && d.text) {
          // Some editions carry Markdown emphasis round their paragraph
          // numbers (Denzinger's "**796.**"); it is markup, not text.
          const body = String(d.text).replace(/\*\*([^*]+)\*\*/g, "$1").replace(/^#+\s*/gm, "");
          const text = `${d.clipped_start ? "… " : ""}${body}${d.clipped_end ? " …" : ""}`;
          $pv.innerHTML = `<blockquote class="sd-quote"${d.lang ? ` lang="${esc(d.lang)}"` : ""}>${esc(text)}</blockquote>` +
            `<p class="sd-preview-foot">${d.locator ? `<span>${esc(d.locator)}</span>` : ""}${read}</p>`;
        } else {
          const why = d && d.reason === "licensed"
            ? "This edition's text is licensed, so it cannot be previewed here."
            : "The passage could not be extracted from this edition.";
          $pv.innerHTML = `<p class="sd-muted">${why}</p><p class="sd-preview-foot">${read}</p>`;
        }
      }).catch(() => {
        loaded = false;
        $btn.setAttribute("aria-expanded", "false");
        $btn.textContent = $btn.dataset.label || "Preview";
        $pv.hidden = false;
        $pv.innerHTML = `<p class="sd-muted">The passage did not load. Select ${esc($btn.textContent)} to try again.</p>`;
      });
    });
  }

  // ── Read: in their own words, then the works ──────────────────
  function renderRead($view, preset) {
    const d = state.data;
    $view.innerHTML =
      `<section aria-labelledby="td-h-words">` +
        `<h2 class="sd-h2" id="td-h-words">In their own words</h2>` +
        `<p class="sd-muted td-note">Quotations checked against the page they come from. Select an author to see all of theirs.</p>` +
        `<div data-td-filters></div>` +
        `<label class="sd-filter td-order"><span class="sd-filter-label">Order</span><select data-td-order>` +
          `<option value="representative">Representative: each tradition's leading voices first</option>` +
          `<option value="chronological">Earliest first</option></select></label>` +
        `<p class="sd-count" data-td-scount role="status"></p>` +
        `<ol class="sd-sources" data-td-rows></ol>` +
        `<button type="button" class="sd-more" data-td-more hidden>Show more</button>` +
      `</section>` +
      `<section aria-labelledby="td-h-works">` +
        `<h2 class="sd-h2" id="td-h-works">Where it is treated</h2>` +
        `<p class="sd-muted td-note">The treatises and chapters given to this topic, earliest first. Open any to read the section in place.</p>` +
        `<div data-td-works></div>` +
      `</section>`;
    const bar = S.filterBar($view.querySelector("[data-td-filters]"), {
      search: true,
      searchLabel: "Search the quotations",
      searchPlaceholder: "A word, an author, a work",
      onChange: () => sources(false),
    });
    const $rows = $view.querySelector("[data-td-rows]");
    const $more = $view.querySelector("[data-td-more]");
    const $count = $view.querySelector("[data-td-scount]");
    const $order = $view.querySelector("[data-td-order]");
    $order.addEventListener("change", () => sources(false));
    let run = 0;
    let offset = 0;
    $more.addEventListener("click", () => sources(true));
    function sources(more) {
      const my = more ? run : ++run;
      if (!more) { offset = 0; $rows.innerHTML = `<li class="sd-muted">Loading…</li>`; }
      $more.disabled = true;
      const f = bar.filters;
      S.api("/v1/topic/sources", { t2: INDEX.get(state.id).locus.t2, tr: f.tr, au: f.au, cen: f.cen, q: f.q, order: $order.value, offset, limit: 20 }).then((r) => {
        if (my !== run) return;
        $more.disabled = false;
        if (!more) $rows.innerHTML = "";
        if (!r || !r.total) {
          $count.textContent = "No verified quotations are indexed for this topic yet.";
          $more.hidden = true;
          return;
        }
        bar.update(r.facets);
        $count.innerHTML = S.activeCount(f)
          ? `<strong>${fmt(r.matched)}</strong> of ${plural(r.total, "quotation", "quotations")} match`
          : `<strong>${fmt(r.total)}</strong> verified ${r.total === 1 ? "quotation" : "quotations"}`;
        (r.rows || []).forEach((row) => $rows.appendChild(quoteItem(row)));
        if (!(r.rows || []).length && !more) $rows.innerHTML = `<li class="sd-muted">Nothing matches these filters.</li>`;
        offset = r.next_offset || 0;
        $more.hidden = !r.next_offset;
        $more.textContent = r.next_offset ? `Show more (${fmt(r.matched - r.next_offset)} left)` : "Show more";
      }).catch(() => {
        if (my !== run) return;
        $more.disabled = false;
        $count.innerHTML = `<span class="sd-muted">Quotations did not load.</span> <button type="button" class="sd-clear" data-td-retry>Try again</button>`;
        $count.querySelector("[data-td-retry]").addEventListener("click", () => sources(false));
        if (!more) $rows.innerHTML = "";
      });
    }
    // A preset (a century chosen in Trace) is applied here, once the list
    // exists: bar.set() fires the load itself. Applied earlier, it ran
    // before $rows was declared and the tab stayed empty.
    const keys = preset ? Object.keys(preset) : [];
    if (keys.length) keys.forEach((k) => bar.set(k, preset[k]));
    else sources(false);
    renderWorks($view.querySelector("[data-td-works]"), d.works || []);
  }

  /* One verified quotation. The quote is the author's own words, so it
   * is shown at once; "More context" reads the whole page around it. The
   * author's name opens the sidebar with everything they say here. */
  function quoteItem(row) {
    const li = document.createElement("li");
    li.className = "sd-source td-quote-item";
    const pid = `tdq-${Math.random().toString(36).slice(2, 9)}`;
    // The worker's reader link carries q= so the reader highlights the
    // quotation; keep it when it has exactly that shape.
    const href = /^\/the-faith-received\/reader\/\?c=[a-z]+&w=[^&#"]+&(?:p=\d+&)?q=[^#"]*$/.test(String(row.href || ""))
      ? row.href : S.sourceHref(row.href, row.w, row.p);
    const meta = [row.wt, row.locus, row.trad, S.centuryLabel(row.cen)].filter(Boolean).map(esc).join(" · ");
    li.innerHTML =
      `<blockquote class="sd-quote"${row.lang ? ` lang="${esc(row.lang)}"` : ""}>${esc(row.quote)}</blockquote>` +
      `<div class="sd-source-head td-quote-foot"><div class="sd-source-id">` +
        `<button type="button" class="td-author-link" data-author="${esc(row.author_id || "")}" data-name="${esc(row.a || "")}" data-trad="${esc(row.trad || "")}" data-cen="${esc(row.cen || "")}">${esc(row.a || "")}</button>` +
        `<span class="sd-source-meta">${meta}</span>` +
      `</div><button type="button" class="sd-preview-btn" data-label="More context" aria-expanded="false" aria-controls="${pid}">More context</button></div>` +
      `<div class="sd-preview" id="${pid}" hidden></div>`;
    // t= is the quote's opening, so the window starts at the quotation
    // rather than the top of the page (2 of 12 hits without it, 9 with).
    wirePreview(li, () => S.api("/v1/verse/passage", { w: row.w, p: row.p, t: String(row.quote || "").slice(0, 80) }), href);
    return li;
  }

  function renderWorks($host, works) {
    if (!works.length) {
      $host.innerHTML = `<p class="sd-muted">No treatise in the library is catalogued under this topic by itself. Its sources are the quotations above.</p>`;
      return;
    }
    // Earliest first, grouped by century, so the reading list is also a
    // history: the Fathers, the schoolmen, the Reformers, their heirs.
    const byCen = new Map();
    works.forEach((w) => {
      const k = Number(w.cen) || 0;
      if (!byCen.has(k)) byCen.set(k, []);
      byCen.get(k).push(w);
    });
    const keys = [...byCen.keys()].sort((a, b) => (a || 99) - (b || 99));
    $host.innerHTML = keys.map((k) => `<section class="td-cen-group"><h3 class="sd-h3">${k ? esc(S.centuryLabel(k).replace(" c.", " century")) : "Undated"}</h3><ol class="td-works" data-cen="${k}"></ol></section>`).join("");
    keys.forEach((k) => {
      const $ol = $host.querySelector(`.td-works[data-cen="${k}"]`);
      byCen.get(k).forEach((w) => {
        const li = document.createElement("li");
        li.className = "td-work";
        const href = S.sourceHref(w.href, w.w);
        const secs = w.secs || [];
        li.innerHTML =
          `<div class="td-work-head"><a class="td-work-title" href="${esc(href)}">${esc(w.t || w.w)}</a>` +
          `<span class="sd-source-meta">${[w.a, w.school || w.trad].filter(Boolean).map(esc).join(" · ")}</span></div>${ 
          secs.length ? `<details class="td-secs"><summary>${plural(secs.length, "section", "sections")} on this topic</summary><ol class="sd-sources"></ol></details>` : ""}`;
        const $secs = li.querySelector(".td-secs ol");
        if ($secs) secs.forEach((s) => $secs.appendChild(previewItem({ title: s.t, heading: s.t, w: w.w, p: s.p, href: s.href, meta: s.p ? `p. ${s.p}` : "" })));
        $ol.appendChild(li);
      });
    });
  }

  // ── Compare: traditions side by side ──────────────────────────
  function renderCompare($view) {
    const d = state.data;
    const present = new Set((d.facets && d.facets.tradition || []).map((x) => String(x.k)));
    const avail = TRADS.filter(([k]) => present.has(k));
    const pick = ["rc", "lu", "rf"].filter((k) => present.has(k));
    while (pick.length < Math.min(3, avail.length)) pick.push(avail.find(([k]) => !pick.includes(k))[0]);
    const select = (i) => `<label class="sd-filter"><span class="sd-filter-label">Tradition ${i + 1}</span><select data-td-cmp="${i}">${
      avail.map(([k, lab]) => `<option value="${k}"${pick[i] === k ? " selected" : ""}>${esc(lab)}</option>`).join("")}</select></label>`;
    $view.innerHTML =
      `<h2 class="sd-h2">Compare the traditions</h2>` +
      `<p class="sd-muted td-note">What each tradition confessed on this topic, who taught it most, and a few of their own words.</p>${ 
      avail.length ? `<div class="sd-filter-row td-cmp-pick">${pick.map((_, i) => select(i)).join("")}</div>` : "" 
      }<div class="td-cmp" data-td-cmp-cols></div>`;
    const paint = () => {
      const keys = [...$view.querySelectorAll("[data-td-cmp]")].map((s) => s.value);
      const $cols = $view.querySelector("[data-td-cmp-cols]");
      $cols.style.setProperty("--td-cols", String(Math.max(1, keys.length)));
      $cols.innerHTML = keys.map((k) => `<section class="td-cmp-col" data-k="${esc(k)}"><h3 class="td-cmp-h">${esc((TRADS.find((t) => t[0] === k) || [k, k])[1])}</h3><div data-td-col></div></section>`).join("");
      const hosts = $cols.querySelectorAll("[data-td-col]");
      keys.forEach((k, i) => fillColumn(hosts[i], k));
    };
    $view.querySelectorAll("[data-td-cmp]").forEach((s) => s.addEventListener("change", paint));
    if (!avail.length) { $view.querySelector("[data-td-cmp-cols]").innerHTML = `<p class="sd-muted">Not enough traditions are indexed on this topic to compare.</p>`; return; }
    paint();
  }

  // The confession data says only "Reformed". The British and Irish
  // formularies go to English Divines, the rest to Continental Reformed,
  // so the two columns do not repeat each other.
  const BRITISH = /westminster|thirty-nine|39 articles|irish|savoy|lambeth|scots|scottish/i;
  const CONF_TRAD = {
    rc: (c) => c.trad === "Roman Catholic",
    lu: (c) => c.trad === "Lutheran",
    rf: (c) => c.trad === "Reformed" && !BRITISH.test(`${c.doc} ${c.w}`),
    ed: (c) => c.trad === "Reformed" && BRITISH.test(`${c.doc} ${c.w}`),
  };
  function fillColumn($col, k) {
    const d = state.data;
    const lab = (TRADS.find((t) => t[0] === k) || [k, k])[1];
    const conf = CONF_TRAD[k] ? (d.confessions || []).filter(CONF_TRAD[k]) : [];
    const authors = (d.authors || []).filter((a) => a.sh === k).slice(0, 6);
    $col.innerHTML =
      `<h4 class="td-cmp-sub">Confessed</h4>${ 
      conf.length ? `<ol class="sd-sources" data-td-cc></ol>` : `<p class="sd-muted">No ${esc(lab)} confession article on this topic.</p>` 
      }<h4 class="td-cmp-sub">Taught most by</h4>${ 
      authors.length ? `<ol class="td-cmp-authors">${authors.map((a) =>
        `<li><button type="button" class="td-author-link" data-author="${esc(a.id)}">${esc(a.a)}</button> <span class="sd-muted">${esc(`${fmt(a.n)} passages`)}</span></li>`).join("")}</ol>` : `<p class="sd-muted">None indexed.</p>` 
      }<h4 class="td-cmp-sub">In their words</h4><ol class="sd-sources" data-td-cq><li class="sd-muted">Loading…</li></ol>`;
    const $cc = $col.querySelector("[data-td-cc]");
    if ($cc) conf.slice(0, 4).forEach((cf) => $cc.appendChild(previewItem({ title: [cf.year, cf.doc].filter(Boolean).join(" · "), sub: confessionTitle(cf), heading: cf.article || "", w: cf.w, p: cf.p, href: cf.href })));
    const $cq = $col.querySelector("[data-td-cq]");
    S.api("/v1/topic/sources", { t2: INDEX.get(state.id).locus.t2, tr: k, offset: 0, limit: 4 }).then((r) => {
      $cq.innerHTML = "";
      ((r && r.rows) || []).forEach((row) => $cq.appendChild(quoteItem(row)));
      if (!$cq.children.length) $cq.innerHTML = `<li class="sd-muted">No verified quotations yet.</li>`;
    }).catch(() => { $cq.innerHTML = `<li class="sd-muted">Did not load.</li>`; });
  }

  // ── Trace: century by century ─────────────────────────────────
  function renderTrace($view) {
    const d = state.data;
    const rows = d.trace || [];
    if (!rows.length) { $view.innerHTML = `<p class="sd-muted">There is not enough dated material to trace this topic.</p>`; return; }
    const present = new Set(rows.flatMap((r) => (r.by || []).map((b) => String(b.k))));
    // Colour belongs to the tradition, not the order it appears in, so
    // Lutheran is the same colour on every topic.
    const ORDER = ["gf", "pl", "po", "md", "rc", "lu", "rf", "ed", "hl"];
    const tradKeys = [...ORDER.filter((k) => present.has(k)), ...[...present].filter((k) => !ORDER.includes(k))];
    const colour = (k) => `var(--td-c-${ORDER.includes(String(k)) ? k : "x"})`;
    const label = (k) => { const t = rows.flatMap((r) => r.by || []).find((b) => String(b.k) === String(k)); return t ? t.label : k; };
    $view.innerHTML =
      `<h2 class="sd-h2">Trace the topic through the centuries</h2>` +
      `<p class="sd-muted td-note">How the library's passages on ${esc(INDEX.get(state.id).locus.label.toLowerCase())} divide among the traditions, century by century. Each bar shows shares; the number is how many passages that century holds, and the library holds far more from some centuries than others. Select a century to read its verified quotations.</p>` +
      `<ul class="td-legend">${tradKeys.map((k) => `<li><span class="td-swatch" style="background:${colour(k)}"></span>${esc(label(k))}</li>`).join("")}</ul>` +
      `<ol class="td-trace">${rows.map((r) =>
        `<li><button type="button" class="td-trace-row" data-cen="${esc(r.cen)}" aria-label="${esc(r.label || S.centuryLabel(r.cen))}: ${fmt(r.total)} passages, ${esc((r.by || []).map((b) => `${b.label} ${fmt(b.n)}`).join(", "))}. Read this century's quotations.">` +
          `<span class="td-trace-label">${esc(r.label || S.centuryLabel(r.cen))}</span>` +
          `<span class="td-trace-track">${(r.by || []).map((b) =>
            `<span class="td-trace-seg" style="flex:${Math.max(0, Number(b.n) || 0)};background:${colour(b.k)}" title="${esc(b.label)}: ${fmt(b.n)}"></span>`).join("")}</span>` +
          `<span class="td-trace-n">${compact(r.total)}</span>` +
        `</button></li>`).join("")}</ol>`;
    $view.querySelectorAll(".td-trace-row").forEach((b) => b.addEventListener("click", () => {
      pendingPreset = { cen: b.dataset.cen };
      setView("read", true);
    }));
  }

  // ── Scripture: the proof-texts ────────────────────────────────
  const LIB_TO_BOOK = new Map(S.BOOKS.map((b) => [b.lib, b]));
  function renderScripture($view) {
    const {locus} = INDEX.get(state.id);
    $view.innerHTML =
      `<h2 class="sd-h2">Scripture on ${esc(locus.label.toLowerCase())}</h2>` +
      `<p class="sd-muted td-note">The passages the tradition cites where it treats this topic, those most particular to it first. Each opens its Verse Desk.</p>` +
      `<ol class="td-proofs" data-td-proofs><li class="sd-muted">Loading…</li></ol>` +
      `<button type="button" class="sd-more" data-td-pmore hidden>Show more</button>`;
    const $ol = $view.querySelector("[data-td-proofs]");
    const $more = $view.querySelector("[data-td-pmore]");
    S.api("/v1/topic/scripture", { id: state.id, t2: locus.t2, limit: 60 }).then((r) => {
      const rows = ((r && r.rows) || []).filter((x) => LIB_TO_BOOK.has(x.b));
      if (!rows.length) { $ol.innerHTML = `<li class="sd-muted">No passages are linked to this topic yet.</li>`; return; }
      const max = Math.max(...rows.map((r) => Number(r.n) || 0)) || 1;
      let shown = 0;
      const t = S.recalledTranslation();
      const page = () => {
        rows.slice(shown, shown + 15).forEach((x) => {
          const book = LIB_TO_BOOK.get(x.b);
          x.c = Number(x.c) || 1;
          x.v = Number(x.v) || 0;
          const li = document.createElement("li");
          li.className = "td-proof";
          li.innerHTML =
            `<div class="td-proof-head"><a class="td-proof-ref" href="${esc(S.deskHref(book, x.c, x.v, t === "ESV" ? "" : t))}">${esc(S.refLabel(book, x.c, x.v))}</a>` +
            `<span class="sd-cbar-track td-proof-bar"><span class="sd-cbar-fill" style="width:${Math.max(2, Math.round((x.n / max) * 100))}%"></span></span>` +
            `<span class="sd-cbar-n td-proof-n">cited ${fmt(x.n)}×</span></div>` +
            `<p class="td-proof-text sd-muted">…</p>`;
          $ol.appendChild(li);
          S.fetchVerseText(t, book, x.c, x.v)
            .then((txt) => { li.querySelector(".td-proof-text").textContent = txt || ""; })
            .catch(() => { li.querySelector(".td-proof-text").textContent = ""; });
        });
        shown += 15;
        $more.hidden = shown >= rows.length;
      };
      $ol.innerHTML = "";
      page();
      $more.addEventListener("click", page);
    }).catch(() => { $ol.innerHTML = `<li class="sd-muted">Passages did not load.</li>`; });
  }

  // ── The sidebar: one author on this topic ─────────────────────
  function openAuthor(authorId, $from) {
    const d = state.data;
    // The topic's author list holds its top 400; anyone else is known
    // from the quotation that was clicked.
    const a = (d && d.authors || []).find((x) => x.id === authorId) || ($from && $from.dataset.name ? {
      id: authorId, a: $from.dataset.name, trad: $from.dataset.trad,
      cen: Number($from.dataset.cen) || 0, n: 0,
    } : null);
    const {locus} = INDEX.get(state.id);
    $panel.innerHTML =
      `<header class="sd-panel-head">` +
        `<p class="sd-eyebrow">On ${esc(locus.label.toLowerCase())}</p>` +
        `<h2 class="sd-panel-ref" tabindex="-1">${esc(a ? a.a : "Author")}</h2>` +
        `<p class="sd-source-meta td-panel-meta">${a ? [a.trad, a.y ? `b. ${a.y}` : S.centuryLabel(a.cen), a.n ? `${fmt(a.n)} positions here` : ""].filter(Boolean).map(esc).join(" · ") : ""}</p>` +
        `<button type="button" class="sd-close" aria-label="Close author panel">Close</button>` +
      `</header>` +
      `<h3 class="sd-h3">Their works on this topic</h3><ol class="td-side-works"></ol>` +
      `<h3 class="sd-h3">In their words</h3><ol class="sd-sources" data-td-arows><li class="sd-muted">Loading…</li></ol>` +
      `<button type="button" class="sd-more" data-td-amore hidden>Show more</button>`;
    const works = (d.works || []).filter((w) => a && w.a === a.a);
    const $w = $panel.querySelector(".td-side-works");
    $w.innerHTML = works.length
      ? works.map((w) => `<li><a href="${esc(S.sourceHref(w.href, w.w))}">${esc(w.t)}</a></li>`).join("")
      : `<li class="sd-muted">No treatise of theirs is catalogued under this topic.</li>`;
    $panel.querySelector(".sd-close").addEventListener("click", () => closePanel($from));
    const $rows = $panel.querySelector("[data-td-arows]");
    const $more = $panel.querySelector("[data-td-amore]");
    let offset = 0;
    const load = (more) => {
      $more.disabled = true;
      S.api("/v1/topic/sources", { t2: locus.t2, au: authorId, offset, limit: 10 }).then((r) => {
        $more.disabled = false;
        if (!more) $rows.innerHTML = "";
        ((r && r.rows) || []).forEach((row) => $rows.appendChild(quoteItem(row)));
        if (!$rows.children.length) $rows.innerHTML = `<li class="sd-muted">No verified quotations of theirs on this topic yet.</li>`;
        offset = (r && r.next_offset) || 0;
        $more.hidden = !offset;
      }).catch(() => { $more.disabled = false; $rows.innerHTML = `<li class="sd-muted">Did not load.</li>`; });
    };
    $more.addEventListener("click", () => load(true));
    load(false);
    if (narrow.matches) {
      const host = $from && ($from.closest("li") || $from);
      if (host) host.appendChild($panel);
      $side.hidden = true;
      $root.classList.remove("has-side");
    } else {
      $side.appendChild($panel);
      $side.hidden = false;
      $root.classList.add("has-side");
    }
    const $ref = $panel.querySelector(".sd-panel-ref");
    if ($ref) $ref.focus({ preventScroll: !narrow.matches });
  }

  function closePanel($from) {
    $panel.remove();
    if ($side) $side.hidden = true;
    $root.classList.remove("has-side");
    if ($from && $from.isConnected) $from.focus({ preventScroll: true });
  }

  let lastAuthorBtn = null;
  $root.addEventListener("click", (e) => {
    const b = e.target.closest(".td-author-link");
    if (!b || !b.dataset.author) return;
    // A name inside the panel is replaced when the panel re-renders, so
    // focus returns to whatever opened the panel in the first place.
    const opener = $panel.contains(b) ? lastAuthorBtn : b;
    lastAuthorBtn = opener;
    openAuthor(b.dataset.author, opener);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !$panel.isConnected) return;
    if (e.target.closest && e.target.closest("input, select, textarea")) return;
    closePanel(lastAuthorBtn);
  });

  // ── Routing ───────────────────────────────────────────────────
  function route() {
    const qs = new URLSearchParams(location.search);
    const t = qs.get("t");
    if (t && INDEX.has(t)) {
      if (t === state.id && state.data) {
        const v = qs.get("view");
        setView(VIEWS.some((x) => x[0] === v) ? v : "read", false);
        return;
      }
      renderLocus(t, qs.get("view") || "read");
    } else {
      state.id = "";
      // An unknown ?t= shows the contents under their own address.
      if (t) history.replaceState(null, "", BASE);
      renderContents();
    }
    window.scrollTo(0, 0);
  }
  window.addEventListener("popstate", route);
  wide.addEventListener("change", () => {
    const dr = $root.querySelector(".td-toc-drawer");
    if (dr) dr.open = wide.matches;
  });
  narrow.addEventListener("change", () => { if ($panel.isConnected) closePanel(null); });

  loadLoci().then(route).catch(() => {
    $root.innerHTML = `<p class="bible-status is-error" role="alert">The topics did not load. Reload the page to try again.</p>`;
  });
})();
