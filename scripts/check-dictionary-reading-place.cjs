const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Run the reader's actual paragraph selection against viewport/pane
// geometry. No copies of its algorithm or dictionary data are involved.
const source = fs.readFileSync(path.join(__dirname, '../assets/js/port/dtc.in02.js'), 'utf8');
const helper = source.slice(source.indexOf('function dtcCurrentParagraph('), source.indexOf('let articleScrollController='));
function current({mobile = true, paneTop = -24000, toolbarBottom = 211, bottoms = [-600, 150, 450, 900] } = {}) {
  const context = {
    window: {matchMedia: () => ({matches: mobile}), innerHeight: 844},
  };
  vm.runInNewContext(helper, context);
  const rows = bottoms.map((bottom, i) => ({id: 'sec' + i, getBoundingClientRect: () => ({bottom})}));
  return context.dtcCurrentParagraph({
    getBoundingClientRect: () => ({top: paneTop}),
    querySelector: () => ({getBoundingClientRect: () => ({bottom: toolbarBottom})}),
    querySelectorAll: () => rows,
  })?.id;
}

test('mobile page flow uses the readable viewport, not the offscreen pane origin', () => {
  assert.equal(current(), 'sec2');
});
test('a paragraph underneath the sticky controls is not chosen', () => {
  assert.equal(current({bottoms: [190, 210, 240, 800]}), 'sec2');
});
test('mobile controls outside the viewport do not shift the reading line', () => {
  assert.equal(current({toolbarBottom: -100, bottoms: [-30, 150, 500]}), 'sec1');
});
test('desktop pane keeps its existing scroll-origin behavior', () => {
  assert.equal(current({mobile: false, paneTop: 300, bottoms: [280, 320, 900]}), 'sec1');
});

test('mobile restore places the same paragraph below measured controls', () => {
  let scroll;
  const context = {
    window: {matchMedia: () => ({matches: true}), scrollY: 24000, scrollTo: value => {scroll = value;}},
    document: {getElementById: id => id === 'sec38' ? {getBoundingClientRect: () => ({top: 2200})} : null},
    getComputedStyle: () => ({top: '95px'}),
  };
  vm.runInNewContext(helper, context);
  context.dtcScrollToParagraph({querySelector: () => ({getBoundingClientRect: () => ({height: 116})})}, 38);
  assert.equal(scroll.top, 25973);
  assert.equal(scroll.behavior, 'instant');
});
test('desktop restore continues to use its paragraph scroll target', () => {
  let options;
  const context = {
    window: {matchMedia: () => ({matches: false})},
    document: {getElementById: () => ({scrollIntoView: value => {options = value;}})},
  };
  vm.runInNewContext(helper, context);
  context.dtcScrollToParagraph({}, 38, 'smooth');
  assert.equal(options.block, 'start');
  assert.equal(options.behavior, 'smooth');
});
