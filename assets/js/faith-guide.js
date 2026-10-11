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
  const SHELVES = {"library": {"name": "Guides to the Shelves", "cls": "lib"}, "english": {"name": "The English Divines", "cls": "eng"}, "westminster": {"name": "The Westminster Assembly", "cls": "wes"}, "puritans": {"name": "The Puritans", "cls": "pur"}, "anglicans": {"name": "The Anglicans", "cls": "ang"}, "methodists": {"name": "The Methodists", "cls": "met"}, "councils": {"name": "The Councils", "cls": "cou", "bare": true}, "greek": {"name": "The Greek Fathers", "cls": "gre"}, "latin": {"name": "The Latin Fathers", "cls": "lat"}, "medieval": {"name": "The Medieval Shelf", "cls": "med"}, "catholic": {"name": "Roman Catholic", "cls": "cat"}, "reformed": {"name": "Continental Reformed", "cls": "ref"}, "lutheran": {"name": "Lutheran", "cls": "lut"}};
  const V = {"library.html": "34258abb677ab544", "library.json": "dff496cf3d8a5455", "english.html": "d1247df5320fe5bd", "english.json": "568b0ea0306538f7", "westminster.html": "cc0401a205a4b7ad", "westminster.json": "7251ac450aa5bc90", "puritans.html": "6c71a4303a34cf19", "puritans.json": "ea3187aa282d8ee0", "anglicans.html": "6a502761b9880bca", "anglicans.json": "c292a18bd577bef4", "methodists.html": "0dfd7a39298bbe0d", "methodists.json": "b3ffceec91bc2c74", "councils.html": "9822cce970fb11c5", "councils.json": "b77e53ea5ff0dd80", "greek.html": "f604333e96d93fc1", "greek.json": "4499b2817b5dd8cb", "latin.html": "c23d113df350bd16", "latin.json": "342019b7f0879a89", "medieval.html": "ef137936535a0478", "medieval.json": "c8adb71f6a341163", "catholic.html": "a8b098a08e789dcf", "catholic.json": "b0e5da4127bd3496", "reformed.html": "13b8fdc226dbb063", "reformed.json": "4b73174fa87580f8", "lutheran.html": "f3c125450f4dc91a", "lutheran.json": "d07b60c82821ddf0", "library": "e71fe32f95dce30f", "english": "0fe13856a916d86c", "westminster": "58447f742712b5d6", "puritans": "9976fa4d8bb21375", "anglicans": "52a96054a1344f28", "methodists": "c49e793ad6e93fa3", "councils": "96e36ff344dc3ae8", "greek": "93a989c030ab8f7f", "latin": "9503f520ff8f0ebb", "medieval": "638d54cdd99f698f", "catholic": "91b263fd6ff14dd1", "reformed": "4137e1f6e395a2a3", "lutheran": "5e989726156f5bf9", "engine": "aa9d200d8b9b03c5", "europe_land.json": "bb985d269feafed6"};
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
