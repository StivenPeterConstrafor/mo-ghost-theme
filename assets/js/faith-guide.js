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
  const SHELVES = {"library": {"name": "Guides to the Shelves", "cls": "lib"}, "english": {"name": "The English Divines", "cls": "eng"}, "westminster": {"name": "The Westminster Assembly", "cls": "wes"}, "puritans": {"name": "The Puritans", "cls": "pur"}, "anglicans": {"name": "The Anglicans", "cls": "ang"}, "methodists": {"name": "The Methodists", "cls": "met"}, "councils": {"name": "The Councils", "cls": "cou", "bare": true}, "greek": {"name": "The Greek Fathers", "cls": "gre"}, "latin": {"name": "The Latin Fathers", "cls": "lat"}, "medieval": {"name": "The Medieval Shelf", "cls": "med"}, "catholic": {"name": "Roman Catholic", "cls": "cat"}, "reformed": {"name": "Continental Reformed", "cls": "ref"}, "lutheran": {"name": "Lutheran", "cls": "lut"}, "eastern": {"name": "The Eastern Fathers", "cls": "eas"}};
  const V = {"library.html": "67930d9ec291ea7f", "library.json": "47dcc65187853766", "english.html": "6718bdbcfa24623b", "english.json": "7d7b85e609ecf349", "westminster.html": "8dad024ea676cce7", "westminster.json": "30e0080022a715ed", "puritans.html": "23cfb6d766e3a256", "puritans.json": "2c1d55658c17a9b4", "anglicans.html": "a815715172f3d65e", "anglicans.json": "2207da9a666aba94", "methodists.html": "f492752113b60bf3", "methodists.json": "a4b6b67c0bec6a92", "councils.html": "c71011dcb77a2254", "councils.json": "b77e53ea5ff0dd80", "greek.html": "03ef68c42426fe81", "greek.json": "1f71b6a02623aaa5", "latin.html": "75f3d7abf7098163", "latin.json": "0ff914c93eb94115", "medieval.html": "1d5a93683440a9a8", "medieval.json": "020454a984ee2a91", "catholic.html": "97419f4c04408042", "catholic.json": "ed02377704185c80", "reformed.html": "4689155bf195fa90", "reformed.json": "36e8012b4cb901cc", "lutheran.html": "4022ae44d76745eb", "lutheran.json": "c82f5e7bd6a3d218", "eastern.html": "91599bda5c3f2bae", "eastern.json": "8792c42602cd2079", "library": "fdace36f1d91a19c", "english": "ff6734be47a95a5a", "westminster": "5f3c47319a2806f8", "puritans": "77cfc18fae93f7be", "anglicans": "71074cac3f7b7598", "methodists": "d9550be571c37057", "councils": "a82ef739b86bf229", "greek": "0a0ac7643be6fd03", "latin": "c71d4a716ab433d2", "medieval": "ca40844e863d64bc", "catholic": "6f61aec749d11ea8", "reformed": "0e24c563585ed1f5", "lutheran": "13322c5d8e40b383", "eastern": "a15e90572c32d79f", "engine": "b64d8d1914770db7", "europe_land.json": "bb985d269feafed6"};
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
