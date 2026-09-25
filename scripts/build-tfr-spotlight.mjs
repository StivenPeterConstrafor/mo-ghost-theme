#!/usr/bin/env node
/*
 * The daily spotlight for the homepage's Faith Received band.
 *
 * WHAT IT WRITES. assets/data/tfr-spotlight.json: three pools of works,
 * one per citation band, each entry {slug, title, author, url}. The page
 * picks one from each pool per day, so the homepage makes no call to the
 * library worker and cannot be slowed or broken by it.
 *
 * THE BANDS, which are Ian's rule and are never labelled on screen:
 *   middle  an author cited 10,000 to 99,999 times across the library
 *   near    under 10,000
 * The day shows TWO from middle and ONE from near.
 *
 * THERE IS NO 100,000 BAND, by Ian's revision on 2026-09-25: "maybe the
 * first two slots should be 10,000-100,000 so it gets broader sources."
 * Only two authors in the whole library clear 100,000, Augustine at
 * 227,088 and Aquinas at 141,791, so that slot could only ever have been
 * one of those two men. 10,000 to 100,000 is thirty-odd authors, which
 * is a spotlight rather than a rota.
 *
 * THE COUNTS ARE PER AUTHOR, NOT PER WORK. v1/reception/index.json maps
 * an author slug to [citations received, works citing], and there is no
 * per-work equivalent: a work inherits its author's standing. So a work
 * lands in a band because of who wrote it, which is also the honest
 * reading of "in the 100,000 citation zone".
 *
 * WHY A BUILD STEP. The inputs are a 19,595-work catalogue and a
 * reception index; both are far too large to fetch on the site's most
 * visited page, and neither changes between deploys.
 *
 * Run: node scripts/build-tfr-spotlight.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../assets/data/tfr-spotlight.json");
const BASE = "https://mo-tfr-library.mo-podcast-feed.workers.dev";

// The worker refuses a non-browser user agent (it 403s urllib and the
// like), so say what we are.
const UA = { "User-Agent": "Mozilla/5.0 (mo-theme build script)" };
const get = async (path) => {
  const r = await fetch(BASE + path, { headers: UA });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
};

const slugify = (name) => String(name || "")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* HOW BIG A POOL NEEDS TO BE. Three works a day, so 400 per band is
   well over a year before anything comes round again, and the file
   stays small enough to sit on the site's busiest page. The library has
   far more than that to offer: 3,071 works by 32 authors clear 10,000
   citations and 9,076 works by 1,301 authors sit below. The caps below
   are about payload and variety, not about what qualifies.

   The middle band has only 32 authors, so its per-author cap is high or
   the pool cannot fill. The near band has 1,301, so two apiece already
   overflows 400 and the spread is wide by construction. */
const PER_AUTHOR_CAP = { middle: 20, near: 2 };
const POOL_CAP = 400;

/* Anything at or above 100,000 still counts as middle: Augustine and
   Aquinas are not excluded from the library's spotlight, they simply do
   not get a slot reserved for them. */
const band = (citations) => (citations >= 10000 ? "middle" : "near");

const [index, reception] = await Promise.all([
  get("/v1/works-index.json"),
  get("/v1/reception/index.json"),
]);

const cited = new Map(
  Object.entries(reception).map(([slug, v]) => [slug, Array.isArray(v) ? Number(v[0]) || 0 : Number(v) || 0])
);

const pools = { middle: [], near: [] };
const perAuthor = new Map();
let matched = 0;

// Longest first, so a pool that hits its cap keeps the substantial works
// rather than whichever volume happened to sort first.
const works = (index.works || []).slice().sort((a, b) => (b.n_pages || 0) - (a.n_pages || 0));

for (const w of works) {
  if (!w.slug || !w.title || !w.author) continue;
  const n = cited.get(slugify(w.author));
  if (n === undefined) continue;          // nobody has cited them in this library
  matched += 1;
  const key = band(n);
  if (pools[key].length >= POOL_CAP) continue;
  const seen = perAuthor.get(w.author) || 0;
  if (seen >= PER_AUTHOR_CAP[key]) continue;
  perAuthor.set(w.author, seen + 1);
  // No url: the page builds it from the slug, the same address the
  // browse rows use, and 400 of them are not worth the bytes.
  pools[key].push({ slug: w.slug, title: w.title, author: w.author });
}

const out = {
  generated: new Date().toISOString(),
  note: "Built by scripts/build-tfr-spotlight.mjs. Bands are by author citations received; never label them on screen.",
  pools,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`);

console.log(`works in catalogue: ${(index.works || []).length}`);
console.log(`authors with citation counts: ${cited.size}  |  works matched to one: ${matched}`);
for (const k of ["middle", "near"]) {
  const p = pools[k];
  console.log(`  ${k.padEnd(7)} ${String(p.length).padStart(3)} works  e.g. ${p[0] ? `${p[0].author}, ${p[0].title}`.slice(0, 60) : "none"}`);
}
if (pools.middle.length < 8 || pools.near.length < 4) {
  console.error("\nA band is too thin to rotate. Check the reception index.");
  process.exit(1);
}
