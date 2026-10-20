/*
 * The Scripture page's dark palette and its layout state (2026-10-19).
 *
 * 1. CONTRAST. The dark tokens are stated in assets/css/scripture-dev.css under "SCRIPTURE DARK MODE". This reads them out of that
 *    block (so a changed colour is checked, not a copy of it) and measures every text-on-ground pair the page uses against WCAG AA
 *    (4.5:1 for text, 3:1 for the lines that mark a control). The light pairs the page already ships are not re-measured.
 * 2. STATE. scripture-view-boot.js parses the stored layout and theme; a bad value falls back, a saved 25-75 or 75-25 migrates to
 *    40-60 or 60-40, and a stored sepia reads as light.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.join(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(ROOT, "assets/css/scripture-dev.css"), "utf8");
const require = createRequire(import.meta.url);
const V = require(path.join(ROOT, "assets/js/page/scripture-view-boot.js"));

const failures = [];
// Literals that are right on both grounds (a selector that sits on its own fixed ground), by "file|selector".
// The Verse Desk's count, filters and Ask boxes are re-stated transparent further down scripture-dev.css (swept in dark, no failure).
const ALLOW = new Set([
  "assets/css/scripture-dev.css|.sd-desk .sd-count",
  "assets/css/scripture-dev.css|.sd-desk .sd-filters",
  "assets/css/scripture-dev.css|.sd-desk .sd-ask",
]);
const fail = (m) => failures.push(m);

// ── the dark block's tokens ──
const start = css.indexOf("SCRIPTURE DARK MODE");
if (start < 0) fail("scripture-dev.css has no SCRIPTURE DARK MODE block");
const block = css.slice(start);
const token = (name) => {
  const m = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\b`).exec(block);
  if (!m) { fail(`dark block does not state ${name} as a hex colour`); return "#000000"; }
  return m[1];
};
const lin = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const page = token("--sd-dk-page");
const card = token("--sd-dk-card");
const panel = token("--sd-dk-panel");
const ink = token("--sd-dk-ink");
const muted = token("--sd-dk-muted");
const faint = token("--sd-dk-faint");
const accent = token("--sd-dk-accent");
const primary = token("--sd-dk-primary");
const mark = token("--sd-dk-mark");
const primaryLit = token("--sd-dk-primary-lit");
const blend = (a, al, b) => { const f = (h) => [16, 8, 0].map((sh) => (parseInt(h.slice(1), 16) >> sh) & 255); const [x, y] = [f(a), f(b)]; return `#${x.map((v, i) => Math.round(v * al + y[i] * (1 - al)).toString(16).padStart(2, "0")).join("")}`; };
const wash = blend("#EE7D51", 0.18, card);
const hit = token("--sd-dk-hit");
const hl = token("--sd-dk-hl");

const pairs = [
  ["ink on page", ink, page, 4.5], ["ink on card", ink, card, 4.5], ["ink on panel", ink, panel, 4.5],
  ["ink on the followed verse", ink, mark, 4.5], ["ink on the commentary's marked passage", ink, hit, 4.5], ["ink on a hovered row", ink, hl, 4.5],
  ["muted on page", muted, page, 4.5], ["muted on card", muted, card, 4.5], ["muted on panel", muted, panel, 4.5], ["muted on a hovered row", muted, hl, 4.5],
  ["faint (10px strip labels) on panel", faint, panel, 4.5], ["faint on card", faint, card, 4.5],
  ["accent (links, labels) on page", accent, page, 4.5], ["accent on card", accent, card, 4.5], ["accent on panel", accent, panel, 4.5],
  ["accent on the followed verse", accent, mark, 4.5], ["accent on a hovered row", accent, hl, 4.5],
  ["verse numbers (primary) on card", primary, card, 4.5], ["verse numbers on the followed verse", primary, mark, 4.5], ["verse numbers on the open verse's wash", primaryLit, wash, 4.5], ["primary on page", primary, page, 4.5],
  ["card ink on a filled button (ink fill)", card, ink, 4.5], ["card ink on the accent hover fill", card, accent, 4.5],
  ["card ink on the primary hover fill (nav arrows)", card, primary, 4.5],
  ["control outline (ink) on page", ink, page, 3],
];
for (const [name, fg, bg, min] of pairs) {
  const r = ratio(fg, bg);
  if (r < min) fail(`${name}: ${r.toFixed(2)}:1 is under ${min}:1 (${fg} on ${bg})`);
  else console.log(`ok  ${r.toFixed(2).padStart(5)}:1  ${name}`);
}

// ── REGRESSION: literal colours that would not turn over in dark ──
// The dark block remaps tokens (--color-dark and the rest) on the page's own sections, so a rule that reads a token follows. A rule
// that states a literal dark text colour or a literal light background does not, and shows as dark-on-dark or light-on-light (the
// Citations heading and stat figures, 2026-10-19, were body's inherited #2d2927). This scans the stylesheets the page loads
// and fails on any such literal unless the dark block names that selector (it has its own override).
if (!/--sd-dk-ink\);\s*\n\s*--color-dark/.test(block) && !/\{\s*\n?\s*(?:\/\*[^]*?\*\/\s*)?color:\s*var\(--sd-dk-ink\)/.test(block)) {
  fail("the dark scope rule does not set color: var(--sd-dk-ink); text that names no colour would inherit body's dark ink");
}
const sheets = ["assets/css/scripture-dev.css", "assets/css/port/dev-notes.css", "assets/css/commentary-pane.css", "assets/css/verse-desk.css"];
const hexLum = (h) => { const x = h.length === 4 ? `#${[...h.slice(1)].map((c) => c + c).join("")}` : h; return lum(x.slice(0, 7)); };
for (const rel of sheets) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\/\*[^]*?\*\//g, "");
  const darkAt = rel.endsWith("scripture-dev.css") ? src.indexOf("html[data-sd-theme=\"dark\"] {") : src.length;
  for (const m of src.slice(0, darkAt > 0 ? darkAt : src.length).matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim();
    if (/^(from|to|\d+%)/.test(selector)) continue;
    for (const d of m[2].split(";")) {
      const dm = /^\s*(color|background|background-color)\s*:\s*(#[0-9a-fA-F]{3,6}|white|black)\s*$/.exec(d);
      if (!dm) continue;
      const hexv = dm[2] === "white" ? "#ffffff" : dm[2] === "black" ? "#000000" : dm[2];
      const L = hexLum(hexv);
      const darkText = dm[1] === "color" && L < 0.2;
      const lightBg = dm[1] !== "color" && L > 0.8;
      if (!darkText && !lightBg) continue;
      const firstSel = selector.split(",")[0].trim().split(/\s+/).pop();
      if (block.includes(firstSel) || ALLOW.has(`${rel}|${selector}`)) continue;
      fail(`${rel}: "${selector}" states ${dm[1]}: ${dm[2]}, a literal that does not turn over in dark mode (use a token, or add an override to the dark block)`);
    }
  }
}

// ── the state ──
const eq = (name, got, want) => { if (got !== want) fail(`${name}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
for (const l of V.LAYOUTS) eq(`parseLayout(${l})`, V.parseLayout(l), l);
eq("parseLayout(null)", V.parseLayout(null), "50-50");
eq("parseLayout(garbage)", V.parseLayout("90-10"), "50-50");
eq("parseLayout(constructor)", V.parseLayout("constructor"), "50-50");
eq("a saved 25-75 reads as 40-60", V.parseLayout("25-75"), "40-60");
eq("a saved 75-25 reads as 60-40", V.parseLayout("75-25"), "60-40");
eq("stored dark", V.resolveTheme("dark", false), "dark");
eq("own light beats reader dark", V.resolveTheme("dark", true, "light"), "light");
eq("own dark beats reader sepia", V.resolveTheme("sepia", false, "dark"), "dark");
eq("own garbage falls to reader", V.resolveTheme("dark", false, "x"), "dark");
eq("stored light, system dark", V.resolveTheme("light", true), "light");
eq("stored sepia reads light", V.resolveTheme("sepia", true), "light");
eq("nothing stored, system dark", V.resolveTheme(null, true), "dark");
eq("nothing stored, system light", V.resolveTheme(null, false), "light");
eq("garbage stored follows the system", V.resolveTheme("purple", true), "dark");

if (failures.length) {
  console.error(`\ncheck-scripture-view: ${failures.length} failure(s)\n - ${failures.join("\n - ")}`);
  process.exit(1);
}
console.log("\ncheck-scripture-view: ok");
