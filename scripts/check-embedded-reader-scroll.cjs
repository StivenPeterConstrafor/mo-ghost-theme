const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const reader = fs.readFileSync(path.join(root, 'assets/js/port/reader-core.js'), 'utf8');
const scripture = fs.readFileSync(path.join(root, 'assets/js/page/scripture-dev-core.js'), 'utf8');
const readerHelper = reader.slice(reader.indexOf('function frScrollReaderTarget('), reader.indexOf('window.__frPlaceReaderAnchor='));
const frameHelper = scripture.slice(scripture.indexOf('function revealReaderFrame('), scripture.indexOf('function readerFrame($pv'));

function readerFixture(framed, rect = { top: 700, bottom: 800 }) {
  let nativeCalls = 0;
  const pane = {
    clientTop: 0, clientHeight: 400, scrollTop: 100,
    contains: () => true,
    getBoundingClientRect: () => ({ top: 20 }),
    scrollTo(options) { this.scrollTop = options.top; },
  };
  const self = {};
  const run = vm.runInNewContext(`${readerHelper}\nfrScrollReaderTarget`, {
    window: { self, top: framed ? {} : self },
    document: { getElementById: () => pane },
  });
  const target = { getBoundingClientRect: () => rect, scrollIntoView: () => nativeCalls++ };
  return { pane, target, run, nativeCalls: () => nativeCalls };
}

test('framed citation arrival scrolls only the inner reading pane', () => {
  const f = readerFixture(true);
  f.run(f.target, { block: 'start', behavior: 'instant' });
  assert.equal(f.pane.scrollTop, 780);
  assert.equal(f.nativeCalls(), 0);
});
test('framed short-passage centering retains its placement', () => {
  const f = readerFixture(true);
  f.run(f.target, { block: 'center' });
  assert.equal(f.pane.scrollTop, 630);
  assert.equal(f.nativeCalls(), 0);
});
test('framed nearest leaves a fully visible passage untouched', () => {
  const f = readerFixture(true, { top: 100, bottom: 200 });
  f.run(f.target, { block: 'nearest' });
  assert.equal(f.pane.scrollTop, 100);
  assert.equal(f.nativeCalls(), 0);
});
test('standalone reader preserves native anchor scrolling', () => {
  const f = readerFixture(false);
  f.run(f.target, { block: 'start' });
  assert.equal(f.nativeCalls(), 1);
  assert.equal(f.pane.scrollTop, 100);
});
function frameFixture(overflowY = 'auto') {
  let nativeCalls = 0;
  const pane = { clientTop: 0, clientHeight: 540, scrollHeight: 2000, scrollTop: 100,
    getBoundingClientRect: () => ({ top: 100 }) };
  const frame = { closest: () => pane, getBoundingClientRect: () => ({ top: 500, bottom: 890 }),
    scrollIntoView: () => nativeCalls++ };
  const run = vm.runInNewContext(`${frameHelper}\nrevealReaderFrame`, {
    getComputedStyle: () => ({ overflowY }),
  });
  return { pane, frame, run, nativeCalls: () => nativeCalls };
}
test('opening a mini reader reveals it only within the mobile chooser', () => {
  const f = frameFixture();
  f.run(f.frame);
  assert.equal(f.pane.scrollTop, 350);
  assert.equal(f.nativeCalls(), 0);
});
test('desktop non-scrolling collection keeps normal frame reveal', () => {
  const f = frameFixture('visible');
  f.run(f.frame);
  assert.equal(f.pane.scrollTop, 100);
  assert.equal(f.nativeCalls(), 1);
});
