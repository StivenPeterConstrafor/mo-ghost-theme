/*
 * The Faith Received — guides to the shelves (/the-faith-received/guide/).
 *
 * One template, custom-faith-guide.hbs, serves every guide: ?s=<shelf>
 * picks one, and with no ?s= the page is the guides themselves under a
 * century ruler. This loader fetches the shelf's markup and data from
 * assets/data/faith-received/guides/, then runs the shared engine
 * (faith-guide-engine.js) and the shelf's own scenes
 * (faith-guide-<shelf>.js). The same three files make the stand-alone
 * previews the owner reviewed, so a guide reads the same in both.
 *
 * Versions below are each file's frv (the first 16 hex of its sha256),
 * stamped by the export that writes these files.
 */
(() => {
  const SHELVES = {"westminster": {"name": "The Westminster Assembly", "cls": "wes"}};
  const V = {"westminster.html": "f57ecb48d5b8b6ba", "westminster.json": "ec8a8c6475b4913c", "westminster": "2985bd913d7f3248", "engine": "b64d8d1914770db7", "europe_land.json": "bb985d269feafed6"};
  const root = document.querySelector("[data-guide-root]");
  if (!root) return;
  const {assets} = root.dataset;
  const asked = new URLSearchParams(location.search).get("s") || "";
  const key = Object.prototype.hasOwnProperty.call(SHELVES, asked) ? asked : "library";
  const shelf = SHELVES[key];
  const v = (name) => `?v=${V[name] || "0"}`;
  const fail = () => {
    root.innerHTML = '<div class="wrap gut" style="padding-block:64px"><p>This guide could not be loaded. <a href="/the-faith-received/guide/">See all the guides</a> or <a href="/the-faith-received/all-works/">browse the shelves</a>.</p></div>';
  };
  const script = (src) => new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.body.appendChild(s);
  });
  if (asked && key === "library") history.replaceState(null, "", location.pathname);
  document.title = key === "library" ? "Guides to the Shelves | The Faith Received | Mere Orthodoxy" : `${shelf.name} | Guides to the Shelves | The Faith Received`;
  fetch(`${assets}${key}.html${v(`${key}.html`)}`)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((html) => {
      // the Councils guide keeps its own scoped styles (.tg-cou) and does not take the shared .tg ones
      if (shelf.bare) root.classList.remove("tg");
      root.classList.add(`tg-${shelf.cls}`);
      root.dataset.data = `${assets}${key}.json${v(`${key}.json`)}`;
      root.dataset.land = `${assets}europe_land.json${v("europe_land.json")}`;
      root.innerHTML = html;
      return script(`/assets/js/faith-guide-engine.js${v("engine")}`);
    })
    .then(() => script(`/assets/js/faith-guide-${key}.js${v(key)}`))
    .then(() => {
      if (location.hash) {
        const t = document.getElementById(location.hash.slice(1));
        if (t) setTimeout(() => t.scrollIntoView(), 400);
      }
    })
    .catch(fail);
})();
