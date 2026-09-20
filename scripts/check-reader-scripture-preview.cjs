// Vercel preview tests, adapted for local routes and the ESV/ASV providers.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync(__dirname+'/../assets/js/port/reader-scripture-preview.js','utf8');
const pure={module:{exports:{}}};vm.runInNewContext(source,pure);const api=pure.module.exports;
const clean=value=>JSON.parse(JSON.stringify(value));
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('verse lists and expanded ranges preserve the requested order without duplicating verses',()=>{
  const chapter={verses:{1:'One',2:'Two',3:'Three',4:'Four',5:'Five',6:'Six'}};
  assert.deepEqual(clean(api.selectedVerses(chapter,[5,2,5])),{verses:[{n:5,text:'Five'},{n:2,text:'Two'}],missing:[],excerpt:false});
  assert.deepEqual(clean(api.selectedVerses(chapter,[2,3,4])),{verses:[{n:2,text:'Two'},{n:3,text:'Three'},{n:4,text:'Four'}],missing:[],excerpt:false});
});

test('missing or blank verses are reported honestly without substituting nearby text',()=>{
  assert.deepEqual(clean(api.selectedVerses({verses:{20:'A verse',21:' ',22:42}},[20,21,22,23])),{verses:[{n:20,text:'A verse'}],missing:[21,22,23],excerpt:false});
  assert.deepEqual(clean(api.selectedVerses(null,[77])),{verses:[],missing:[77],excerpt:false});
});

test('a chapter-only reference is a labelled opening excerpt rather than a whole-chapter claim',()=>{
  const chapter={verses:{1:'Opening',2:'Second',3:'Third',4:'Beyond excerpt'}};
  const result=clean(api.selectedVerses(chapter,[]));assert.equal(result.excerpt,true);assert.deepEqual(result.verses.map(v=>v.n),[1,2,3]);assert.deepEqual(result.missing,[]);
  assert.equal(api.selectedVerses(chapter).excerpt,true);
  assert.equal(api.chapterURL('matthew',5,[20,21]),'/the-faith-received/bible/#b/matthew/5?v=20');
});

function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function element(){
  const listeners=new Map(),attributes={};
  return {id:'',hidden:false,dataset:{},style:{},textContent:'',innerHTML:'',offsetWidth:350,offsetHeight:280,isConnected:true,
    setAttribute(name,value){attributes[name]=value;},getAttribute:name=>attributes[name],
    addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn);},
    dispatch(event){for(const fn of listeners.get(event.type)||[])fn(event);},
    contains(node){return node===this;},closest(){return null;},focus(){this.focused=true;},getBoundingClientRect:()=>({left:100,top:200,bottom:220,width:80})};
}

function harness(options={}){
  const ids=new Map(),reading=element(),body=element();ids.set('reading',reading);
  const nodes={edition:element(),title:element(),content:element(),bible:element(),commentaries:element(),close:element(),retry:element()};
  let panel;
  const doc=Object.assign(element(),{body,getElementById:id=>ids.get(id)||null,createElement(tag){assert.equal(tag,'section');panel=element();panel.querySelector=selector=>({'.rsp-edition':nodes.edition,h2:nodes.title,'.rsp-content':nodes.content,'.rsp-bible':nodes.bible,'.rsp-commentaries':nodes.commentaries,'.rsp-close':nodes.close}[selector]||null);panel.contains=node=>node===panel||Object.values(nodes).includes(node);return panel;},dispatchEvent(event){this.dispatch(event);return true;}});
  body.appendChild=node=>{ids.set(node.id,node);};nodes.content.querySelector=selector=>selector==='.rsp-retry'?nodes.retry:null;
  const refs={A:{book:'Matthew',chapter:5,verses:[20],query:'Matthew 5:20'},B:{book:'John',chapter:4,verses:[23],query:'John 4:23'},MISSING:{book:'Matthew',chapter:5,verses:[99],query:'Matthew 5:99'},CHAPTER:{book:'Matthew',chapter:5,verses:[],query:'Matthew 5'}};
  const anchors={};for(const [key,ref]of Object.entries(refs)){const anchor=element();anchor.href='https://preview.invalid/search?m=scripture&q='+encodeURIComponent(ref.query);anchor.dataset.scriptureRef=ref.query;anchor.closest=selector=>selector==='a.xref'?anchor:null;anchors[key]=anchor;}
  const outside=element();outside.href='https://preview.invalid/search?q=unparsed';outside.closest=selector=>selector==='a.xref'?outside:null;anchors.OUTSIDE=outside;
  reading.contains=anchor=>Object.values(anchors).includes(anchor);
  const chapters=new Map(),requests=[];
  const root={document:doc,location:{href:'https://preview.invalid/read?w=fixture'},innerWidth:390,innerHeight:844,addEventListener(){},FRReaderScripture:{parseQuery:query=>Object.values(refs).find(ref=>ref.query===query)||null},
    fetch(url,{signal}){requests.push({url,signal});if(url.includes('/v1/chapter/ESV/')&&!options.esv)return Promise.resolve({ok:false});if(url.endsWith('/asv/books.json'))return Promise.resolve({ok:true,json:async()=>({Matthew:{path:'matthew'},John:{path:'john'}})});if(url.endsWith('/all/books.json'))return Promise.resolve({ok:true,json:async()=>({books:[{book:'Matthew',slug:'matthew'},{book:'John',slug:'john'}]})});const request=deferred();chapters.set(url,request);return request.promise;}};
  let serial=0;const timers=new Map();
  const context={window:root,module:{exports:{}},URL,AbortController,queueMicrotask,
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},
    setTimeout(fn){timers.set(++serial,fn);return serial;},clearTimeout(id){timers.delete(id);}};
  vm.runInNewContext(source,context,{filename:'reader-scripture-preview.js'});context.module.exports.install();
  function event(type,target,options={}){return {type,target,button:0,detail:1,defaultPrevented:false,stopped:false,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;},...options};}
  return {doc,reading,nodes,panel,anchors,requests,
    click(key,options){const e=event('click',anchors[key],options);doc.dispatch(e);return e;},
    key(name){const e=event('keydown',anchors.A,{key:name});doc.dispatch(e);return e;},
    async reply(book,chapter,verses){const entry=[...chapters].find(([url])=>url.endsWith('/'+book+'/'+chapter+'.json'));assert.ok(entry,'Requested chapter exists');entry[1].resolve({ok:true,json:async()=>({verses})});await tick();},
    async replyESV(book,chapter,rows){const entry=[...chapters].find(([url])=>url.endsWith('/ESV/'+book+'/'+chapter+'/'));assert.ok(entry,'ESV chapter requested');entry[1].resolve({ok:true,json:async()=>rows});await tick();},
    async fail(book,chapter){const entry=[...chapters].find(([url])=>url.endsWith('/'+book+'/'+chapter+'.json'));assert.ok(entry);entry[1].reject(Error('Synthetic transport failure'));await tick();}
  };
}

test('one ordinary click opens a Scripture pane and prevents reader navigation',async()=>{
  const h=harness(),event=h.click('A');assert.equal(event.defaultPrevented,true);assert.equal(event.stopped,true);assert.equal(h.panel.hidden,false);assert.match(h.nodes.content.innerHTML,/Loading passage/);await tick();
  await h.reply('matthew',5,{20:'A complete quotation.'});assert.match(h.nodes.content.innerHTML,/A complete quotation/);assert.equal(h.anchors.A.getAttribute('aria-expanded'),'true');assert.equal(h.nodes.bible.href,'/the-faith-received/bible/#b/matthew/5?v=20');
});

test('a late A response cannot replace the newer B passage',async()=>{
  const h=harness();h.click('A');await tick();h.click('B');await tick();
  await h.reply('john',4,{23:'The newer passage.'});const current=h.nodes.content.innerHTML;
  await h.reply('matthew',5,{20:'The stale passage.'});assert.equal(h.nodes.content.innerHTML,current);assert.equal(h.nodes.title.textContent,'John 4:23');assert.equal(h.anchors.A.getAttribute('aria-expanded'),'false');assert.equal(h.anchors.B.getAttribute('aria-expanded'),'true');
});

test('closing cancels late response rendering without reopening the panel',async()=>{
  const h=harness();h.click('A');await tick();h.nodes.close.onclick();const closedHTML=h.nodes.content.innerHTML;
  assert.equal(h.panel.hidden,true);await h.reply('matthew',5,{20:'Arrived after close.'});assert.equal(h.panel.hidden,true);assert.equal(h.nodes.content.innerHTML,closedHTML);assert.equal(h.anchors.A.getAttribute('aria-expanded'),'false');assert.equal(h.anchors.A.focused,true);
});

test('a late failed A request cannot replace B with a stale error',async()=>{
  const h=harness();h.click('A');await tick();h.click('B');await tick();await h.reply('john',4,{23:'Still the current passage.'});const current=h.nodes.content.innerHTML;
  await h.fail('matthew',5);assert.equal(h.nodes.content.innerHTML,current);assert.equal(h.nodes.title.textContent,'John 4:23');
});

test('keyboard activation opens accessibly; modifiers and non-primary clicks pass through',async()=>{
  const h=harness(),keyboard=h.click('A',{detail:0});assert.equal(keyboard.defaultPrevented,true);assert.equal(h.nodes.close.focused,true);await tick();h.nodes.close.onclick();
  for(const options of [{metaKey:true},{ctrlKey:true},{shiftKey:true},{altKey:true},{button:1},{button:2},{detail:0,metaKey:true}]){const e=h.click('B',options);assert.equal(e.defaultPrevented,false);assert.equal(e.stopped,false);assert.equal(h.panel.hidden,true);}
  const invalid=h.click('OUTSIDE');assert.equal(invalid.defaultPrevented,false);assert.equal(h.panel.hidden,true);
});

test('missing verses and chapter excerpts remain explicit in the rendered content',async()=>{
  const h=harness();h.click('MISSING');await tick();await h.reply('matthew',5,{1:'Opening <unsafe> text.',2:'Second.',3:'Third.'});assert.match(h.nodes.content.innerHTML,/Verse 99 is not present/);assert.doesNotMatch(h.nodes.content.innerHTML,/Opening &lt;/);
  h.click('CHAPTER');await tick();assert.match(h.nodes.content.innerHTML,/Opening verses/);assert.match(h.nodes.content.innerHTML,/&lt;unsafe&gt;/);assert.doesNotMatch(h.nodes.content.innerHTML,/<unsafe>/);assert.equal(h.nodes.bible.href,'/the-faith-received/bible/#b/matthew/5');
});

test('Escape and another apparatus panel close Scripture without following the citation',async()=>{
  const h=harness();h.click('A');await tick();const escape=h.key('Escape');assert.equal(escape.defaultPrevented,true);assert.equal(h.panel.hidden,true);
  h.click('B');h.doc.dispatch({type:'fr-apparatus-open',detail:{kind:'footnote'}});assert.equal(h.panel.hidden,true);assert.equal(h.anchors.B.getAttribute('aria-expanded'),'false');
});

test('published Roman-numbered catalogue books match normalized citation names',()=>{
  for(const [a,b] of [['II Thessalonians','2 Thessalonians'],['ii-corinthians','2 Corinthians'],['III John','3 John'],['Revelation of John','Revelation'],['Song of Songs','Song of Solomon']])assert.equal(api.bookKey(a),api.bookKey(b));
});


test('ESV verses render with the correct edition and missing-verse label',async()=>{
  const h=harness({esv:true});h.click('MISSING');await tick();
  await h.replyESV(40,5,[{verse:20,text:'<b>The ESV passage.</b>'}]);
  assert.equal(h.nodes.edition.textContent,'English Standard Version');
  assert.match(h.nodes.content.innerHTML,/not present in this ESV chapter/);
  assert.doesNotMatch(h.nodes.content.innerHTML,/ASV chapter/);
});

test('hover prefetch and click share one ESV chapter request',async()=>{
  const h=harness({esv:true});
  h.reading.dispatch({type:'pointerover',target:h.anchors.A,pointerType:'mouse'});
  h.click('A');await tick();
  assert.equal(h.requests.filter(r=>r.url.includes('/ESV/40/5/')).length,1);
  await h.replyESV(40,5,[{verse:20,text:'A complete passage.'}]);
  assert.match(h.nodes.content.innerHTML,/A complete passage/);
});
