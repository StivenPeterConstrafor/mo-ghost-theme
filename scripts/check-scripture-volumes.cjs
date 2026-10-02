// Scripture source rows: a set's volumes are named from the catalogue and stand in volume order.
//   node --test scripts/check-scripture-volumes.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const helper = (() => { const box = { module: { exports: {} } }; vm.runInNewContext(read('assets/js/page/scripture-source-groups.js'), box); return box.module.exports; })();

// The core script is a page script; load it with the few globals it touches at start, and no network.
function core(works) {
  const calls = [];
  const fetch = (url) => { calls.push(String(url)); return Promise.resolve({ ok: true, json: () => Promise.resolve({ works }) }); };
  const document = { querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), addEventListener() {}, documentElement: { style: { setProperty() {} } } };
  const window = { FRScriptureSources: helper, addEventListener() {}, localStorage: { getItem: () => null, setItem() {} } };
  const box = { window, document, fetch, URL, console, Intl, Promise, Map, Set, WeakMap, Number, String, Array, Object, Math, Error, RegExp, encodeURIComponent, decodeURIComponent, setTimeout, clearTimeout, IntersectionObserver: undefined, navigator: {} };
  vm.runInNewContext(read('assets/js/page/scripture-dev-core.js'), box);
  return { S: window.MOScriptureDev, calls };
}

const CATALOGUE = [
  { slug: 'calov-systema-vol-1', volume: 'Vol. 1' }, { slug: 'calov-systema-vol-10', volume: 'Vol. 10' }, { slug: 'calov-systema-vol-3', volume: 'Vol. 3' },
  { slug: 'driedo-opera-vol-2', volume: 'Tomus II' }, { slug: 'driedo-opera-vol-4', volume: 'Tomus IV' }, { slug: 'driedo-opera-vol-9', volume: 'Tomus IX' },
  { slug: 'pld-2815', volume: 'PL 35' }, { slug: 'taylor-parable', volume: '1621' }, { slug: 'baron-metaphysica', volume: 'first ed.' },
  { slug: 'opera-tomus-2', volume: 'Tomus II' }, { slug: 'no-volume' },
];

test('only a volume designation is a label: a series volume, a year and an edition note are not', async () => {
  const { S, calls } = core(CATALOGUE);
  const volumes = await S.loadVolumes();
  assert.equal(calls.length, 1);
  assert.match(calls[0], /\/v1\/works-index\.json$/);
  assert.deepEqual([...volumes.keys()].sort(), ['calov-systema-vol-1', 'calov-systema-vol-10', 'calov-systema-vol-3', 'driedo-opera-vol-2', 'driedo-opera-vol-4', 'driedo-opera-vol-9', 'opera-tomus-2']);
  await S.loadVolumes();
  assert.equal(calls.length, 1, 'the catalogue is read once');
});

test('the label is shown beside a title that lacks it, and not repeated beside one that carries it', async () => {
  const { S } = core(CATALOGUE);
  const volumes = await S.loadVolumes();
  assert.equal(S.volumeLabel(volumes, 'calov-systema-vol-10', 'System of Theological Topics'), 'Vol. 10');
  assert.equal(S.volumeLabel(volumes, 'calov-systema-vol-1', 'Commentary on 1 Corinthians'), 'Vol. 1', 'a number in the title is not the volume');
  assert.equal(S.volumeLabel(volumes, 'opera-tomus-2', 'Opera omnia, Tomus II'), '');
  assert.equal(S.volumeLabel(volumes, 'no-volume', 'A single book'), '');
  assert.equal(S.volumeLabel(volumes, 'pld-2815', 'In epistolam Ioannis'), '');
});

test('volumes of one title stand in volume order, Arabic and Roman; titles stand A to Z', async () => {
  const { S } = core(CATALOGUE);
  const volumes = await S.loadVolumes();
  const entry = (w, t) => ({ w, t, key: w });
  const arrived = [entry('calov-systema-vol-1', 'System of Theological Topics'), entry('calov-systema-vol-10', 'System of Theological Topics'), entry('driedo-opera-vol-9', 'Opera'),
    entry('calov-systema-vol-3', 'System of Theological Topics'), entry('driedo-opera-vol-4', 'Opera'), entry('driedo-opera-vol-2', 'Opera'), entry('another-book', 'Biblia illustrata')];
  assert.deepEqual(S.sortWorks(arrived, volumes).map((x) => x.w),
    ['another-book', 'driedo-opera-vol-2', 'driedo-opera-vol-4', 'driedo-opera-vol-9', 'calov-systema-vol-1', 'calov-systema-vol-3', 'calov-systema-vol-10']);
  assert.equal(arrived[0].w, 'calov-systema-vol-1', 'the list given is not reordered in place');
});

test('without the catalogue, volumes still stand in the order of their addresses read as numbers', () => {
  const { S } = core([]);
  const entry = (w) => ({ w, t: 'System of Theological Topics' });
  assert.deepEqual(S.sortWorks([entry('s-vol-1'), entry('s-vol-10'), entry('s-vol-12'), entry('s-vol-9'), entry('s-vol-5')], new Map()).map((x) => x.w), ['s-vol-1', 's-vol-5', 's-vol-9', 's-vol-10', 's-vol-12']);
});

test('the ordering helper is the corpus site\'s file, byte for byte, when that tree is at hand', () => {
  const site = '/Users/speter/Davenant/tools/prdl_reader_prototype/scripture-source-groups.js';
  if (!fs.existsSync(site)) return;
  assert.equal(read('assets/js/page/scripture-source-groups.js'), fs.readFileSync(site, 'utf8'));
});
