#!/usr/bin/env node
/*
 * Copies assets/data/faith-received/work-forwards.json into the block
 * between the FORWARDS markers in assets/js/lib/faith-work-forwards.js.
 *
 * The JSON is the source of truth (it is what scripts and workers read);
 * the copy inside the lib exists because the reader must rewrite its own
 * address synchronously, before its engine reads ?w=, and a fetch would
 * lose that race. See the header of the lib.
 *
 *   node scripts/build-work-forwards.mjs          write the block
 *   node scripts/build-work-forwards.mjs --check  exit 1 if it is stale
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "assets/data/faith-received/work-forwards.json");
const LIB = path.join(root, "assets/js/lib/faith-work-forwards.js");

const data = JSON.parse(readFileSync(SRC, "utf8"));
// Only what the browser uses: drop the notes and the titles.
const slim = { v: data.v, works: {} };
for (const [old, w] of Object.entries(data.works || {})) {
  if (!w || typeof w.to !== "string" || !w.to) throw new Error(`work-forwards: ${old} has no "to"`);
  if (old === w.to) throw new Error(`work-forwards: ${old} forwards to itself`);
  if (data.works[w.to]) throw new Error(`work-forwards: ${old} -> ${w.to}, which is itself retired`);
  const row = { corpus: w.corpus || "mo", to: w.to };
  if (w.legacy) row.legacy = w.legacy;
  if (w.at) row.at = w.at;
  if (w.research) row.research = true;
  if (w.anchors && Object.keys(w.anchors).length) row.anchors = w.anchors;
  if (w.pages && Object.keys(w.pages).length) row.pages = w.pages;
  slim.works[old] = row;
}

const lib = readFileSync(LIB, "utf8");
const re = /(\/\* FORWARDS:BEGIN[^\n]*\*\/\n)[\s\S]*?(\n\s*\/\* FORWARDS:END \*\/)/;
if (!re.test(lib)) throw new Error("FORWARDS markers not found in the lib");
const next = lib.replace(re, (_, a, b) => `${a}  const DATA = ${JSON.stringify(slim)};${b}`);

if (process.argv.includes("--check")) {
  if (next !== lib) {
    console.error("faith-work-forwards.js is stale: run node scripts/build-work-forwards.mjs");
    process.exit(1);
  }
  console.log(`work-forwards: ${Object.keys(slim.works).length} retired works, lib current`);
} else {
  writeFileSync(LIB, next);
  console.log(`work-forwards: ${Object.keys(slim.works).length} retired works written into the lib`);
}
