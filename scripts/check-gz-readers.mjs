#!/usr/bin/env node
/*
 * Guard against the bug that made every Early English Books work
 * unreadable on 2026-09-11.
 *
 * A key named ".json.gz" says NOTHING about what is in the response
 * body. The library serves these with `content-encoding: br`, the
 * client undoes the transport encoding, and what arrives is plain JSON
 * under a gz name. Any reader that inflates unconditionally throws on
 * every one of them, and the page blamed the reader's ad blocker.
 *
 * It had appeared three times before anyone caught it: in
 * build-scripture-index.mjs, in lib/locus-text.js, and in four separate
 * front-end files. So this checks both halves, every time:
 *
 *   1. STATIC. Every file in the theme that calls DecompressionStream
 *      must sniff the gzip magic bytes (0x1f 0x8b) first.
 *   2. LIVE.   A sample of real .json.gz endpoints must parse through
 *              the same sniff-then-inflate path the theme ships.
 *
 *   node scripts/check-gz-readers.mjs
 *
 * Exits non-zero on failure, so it can gate a build.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const LIB = "https://mo-tfr-library.mo-podcast-feed.workers.dev";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "built" || name === "node_modules") continue;
      walk(p, out);
    } else if (name.endsWith(".js")) out.push(p);
  }
  return out;
}

let failed = 0;

console.log("1. Every DecompressionStream caller sniffs before it inflates\n");
for (const file of walk(path.join(ROOT, "assets/js"))) {
  const src = readFileSync(file, "utf8");
  if (!src.includes("DecompressionStream")) continue;
  const sniffs = src.includes("0x1f") && src.includes("0x8b");
  const rel = path.relative(ROOT, file);
  console.log(`   ${sniffs ? "ok      " : "NO SNIFF"}  ${rel}`);
  if (!sniffs) failed += 1;
}

/* The shipped path, byte for byte: sniff, then inflate only if it really
 * is gzip. If this ever stops matching faith-reader.js, the check is
 * lying and should be updated with it. */
async function readMaybeGzip(response) {
  const buf = await response.arrayBuffer();
  const head = new Uint8Array(buf, 0, Math.min(2, buf.byteLength));
  const isGzip = head.length > 1 && head[0] === 0x1f && head[1] === 0x8b;
  if (!isGzip) return JSON.parse(new TextDecoder().decode(buf));
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).json();
}

console.log("\n2. Real .json.gz endpoints parse through that path\n");
const ids = JSON.parse(
  readFileSync(path.join(ROOT, "assets/data/faith-received/eebo-theological.json"), "utf8"),
).ids;
// Spread across the shelf rather than the first few, which are all one era.
const step = Math.max(1, Math.floor(ids.length / 12));
const picks = [];
for (let i = 0; i < ids.length && picks.length < 12; i += step) picks.push(ids[i]);

const urls = picks.map((id) => [`eebo-${id}`, `${LIB}/eebo/${id}.json.gz`]);
urls.push(["author verses", `${LIB}/v1/bible/all/a2/ambrose-of-milan.json.gz`]);
urls.push(["shelf counts", `${LIB}/v1/works-dir/pl.json.gz`]);

for (const [label, url] of urls) {
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await readMaybeGzip(r);
    const keys = Object.keys(j).slice(0, 3).join(",");
    console.log(`   ok        ${label.padEnd(16)} ${keys}`);
  } catch (e) {
    console.log(`   FAILED    ${label.padEnd(16)} ${e.message}`);
    failed += 1;
  }
}

console.log(failed ? `\n${failed} failure(s)` : "\nAll clear.");
process.exit(failed ? 1 : 0);
