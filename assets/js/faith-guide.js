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
  const V = {"library.html": "6116f3316ac8a9f8", "library.json": "c368d080700fa780", "english.html": "5c9aeec31a9db876", "english.json": "5db84643a481761e", "westminster.html": "b81ae057720f04cf", "westminster.json": "908751f496a71eaa", "puritans.html": "a23db1fbafa6872f", "puritans.json": "82077c1d0457b425", "anglicans.html": "39079e8df537a052", "anglicans.json": "666e84d934857056", "methodists.html": "bce2612fc4e090ef", "methodists.json": "a6a4cc0963b970a7", "councils.html": "2476fc3fdde90c59", "councils.json": "a778fda8f5684ef4", "greek.html": "5734c2ba098783df", "greek.json": "7b6061591963a45b", "latin.html": "89257344d2bc3bce", "latin.json": "500f4c1343be375a", "medieval.html": "c03ce62f00da20f0", "medieval.json": "14a6be4e78db62fe", "catholic.html": "c7ab65c768e63a3c", "catholic.json": "ba455e33cd6429d7", "reformed.html": "588de64a68d1b752", "reformed.json": "cf840c426ce6f306", "lutheran.html": "ce80d02ccb7535d8", "lutheran.json": "7a801cb699b03f12", "library": "e71fe32f95dce30f", "english": "f24f56734c309a0d", "westminster": "a6fd48ed66bac1f4", "puritans": "3e563543c715018c", "anglicans": "bb88fec34ef0298b", "methodists": "d24ee0f25a6eabce", "councils": "06ff3a2586c64d3b", "greek": "2947353a4c47d72d", "latin": "741ed7dfda2717ae", "medieval": "bfbb7a6d9dfb5160", "catholic": "66574bf984af705b", "reformed": "7085b14736d6d26c", "lutheran": "1d648c365715edb2", "engine": "b92ca0e014df7cc5", "europe_land.json": "bb985d269feafed6"};
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
