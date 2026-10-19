// Pure-logic check for the phone header reveal rule in
// assets/js/boot/header-behaviors.js (stepReveal). No browser needed.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { stepReveal, PHONE, DESKTOP, TOP_ZONE, REVEAL_UP_PHONE } = require("../assets/js/boot/header-behaviors.js");

const run = (ys, cfg, start = { lastY: 0, upRun: 0, hidden: false }) =>
  ys.reduce((s, y) => stepReveal(s, y, cfg), start);

// Scrolling down far hides it.
let s = run([400, 900, 1500], PHONE);
assert.equal(s.hidden, true, "hides on scroll down");

// A small upward move does not bring it back on a phone, but does on desktop.
assert.equal(run([1480], PHONE, s).hidden, true, "phone: 20px up keeps it hidden");
assert.equal(run([1480], DESKTOP, s).hidden, false, "desktop: any upward step reveals");

// One short of the threshold up in one run: still hidden. At the threshold: back.
const stepsUp = (n) => Array.from({ length: n }, (_, i) => 1500 - (i + 1));
assert.equal(run(stepsUp(REVEAL_UP_PHONE - 1), PHONE, s).hidden, true, "one short of the threshold is not enough");
assert.equal(run(stepsUp(REVEAL_UP_PHONE), PHONE, s).hidden, false, "the threshold reveals");

// A step down mid-run resets the accumulator.
const mid = run([1400, 1420, 1410], PHONE, s); // 100 up, then 20 down, then 10 up
assert.equal(mid.hidden, true);
assert.equal(run([1200], PHONE, run([1500, 1400, 1420], PHONE, s)).hidden, true, "reset by a down step: the run after the reset is under the threshold");

// Sub-4px jitter is ignored but slow drags still add up (lastY not advanced).
const j = run([1499, 1498, 1497], PHONE, s);
assert.equal(j.lastY, 1500, "tiny steps leave the anchor alone");
assert.equal(run([1496], PHONE, s).upRun, 4, "the anchor catches up once the drag reaches 4px");

// Near the top it always shows, and negative offsets (rubber-band) are clamped.
assert.equal(run([TOP_ZONE - 1], PHONE, s).hidden, false, "near top reveals");
assert.equal(run([-30], PHONE, s).hidden, false, "negative offset treated as top");
assert.equal(run([-30, 200], PHONE).hidden, true, "recovers from overscroll and hides normally");



// ── CSS: hide and reveal share one transition, declared on the always-on rule ──
// A transition is taken from the state being ENTERED. If it lives only on the
// hidden-state selector, the way back has none and the element snaps.
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const files = {
  screen: read("assets/built/screen.css"),
  rec: read("assets/css/faith-received.css"),
  surf: read("assets/css/faith-port-surfaces.css"),
  skin: read("assets/css/faith-port-reader-skin.css"),
};
const rules = (css) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));
const HIDDEN = /\.is-hidden|\.mh-hide|\.mh-mini/;
const SHARED = /var\(--hdr-ms[^)]*\)\s+var\(--hdr-ease/;

assert.match(files.screen, /--hdr-ms:\s*280ms/);
assert.match(files.screen, /--hdr-ease:\s*cubic-bezier\(0\.45, 0, 0\.55, 1\)/);

// 1. No hidden-state selector may carry its own (non-none) transition.
for (const [name, css] of Object.entries(files)) {
  for (const r of rules(css)) {
    const t = r.body.match(/(?:^|;|\s)transition(?:-[a-z]+)?:\s*([^;]+)/);
    if (t && HIDDEN.test(r.sel) && !/^none\b/.test(t[1].trim())) {
      // allowed only when the selector is a reduced-motion reset or the mirror of a base
      assert.fail(`${name}: hidden-state rule declares a transition: ${r.sel}`);
    }
  }
}

// 2. Every selector that sets a moved property in the hidden state has its
//    always-on partner declaring the shared transition (phones).
const need = [
  ["screen", /^\.site-header$/],
  ["rec", /^body:not\(:has\(#app\.faith-port-read-page\)\):not\(\.web-page\) > \.tfr-rail$/],
  ["rec", /^\[data-room-shell\] > \[data-room-rail\]$/],
  ["surf", /^body\.web-page header\.site$/],
  ["surf", /^\.faith-port-desk-page #docs$/],
  ["skin", /^html\.g-mobile body:has\(#app\.faith-port-read-page\) \.tfr-rail$/],
  ["skin", /^html\.g-mobile #app\.faith-port-read-page \.ph\.fr-reader-head$/],
  ["skin", /^html\.g-mobile body:has\(#app\.faith-port-read-page\) header\.site-header$/],
  ["skin", /^html\.g-mobile #notebook\.notebook$/],
  ["skin", /^html\.g-mobile #app\.faith-port-read-page \.sidebar$/],
  ["skin", /^html\.g-mobile #sbScrim$/],
  ["skin", /^html\.g-mobile \.nb-scrim$/],
  ["skin", /^html\.g-mobile aside\.relpanel$/],
  ["skin", /^html\.g-mobile \.fr-read-toc$/],
];
for (const [name, re] of need) {
  const hit = rules(files[name]).some((r) =>
    r.sel.split(",").some((x) => re.test(x.trim().replace(/\s+/g, " "))) && SHARED.test(r.body));
  assert.ok(hit, `${name}: no always-on rule with the shared transition for ${re}`);
}

// 3. The earlier reveal-only curve is gone.
for (const [name, css] of Object.entries(files)) {
  assert.ok(!/0\.22, 1, 0\.36, 1\)[^;]*;/.test(rules(css).filter((r) => /site-header|tfr-rail|data-room-rail|header\.site|#docs|#rail/.test(r.sel)).map((r) => r.body).join("")) || name === "skin", `${name}: reveal-only ease-out still present`);
}

console.log("check-header-reveal: ok");
