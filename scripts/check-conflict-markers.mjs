/*
 * No conflict marker ever reaches a built theme.
 *
 * WHY THIS EXISTS. On 2026-09-15 `git stash pop` conflicted, said so,
 * and the conflict was committed and deployed inside
 * assets/css/faith-port-reader-skin.css. A CSS parser does not fail
 * loudly on `<<<<<<< Updated upstream` — it discards everything after
 * it. So the file served, the theme validated, gscan passed, and every
 * rule in the second half of the stylesheet silently did not exist. The
 * symptom was a nav that stayed broken while the fix for it sat in the
 * file, served, and unread.
 *
 * Handlebars and JS would have failed noisily. CSS is the one that goes
 * quiet, which is exactly why this is worth a check of its own.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const EXTS = new Set([".css", ".js", ".mjs", ".hbs", ".json", ".yaml", ".yml", ".md"]);
const SKIP = new Set(["node_modules", ".git", ".claude", "archive"]);
// Marker text split so this file never trips its own check.
const MARKERS = [`${"<".repeat(7)} `, `${"=".repeat(7)}`, `${">".repeat(7)} `];

const bad = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!EXTS.has(path.extname(entry.name))) continue;
    const lines = fs.readFileSync(full, "utf8").split("\n");
    lines.forEach((line, i) => {
      const hit = MARKERS.some((m) => (m.trim() === "=======" ? line.trimEnd() === m : line.startsWith(m)));
      if (hit) bad.push(`${path.relative(ROOT, full)}:${i + 1}  ${line.slice(0, 60)}`);
    });
  }
})(ROOT);

if (bad.length) {
  console.error(`\ncheck-conflict-markers: ${bad.length} unresolved conflict marker(s).\n`);
  for (const b of bad) console.error("  " + b);
  console.error("\nCSS discards everything after a marker without erroring. Resolve before building.\n");
  process.exit(1);
}
console.log("✓ No conflict markers");
