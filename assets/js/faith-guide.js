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
  const V = {"library.html": "8b2f8d45fb4bb6e5", "library.json": "47dcc65187853766", "english.html": "6718bdbcfa24623b", "english.json": "b932411870fc35a3", "westminster.html": "8dad024ea676cce7", "westminster.json": "8a705e1a60928af4", "puritans.html": "17138a32312deb3a", "puritans.json": "c1e0a87b62912b8e", "anglicans.html": "a815715172f3d65e", "anglicans.json": "471ced5f26a96a0f", "methodists.html": "f492752113b60bf3", "methodists.json": "88c8ea8ab84eb92d", "councils.html": "c71011dcb77a2254", "councils.json": "b77e53ea5ff0dd80", "greek.html": "03ef68c42426fe81", "greek.json": "5606318bb033aa6e", "latin.html": "75f3d7abf7098163", "latin.json": "52cc392e8d8d5412", "medieval.html": "8d06264a0a377187", "medieval.json": "ba546f152615bb60", "catholic.html": "3bfbe1e642b3c4d5", "catholic.json": "580fa39560c3f560", "reformed.html": "c3a9d99de2fffb10", "reformed.json": "52bb73c74ac08427", "lutheran.html": "4d1ee98d0cf3c82f", "lutheran.json": "c602f4b77bceb1f8", "eastern.html": "2fb86b01847ef2c8", "eastern.json": "fd9a9b5bce15af57", "library": "1239b8eef2cbfecd", "english": "40d00ddaec7c8dbe", "westminster": "5f3c47319a2806f8", "puritans": "77cfc18fae93f7be", "anglicans": "71074cac3f7b7598", "methodists": "d9550be571c37057", "councils": "a82ef739b86bf229", "greek": "0a0ac7643be6fd03", "latin": "c71d4a716ab433d2", "medieval": "ca40844e863d64bc", "catholic": "142b9ab44bef9325", "reformed": "8d8368d36cd0acd5", "lutheran": "52eccf82545cbb69", "eastern": "92c959ab49a81b16", "engine": "b64d8d1914770db7", "europe_land.json": "bb985d269feafed6"};
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
