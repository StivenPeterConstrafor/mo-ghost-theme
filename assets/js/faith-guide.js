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
  const V = {"library.html": "54caa1887062f5c2", "library.json": "ccad1a4863291d5f", "english.html": "6718bdbcfa24623b", "english.json": "a99f9fd4fd8d56b3", "westminster.html": "828342f3bace575c", "westminster.json": "b67398a5527524f0", "puritans.html": "23cfb6d766e3a256", "puritans.json": "16d11849687b656f", "anglicans.html": "a815715172f3d65e", "anglicans.json": "e47655ce268b542f", "methodists.html": "f492752113b60bf3", "methodists.json": "f4d69285a0ef9e84", "councils.html": "9ae4a10a1a7e4ea1", "councils.json": "f4e31af4976d0feb", "greek.html": "03ef68c42426fe81", "greek.json": "4a9d1a40a3d98ad5", "latin.html": "75f3d7abf7098163", "latin.json": "7337d85874d98161", "medieval.html": "1d5a93683440a9a8", "medieval.json": "3973f41e0c69753c", "catholic.html": "c495bad031ba0c6c", "catholic.json": "3ae132bf5852398e", "reformed.html": "4689155bf195fa90", "reformed.json": "493469e5a55166ab", "lutheran.html": "4022ae44d76745eb", "lutheran.json": "dc692e16469fda70", "eastern.html": "91599bda5c3f2bae", "eastern.json": "5b1f116d176b6998", "library": "af7b800097f2a5e6", "english": "ff6734be47a95a5a", "westminster": "ebfe209642da4117", "puritans": "77cfc18fae93f7be", "anglicans": "71074cac3f7b7598", "methodists": "d9550be571c37057", "councils": "88f838035f85585b", "greek": "ce7b4a5a92587f8d", "latin": "5692851cc4f056a8", "medieval": "4345bee1f0d86ac4", "catholic": "1c6c4024415bd2b6", "reformed": "56db7cf58c06052d", "lutheran": "c52a9af908ec1530", "eastern": "ec82be587d7ae5e4", "engine": "c61780b1d36894ff", "europe_land.json": "bb985d269feafed6"};
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
