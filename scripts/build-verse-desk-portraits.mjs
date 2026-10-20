#!/usr/bin/env node
/*
 * Which authors have a portrait the Verse Desk can show.
 *
 * The shelf guides carry the portraits (assets/data/faith-received/guides/portraits/*.jpg, 245 files) and name them in each guide's
 * `portraits` map. The desk would otherwise have to fetch fourteen guide files to find one picture. This gathers the maps into one
 * small file keyed by the author's name as the guides spell it: name -> { src, kind }.
 *
 *   node scripts/build-verse-desk-portraits.mjs           write assets/data/faith-received/verse-desk-portraits.json
 *   node scripts/build-verse-desk-portraits.mjs --check   fail if the committed file is stale or names a missing picture
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const DIR = path.join(ROOT, "assets/data/faith-received/guides");
const OUT = path.join(ROOT, "assets/data/faith-received/verse-desk-portraits.json");

const out = {};
for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith(".json")).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
  const ps = d && typeof d === "object" && !Array.isArray(d) ? d.portraits : null;
  if (!ps || typeof ps !== "object") continue;
  for (const [name, p] of Object.entries(ps)) {
    if (!p || !p.src || out[name]) continue;
    out[name] = { src: p.src, kind: p.kind || "portrait" };
  }
}
const sorted = Object.fromEntries(Object.entries(out).sort((a, b) => a[0].localeCompare(b[0])));
const text = `${JSON.stringify({ v: 1, note: "Built by scripts/build-verse-desk-portraits.mjs from the shelf guides. Do not edit by hand.", p: sorted })}\n`;

if (process.argv.includes("--check")) {
  const bad = [];
  if (!fs.existsSync(OUT) || fs.readFileSync(OUT, "utf8") !== text) bad.push("verse-desk-portraits.json is stale: run node scripts/build-verse-desk-portraits.mjs");
  for (const [name, p] of Object.entries(sorted)) {
    if (!fs.existsSync(path.join(DIR, p.src.split("?")[0]))) bad.push(`${name}: ${p.src} is not in the portraits folder`);
  }
  if (bad.length) { console.error(`build-verse-desk-portraits: ${bad.length} problem(s)\n - ${bad.join("\n - ")}`); process.exit(1); }
  console.log(`build-verse-desk-portraits: ok (${Object.keys(sorted).length} portraits)`);
} else {
  fs.writeFileSync(OUT, text);
  console.log(`wrote ${path.relative(ROOT, OUT)} (${Object.keys(sorted).length} portraits)`);
}
