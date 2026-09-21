const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const FRScripture=require('../assets/js/port/scripture-tools.js');
const books=[{slug:'romans',book:'Romans',chapters:Array.from({length:16},(_,i)=>({c:i+1}))},{slug:'i-john',book:'I John',chapters:[{c:1},{c:2}]},{slug:'jude',book:'Jude',chapters:[{c:1}]}];
for(const file of ['bible.in03.js','authors.in03.js']){
 const source=fs.readFileSync('assets/js/port/'+file,'utf8');
 const start=source.indexOf('const JABBR='),end=source.indexOf('let BIBLE_STATE=',start);
 const box={FRScripture};vm.createContext(box);vm.runInContext(source.slice(start,end),box);
 for(const [input,expected] of [['Romans 6:3-4','3-4'],['Rom. 6:3–4','3-4'],['Romans 6:3',3]]){
   const actual=box.jumpParse(input,books);assert.equal(actual.slug,'romans');assert.equal(actual.ch,6);assert.equal(actual.v,expected);
 }
 assert.equal(box.jumpParse('1 John 1:5-7',books).slug,'i-john');
 assert.equal(box.jumpParse('Jude 5',books).v,5);
 for(const input of ['Romans 6:4-3','Romans 6:0-4','Romans 6:3-250'])assert.equal(box.jumpParse(input,books),null,input);
 assert.ok(source.includes("let BIBLE_STATE={selection:null,view:'read',verse:null}"));
}
assert.deepEqual(FRScripture.verseSelection('3–4'),[3,4]);
assert.deepEqual(FRScripture.verseSelection('4-3'),[]);
assert.ok(FRScripture.bibleURL('romans',6,'3-4').endsWith('#b/romans/6?v=3-4'));
console.log('Passage navigation: ranges, single verses, invalid inputs and both research hosts passed.');
