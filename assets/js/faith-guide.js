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
  const V = {"reformed.html": "4689155bf195fa90", "reformed.json": "0c8bff161d39281a", "reformed": "56db7cf58c06052d", "library.html": "54caa1887062f5c2", "library.json": "ccad1a4863291d5f", "library": "af7b800097f2a5e6", "english.html": "6718bdbcfa24623b", "english.json": "df0540ca52505796", "english": "ff6734be47a95a5a", "westminster.html": "828342f3bace575c", "westminster.json": "ed2d500cd693c44c", "westminster": "ebfe209642da4117", "puritans.html": "23cfb6d766e3a256", "puritans.json": "7d1856ba64cde4f2", "puritans": "77cfc18fae93f7be", "anglicans.html": "a815715172f3d65e", "anglicans.json": "91f745ad38d57596", "anglicans": "5559f2f2e3b380c0", "methodists.html": "f492752113b60bf3", "methodists.json": "f4d69285a0ef9e84", "methodists": "d9550be571c37057", "councils.html": "9ae4a10a1a7e4ea1", "councils.json": "f4e31af4976d0feb", "councils": "bef7bdc4ebb6d28b", "greek.html": "03ef68c42426fe81", "greek.json": "a3e53e80181ca510", "greek": "476e043b440b13d8", "latin.html": "75f3d7abf7098163", "latin.json": "2f19c07fa24d56d8", "latin": "4a2600ed512bb302", "medieval.html": "1d5a93683440a9a8", "medieval.json": "0f8787fa09e7ef15", "medieval": "4345bee1f0d86ac4", "catholic.html": "c495bad031ba0c6c", "catholic.json": "947dc6ed7b7f2a93", "catholic": "5970b487b7cecf31", "lutheran.html": "4022ae44d76745eb", "lutheran.json": "df0607a060f77565", "lutheran": "335a52c9f16081d1", "eastern.html": "91599bda5c3f2bae", "eastern.json": "f554d6752b430629", "eastern": "ec82be587d7ae5e4", "engine": "0b8ad75ce3400f56", "europe_land.json": "bb985d269feafed6"};
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
