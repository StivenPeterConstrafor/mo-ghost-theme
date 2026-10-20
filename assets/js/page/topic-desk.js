/*
 * The Topic Desk, browser side (2026-10-19). topics-dev.js calls MOTopicDeskMount({...}) once per topic it opens and
 * feeds the desk what it has already fetched, so nothing is fetched twice:
 *
 *   desk.feed("topic", data, treatments)   /v1/topic after its Predestination clean-up, and the chosen treatments
 *   desk.feed("conf", conf | null)         the confession articles (null when they did not load)
 *
 * The desk fetches only what the page does not hold: /v1/topic/scripture (sixty rows) and two small theme files
 * (topic-desk.json, topic-desk-marquee.json), each once per page view. It draws when all of it has answered, or failed.
 *
 * FALLBACK. The desk is an addition above the page's two existing blocks (Creeds, Confessions, and Catechisms; Works).
 * If this file or the model fails to load, a fetch fails, or a render throws, the host stays empty and the page is
 * exactly what it was. A module the data cannot fill is left out (topic-desk-model.js), never drawn empty.
 */
(function () {
  "use strict";
  const files = {};
  const loadFile = (name) => {
    if (!files[name]) {
      const path = `/assets/data/faith-received/${name}`;
      const url = window.moAssetUrl ? window.moAssetUrl(path) : path;
      files[name] = fetch(url, { credentials: "omit" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    }
    return files[name];
  };

  /* The About section's tabs. History is drawn with the section; other scripts add theirs (add), in this order. Selecting a tab shows its
     panel (hidden on the rest), keeps the roving tabindex, moves with the arrow keys, Home and End, and writes #about-<key> so a tab can be
     linked. A panel with data-lazy is filled by whoever added it, when it is first shown ("about:show" on the panel). */
  const ORDER = ["history", "scripture", "course", "traditions", "concepts"];
  const about = {
    host: null,
    tabs() { return this.host ? [...this.host.querySelectorAll("[data-about-tabs] [role=tab]")] : []; },
    ready(host) {
      this.host = host;
      const list = host.querySelector("[data-about-tabs]");
      if (!list || list.dataset.bound) return;
      list.dataset.bound = "1";
      list.addEventListener("click", (e) => { const t = e.target.closest("[role=tab]"); if (t) this.activate(t.dataset.k, false, true); });
      list.addEventListener("keydown", (e) => {
        const tabs = this.tabs();
        const i = tabs.indexOf(document.activeElement);
        if (i < 0) return;
        const to = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        this.activate(tabs[to].dataset.k, true, true);
      });
      this.hash();
    },
    activate(key, focus, write) {
      const tabs = this.tabs();
      const on = tabs.find((t) => t.dataset.k === key);
      if (!on) return;
      tabs.forEach((t) => {
        const sel = t === on;
        t.setAttribute("aria-selected", String(sel));
        t.tabIndex = sel ? 0 : -1;
        const panel = this.host.querySelector(`#${t.getAttribute("aria-controls")}`);
        if (panel) panel.hidden = !sel;
        if (sel && panel) panel.dispatchEvent(new window.CustomEvent("about:show"));
      });
      if (focus) on.focus();
      if (write) { try { history.replaceState(null, "", `${location.pathname}${location.search}#about-${key}`); } catch (e) { /* a hash is a convenience */ } }
    },
    add(key, label, panel) {
      const list = this.host && this.host.querySelector("[data-about-tabs]");
      if (!list || list.querySelector(`[data-k="${key}"]`)) return false;
      const tab = document.createElement("button");
      tab.type = "button"; tab.className = "tdk-tab"; tab.id = `about-${key}`; tab.dataset.k = key;
      tab.setAttribute("role", "tab"); tab.setAttribute("aria-controls", `about-panel-${key}`); tab.setAttribute("aria-selected", "false"); tab.tabIndex = -1;
      tab.textContent = label;
      panel.id = `about-panel-${key}`; panel.setAttribute("role", "tabpanel"); panel.setAttribute("aria-labelledby", tab.id); panel.tabIndex = 0; panel.hidden = true;
      panel.classList.add("tdk-panel"); panel.dataset.aboutPanel = key;
      const after = this.tabs().find((t) => ORDER.indexOf(t.dataset.k) > ORDER.indexOf(key));
      list.insertBefore(tab, after || null);
      const panels = [...this.host.querySelectorAll("[data-about-panel]")];
      const next = panels.find((p) => ORDER.indexOf(p.dataset.aboutPanel) > ORDER.indexOf(key));
      if (next) next.before(panel); else panels[panels.length - 1].after(panel);
      this.hash();
      return true;
    },
    hash() {
      const m = /^#about-(history|scripture|course|traditions|concepts)$/.exec(location.hash);
      if (m && this.tabs().some((t) => t.dataset.k === m[1])) this.activate(m[1], false, false);
    },
  };
  window.MOAbout = about;
  window.addEventListener("hashchange", () => about.hash());

  window.MOTopicDeskMount = function mount(opts) {
    const M = window.MOTopicDesk;
    const { host, root, id, locus, part, parent, S, loci, bodyOf } = opts;
    if (!M || !host || !S) return null;
    const got = { topic: undefined, conf: undefined, scr: undefined, files: undefined, hist: undefined };
    delete root.dataset.deskHistory;
    // dev-notes waits for this before it decides where its tabs go (into the About section, or a block of its own).
    const state = (v) => { root.dataset.deskState = v; root.dispatchEvent(new window.CustomEvent("tdk:state")); };
    root.dataset.deskState = "pending";
    let treat = [];
    let drawn = false;

    const draw = () => {
      if (drawn || !host.isConnected) return;
      if (got.topic === undefined || got.conf === undefined || got.scr === undefined || got.files === undefined || got.hist === undefined) return;
      if (!got.topic) return;
      drawn = true;
      try {
        const [data, marquee] = got.files;
        const model = M.buildDeskModel({
          locus, part, parent, topic: got.topic, conf: got.conf, scr: got.scr, treat, history: got.hist,
          keyWorks: window.MOTopicKeyWorks ? window.MOTopicKeyWorks.buildKeyWorks({ locus, treat, works: got.topic.works || [], authors: got.topic.authors || [] }) : null,
          data: data || {}, marquee: (marquee && marquee.topics && marquee.topics[id]) || null,
          books: new Map(S.BOOKS.map((b) => [b.lib, b])), loci: new Map([...loci].map(([k, v]) => [k, v.locus])), bodyOf,
        });
        const html = M.renderDesk(model);
        host.innerHTML = html.hero + html.body;
        host.dataset.tier = model.tier;
        // One tablist for the About section (History is drawn above). faith-port-topic-dev-notes.js adds the other tabs through MOAbout.
        about.ready(host);
        const toggle = (b, open) => {
          b.setAttribute("aria-expanded", String(open));
          const body = host.querySelector(`#${b.getAttribute("aria-controls")}`);
          if (body) body.hidden = !open;
          if (b.closest(".tdk-row")) b.closest(".tdk-row").classList.toggle("is-open", open);
        };
        host.addEventListener("click", (e) => {
          const note = e.target.closest("[data-notes-for]");
          if (note) {
            // "See the notes under the 2nd century": open that row and bring the list into view.
            e.preventDefault();
            const b = host.querySelector(`.tdk-row[data-c="${note.dataset.notesFor}"] .tdk-row-h`);
            if (b) { toggle(b, true); const t = host.querySelector(note.getAttribute("href")); if (t) t.scrollIntoView({ block: "center" }); }
            return;
          }
          const b = e.target.closest(".tdk-row-h");
          if (b && b.tagName === "BUTTON") toggle(b, b.getAttribute("aria-expanded") !== "true");
        });
        // The page's own count boxes stay unless the desk drew counts of its own.
        if (model.modules.hero.tiles.length) root.classList.add("has-desk");
        state("drawn");
        host.querySelectorAll("img[data-tdk-portrait]").forEach((img) => {
          const fallback = () => {
            img.hidden = true;
            const ini = img.parentElement && img.parentElement.querySelector(".ini");
            if (ini) ini.hidden = false;
          };
          img.addEventListener("error", fallback, { once: true });
          if (img.complete && !img.naturalWidth) fallback();
        });
      } catch (e) {
        host.innerHTML = "";
        root.classList.remove("has-desk");
        state("failed");
      }
    };

    S.api("/v1/topic/scripture", { id, t2: locus.t2, limit: 60 }).then((r) => r || null).catch(() => null)
      .then((r) => { got.scr = r; draw(); });
    // The History data the page's notes block has always read: v1/enrich/topics/<t2 or alias>.json on the library worker.
    const base = window.__FR_BLOB_BASE__ || "https://mo-tfr-library.mo-podcast-feed.workers.dev";
    (async () => {
      for (const slug of [locus.t2, ...(locus.aliases || [])].filter(Boolean)) {
        const d = await fetch(`${base}/v1/enrich/topics/${encodeURIComponent(String(slug).toLowerCase())}.json`, { credentials: "omit" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        if (d && d.guide && (d.guide.history || []).length) return d.guide;
      }
      return null;
    })().then((g) => { got.hist = g; draw(); });
    Promise.all([loadFile("topic-desk.json"), loadFile("topic-desk-marquee.json")]).then((f) => { got.files = f; draw(); });

    return {
      feed(kind, payload, extra) {
        if (kind === "topic") { got.topic = payload; treat = extra || []; }
        if (kind === "conf") got.conf = payload;
        draw();
      },
    };
  };
}());
