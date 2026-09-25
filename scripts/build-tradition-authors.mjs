#!/usr/bin/env node
/*
 * Build the author lists for the tradition pages.
 *
 *   node scripts/build-tradition-authors.mjs
 *
 * Writes assets/data/faith-received/tradition-authors.json, which
 * assets/js/page/faith-tradition.js reads. Rerun it when the library's
 * shelf rosters change (a new author room, a new shelf) or after
 * rebuilding denominations.json.
 *
 * WHO IS LISTED. Only authors who have a room: the nine shelf rosters
 * the author page resolves ?a= against (v1/bible/<shelf>/rooms/index.json).
 * A name with no room would link to a page that cannot load.
 *
 * WHERE EACH ONE FILES. The same tables and the same order of questions
 * the author page's own label uses (assets/js/page/faith-author-labels.js),
 * so the tradition page and the author page never disagree about a man:
 *   1. his church from denominations.json (keyed by name and dates, so
 *      the two John Owens stay apart);
 *   2. a religious order from v1/schools.json, which makes him Roman
 *      Catholic after 1500 and medieval before it;
 *   3. otherwise his shelf and his dates: the Lutheran and Reformed
 *      shelves say so; a father before 800 wrote in the early church; a
 *      Latin writer from 800 to 1500 is medieval; a Greek writer from
 *      800 to 1453 is Byzantine and files with Eastern Orthodoxy.
 *      Patrologia Orientalis after 800 is the Syriac, Coptic, Armenian and
 *      Ethiopic churches, which are not Eastern Orthodox and have no page
 *      yet, so they are left out rather than misfiled.
 * An author none of these places is left out. The English shelf's
 * unplaced names are the largest group; they appear once the
 * denomination table reaches them.
 *
 * DATES. The room's own `dates`, else authors.json, else the birth year
 * the roster carries, printed "b. 1616" only when nothing better exists.
 */

import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const OUT = path.join(ROOT, "assets", "data", "faith-received", "tradition-authors.json");
const DENOMS = path.join(ROOT, "assets", "data", "faith-received", "denominations.json");
const LIBRARY = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
// The library worker 403s anything that does not look like a browser.
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const SHELVES = ["pl", "gf", "po", "ed", "md", "rc", "lu", "rf", "hl"];

// Body (denominations.json) -> tradition page slug. Continental Reformed
// is the Reformed page; the English and Scottish Reformed have their own.
const BODY_PAGE = {
  Anglican: "anglican", Presbyterian: "presbyterian", Congregational: "congregational",
  Baptist: "baptist", Quaker: "quaker", "Continental Reformed": "reformed",
  Reformed: "reformed",
  Lutheran: "lutheran", Anabaptist: "anabaptist", Arminian: "arminian",
  "Bohemian Brethren": "bohemian-brethren", Waldensian: "waldensian",
  "Eastern Orthodox": "eastern-orthodox",
};
const ORDER_NAME = { Jesuits: "Jesuit", Dominicans: "Dominican", Franciscans: "Franciscan", Augustinians: "Augustinian", Carmelites: "Carmelite", Benedictines: "Benedictine" };

async function get(url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const r = await fetch(url, { headers: { "user-agent": UA } }).catch(() => null);
    if (r && r.ok) return r.json();
    if (r && r.status === 404) return null;
  }
  throw new Error(`failed ${url}`);
}

const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const years = (t) => (String(t || "").match(/\b\d{3,4}\b/g) || []).map(Number);

// faith-author-labels.js denomFor(), line for line.
function denomFor(denoms, name, ys) {
  const bare = fold(name);
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

const CORPORATE = /\b(?:council|councils|synod|assembly|divines|academy|collegium|conimbricense|salmanticenses|salamanticenses|wirceburgensis|acta)\b|\((?:ed|hrsg)\.?\)|\bhrsg\b|migne cols|'s ten books/i;
// The Greek Fathers shelf after 800 is the Byzantine church, with a few
// Latins printed beside it: popes writing to Constantinople, a Roman
// librarian, a Latin archbishop. They are medieval Latins, not Byzantine.
const LATIN_IN_PG = /^pope\b|\bof milan\b|bibliothecari|bibliotecari/i;
// Syriac writers the Greek shelf carries. Their church is not Eastern
// Orthodox and has no page yet.
const NOT_BYZANTINE = /\bbar kepha\b|\bbar hebraeus\b/i;

function place(sh, y, body, order, name) {
  if (BODY_PAGE[body]) return BODY_PAGE[body];
  const early = y && y < 800;
  if (["pl", "gf", "po"].includes(sh) && early) return "the-whole-church";
  // A Greek patriarch is Orthodox whatever shelf printed him: Gennadius
  // Scholarios sits on the Medieval shelf.
  if (y && y >= 800 && /\bpatriarch of (?:constantinople|alexandria|antioch|jerusalem)\b/i.test(name)
    && !LATIN_IN_PG.test(name) && body !== "Roman Catholic") return "eastern-orthodox";
  if (sh === "gf" && y && y < 1453) {
    if (LATIN_IN_PG.test(name)) return y < 1500 ? "medieval-church" : "";
    if (NOT_BYZANTINE.test(name)) return "";
    return "eastern-orthodox";
  }
  if (body === "Roman Catholic" || order || sh === "rc") {
    // Gerson and Tostado sit on the Roman Catholic shelf but wrote a
    // century before the Reformation: born before 1450, medieval.
    if (y && y < 1450 && y >= 800) return "medieval-church";
    if (sh === "rc" || (y && y >= 1500)) return "roman-catholic";
    if (y && y >= 800 && ["pl", "md"].includes(sh)) return "medieval-church";
    return "";
  }
  if (sh === "lu") return "lutheran";
  if (sh === "rf") return "reformed";
  if (sh === "md" && y) return y >= 1517 ? "roman-catholic" : "medieval-church";
  if (sh === "pl" && y && y >= 800 && y < 1500) return "medieval-church";
  return "";
}

const denoms = JSON.parse(await readFile(DENOMS, "utf8")).authors || {};
const [schoolsRaw, llAuthors, ...rosters] = await Promise.all([
  get(`${LIBRARY}/v1/schools.json`),
  get(`${LIBRARY}/v1/authors.json`),
  ...SHELVES.map((sh) => get(`${LIBRARY}/v1/bible/${sh}/rooms/index.json`)),
]);
const orders = new Map();
Object.entries(schoolsRaw || {}).forEach(([school, v]) => {
  if (!ORDER_NAME[school]) return;
  ((v && v.authors) || []).forEach((n) => orders.set(fold(n), ORDER_NAME[school]));
});

// One row per room. A man with rooms on two shelves keeps the one with
// more works, which is the one ?a= is most useful for.
const seen = new Map();
rosters.forEach((d, i) => {
  const sh = SHELVES[i];
  ((d && d.authors) || []).forEach((e) => {
    if (!e.a || !e.s) return;
    // Not people: anonymous buckets, anthologies, and conciliar acts
    // (the Council of Trent has a room, and is not an author).
    if (/^(?:anonymous|unknown|uncertain|unattributed|acts of)\b|\banthology\b|synaxarion/i.test(e.a)) return;
    // Nor bodies: councils, synods, assemblies, colleges and their
    // editors have rooms, but an Authors list is a list of people.
    if (CORPORATE.test(e.a)) return;
    // A volume filed under five names at once is a volume, not a man.
    if ((e.a.match(/,/g) || []).length >= 3) return;
    const k = fold(e.a);
    const had = seen.get(k);
    if (!had || (e.w || 0) > (had.w || 0)) seen.set(k, { ...e, sh });
  });
});

// Room dates, fetched only for the men who file somewhere.
const rows = [...seen.values()];
const out = {};
let placed = 0;
const queue = rows.slice();
async function worker() {
  while (queue.length) {
    const e = queue.shift();
    const ll = llAuthors && typeof llAuthors[e.a] === "object" ? llAuthors[e.a] : null;
    let dates = (ll && ll.dates) || "";
    const pre = denomFor(denoms, e.a, years(dates).length ? years(dates) : (e.y ? [e.y] : []));
    const order = orders.get(fold(e.a)) || "";
    const slug = place(e.sh, e.y || years(dates)[0] || 0, pre && pre[0], order, e.a);
    if (!slug) continue;
    if (!dates) {
      const room = await get(`${LIBRARY}/v1/bible/${e.sh}/rooms/${e.s}.json`).catch(() => null);
      dates = (room && room.dates) || "";
      // Some rooms carry no dates field but open their bio on them:
      // "Jacobus Arminius (1560–1609), professor of theology at Leiden".
      // Only a pair in the bio's first sentence, which is the subject's.
      if (!dates) {
        const bio = String((room && room.bio) || (typeof llAuthors[e.a] === "string" ? llAuthors[e.a] : ""));
        const m = /^[^.]{0,160}?\(((?:c\. )?\d{3,4}[–-](?:c\. )?\d{3,4})\)/.exec(bio);
        if (m) dates = m[1].replace("-", "–");
      }
    }
    if (/^unknown$/i.test(dates.trim())) dates = "";
    const ys = years(dates);
    const d = denomFor(denoms, e.a, ys.length ? ys : (e.y ? [e.y] : [])) || pre;
    const final = place(e.sh, e.y || ys[0] || 0, d && d[0], order, e.a);
    if (!final) continue;
    const detail = [d && d[1], order].filter(Boolean).join(", ");
    (out[final] = out[final] || []).push({
      n: e.a,
      s: e.s,
      d: dates || (e.y ? `b. ${e.y}` : ""),
      y: e.y || ys[0] || 0,
      w: e.w || 0,
      ...(detail ? { x: detail } : {}),
    });
    placed += 1;
  }
}
await Promise.all(Array.from({ length: 12 }, worker));

Object.values(out).forEach((list) => list.sort((a, b) => (a.y || 9999) - (b.y || 9999) || a.n.localeCompare(b.n)));
const sorted = Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
await writeFile(OUT, JSON.stringify({
  version: new Date().toISOString().slice(0, 10),
  note: "Built by scripts/build-tradition-authors.mjs. Do not edit by hand.",
  traditions: sorted,
}));
console.log(`placed ${placed} of ${rows.length} rooms`);
Object.entries(sorted).forEach(([k, v]) => console.log(`  ${k.padEnd(20)} ${v.length}`));
console.log(`wrote ${path.relative(ROOT, OUT)}`);
