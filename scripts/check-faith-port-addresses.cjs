const assert = require('node:assert/strict');
const {localURL} = require('../assets/js/page/faith-port-links.js');
const origin='http://localhost:2368';
for(const [from,to] of [
 ['https://thefaithreceived.vercel.app/search?m=title','/the-faith-received/search/?m=title'],
 ['/search?m=ask&trad=Medieval','/the-faith-received/search/?m=ask&trad=Medieval'],
 ['/topics?sh=md#grace','/the-faith-received/topics/?sh=md#grace'],
 ['/fathers?sh=gf','/the-faith-received/author/?sh=gf'],
 ['/read/a-work.html?p=52%3A0183A#b52:0183A-0','/the-faith-received/read/?p=52%3A0183A&w=a-work#b52:0183A-0'],
 ['https://thefaithreceived.vercel.app/dtc?e=a/article.json','/the-faith-received/dictionary/?e=a/article.json'],
 ['https://example.org/read?a=1','https://example.org/read?a=1'],
 ['/the-faith-received/reader/?c=eebo&w=1022#b3-0','/the-faith-received/read/?w=eebo-1022#b3-0'],
 ['/the-faith-received/reader/?c=mo&w=didache','/the-faith-received/reader/?c=mo&w=didache'],
 ['/','/'],['/membership/','/membership/'],['/the-faith-received/read/?w=a','/the-faith-received/read/?w=a']
]) assert.equal(localURL(from,origin),to,from);
const search=require('../assets/js/port/search-tools.js');
global.location={origin};
assert.deepEqual(search.readerLink(origin+'/the-faith-received/read/?w=a#b52:0183A-0'),{slug:'a',page:'52:0183A'});
assert.equal(search.readerLink('https://example.org/read?w=a'),null);
console.log('14 port address checks passed: shelf, search mode, column, external citation and MereO links.');
