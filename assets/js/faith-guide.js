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
  const V = {"library.html": "5afb447f124dc6c9", "library.json": "c368d080700fa780", "english.html": "41c247a68175e082", "english.json": "add8c1f886fbe3ca", "westminster.html": "1105f041544c1f2e", "westminster.json": "ef079b910849cf38", "puritans.html": "53dc8da6a5a99d38", "puritans.json": "ddbc62a04bf763c5", "anglicans.html": "13232a1e753f561d", "anglicans.json": "34c062c20f901240", "methodists.html": "3df25b8b2850d04f", "methodists.json": "f9dc085df94d23c6", "councils.html": "13fefdb00e1d14ab", "councils.json": "a778fda8f5684ef4", "greek.html": "2a7bd4c57b1360c4", "greek.json": "d746727489e4ed95", "latin.html": "9c2338136ba04272", "latin.json": "147c77739529ca80", "medieval.html": "02aad98ae6859634", "medieval.json": "ce7e9b59b272225e", "catholic.html": "9b1805f246cfbd21", "catholic.json": "ffc23ee40b99040e", "reformed.html": "022bbb41be41ea8b", "reformed.json": "b8f9135ac0b831a6", "lutheran.html": "c3415ec48c947b7e", "lutheran.json": "fed496c86581f627", "library": "d2309d736b8dbfb7", "english": "b7b9a715e76e7ebf", "westminster": "a6d2667efca78c5c", "puritans": "d36b9f25173b779a", "anglicans": "accb265c4b4c0d1a", "methodists": "d9550be571c37057", "councils": "a82ef739b86bf229", "greek": "0a0ac7643be6fd03", "latin": "c71d4a716ab433d2", "medieval": "f23cd75944b57a85", "catholic": "e6756bdf642416f4", "reformed": "37bd360ad73583f5", "lutheran": "3cc8e69ef117b06a", "engine": "3ae043a0638781a8", "europe_land.json": "bb985d269feafed6"};
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
