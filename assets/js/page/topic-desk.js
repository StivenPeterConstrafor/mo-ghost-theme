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

  window.MOTopicDeskMount = function mount(opts) {
    const M = window.MOTopicDesk;
    const { host, root, id, locus, part, parent, S, loci, bodyOf } = opts;
    if (!M || !host || !S) return null;
    const got = { topic: undefined, conf: undefined, scr: undefined, files: undefined };
    let treat = [];
    let drawn = false;

    const draw = () => {
      if (drawn || !host.isConnected) return;
      if (got.topic === undefined || got.conf === undefined || got.scr === undefined || got.files === undefined) return;
      if (!got.topic) return;
      drawn = true;
      try {
        const [data, marquee] = got.files;
        const model = M.buildDeskModel({
          locus, part, parent, topic: got.topic, conf: got.conf, scr: got.scr, treat,
          data: data || {}, marquee: (marquee && marquee.topics && marquee.topics[id]) || null,
          books: new Map(S.BOOKS.map((b) => [b.lib, b])), loci: new Map([...loci].map(([k, v]) => [k, v.locus])), bodyOf,
        });
        const html = M.renderDesk(model);
        host.innerHTML = html.hero + html.body;
        host.dataset.tier = model.tier;
        // "The doctrine through the centuries" (faith-port-topic-dev-notes.js) belongs right under the century showpiece.
        const notes = root.querySelector(".fr-dn");
        const anchor = host.querySelector("#tdk-chron");
        if (notes && anchor) anchor.after(notes);
        // The page's own count boxes stay unless the desk drew counts of its own.
        if (model.modules.hero.tiles.length) root.classList.add("has-desk");
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
      }
    };

    S.api("/v1/topic/scripture", { id, t2: locus.t2, limit: 60 }).then((r) => r || null).catch(() => null)
      .then((r) => { got.scr = r; draw(); });
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
