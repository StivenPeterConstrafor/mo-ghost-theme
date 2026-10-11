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
    councils: "the Councils",
    eastern: "the Eastern Fathers",
  };
  // tradition slugs and their aliases (assets/data/faith-received/traditions.json) → the guides of that shelf
  const TRAD = {
    "medieval-church": ["medieval"], medieval: ["medieval"], "medieval-west": ["medieval"], scholastic: ["medieval"],
    "roman-catholic": ["catholic"], catholic: ["catholic"], rome: ["catholic"], roman: ["catholic"],
    reformed: ["reformed"], "continental-reformed": ["reformed"], calvinist: ["reformed"], "reformed-church": ["reformed"],
    lutheran: ["lutheran"], lutheranism: ["lutheran"], "evangelical-lutheran": ["lutheran"],
    "the-whole-church": ["councils", "greek", "latin"], fathers: ["greek", "latin"], "the-fathers": ["greek", "latin"], patristic: ["greek", "latin"],
    "early-church": ["greek", "latin"], "greek-fathers": ["greek"], "latin-fathers": ["latin"],
    "eastern-orthodox": ["greek", "eastern"], orthodox: ["greek", "eastern"], "eastern-fathers": ["eastern"], "oriental-orthodox": ["eastern"], "church-of-the-east": ["eastern"], protestant: ["reformed", "lutheran", "english"], baptist: ["english"], baptists: ["english"],
    arminian: ["reformed"], remonstrant: ["reformed"], councils: ["councils"],
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
  // The Traditions index (owner, 2026-10-11: "the guides … where they belong with respect to traditions"): under each
  // tradition that has a guide, a line of its guides, in the row's own two columns.
  function index() {
    if (!/\/traditions\/?$/.test(location.pathname)) return;
    document.querySelectorAll("a.tfr-trad-ix").forEach((a) => {
      const t = (new URL(a.href, location.href).searchParams.get("t") || "").toLowerCase();
      const guides = TRAD[t];
      if (!guides || (a.nextElementSibling && a.nextElementSibling.matches(".tfr-trad-guides"))) return;
      const p = document.createElement("p");
      p.className = "tfr-trad-guides";
      p.setAttribute("data-guide-link", "");
      p.hidden = !live;
      p.style.cssText = "display:grid;grid-template-columns:minmax(10em,15em) minmax(0,1fr);gap:2px 24px;margin:-8px 0 0;padding:0 0 16px;";
      const cell = document.createElement("span");
      cell.style.cssText = "grid-column:2;display:flex;flex-wrap:wrap;gap:6px 22px;";
      guides.forEach((k) => {
        const g = document.createElement("a");
        g.className = "btrad-all";
        g.style.marginTop = "0";
        g.href = `${ROUTE}?s=${k}`;
        g.textContent = `Guide to ${SHELF[k]} →`;
        cell.append(g);
      });
      p.append(cell);
      a.after(p);
    });
  }
  index();
  new MutationObserver(() => index()).observe(document.body, { childList: true, subtree: true });
  new MutationObserver((records) => {
    if (!live) return;
    records.forEach((r) => r.addedNodes.forEach((n) => { if (n.nodeType === 1) { if (n.matches("[data-guide-link][hidden]")) n.hidden = false; reveal(n); } }));
  }).observe(document.body, { childList: true, subtree: true });
  if (live) { reveal(); return; }
  // A "no" is not kept: the route went live after many readers had visited, and a stored "no" hid every guide link for the
  // rest of their session (2026-10-11). Only a "yes" saves the request.
  fetch(ROUTE, { method: "HEAD", credentials: "same-origin" })
    .then((r) => { live = r.ok; remember(live ? "1" : "0"); reveal(); })
    .catch(() => {});
})();
