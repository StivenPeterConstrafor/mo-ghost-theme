/*
 * Links into the guides to the shelves (/the-faith-received/guide/).
 *
 * The guides are one template behind a route that is uploaded in Ghost
 * Admin rather than shipped with the theme. Until that route answers,
 * every link to a guide stays hidden instead of leading to a 404: links
 * are written with [data-guide-link] and the hidden attribute, and this
 * file shows them once a HEAD request to the route comes back ok (the
 * answer is kept for the session). Links that arrive later, like the
 * shelves in All Works, are caught as they are added.
 *
 * On a tradition page (?t=) whose shelf has a guide, the link is added
 * under the dek.
 */
(() => {
  const ROUTE = "/the-faith-received/guide/";
  const KEY = "tfr-guide-route";
  const SHELF = {
    medieval: "the Medieval shelf",
    catholic: "the Roman Catholic shelf",
    reformed: "the Continental Reformed shelf",
    lutheran: "the Lutheran shelf",
    greek: "the Greek Fathers",
    latin: "the Latin Fathers",
    english: "the English Divines",
    puritans: "the Puritans",
    anglicans: "the Anglicans",
    methodists: "the Methodists",
    westminster: "the Westminster Assembly",
  };
  // tradition slugs and their aliases (assets/data/faith-received/traditions.json) → the guides of that shelf
  const TRAD = {
    "medieval-church": ["medieval"], medieval: ["medieval"], "medieval-west": ["medieval"], scholastic: ["medieval"],
    "roman-catholic": ["catholic"], catholic: ["catholic"], rome: ["catholic"], roman: ["catholic"],
    reformed: ["reformed"], "continental-reformed": ["reformed"], calvinist: ["reformed"], "reformed-church": ["reformed"],
    lutheran: ["lutheran"], lutheranism: ["lutheran"], "evangelical-lutheran": ["lutheran"],
    "the-whole-church": ["greek", "latin"], fathers: ["greek", "latin"], "the-fathers": ["greek", "latin"], patristic: ["greek", "latin"],
    "early-church": ["greek", "latin"], "greek-fathers": ["greek"], "latin-fathers": ["latin"],
    anglican: ["anglicans"], "church-of-england": ["anglicans"], episcopal: ["anglicans"], anglicanism: ["anglicans"],
    methodist: ["methodists"], methodists: ["methodists"], wesleyan: ["methodists"], wesleyans: ["methodists"], "wesleyan-methodist": ["methodists"], methodism: ["methodists"],
    presbyterian: ["puritans", "westminster"], presbyterians: ["puritans", "westminster"], congregational: ["puritans"], congregationalist: ["puritans"], independent: ["puritans"], independents: ["puritans"],
  };
  const known = () => { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } };
  const remember = (v) => { try { sessionStorage.setItem(KEY, v); } catch (e) {} };
  let live = known() === "1";
  const reveal = (scope) => {
    if (!live) return;
    (scope || document).querySelectorAll("[data-guide-link][hidden]").forEach((el) => { el.hidden = false; });
  };
  function tradition() {
    const dek = document.querySelector("[data-trad-dek]");
    const t = (new URLSearchParams(location.search).get("t") || "").toLowerCase();
    const guides = TRAD[t];
    if (!dek || !guides || document.querySelector(".tfr-guide-link")) return;
    const p = document.createElement("p");
    p.className = "bhero-actions tfr-guide-link";
    p.setAttribute("data-guide-link", "");
    p.hidden = true;
    guides.forEach((k, i) => {
      const a = document.createElement("a");
      a.className = "bhero-btn";
      a.href = `${ROUTE}?s=${k}`;
      a.textContent = `Guide to ${SHELF[k]}`;
      p.append(a);
    });
    dek.after(p);
  }
  tradition();
  new MutationObserver((records) => {
    if (!live) return;
    records.forEach((r) => r.addedNodes.forEach((n) => { if (n.nodeType === 1) { if (n.matches("[data-guide-link][hidden]")) n.hidden = false; reveal(n); } }));
  }).observe(document.body, { childList: true, subtree: true });
  if (live) { reveal(); return; }
  if (known() === "0") return;
  fetch(ROUTE, { method: "HEAD", credentials: "same-origin" })
    .then((r) => { live = r.ok; remember(live ? "1" : "0"); reveal(); })
    .catch(() => {});
})();
