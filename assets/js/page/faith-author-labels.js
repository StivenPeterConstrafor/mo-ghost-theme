/*
 * What kind of writer this is: tradition, and denomination or order.
 *
 * Ian, 2026-09-23: "on the author's page ... they could be labeled by
 * tradition and denomination better than they are right now. As it
 * stands, it's not very clear on what kinds of writers these are." The
 * room printed one word, its shelf: "Greek Fathers", "Roman Catholic",
 * "English writers". The directory printed a period ("Seventeenth
 * century"). Neither says that Owen was a Congregationalist and a
 * Puritan, Bellarmine a Jesuit, or Chrysostom a father of the early
 * church writing in Greek.
 *
 * WHAT IS SAID, AND FROM WHERE. Nothing here is guessed per author; each
 * label comes from a table somebody curated, or from the shelf:
 *   - the church (body) and party: denominations.json, the table behind
 *     the library's Denomination filter (faith-denominations.js). Keyed
 *     by name and dates, so the two John Owens stay apart;
 *   - a religious order: the library's schools list (v1/schools.json:
 *     Jesuits, Dominicans, Franciscans, Augustinians);
 *   - otherwise the shelf and the century: a Greek or Latin father before
 *     800 is of the Early Church, a Greek writer after it (to 1453)
 *     Byzantine, a Latin one (to 1500) Medieval; Lutheran and Reformed
 *     shelves say so. Undated, or later than that, the shelf name stands.
 * Where none of these knows, the shelf name stands, as before.
 *
 * ON THE ROOM: the "Tradition" box says the tradition (Protestant, Roman
 * Catholic, Early Church...) and a second box beside it says the
 * denomination, the order, or for a father the church he wrote in
 * (Greek, Latin, Eastern). IN THE DIRECTORY: the line under each name
 * reads "c. 1616 · Congregational, Puritan" instead of the period.
 *
 * Text only, set with textContent. Re-applied by a MutationObserver
 * because the port redraws both views and rewrites the tradition word
 * once its own denomination table lands.
 */
(function () {
  "use strict";

  const LIB = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
  const SHELF = {
    gf: "Greek Fathers", pl: "Latin Fathers", po: "Eastern Fathers", ed: "English writers",
    md: "Medieval", rc: "Roman Catholic", lu: "Lutheran", rf: "Continental Reformed", hl: "Humanism and Law",
  };
  const CHURCH_OF = { gf: "Greek", pl: "Latin", po: "Eastern" };
  const ORDER_NAME = { Jesuits: "Jesuit", Dominicans: "Dominican", Franciscans: "Franciscan", Augustinians: "Augustinian", Carmelites: "Carmelite", Benedictines: "Benedictine" };
  const BODY_NAME = { "Continental Reformed": "Reformed" };
  const ERAS = /^(?:Early patristic|Later patristic|Carolingian|High medieval|Reformation|Seventeenth century|Later authors|Undated)$/;

  const fold = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  // ── The tables ───────────────────────────────────────────────────
  let denoms = null; // { key: [body, party, confidence] }
  let schools = null; // Map(folded name -> order)
  const denomPath = "/assets/data/faith-received/denominations.json";
  const ready = Promise.all([
    fetch(window.moAssetUrl ? window.moAssetUrl(denomPath) : denomPath)
      .then((r) => (r.ok ? r.json() : null)).then((d) => { denoms = (d && d.authors) || {}; })
      .catch(() => { denoms = {}; }),
    fetch(`${LIB}/v1/schools.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        schools = new Map();
        Object.entries(d || {}).forEach(([school, v]) => {
          (v && v.authors || []).forEach((name) => schools.set(fold(name), ORDER_NAME[school] || school));
        });
      })
      .catch(() => { schools = new Map(); }),
  ]);

  function years(text) {
    return (String(text || "").match(/\b\d{3,4}\b/g) || []).map(Number);
  }
  // The denomination table's own key: forename surname, then dates.
  function denomFor(name, ys) {
    if (!denoms) return null;
    let bare = fold(name);
    if (window.MODenom && typeof window.MODenom.authorKey === "function") {
      try { bare = window.MODenom.authorKey(name) || bare; } catch (e) { /* keep fold */ }
    }
    if (!bare) return null;
    if (ys.length >= 2 && denoms[`${bare} ${ys[0]} ${ys[1]}`]) return denoms[`${bare} ${ys[0]} ${ys[1]}`];
    if (ys.length && denoms[`${bare} ${ys[0]}`]) return denoms[`${bare} ${ys[0]}`];
    if (ys.length) {
      const hit = Object.keys(denoms).find((k) => k.indexOf(`${bare} ${ys[0]} `) === 0);
      if (hit) return denoms[hit];
    }
    if (denoms[bare]) return denoms[bare];
    const dated = Object.keys(denoms).filter((k) => k.indexOf(`${bare} `) === 0 && /^\d/.test(k.slice(bare.length + 1)));
    return dated.length === 1 ? denoms[dated[0]] : null;
  }

  /* { tradition, detail, detailLabel } for one author. */
  function labelFor(name, sh, datesText) {
    const ys = years(datesText);
    const year = ys.length ? ys[0] : 0;
    const d = denomFor(name, ys);
    const body = d && d[0] ? d[0] : "";
    const party = d && d[1] ? d[1] : "";
    const order = schools ? schools.get(fold(name)) || "" : "";
    const communion = body && window.MODenom && window.MODenom.communion ? window.MODenom.communion(body) : "";

    let tradition = "";
    if (communion) tradition = communion;
    else if (body === "Roman Catholic" || order || sh === "rc") tradition = "Roman Catholic";
    else if (sh === "lu" || sh === "rf") tradition = "Protestant";
    else if (sh === "md") tradition = year >= 1517 ? "Roman Catholic" : "Medieval Church";
    // The fathers' shelves also hold later editors and scholars (Leo
    // Allatius, 1586; Garnier's Jesuit editions) and writers the
    // catalogue does not date. For them the century says nothing sure, so
    // the shelf's own name stands rather than a guess.
    else if (sh === "pl" && year && year < 1500) tradition = year > 800 ? "Medieval Church" : "Early Church";
    else if (sh === "gf" && year && year < 1453) tradition = year > 800 ? "Byzantine" : "Early Church";
    else if (sh === "po" && year && year < 1500) tradition = year > 800 ? "Eastern Christian" : "Early Church";
    else tradition = SHELF[sh] || "";
    // A medieval writer placed "Roman Catholic" by the table still wrote
    // before there was a Protestant to tell him apart from.
    if (tradition === "Roman Catholic" && year && year < 1500 && sh !== "rc") tradition = "Medieval Church";

    let detail = "";
    let detailLabel = "Denomination";
    if (body && body !== "Roman Catholic") {
      detail = (BODY_NAME[body] || body) + (party ? `, ${party}` : "");
    } else if (party) {
      detail = party;
    } else if (order) {
      detail = order;
      detailLabel = "Order";
    } else if (sh === "lu") {
      detail = "Lutheran";
    } else if (sh === "rf") {
      detail = "Reformed";
    } else if (CHURCH_OF[sh] && tradition !== "Medieval Church" && tradition !== SHELF[sh]) {
      detail = CHURCH_OF[sh];
      detailLabel = "Church";
    }
    return { tradition, detail, detailLabel };
  }

  // ── Links to the tradition pages ─────────────────────────────────
  // The room's two words, tradition and church, open that tradition's
  // page (2026-09-24). Only the words with a page link; an order, a
  // party or "Greek" stays text. The directory's line is inside the
  // row's own link, so it stays text there.
  const TRAD_PAGE = {
    "Protestant": "protestant", "Roman Catholic": "roman-catholic", "Early Church": "the-whole-church",
    "Medieval Church": "medieval-church", "Byzantine": "eastern-orthodox",
    "Anglican": "anglican", "Presbyterian": "presbyterian", "Congregational": "congregational",
    "Baptist": "baptist", "Quaker": "quaker", "Reformed": "reformed", "Lutheran": "lutheran",
    "Anabaptist": "anabaptist", "Arminian": "arminian", "Bohemian Brethren": "bohemian-brethren",
    "Waldensian": "waldensian",
  };
  // Writes `text` into el, its first comma-separated word a link when that
  // word has a page. Idempotent: the observer calls this on every redraw,
  // and a write that changes nothing must not trigger another.
  function writeLabel(el, text) {
    const head = String(text).split(", ")[0];
    const slug = TRAD_PAGE[head];
    const href = slug ? `/the-faith-received/tradition/?t=${slug}` : "";
    const a = el.querySelector("a.ar-trad-link");
    if (el.textContent === text && (href ? a && a.getAttribute("href") === href : !a)) return;
    el.textContent = "";
    if (!href) { el.textContent = text; return; }
    const link = document.createElement("a");
    link.className = "ar-trad-link";
    link.href = href;
    link.textContent = head;
    el.append(link, text.slice(head.length));
  }

  // ── The room ─────────────────────────────────────────────────────
  function roomShelf() {
    return new URLSearchParams(location.search).get("sh") || "";
  }
  function paintRoom() {
    // The port's own room only: an author with no room draws a
    // main.research-room of its own (faith-author-page.js), with its labels.
    const room = document.querySelector("main#page.research-room");
    const profile = room && room.querySelector(".rx-profile");
    const grid = profile && profile.querySelector(".ar-stats");
    if (!grid) return;
    const wordBox = grid.querySelector(".ar-stat--word:not(.ar-stat--detail)");
    if (!wordBox) return;
    const h1 = room.querySelector("h1");
    const name = h1 ? h1.textContent.trim() : "";
    const deck = profile.querySelector(".deck");
    const L = labelFor(name, roomShelf(), deck ? deck.textContent : "");
    if (!L.tradition) return;
    const value = wordBox.querySelector("b");
    const church = value && value.querySelector("[data-author-church]");
    const target = church || value;
    if (target) writeLabel(target, L.tradition);
    let detail = grid.querySelector(".ar-stat--detail");
    if (!L.detail) { if (detail) detail.remove(); return; }
    if (!detail) {
      detail = document.createElement("div");
      detail.className = "ar-stat ar-stat--word ar-stat--detail";
      detail.append(document.createElement("b"), document.createElement("span"));
      wordBox.after(detail);
    }
    const [b, span] = [detail.querySelector("b"), detail.querySelector("span")];
    if (L.detailLabel === "Denomination") writeLabel(b, L.detail);
    else if (b.textContent !== L.detail) b.textContent = L.detail;
    if (span.textContent !== L.detailLabel) span.textContent = L.detailLabel;
  }

  // ── The directory ────────────────────────────────────────────────
  function paintDirectory() {
    document.querySelectorAll("main.research-directory .rx-author-row:not([data-mo-label])").forEach((row) => {
      const main = row.querySelector(".rx-author-main");
      const strong = main && main.querySelector("strong");
      const small = main && main.querySelector("small");
      if (!strong || !small) return;
      // A volume anthology has no one tradition, and its only date is
      // the year Migne printed it.
      if (/\banthology\b/i.test(strong.textContent)) { row.dataset.moLabel = "1"; return; }
      let sh = "";
      try { sh = new URL(main.href, location.href).searchParams.get("sh") || ""; } catch (e) { /* none */ }
      const parts = small.textContent.split(" · ");
      const dates = parts.length > 1 ? parts[0] : (ERAS.test(parts[0]) ? "" : parts[0]);
      const L = labelFor(strong.textContent.trim(), sh, dates);
      const said = L.detail && L.detailLabel !== "Church" ? L.detail : [L.tradition, L.detail].filter(Boolean).join(", ");
      if (!said) return;
      row.dataset.moLabel = "1";
      small.textContent = dates ? `${dates} · ${said}` : said;
    });
  }

  function paint() {
    paintRoom();
    paintDirectory();
  }
  // For faith-author-page.js, which draws the rooms' boxes for authors with no room.
  window.MOAuthorLabels = { ready, labelFor, writeLabel };
  ready.then(() => {
    const page = document.getElementById("page") || document.body;
    new MutationObserver(paint).observe(page, { childList: true, subtree: true, characterData: true });
    paint();
  });
})();
