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
  const V = {"library.html": "34258abb677ab544", "library.json": "c368d080700fa780", "english.html": "b85d82c8c959f310", "english.json": "679b45bc37b3da93", "westminster.html": "bdd5d12dc7895585", "westminster.json": "edba9e03dbe657b4", "puritans.html": "70962be904364fe4", "puritans.json": "3bc0ea1203984ede", "anglicans.html": "5750f11b1507e627", "anglicans.json": "cf91fb1c61eca4c8", "methodists.html": "5256af12da098dd3", "methodists.json": "7a2cc070624bb363", "councils.html": "9822cce970fb11c5", "councils.json": "a778fda8f5684ef4", "greek.html": "ae65344e647edaa2", "greek.json": "e4e078f9bcce35e5", "latin.html": "49a9a5f753b86f2f", "latin.json": "aab0831d5d615e7a", "medieval.html": "25c226b1fa0600f1", "medieval.json": "2435aed2b4fee9bd", "catholic.html": "396f5d7f71e3b744", "catholic.json": "d43b3594fc61b895", "reformed.html": "0e1922b97860e3d6", "reformed.json": "0e06e5f591adf6f7", "lutheran.html": "bdb94595016f854e", "lutheran.json": "e4ea09d9d9a6e8d5", "library": "e71fe32f95dce30f", "english": "f24f56734c309a0d", "westminster": "a6fd48ed66bac1f4", "puritans": "5512b7120ceaf407", "anglicans": "bb88fec34ef0298b", "methodists": "c49e793ad6e93fa3", "councils": "96e36ff344dc3ae8", "greek": "93a989c030ab8f7f", "latin": "9503f520ff8f0ebb", "medieval": "ab6ad65a0025a750", "catholic": "15b1bf4f9d93d553", "reformed": "f1a7345d430e50c1", "lutheran": "b7eb6581638687ca", "engine": "ea3d3cbd31680b0f", "europe_land.json": "bb985d269feafed6"};
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
