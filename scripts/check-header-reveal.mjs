// Pure-logic check for the phone header reveal rule in
// assets/js/boot/header-behaviors.js (stepReveal). No browser needed.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
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

console.log("check-header-reveal: ok");
