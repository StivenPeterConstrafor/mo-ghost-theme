#!/usr/bin/env node
/*
 * Repoints every link in the theme at a RETIRED work (one listed in
 * assets/data/faith-received/work-forwards.json) to the copy that
 * replaced it, division for division: /the-faith-received/
 * westminster-shorter/#q-33 becomes /the-faith-received/read/
 * ?w=rc-115-westminster-shorter-catechism-1647&p=3#b3-12.
 *
 * The mapping is the one the browser uses: the lib
 * (assets/js/lib/faith-work-forwards.js) is loaded here in a sandbox and
 * asked, so a link rewritten at build time and an old link forwarded at
 * run time land in the same place.
 *
 * What it changes:
 *   templates, partials, JS, data  every "/the-faith-received/<old>/[#id]"
 *                                  and "/the-faith-received/read/?w=<old>
 *                                  [&p=n][#id]" (and /reader/?c=mo&w=)
 *   today.json                     url -> the new copy, plus src {mo, id}:
 *                                  Today's reading still QUOTES the old
 *                                  copy's text (kept in R2 at
 *                                  v1/mo/<slug>.json) and links to the new
 *                                  one. See initToday() in faith-received.js.
 *   catechism-daily.json           url added (faith-start.js prefers it);
 *                                  the question and answer stay inline.
 *   scripture-index.json           url added (mo-bible.js prefers it).
 *
 * What it leaves alone: the old per-work pages themselves (they forward,
 * see page/faith-work-forward.js), the memorize pages (they are built
 * from their own partial and keep working; only their "read in full"
 * link moves), routes.yaml, and scripts/ (build inputs).
 *
 *   node scripts/relink-retired-works.mjs          rewrite
 *   node scripts/relink-retired-works.mjs --dry    count only
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");
const rel = (p) => path.join(root, p);

const sandbox = { window: {}, URLSearchParams, Map, Object, String, Number, JSON };
vm.runInNewContext(readFileSync(rel("assets/js/lib/faith-work-forwards.js"), "utf8"), sandbox);
const F = sandbox.window.MOWorkForwards;
const RETIRED = new Set(F.retired());
if (!RETIRED.size) { console.log("nothing retired"); process.exit(0); }

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ALT = [...RETIRED].sort((a, b) => b.length - a.length).map(esc).join("|");

// /the-faith-received/<old>/ with an optional #id, and NOT followed by
// more path (memorize/ stays). The terminator is left in place.
const LEGACY = new RegExp(`/the-faith-received/(${ALT})/(#[A-Za-z0-9_%.-]*)?(?=["'\`)<\\s,}\\]]|$)`, "g");
// The readers: /read/?w=<old>, /reader/?c=mo&w=<old>, with optional &p=
// and #id. &amp; in templates is accepted and written back.
const READER = new RegExp(
  `/the-faith-received/(?:read/\\?w=|reader/\\?c=mo(?:&amp;|&)w=)(${ALT})((?:(?:&amp;|&)p=\\d+)?)(#[A-Za-z0-9_%.-]*)?(?=["'\`)<\\s,}\\]]|$)`, "g");

function relinkText(text, amp) {
  let n = 0;
  const out = text
    .replace(READER, (m, old, pp, hash) => {
      const p = (/p=(\d+)/.exec(pp || "") || [])[1] || "";
      n++;
      const u = F.url(old, p, hash || "");
      return amp ? u.replace(/&/g, "&amp;") : u;
    })
    .replace(LEGACY, (m, old, hash) => {
      n++;
      const u = F.url(old, "", hash || "");
      return amp ? u.replace(/&/g, "&amp;") : u;
    });
  return { out, n };
}

const counts = {};
function write(file, next, n) {
  if (!n) return;
  counts[file] = (counts[file] || 0) + n;
  if (!DRY) writeFileSync(rel(file), next);
}

/* ---- structured data first (they need fields, not just URLs) ---- */

const DATA = "assets/data/faith-received";

{ // today.json: [{slug,url,label,number}]
  const file = `${DATA}/today.json`;
  const plan = JSON.parse(readFileSync(rel(file), "utf8"));
  let n = 0;
  for (const e of plan) {
    if (!RETIRED.has(e.slug) || e.src) continue;
    const hash = String(e.url || "").split("#")[1] || "";
    e.src = { mo: e.slug, id: hash };
    e.url = F.url(e.slug, "", hash);
    n++;
  }
  write(file, `${JSON.stringify(plan)}\n`, n);
}

{ // catechism-daily.json: [{source, anchor, ...}] (or {items:[...]})
  const file = `${DATA}/catechism-daily.json`;
  const raw = JSON.parse(readFileSync(rel(file), "utf8"));
  const list = Array.isArray(raw) ? raw : (raw.items || raw.questions || []);
  let n = 0;
  for (const q of list) {
    if (!RETIRED.has(q.source) || q.url) continue;
    q.url = F.url(q.source, "", q.anchor || "");
    n++;
  }
  write(file, `${JSON.stringify(raw)}\n`, n);
}

{ // scripture-index.json: {books, index: {"Book n": [{source,id,...}]}}
  const file = `${DATA}/scripture-index.json`;
  const d = JSON.parse(readFileSync(rel(file), "utf8"));
  let n = 0;
  for (const hits of Object.values(d.index || {})) {
    for (const h of hits) {
      if (!RETIRED.has(h.source) || h.url) continue;
      h.url = F.url(h.source, "", h.id || "");
      n++;
    }
  }
  write(file, JSON.stringify(d), n);
}

/* ---- every other link, as text ---- */

const SKIP_DIRS = new Set(["node_modules", ".git", "built", "scripts", ".claude", "port"]);
function walk(dir, out) {
  for (const name of readdirSync(rel(dir))) {
    const p = path.join(dir, name);
    if (SKIP_DIRS.has(name)) continue;
    const st = statSync(rel(p));
    if (st.isDirectory()) walk(p, out);
    else if (/\.(hbs|js|json)$/.test(name)) out.push(p);
  }
  return out;
}
const files = [
  ...readdirSync(root).filter((f) => /\.hbs$/.test(f)),
  ...walk("partials", []),
  ...walk("assets/js", []),
  ...walk(DATA, []),
].filter((f) => {
  // The old per-work pages and their generated wrappers keep their own
  // links: they are the thing being forwarded.
  const m = /(?:^|\/)(?:custom-faith-)?([a-z0-9-]+?)(?:-memorize)?\.hbs$/.exec(f);
  if (m && RETIRED.has(m[1]) && !/memorize/.test(f)) return false;
  if (/work-forwards?\.(json|js)$/.test(f)) return false;
  return true;
});

for (const f of files) {
  const text = readFileSync(rel(f), "utf8");
  if (!RETIRED.size || !/the-faith-received\//.test(text)) continue;
  const { out, n } = relinkText(text, /\.hbs$/.test(f));
  write(f, out, n);
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
for (const [f, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(6)}  ${f}`);
console.log(`${DRY ? "would relink" : "relinked"} ${total} links in ${Object.keys(counts).length} files`);
