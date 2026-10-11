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
  const V = {"library.html": "54caa1887062f5c2", "library.json": "7b8ad965b08db672", "english.html": "bc0e39552e4ea005", "english.json": "4c8ef2446e56b255", "westminster.html": "79a8270dfc5972e0", "westminster.json": "6810ce6fa284b50e", "puritans.html": "9640bc23bfddb975", "puritans.json": "cfb09e35ecbee27e", "anglicans.html": "0cfef67531644023", "anglicans.json": "034ab2c903086dd7", "methodists.html": "83fcbb6b8a10497e", "methodists.json": "f26204fc4abcd8fb", "councils.html": "9ae4a10a1a7e4ea1", "councils.json": "f4e31af4976d0feb", "greek.html": "a06455b3897412f4", "greek.json": "3dc0723d527a65e4", "latin.html": "aa90d875d3d85eb6", "latin.json": "538b8e7b2980bdc1", "medieval.html": "1d5a93683440a9a8", "medieval.json": "d2f625f0f51e1152", "catholic.html": "c495bad031ba0c6c", "catholic.json": "6cdfc54fe59b771a", "reformed.html": "4689155bf195fa90", "reformed.json": "17057f37a02f3ce1", "lutheran.html": "4022ae44d76745eb", "lutheran.json": "61bed108b8ce4629", "eastern.html": "0c4c0c39179530ac", "eastern.json": "5e4e46688c1fe174", "library": "af7b800097f2a5e6", "english": "ff6734be47a95a5a", "westminster": "358612c7167b2867", "puritans": "5564db1676ef28c8", "anglicans": "9e9665fd5c80b6ea", "methodists": "d9550be571c37057", "councils": "9dfda5da6a950963", "greek": "cb95ed662200d2f9", "latin": "d93ad286248126b1", "medieval": "65a2f881188964e4", "catholic": "cb98b44b0199c7a4", "reformed": "cf22b5891b4e3b87", "lutheran": "411887a2db879647", "eastern": "17cb14aa1c903204", "engine": "08b434665ab89ebe", "europe_land.json": "bb985d269feafed6"};
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
