// Pure-logic check for the phone header reveal rule in
// assets/js/boot/header-behaviors.js (stepReveal). No browser needed.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { stepReveal, PHONE, DESKTOP, TOP_ZONE, REVEAL_UP_PHONE } = require("../assets/js/boot/header-behaviors.js");

const run = (ys, cfg, start = { lastY: 0, upRun: 0, hidden: false }) =>
  ys.reduce((s, y) => stepReveal(s, y, cfg), start);

// Scrolling down far hides it.
let s = run([100, 200, 400], PHONE);
assert.equal(s.hidden, true, "hides on scroll down");

// A small upward move does not bring it back on a phone, but does on desktop.
assert.equal(run([380], PHONE, s).hidden, true, "phone: 20px up keeps it hidden");
assert.equal(run([380], DESKTOP, s).hidden, false, "desktop: any upward step reveals");

// 139px up in one run: still hidden. 140px: back.
const stepsUp = (n) => Array.from({ length: n }, (_, i) => 400 - (i + 1));
assert.equal(run(stepsUp(REVEAL_UP_PHONE - 1), PHONE, s).hidden, true, "139px is not enough");
assert.equal(run(stepsUp(REVEAL_UP_PHONE), PHONE, s).hidden, false, "140px reveals");

// A step down mid-run resets the accumulator.
const mid = run([300, 320, 310], PHONE, s); // 100 up, then 20 down, then 10 up
assert.equal(mid.hidden, true);
assert.equal(run([200], PHONE, run([400, 300, 320], PHONE, s)).hidden, true, "reset by a down step: 120 up after reset is under 140");

// Sub-4px jitter is ignored but slow drags still add up (lastY not advanced).
const j = run([399, 398, 397], PHONE, s);
assert.equal(j.lastY, 400, "tiny steps leave the anchor alone");
assert.equal(run([396], PHONE, s).upRun, 4, "the anchor catches up once the drag reaches 4px");

// Near the top it always shows, and negative offsets (rubber-band) are clamped.
assert.equal(run([TOP_ZONE - 1], PHONE, s).hidden, false, "near top reveals");
assert.equal(run([-30], PHONE, s).hidden, false, "negative offset treated as top");
assert.equal(run([-30, 200], PHONE).hidden, true, "recovers from overscroll and hides normally");

console.log("check-header-reveal: ok");
