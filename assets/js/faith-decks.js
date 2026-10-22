/* Commentary decks: ported from The Faith Received (tools/prdl_reader_prototype/decks.html); the data from the library worker, links into the reader on this site. */
window.__FR_BLOB_BASE__=window.__FR_BLOB_BASE__||"https://mo-tfr-library.mo-podcast-feed.workers.dev";
window.__FR_READER_PATH__=window.__FR_READER_PATH__||"/the-faith-received/read/";
window.__FR_LEXICON_PATH__=window.__FR_LEXICON_PATH__||"/the-faith-received/lexicon/";
const BLOB=(window.__FR_BLOB_BASE__||"").replace(/\/$/,"");
const VER=window.__FR_VER?(`?v=${window.__FR_VER}`):"";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ROMAN=n=>{const m=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];let o='';for(const [v,s] of m)while(n>=v){o+=s;n-=v;}return o;};
const PARTS=[['Ia','First Part'],['I-II','First Part of the Second'],['II-II','Second Part of the Second'],['III','Third Part']];
// the Decretum's four runs of places: the distinctions of Part I, the causae of Part II, De penitentia (inside C. 33) and De consecratione
const DECRETUM=[['D','Distinctions','Distinctio'],['C','Causae','Causa'],['DP','De penitentia','De penitentia, Distinctio'],['DC','De consecratione','De consecratione, Distinctio']];
const FIRST={sentences:'1',summa:'Ia',decretals:'1',decretum:'D',systems:'I'};
const TEXTNAME={sentences:"Lombard's text",summa:"Aquinas's text",decretals:"The Decretals",decretum:"Gratian's text",systems:"The place (no common text)"};
const DECKNAME={sentences:"Lombard's Sentences",summa:"Aquinas's Summa",decretals:"the Decretals",decretum:"Gratian's Decretum",systems:"the systems of theology"};
// the traditions in a fixed order; a work's own (works-index) decides
const TRADS=['Greek Fathers','Latin Fathers','Medieval','Roman Catholic','Lutheran','Reformed','Continental Reformed','English Divines'];
// a commentator's place is read here up to this many pages; the reader has the rest
const MAXP=50;
// MereO hosts the same page with its own reader path (window.__FR_READER_PATH__ = '/the-faith-received/read/') and data address.
// at= names the heading the link means: the reader opens on it, not on the top of its page.
const READER=(window.__FR_READER_PATH__||'/read');
const read=(slug,page,at)=>`${READER}?w=${encodeURIComponent(slug)}${at?`&at=${encodeURIComponent(String(at).slice(0,200))}`:''}${page!=null&&page!==''?`#b${encodeURIComponent(page)}-0`:''}`;
const J=u=>fetch(BLOB+u).then(r=>r.ok?r.json():null).catch(()=>null);
const fold=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
let S={deck:'sentences',part:'1',place:null,art:null,r:null,i:null,l:null,j:null},D=null,LANE='en';
try{LANE=localStorage.getItem('fr_deck_lane')||'en';}catch(_){}
if(!['en','la','both'].includes(LANE))LANE='en';
const canon=k=>((D.canon||{})[k])||{titles:[],places:[],landings:{}};
function noun(){return {sentences:'distinction',summa:'question',decretals:'title',decretum:S.part==='C'?'causa':'distinction',systems:'place'}[S.deck];}
const SYS=()=>S.deck==='systems';
const WHO=()=>SYS()?'systems':'commentators';

// ── the address ──────────────────────────────────────────────────────────────────────────────────────────────────────
function state(){
  const [path,query='']=location.hash.slice(1).split('?');
  let h=[];try{h=decodeURIComponent(path).split('/');}catch(_){}
  const q=new URLSearchParams(query),n=k=>q.has(k)&&/^\d+$/.test(q.get(k))?+q.get(k):null;
  if(h[0]==='summa')S={deck:'summa',part:PARTS.some(([k])=>k===h[1])?h[1]:'Ia',place:/^\d+$/.test(h[2]||'')?h[2]:null,art:/^\d+$/.test(h[3]||'')?h[3]:null};
  else if(h[0]==='decretals')S={deck:'decretals',part:['1','2','3','4','5'].includes(h[1])?h[1]:'1',place:/^\d+$/.test(h[2]||'')?h[2]:null,art:null};
  else if(h[0]==='decretum')S={deck:'decretum',part:DECRETUM.some(([k])=>k===h[1])?h[1]:'D',place:/^\d+$/.test(h[2]||'')?h[2]:null,art:null};
  else if(h[0]==='systems')S={deck:'systems',part:/^[IVX]+$/.test(h[1]||'')?h[1]:'I',place:/^[a-z][a-z0-9-]*$/.test(h[2]||'')?h[2]:null,art:null};
  else S={deck:'sentences',part:['1','2','3','4'].includes(h[1])?h[1]:'1',place:/^\d+$/.test(h[2]||'')?h[2]:null,art:null};
  Object.assign(S,{r:q.get('r')||null,i:n('i'),l:q.get('l')||null,j:n('j')});
}
function hashOf(){
  const q=new URLSearchParams();if(S.r)q.set('r',S.r);if(S.i!=null)q.set('i',S.i);if(S.l)q.set('l',S.l);if(S.j!=null)q.set('j',S.j);
  return [S.deck,S.part,S.place,S.art].filter(x=>x!=null&&x!=='').join('/')+(q.toString()?`?${q}`:'');
}
function go(){const h=`#${hashOf()}`;if(location.hash!==h)location.hash=h;else render();}

// ── the places of a deck and its grid ────────────────────────────────────────────────────────────────────────────────
function places(){
  // the systems: every place of the grid, in order across the ten parts (the stepper walks them all)
  if(S.deck==='systems')return D.sys?D.sys._places.map(([part,k,name,la])=>({k,part,name,la,n:new Set((((D.sys[part]||{})[k]||{}).works||[]).map(r=>r[0])).size})):[];
  if(S.deck==='decretals'){const L=canon('X');return L.titles.filter(t=>String(t[0])===S.part).map(t=>({k:String(t[1]),n:Object.keys(L.landings[`${t[0]}.${t[1]}`]||{}).length,name:t[2]}));}
  if(S.deck==='decretum'){const L=canon('D');return L.places.filter(x=>x[0]===S.part).map(x=>({k:String(x[1]),n:Object.keys(L.landings[`${x[0]}.${x[1]}`]||{}).length,name:x[2]}));}
  if(S.deck==='sentences'){const g=D.sent[S.part]||{},max={'1':48,'2':44,'3':40,'4':50}[S.part];
    return Array.from({length:max},(_,i)=>String(i+1)).map(k=>({k,n:new Set((g[k]||[]).map(r=>r[0])).size}));}
  const g=D.summa[S.part]||{},ks=Object.keys(g).filter(k=>/^\d+$/.test(k)).map(Number).sort((a,b)=>a-b);
  return ks.map(k=>({k:String(k),n:new Set(((g[k]||{}).works||[]).map(r=>r[0])).size,name:(g[k]||{}).t}));
}
function rowsFor(all){
  if(S.deck==='decretals'||S.deck==='decretum')return Object.entries(canon(S.deck==='decretals'?'X':'D').landings[`${S.part}.${S.place}`]||{}).map(([slug,p])=>[slug,p,'',0]);
  if(S.deck==='sentences')return (D.sent[S.part]||{})[S.place]||[];
  if(S.deck==='systems')return (((D.sys||{})[S.part]||{})[S.place]||{}).works||[];
  const ws=((D.summa[S.part]||{})[S.place]||{}).works||[];
  return S.art==null||all?ws:ws.filter(r=>String(r[3]||0)===String(S.art));
}
function placeName(k){
  if(S.deck==='systems'){const p=D.sys&&D.sys._places.find(x=>x[1]===k);return p?p[2]:String(k);}
  if(S.deck==='sentences')return `Distinction ${ROMAN(+k)}`;
  if(S.deck==='summa')return `Question ${k}`;
  if(S.deck==='decretals')return `Title ${ROMAN(+k)}`;
  return `${(DECRETUM.find(d=>d[0]===S.part)||[])[2]} ${ROMAN(+k)}`;
}
function heading(){
  if(S.deck==='sentences')return [`Book ${ROMAN(+S.part)}, Distinction ${ROMAN(+S.place)}`,''];
  if(S.deck==='summa'){const q=(D.summa[S.part]||{})[S.place]||{};return [`${(PARTS.find(p=>p[0]===S.part)||[])[1]}, Question ${S.place}`,q.t||''];}
  if(S.deck==='decretals'){const t=canon('X').titles.find(x=>String(x[0])===S.part&&String(x[1])===S.place);return [`Book ${ROMAN(+S.part)}, Title ${ROMAN(+S.place)}`,t?t[2]:''];}
  if(S.deck==='systems'){const p=(D.sys&&D.sys._places.find(x=>x[1]===S.place))||[];return [p[2]||S.place,[p[3],`Part ${S.part}, ${partName(S.part)}`].filter(Boolean).join(' · ')];}
  return [placeName(S.place),''];
}
function partName(pk){
  if(S.deck==='summa')return (PARTS.find(p=>p[0]===pk)||[])[1]||pk;
  if(S.deck==='sentences'||S.deck==='decretals')return `Book ${ROMAN(+pk)}`;
  if(S.deck==='decretum')return (DECRETUM.find(d=>d[0]===pk)||[])[1]||pk;
  if(S.deck==='systems')return (((D.sys&&D.sys._parts)||[]).find(p=>p[0]===pk)||[])[1]||pk;
  return pk;
}
// a part named inside a sentence: "the First Part", "Book II", "the Causae", "De penitentia", "God"
function partPhrase(pk){const n=partName(pk);return S.deck==='summa'||(S.deck==='decretum'&&/^(D|C)$/.test(pk))?`the ${n}`:n;}
function renderNav(){
  document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.deck===S.deck)));
  const parts={sentences:[['1','Book I'],['2','Book II'],['3','Book III'],['4','Book IV']],summa:PARTS.map(([k])=>[k,k]),
    decretals:['1','2','3','4','5'].map(k=>[k,`Book ${ROMAN(+k)}`]),decretum:DECRETUM.map(([k,l])=>[k,l]),systems:((D.sys&&D.sys._parts)||[]).map(([k])=>[k,k])}[S.deck];
  $('#parts').innerHTML=parts.map(([k,l])=>`<button type="button" class="chip" data-part="${esc(k)}" aria-pressed="${k===S.part}" title="${esc(S.deck==='summa'?(PARTS.find(p=>p[0]===k)||[])[1]:SYS()?partName(k):l)}"${SYS()?` aria-label="Part ${esc(k)}, ${esc(partName(k))}"`:''}>${esc(l)}</button>`).join('');
  const ps=places(),here=p=>p.k===S.place&&(!p.part||p.part===S.part),i=ps.findIndex(here),[one,many]=SYS()?['system','systems']:['commentary','commentaries'];
  const cell=p=>`<button type="button" data-place="${esc(p.k)}"${p.part?` data-ppart="${esc(p.part)}"`:''} aria-pressed="${here(p)}" class="${p.n?'':'empty'}"${p.name&&!SYS()?` title="${esc(p.name)}"`:''} aria-label="${esc(placeName(p.k))}${p.name&&!SYS()?`, ${esc(p.name)}`:''}, ${p.n} ${p.n===1?one:many}">${esc(SYS()?p.name:p.k)}<small>${p.n||'·'}</small></button>`;
  $('#grid').classList.toggle('sys',SYS());
  $('#grid').innerHTML=SYS()?((D.sys&&D.sys._parts)||[]).map(([pk,pn])=>`<p class="gpart">${esc(pk)}. ${esc(pn)}</p>${ps.filter(p=>p.part===pk).map(cell).join('')}`).join(''):ps.map(cell).join('');
  $('#pick').textContent=S.place?`${placeName(S.place)} ▾`:`Choose a ${noun()} ▾`;
  $('#prev').disabled=i<=0;$('#next').disabled=i<0||i>=ps.length-1;
  document.querySelectorAll('#lanes button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lane===LANE)));
}

// ── the place: its text and its commentators' divisions, fetched once a place ─────────────────────────────────────────
let PL={key:''};
async function loadPlace(){
  const key=[S.deck,S.part,S.place].join('/');
  if(PL.key===key)return PL.wait;
  const f=`${encodeURIComponent(S.deck)}/${encodeURIComponent(S.part)}/${encodeURIComponent(S.place)}.json`;
  PL={key,text:null,out:null};
  // a place no commentator is aligned to has no outline file: it is not asked for
  PL.wait=Promise.all([SYS()?null:J(`/v1/decks/read/${f}`),rowsFor().length||S.art?J(`/v1/decks/outline/${f}`):null]).then(([t,o])=>{if(PL.key===key){PL.text=t;PL.out=o;}});
  return PL.wait;
}
const order=(a,b)=>{const ta=TRADS.includes(a.tr)?TRADS.indexOf(a.tr):99,tb=TRADS.includes(b.tr)?TRADS.indexOf(b.tr):99;return ta-tb||a.y-b.y||a.a.localeCompare(b.a)||a.t.localeCompare(b.t)||a.from-b.from;};
// the commentators of the place: the grid says who and where he begins; the outline gives his divisions and where his place ends.
// An article chosen narrows the list to those who treat it; a commentator already open stays open (he treats the whole question).
function commentators(all){
  const by=new Map();for(const r of rowsFor(all)){if(!by.has(r[0])||+r[1]<+by.get(r[0])[1])by.set(r[0],r);}
  const out=(PL.out&&PL.out.works)||{};
  return [...by.values()].map(r=>{const w=D.texts.works[r[0]]||[],o=out[r[0]];
    const items=o&&o.items&&o.items.length?o.items:[[r[2]||`From p. ${r[1]}`,+r[1],1,r[2]||'',r[3]||null]];
    return {slug:r[0],a:w[0]||'',t:w[1]||r[0],vol:w[2]||'',tr:w[3]||'Other',y:w[4]||9999,from:o?+o.from:+r[1],to:o?+o.to:+r[1]+6,items};
  }).filter(c=>c.a||c.t!==c.slug).sort(order);
}
const KINDS=[['question',/^(?:on\s+|in\s+)?(?:question|quaestio|quaest\.|q\.\s*\d)|^\w+\s+question\b/i],['article',/^(?:article|articulus|art\.|a\.\s*\d)|^\w+\s+article\b/i],
  ['disputation',/^(?:disputation|disputatio|disp\.)|^\w+\s+disputation\b/i],['doubt',/^(?:doubt|dubium|dub\.)|^\w+\s+doubt\b/i],['chapter',/^(?:chapter|caput|cap\.)/i],['section',/^(?:§|section|sectio)/i]];
function summary(items){
  const n={};for(const x of items){const k=KINDS.find(([,rx])=>rx.test(x[0]));if(k)n[k[0]]=(n[k[0]]||0)+1;}
  const parts=KINDS.filter(([k])=>n[k]).slice(0,3).map(([k])=>`${n[k]} ${k}${n[k]===1?'':'s'}`);
  return parts.length?parts.join(' · '):`${items.length} heading${items.length===1?'':'s'}`;
}
const who=c=>`${c.a||'Unknown'}${c.y<9999&&!SYS()?` (b. ${c.y})`:''}`;
// the year beside a name is a commentator's birth; on the systems it is the edition's, and goes with the work
const born=c=>c.y<9999&&!SYS()?`<small>b. ${c.y}</small>`:'';
const workLine=c=>`${esc(c.t)}${c.vol?`, ${esc(c.vol)}`:''}${SYS()&&c.y<9999&&!String(c.vol).includes(String(c.y))?`, ${c.y}`:''}`;
const pp=c=>c.to>c.from?`pp. ${c.from}–${c.to}`:`p. ${c.from}`;

// ── where a work is not: every place of the deck in order, and the nearest places a work treats ───────────────────────
const DPC=new Map();
function deckPlaces(){
  if(DPC.has(S.deck))return DPC.get(S.deck);
  const set=rows=>new Set((rows||[]).map(r=>r[0])),num=o=>Object.keys(o||{}).filter(k=>/^\d+$/.test(k)).map(Number).sort((a,b)=>a-b);
  let L=[];
  if(S.deck==='summa')L=PARTS.flatMap(([pk])=>num(D.summa[pk]).map(k=>{const q=D.summa[pk][k]||{};return {part:pk,k:String(k),t:q.t||'',slugs:set(q.works)};}));
  else if(S.deck==='sentences')L=['1','2','3','4'].flatMap(b=>num(D.sent[b]).map(k=>({part:b,k:String(k),t:'',slugs:set(D.sent[b][k])})));
  else if(S.deck==='decretals'){const C=canon('X');L=C.titles.map(t=>({part:String(t[0]),k:String(t[1]),t:t[2]||'',slugs:new Set(Object.keys(C.landings[`${t[0]}.${t[1]}`]||{}))}));}
  else if(S.deck==='decretum'){const C=canon('D');L=DECRETUM.flatMap(([pk])=>C.places.filter(x=>x[0]===pk).map(x=>({part:pk,k:String(x[1]),t:'',slugs:new Set(Object.keys(C.landings[`${x[0]}.${x[1]}`]||{}))})));}
  else if(SYS()&&D.sys)L=D.sys._places.map(([pk,k,t])=>({part:pk,k,t,slugs:set(((D.sys[pk]||{})[k]||{}).works)}));
  if(L.length)DPC.set(S.deck,L);
  return L;
}
function nearest(slug){
  const L=deckPlaces(),i=L.findIndex(p=>p.part===S.part&&p.k===S.place);
  let before=null,after=null,count=0;
  L.forEach((p,j)=>{if(!p.slugs.has(slug))return;count++;if(i>=0&&j<i)before=p;else if(j>i&&!after)after=p;});
  return {before,after,count};
}
// a place named in a sentence or a link: its part only when it is not the part being read; the question's own title on the Summa
function placeLabel(p,full){
  const other=p.part!==S.part,pre=other&&!SYS()?`${partName(p.part)}, `:'';
  if(S.deck==='summa')return `${pre}Question ${p.k}${full&&p.t?`, ${p.t}`:''}`;
  if(S.deck==='sentences')return `${pre}Distinction ${ROMAN(+p.k)}`;
  if(S.deck==='decretals')return `${pre}Title ${ROMAN(+p.k)}${full&&p.t?`, ${p.t}`:''}`;
  if(S.deck==='decretum')return `${(DECRETUM.find(d=>d[0]===p.part)||[])[2]} ${ROMAN(+p.k)}`;
  return SYS()&&other?`${p.t} (Part ${p.part}, ${partName(p.part)})`:p.t||p.k;
}
// the address of a place with the work kept in its pane (the right pane unless it is the left that is asked for)
function hashFor(p,slug,side){
  const q=new URLSearchParams(),r=side==='a'?S.r:slug,l=side==='a'?slug:S.l;if(r)q.set('r',r);if(l)q.set('l',l);
  return `${S.deck}/${p.part}/${p.k}${q.toString()?`?${q}`:''}`;
}
const placeLink=(p,slug,side,full)=>`<a href="#${esc(hashFor(p,slug,side))}">${esc(placeLabel(p,full))}</a>`;
// the pane of a work chosen where it has no division: it says so, and where the nearest are
function absentNote(slug,side){
  const w=D.texts.works[slug]||[],name=w[0]||(SYS()?'This system':'This commentator'),N=nearest(slug),pk=S.part,sys=SYS();
  const L=p=>placeLink(p,slug,side,true),inPart=p=>p&&p.part===pk,His=sys?'Its':'His',he=sys?'it':'he',work=sys?'treatment of':'commentary on';
  // a system's place named inside a sentence: "the covenants", not "The covenants"
  const here=sys?placeName(S.place).replace(/^The /,'the '):placeName(S.place);
  const s1=sys?`${esc(name)}, ${esc(w[1]||'')}, has nothing filed under ${esc(here)}.`:`${esc(name)} has no commentary on ${esc(here)}.`;
  let s2='';
  if(!N.count)s2=`${sys?'It':'He'} is not aligned to any ${noun()} of ${esc(DECKNAME[S.deck])}.`;
  else if(inPart(N.before)&&inPart(N.after))s2=`The nearest ${noun()}s ${he} treats are ${L(N.before)}, before, and ${L(N.after)}, after.`;
  else if(inPart(N.after))s2=`${His} ${work} ${esc(partPhrase(pk))} begins at ${L(N.after)}.${N.before?` The last ${noun()} ${he} treats before it is ${L(N.before)}.`:''}`;
  else if(inPart(N.before))s2=`${His} ${work} ${esc(partPhrase(pk))} ends at ${L(N.before)}.${N.after?` The next ${noun()} ${he} treats is ${L(N.after)}.`:''}`;
  else s2=`${sys?'It':'He'} treats ${N.count} other ${N.count===1?noun():`${noun()}s`} of ${esc(DECKNAME[S.deck])}; the nearest ${N.before&&N.after?'are':'is'} ${[N.before&&L(N.before),N.after&&L(N.after)].filter(Boolean).join(' and ')}.`;
  return `<div class="abs-note"><p>${s1}</p><p>${s2}</p></div>`;
}
// the line under an absent work in the list: where it begins, ends, or the nearest on either side
function nearHTML(slug){
  const N=nearest(slug),L=p=>placeLink(p,slug,'b',false);
  if(N.before&&N.after)return `Nearest: ${L(N.before)}, before; ${L(N.after)}, after`;
  if(N.after)return `Begins at ${L(N.after)}`;
  if(N.before)return `Ends at ${L(N.before)}`;
  return '';
}
const DWC=new Map();
function deckWorks(){if(!DWC.has(S.deck)&&deckPlaces().length)DWC.set(S.deck,[...new Set(deckPlaces().flatMap(p=>[...p.slugs]))]);return DWC.get(S.deck)||[];}

// ── a work's pages: its page files (about a hundred pages a file), else its TEI; fetched once ─────────────────────────
const META=new Map(),FILES=new Map(),TEIS=new Map();
const wurl=(slug,f)=>`${BLOB}/v1/works/${encodeURIComponent(slug)}/${f}`;
const getJ=u=>fetch(u).then(r=>r.ok?r.json():null).catch(()=>null);
function metaOf(slug){if(!META.has(slug))META.set(slug,getJ(wurl(slug,'meta.json')+VER));return META.get(slug);}
async function blocksOf(slug,lane,n){
  const m=await metaOf(slug);if(!m)return null;
  const sh=Array.isArray(m.shards)?m.shards.find(x=>n>=+x.from&&n<=+x.to):null,file=sh?sh.file:(m.single||null);
  if(file){
    const key=`${slug}/${file}`;if(!FILES.has(key))FILES.set(key,getJ(wurl(slug,file)));
    const d=await FILES.get(key),p=((d&&d.pages)||[]).find(x=>+String(x.n).replace(/^0+(?=\d)/,'')===n);
    const t=p&&p[lane==='en'?'en':'la'];
    if(t&&t.trim())return t.split(/\n+/).map(s=>({t:s.trim(),h:false})).filter(b=>b.t);
    if(!m.has_tei)return [];
  }
  if(m.has_tei&&window.FRPageWindow&&window.FRPageWindow.teiPages){
    const key=`${slug}|${lane}`;
    if(!TEIS.has(key))TEIS.set(key,(async()=>{for(const f of lane==='en'?['en']:['la','fr']){
      const x=await fetch(`${wurl(slug,`tei.${f}.xml`)}?v=${encodeURIComponent(m.tei_v||0)}`).then(r=>r.ok?r.text():'').catch(()=>'');
      const P=x&&window.FRPageWindow.teiPages(x);if(P&&P.size)return P;}return null;})());
    const P=await TEIS.get(key);return (P&&P.get(n))||[];
  }
  return [];
}

// ── drawing pages: a heading the outline names gets its anchor; a line that reads as a heading is set as one ───────────
const HEADLIKE=/^(?:distinct|quaest|question|art(?:ic|\.)|disput|dub(?:ium|\.)|doubt|cap(?:ut|\.|itul)|chapter|sect|§|pars\b|part\b|liber\b|book\b|prolog|pro(?:o|œ)em|tract|treatise|lectio|lesson|expositio|divisio|summa(?:rium|ry)|textus|resolutio|conclusio|notanda)/i;
const capsy=t=>{const L=t.replace(/[^A-Za-z]/g,'');return L.length>5&&L.replace(/[^A-Z]/g,'').length/L.length>.7;};
const headish=t=>t.length<150&&(HEADLIKE.test(t)||(t.length<100&&capsy(t)));
function matches(item,t){const b=fold(t);if(b.length<3)return false;
  return [item[3],item[0],...String(item[3]||'').split(/\s+\u2014\s+/)].some(x=>{const a=fold(x),k=Math.min(28,a.length,b.length);return k>=5&&a.slice(0,k)===b.slice(0,k);});}
function linesHTML(blocks,lane,marks,after){
  return blocks.map((b,bi)=>{const id=marks.get(bi),{t} = b,h=b.h===1||b.h===true||id!=null||(b.h!==2&&headish(t));
    const tail=((after&&after.get(bi))||[]).map(x=>`<span class="anc" id="${x}" data-item="${x}"></span>`).join('');
    if(b.h===2)return `<p class="cap" lang="${lane}">${esc(t)}</p>${tail}`;
    return (h?`<h3 class="hd${capsy(t)?' sc':''}" lang="${lane}"${id!=null?` id="${id}" data-item="${id}"`:''}>${esc(t)}</h3>`:`<p lang="${lane}">${esc(t)}</p>`)+tail;}).join('');
}
// one page: its number (a link into the reader at that page), then its lines in one language or both
function pageHTML(side,slug,n,cols,items,colLabel){
  // a division the page's lines name becomes that line's anchor; one they do not name is anchored after the last one placed,
  // so the contents keep the outline's order as the reader scrolls
  const lanes=LANE==='both'?['la','en']:[LANE],marks={la:new Map(),en:new Map()},after={la:new Map(),en:new Map()},lead=[];
  const lane=(cols.en&&cols.en.length&&LANE!=='la')?'en':((cols.la&&cols.la.length)?'la':'en');
  let last=-1;
  for(const it of items){
    const bi=(cols[lane]||[]).findIndex((b,k)=>k>last&&!marks[lane].has(k)&&matches(it.x,b.t)),id=`${side}-i${it.k}`;
    if(bi>=0&&lanes.includes(lane)){marks[lane].set(bi,id);last=bi;}
    else if(last<0||!lanes.includes(lane))lead.push(id);
    else{const a=after[lane].get(last)||[];a.push(id);after[lane].set(last,a);}
  }
  const col=l=>`<div class="ln" lang="${l}">${(cols[l]&&cols[l].length)?linesHTML(cols[l],l,marks[l],after[l]):`<p class="note">No ${l==='en'?'English':'Latin'} on this ${colLabel}.</p>`}</div>`;
  return `<section class="pg" data-n="${n}">${lead.map(id=>`<span class="anc" id="${id}" data-item="${id}"></span>`).join('')}<a class="pgno" href="${read(slug,n)}" title="Open this ${colLabel} in the reader">${colLabel==='column'?'col.':'p.'} ${esc(n)}</a>${lanes.length>1?`<div class="duo">${col('la')}${col('en')}</div>`:col(lanes[0])}</section>`;
}

// ── the panes ────────────────────────────────────────────────────────────────────────────────────────────────────────
const PANE={a:$('#paneA'),b:$('#paneB')},RUN={a:0,b:0},SHOWN={a:'',b:''};
const isPhone=()=>matchMedia('(max-width:980px)').matches;
function scrollerOf(side){const s=PANE[side].querySelector('.scroll');return s&&!isPhone()?s:null;}
function scrollToEl(side,el,flash){
  if(!el)return;const s=scrollerOf(side);
  if(s)s.scrollTop+=el.getBoundingClientRect().top-s.getBoundingClientRect().top-12;
  else window.scrollTo({top:window.scrollY+el.getBoundingClientRect().top-(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sticky'))||12)*16-70});
  if(flash){const t=el.classList.contains('anc')?el.closest('.pg'):el;if(t){t.classList.remove('flash');void t.offsetWidth;t.classList.add('flash');}}
}
function sourceSelect(side,cs,current){
  const first=side==='a'?`<option value="${SYS()?'-':''}">${esc(TEXTNAME[S.deck])}</option>`:`<option value="">All ${WHO()} (${cs.length})</option>`;
  const groups=[...TRADS,'Other'].map(t=>[t,cs.filter(c=>(TRADS.includes(c.tr)?c.tr:'Other')===t)]).filter(([,g])=>g.length);
  const w=current&&current!=='-'&&!cs.some(c=>c.slug===current)?D.texts.works[current]||[]:null;
  const away=w?`<optgroup label="Not on this ${noun()}"><option value="${esc(current)}" selected>${esc(w[0]||current)}${w[1]?` · ${esc(String(w[1]).slice(0,48))}`:''}</option></optgroup>`:'';
  return `<label class="srcl"><span>Read</span><select data-src="${side}" aria-label="What the ${side==='a'?'left':'right'} pane reads">${first}${away}${groups.map(([t,g])=>`<optgroup label="${esc(t)}">${g.map(c=>`<option value="${esc(c.slug)}"${c.slug===current?' selected':''}>${esc(c.a||c.t)} · ${esc(c.t.slice(0,48))}${c.vol?`, ${esc(c.vol.slice(0,24))}`:''}</option>`).join('')}</optgroup>`).join('')}</select></label>`;
}
// THE TEXT ITSELF, in the left pane unless a commentator is put there
async function paneText(side){
  const host=PANE[side],[h2,sub]=heading(),t=PL.text,cs=commentators(true),token=++RUN[side];
  const key=['text',PL.key,LANE].join('|');
  const firstHead=t?((t.en||[]).concat(t.la||[]).find(b=>b[0]===1)||[])[1]:'';
  const open=t?read(t.slug,t.from,artHead()||firstHead):'';
  const head=`<header class="ph"><div class="ph-row">${sourceSelect(side,cs,'')}${open?`<a class="open" href="${open}">Open in the reader ↗</a>`:''}</div>
    <h2>${esc(h2)}</h2>${sub?`<p class="what">${esc(sub)}</p>`:''}${S.deck==='summa'?artsBar():''}</header>`;
  if(SHOWN[side]===key){host.querySelector('.ph').outerHTML=head;if(S.deck==='summa')jumpArt(side);return;}
  SHOWN[side]=key;host.dataset.moved='';
  if(SYS()){host.innerHTML=`${head}<div class="scroll"><p class="note">The systems have no common text: they are compared place by place. Choose a system for either pane from the lists.</p></div>`;return;}
  if(!t){host.innerHTML=`${head}<div class="scroll"><p class="note">The text of this ${noun()} is not cut yet. ${S.deck==='sentences'?'':'Open its first page in the reader from the commentators beside it.'}</p></div>`;return;}
  const byPage=new Map();for(const l of ['en','la'])for(const [hh,txt,pg] of (t[l]||[])){if(!byPage.has(pg))byPage.set(pg,{en:[],la:[]});byPage.get(pg)[l].push({t:txt,h:hh});}
  const unit=t.slug==='pld-7607'?'column':'page';
  host.innerHTML=`${head}<div class="scroll">${[...byPage].map(([n,cols])=>pageHTML(side,t.slug,n,cols,[],unit)).join('')}<p class="end">${t.to&&t.to>t.from?`${unit==='column'?'Columns':'Pages'} ${esc(t.from)}–${esc(t.to)}. `:''}<a href="${read(t.slug,t.to||t.from)}">Read on in the reader ↗</a></p></div>`;
  if(token===RUN[side]&&S.deck==='summa'){jumpArt(side);if(document.fonts)document.fonts.ready.then(()=>{if(token===RUN[side]&&!host.dataset.moved)jumpArt(side,true);});}
}
function artHead(){
  if(S.deck!=='summa'||!S.art||!PL.text)return '';
  const re=new RegExp(`^(?:A\\.|Art\\.?|Article|ARTICULUS|Articulus)\\s*${S.art}\\b`);
  return ((PL.text.en||[]).find(b=>b[0]===1&&re.test(b[1]))||[])[1]||'';
}
function artsBar(){
  const q=(D.summa[S.part]||{})[S.place]||{},aq=(D.texts.summa[S.part]||{})[S.place]||{};
  const counts={};for(const r of q.works||[]){const k=String(r[3]||0);(counts[k]=counts[k]||new Set()).add(r[0]);}
  const ks=[...new Set([...Object.keys(aq).filter(k=>k!=='0'),...Object.keys(counts).filter(k=>k!=='0')])].map(Number).sort((a,b)=>a-b);
  if(!ks.length)return '';
  return `<div class="arts" role="group" aria-label="Articles"><button type="button" class="chip" data-art="" aria-pressed="${S.art==null}">All articles</button>${ks.map(k=>`<button type="button" class="chip" data-art="${k}" aria-pressed="${String(k)===S.art}" title="${esc((aq[k]||[])[2]||'')}">Art. ${k}<small>${(counts[k]||new Set()).size}</small></button>`).join('')}</div>`;
}
function jumpArt(side,quiet){
  if(!S.art)return;
  const re=new RegExp(`^(?:A\\.|Art\\.?|Article|ARTICULUS|Articulus)\\s*${S.art}\\b`);
  const el=[...PANE[side].querySelectorAll('.scroll .hd,.scroll p')].find(x=>re.test(x.textContent.trim()));
  scrollToEl(side,el,!quiet);
}
// A COMMENTATOR'S PLACE, page after page, with his divisions of it as the pane's contents
async function paneWork(side,slug,focus){
  const host=PANE[side],cs=commentators(true),c=cs.find(x=>x.slug===slug),token=++RUN[side];
  const key=['work',PL.key,slug,LANE].join('|');
  if(!c){SHOWN[side]='';const w=D.texts.works[slug]||[];
    host.innerHTML=`<header class="ph"><div class="ph-row">${sourceSelect(side,cs,slug)}</div>${side==='b'?`<button type="button" class="back" data-back>← All ${WHO()}</button>`:''}
      <h2>${esc(w[0]||slug)}${born({y:w[4]||9999})}</h2>${w[1]?`<p class="what">${workLine({t:w[1],vol:w[2]||'',y:w[4]||9999})}</p>`:''}</header><div class="scroll">${absentNote(slug,side)}</div>`;return;}
  const {items} = c;
  if(focus==null&&S.deck==='summa'&&S.art){const k=items.findIndex(x=>String(x[4]||'')===String(S.art));if(k>=0)focus=k;}
  const toc=items.length>1?`<select data-toc="${side}" aria-label="${esc(c.a)}'s divisions of this ${noun()}">${items.map((x,k)=>`<option value="${k}"${k===focus?' selected':''}>${' '.repeat(Math.max(0,Math.min(3,x[2])-1))}${esc(x[0].slice(0,110))} · p. ${esc(x[1])}</option>`).join('')}</select>`:'';
  const cur=items[focus!=null?focus:0]||items[0];
  const head=`<header class="ph"><div class="ph-row">${sourceSelect(side,cs,slug)}<a class="open" data-open="${side}" href="${read(slug,cur[1],cur[3])}">Open in the reader ↗</a></div>
    ${side==='b'?`<button type="button" class="back" data-back>← All ${WHO()}</button>`:''}
    <h2>${esc(c.a||c.t)}${born(c)}</h2><p class="what">${workLine(c)} · ${esc(pp(c))}</p>${toc}</header>`;
  if(SHOWN[side]===key){host.querySelector('.ph').outerHTML=head;if(focus!=null)scrollToEl(side,document.getElementById(`${side}-i${focus}`),true);return;}
  SHOWN[side]=key;
  host.innerHTML=`${head}<div class="scroll"><div class="pages"></div><div class="sk" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><p class="end" hidden></p></div>`;
  // a division beyond the first fifty pages of a long place (the Salmanticenses' grace runs to a hundred and forty) is read from
  // its own page; the place's opening stays a click away
  const fp=focus!=null?+items[focus][1]:c.from,start=fp>c.from+MAXP-6?Math.max(c.from,fp-1):c.from;
  const pagesEl=host.querySelector('.pages'),last=Math.min(c.to,start+MAXP-1),lanes=LANE==='both'?['la','en']:[LANE];
  if(start>c.from)pagesEl.insertAdjacentHTML('beforebegin',`<p class="end" style="border:0;margin:.6rem 0 0;padding:0">${esc(c.a)} begins this ${noun()} at p. ${esc(c.from)}. <a href="${read(slug,c.from,items[0][3])}">Read it from there in the reader ↗</a></p>`);
  let drawn=0,landed=focus==null;host.dataset.moved='';
  for(let n=start;n<=last;n++){
    const cols={};for(const l of lanes)cols[l]=await blocksOf(slug,l,n);
    if(token!==RUN[side])return;
    if(lanes.every(l=>cols[l]==null)){if(n===start){pagesEl.innerHTML=`<p class="note">These pages could not be loaded. <a href="${read(slug,c.from,items[0][3])}">Open them in the reader ↗</a></p>`;host.querySelector('.sk').remove();return;}break;}
    const on=items.map((x,k)=>({x,k})).filter(o=>+o.x[1]===n);
    pagesEl.insertAdjacentHTML('beforeend',pageHTML(side,slug,n,cols,on,'page'));drawn=n;
    if(!landed&&+items[focus][1]<=n){landed=true;if(!host.dataset.moved){const go2=()=>{if(!host.dataset.moved&&token===RUN[side])scrollToEl(side,document.getElementById(`${side}-i${focus}`),false);};
      scrollToEl(side,document.getElementById(`${side}-i${focus}`),true);if(document.fonts)document.fonts.ready.then(go2);setTimeout(go2,400);}}
  }
  if(token!==RUN[side])return;
  host.querySelector('.sk')?.remove();
  const end=host.querySelector('.end');end.hidden=false;
  end.innerHTML=drawn<c.to?`${esc(c.a)} goes on to p. ${esc(c.to)} on this ${noun()}. <a href="${read(slug,drawn+1)}">Read on in the reader from p. ${esc(drawn+1)} ↗</a>`:`End of ${esc(c.a)} on this ${noun()}. <a href="${read(slug,c.to)}">Read on in the reader ↗</a>`;
  spy(side);
}
// the contents follow the reading: the division last passed is the one shown, and "Open in the reader" opens it
function spy(side){
  const host=PANE[side],sel=host.querySelector('select[data-toc]'),open=host.querySelector('a[data-open]');
  const slug=(host.querySelector('select[data-src]')||{}).value;if(!sel||!slug)return;
  const s=scrollerOf(side),top=s?s.getBoundingClientRect().top:((parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sticky'))||1)*16+60);
  let cur=null;for(const a of host.querySelectorAll('[data-item]')){if(a.getBoundingClientRect().top-top<=48)cur=a;else break;}
  if(!cur)return;
  const k=+cur.dataset.item.split('-i')[1];if(String(k)===sel.value)return;
  sel.value=String(k);
  const c=commentators(true).find(x=>x.slug===slug),it=c&&c.items[k];if(it&&open)open.href=read(slug,it[1],it[3]);
}
// THE COMMENTATORS OF THE PLACE: by tradition, then by date; each with his own divisions of it
function paneDir(side){
  const host=PANE[side],cs=commentators(),key=['dir',PL.key,S.art||''].join('|');
  if(SHOWN[side]===key)return;
  SHOWN[side]=key;RUN[side]++;
  const row=c=>{const k=S.deck==='summa'&&S.art?c.items.findIndex(x=>String(x[4]||'')===String(S.art)):0,f=c.items[k>=0?k:0];
    return `<li class="c" data-slug="${esc(c.slug)}"><div class="c-top"><button type="button" class="c-read" data-read="${esc(c.slug)}"${k>0?` data-i="${k}"`:''}>
      <span class="who">${esc(c.a||'Unknown')}${born(c)}</span><span class="work">${workLine(c)}</span>
      <span class="sum">${esc(summary(c.items))} · ${esc(pp(c))}</span></button><a class="ext" href="${read(c.slug,f[1],f[3])}" aria-label="Open ${esc(c.a)} in the reader">Open ↗</a></div>
      ${c.items.length>1?`<details class="toc"><summary>Contents</summary><ol>${c.items.map((x,k)=>`<li class="d${Math.max(1,Math.min(3,x[2]))}"><button type="button" data-read="${esc(c.slug)}" data-i="${k}">${esc(x[0])}</button><a href="${read(c.slug,x[1],x[3])}" title="Open in the reader">p. ${esc(x[1])}</a></li>`).join('')}</ol></details>`:''}</li>`;};
  const byTrad=list=>[...TRADS,'Other'].map(t=>[t,list.filter(c=>(TRADS.includes(c.tr)?c.tr:'Other')===t)]).filter(([,g])=>g.length);
  const groups=byTrad(cs);
  // the deck's other commentators, not on this place: folded under the list, each with the nearest place he treats
  const here=new Set(commentators(true).map(c=>c.slug));
  const away=deckWorks().filter(sl=>!here.has(sl)).map(sl=>{const w=D.texts.works[sl]||[];return {slug:sl,a:w[0]||'',t:w[1]||sl,vol:w[2]||'',tr:w[3]||'Other',y:w[4]||9999,from:0};}).filter(c=>c.a||c.t!==c.slug).sort(order);
  const arow=c=>`<li class="c" data-slug="${esc(c.slug)}"><div class="c-who"><span class="who">${esc(c.a||'Unknown')}${born(c)}</span><span class="work">${workLine(c)}</span><span class="near">${nearHTML(c.slug)}</span></div></li>`;
  const absent=away.length?`<details class="absent"><summary>Not on this ${noun()}<span>${away.length}</span></summary><p class="count">The other ${WHO()} of ${esc(DECKNAME[S.deck])}, with the nearest ${noun()} each treats.</p>${byTrad(away).map(([t,g])=>`<section class="grp"><h3 class="trad">${esc(t)}<span>${g.length}</span></h3><ul class="dir">${g.map(arow).join('')}</ul></section>`).join('')}</details>`:'';
  host.innerHTML=`<header class="ph"><div class="ph-row">${sourceSelect(side,cs,'')}</div>
    <h2>${SYS()?'Systems':'Commentators'}</h2><p class="count">${cs.length?`${cs.length} on this ${noun()}${S.deck==='summa'&&S.art?`, article ${esc(S.art)}`:''}. Choose one to read beside ${SYS()?'the other pane':'the text'}.`:`None aligned to this ${noun()} yet.`}</p>
    ${cs.length+away.length>8?`<input class="find" type="search" placeholder="Find a ${SYS()?'system':'commentator'}" aria-label="Find a ${SYS()?'system':'commentator'}">`:''}</header>
    <div class="scroll">${groups.map(([t,g])=>`<section class="grp"><h3 class="trad">${esc(t)}<span>${g.length}</span></h3><ul class="dir">${g.map(row).join('')}</ul></section>`).join('')}${absent}</div>`;
}
// the systems' grid is fetched the first time that deck is opened
let SYSP=null;
function loadSystems(){return SYSP||(SYSP=J(`/v1/decks/systems/grid.json${VER}`).then(g=>{if(g&&g._places){D.sys=g;D.texts.works={...(g._works||{}),...D.texts.works};}else SYSP=null;return g;}));}
// the left pane: the text of the place; on the systems, which have no common text, the place's first system unless one was chosen
function leftSlug(){
  if(!SYS())return S.l;
  if(S.l==='-')return null;
  if(S.l)return S.l;
  // the canon family (Migne, the EEBO texts) is read in the reader from its own TEI, not here: the default is the first system this page can read
  const cs=new Set(commentators(true).map(c=>c.slug)),ok=sl=>cs.has(sl)&&sl!==S.r,rows=rowsFor(true).map(r=>r[0]);
  return rows.find(sl=>ok(sl)&&!/^(pg|pld|po|eebo)-\d+$/.test(sl))||rows.find(ok)||null;
}
async function render(){
  if(!D)return;
  if(SYS()){
    if(!D.sys){renderNav();PANE.a.innerHTML='<p class="note" style="padding:1rem 1.2rem">Loading the systems…</p>';PANE.b.innerHTML='';SHOWN.a=SHOWN.b='';
      await loadSystems();if(!SYS())return;
      if(!D.sys){PANE.a.innerHTML='<p class="note" style="padding:1rem 1.2rem">The systems could not be loaded. Reload the page to try again.</p>';return;}}
    // a place belongs to one part: the address's part follows the place it names
    const pl=S.place&&D.sys._places.find(x=>x[1]===S.place);
    if(pl)S.part=pl[0];else{S.place=null;if(!D.sys._parts.some(p=>p[0]===S.part))S.part='I';}
  }
  // a part with no place chosen opens on its first place with a commentator, so there is always a text to read
  if(!S.place){const ps=places().filter(p=>!p.part||p.part===S.part),f=ps.find(p=>p.n)||ps[0];if(f){S.place=f.k;history.replaceState(null,'',`#${hashOf()}`);}}
  renderNav();
  if(!S.place)return;
  await loadPlace();
  const left=leftSlug();
  $('#showA').textContent=left?((D.texts.works[left]||[])[0]||'Left'):'Text';
  $('#showB').textContent=S.r?((D.texts.works[S.r]||[])[0]||'Commentator'):`${SYS()?'Systems':'Commentators'} (${commentators().length})`;
  await Promise.all([left?paneWork('a',left,S.j):paneText('a'),S.r?paneWork('b',S.r,S.i):Promise.resolve(paneDir('b'))]);
}
// the next place; on the systems the stepper walks on into the next part
function step(d){const ps=places(),i=ps.findIndex(p=>p.k===S.place&&(!p.part||p.part===S.part));const n=ps[i+d];if(n){if(n.part)S.part=n.part;S.place=n.k;S.art=null;S.i=null;S.j=null;$('#grid').hidden=true;go();}}
function show(w){$('#desk').dataset.show=w;document.querySelectorAll('.switch [data-show]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.show===w)));}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-deck]');if(t){S={deck:t.dataset.deck,part:FIRST[t.dataset.deck]||'1',place:null,art:null,r:null,i:null,l:null,j:null};go();return;}
  // another book is mostly another volume: the panes go back to the text and the list
  const p=e.target.closest('[data-part]');if(p){S.part=p.dataset.part;S.place=null;S.art=null;S.r=null;S.i=null;S.l=null;S.j=null;go();return;}
  const g=e.target.closest('[data-place]');if(g){if(g.dataset.ppart)S.part=g.dataset.ppart;S.place=g.dataset.place;S.art=null;S.i=null;S.j=null;$('#grid').hidden=true;$('#pick').setAttribute('aria-expanded','false');go();return;}
  const a=e.target.closest('[data-art]');if(a){S.art=a.dataset.art===''?null:a.dataset.art;S.i=null;S.j=null;go();return;}
  const l=e.target.closest('[data-lane]');if(l){LANE=l.dataset.lane;try{localStorage.setItem('fr_deck_lane',LANE);}catch(_){}render();return;}
  const r=e.target.closest('[data-read]');if(r){S.r=r.dataset.read;S.i=r.dataset.i!=null?+r.dataset.i:null;show('b');go();return;}
  if(e.target.closest('[data-back]')){S.r=null;S.i=null;go();return;}
  const w=e.target.closest('.switch [data-show]');if(w){show(w.dataset.show);return;}
  if(e.target.closest('#pick')){const g2=$('#grid');g2.hidden=!g2.hidden;$('#pick').setAttribute('aria-expanded',String(!g2.hidden));return;}
  if(e.target.closest('#prev')){step(-1);return;}
  if(e.target.closest('#next')){step(1);}
});
document.addEventListener('change',e=>{
  const s=e.target.closest('select[data-src]');
  if(s){if(s.dataset.src==='a'){S.l=s.value||null;S.j=null;}else{S.r=s.value||null;S.i=null;}go();return;}
  const t=e.target.closest('select[data-toc]');
  if(t){const side=t.dataset.toc,k=+t.value;if(side==='a')S.j=k;else S.i=k;history.replaceState(null,'',`#${hashOf()}`);
    const el=document.getElementById(`${side}-i${k}`);if(el)scrollToEl(side,el,true);
    const c=commentators(true).find(x=>x.slug===(side==='a'?leftSlug():S.r)),it=c&&c.items[k],o=PANE[side].querySelector('a[data-open]');if(it&&o)o.href=read(c.slug,it[1],it[3]);}
});
document.addEventListener('input',e=>{
  const f=e.target.closest('.find');if(!f)return;const q=fold(f.value);
  PANE.b.querySelectorAll('.c').forEach(li=>{const t=li.querySelector('.c-read,.c-who');li.hidden=!!q&&!fold(t?t.textContent:'').includes(q);});
  PANE.b.querySelectorAll('.grp').forEach(g=>{g.hidden=![...g.querySelectorAll('.c')].some(li=>!li.hidden);});
  const ab=PANE.b.querySelector('details.absent');if(ab&&q)ab.open=[...ab.querySelectorAll('.c')].some(li=>!li.hidden);
});
// the reader scrolls a pane himself: the contents follow, and a late page no longer pulls him to the chosen division
let spyRaf=0;
document.addEventListener('scroll',()=>{
  if(spyRaf)return;spyRaf=requestAnimationFrame(()=>{spyRaf=0;spy('a');spy('b');});},true);
// reading down in a pane first lifts the page until the desk is docked under the bar, so the panes fill the window; then the pane
// itself scrolls. Reading up past a pane's top brings the page back (the browser's own scroll chaining).
document.addEventListener('wheel',e=>{
  const pane=e.target.closest&&e.target.closest('.pane');if(!pane||isPhone()||e.deltaY<=0||e.ctrlKey)return;
  const {top} = $('#desk').getBoundingClientRect(),st=parseFloat(getComputedStyle(pane).top)||12;
  if(top>st+1){e.preventDefault();window.scrollBy(0,Math.min(e.deltaY,top-st));}
},{passive:false});
['wheel','touchmove','keydown'].forEach(ev=>document.addEventListener(ev,e=>{const pane=e.target.closest&&e.target.closest('.pane');if(pane)pane.dataset.moved='1';},{passive:true,capture:true}));
document.addEventListener('keydown',e=>{
  if(e.target.closest&&e.target.closest('input,textarea,select,[contenteditable]'))return;
  if(e.key==='ArrowLeft'&&!e.metaKey&&!e.ctrlKey&&!e.altKey){step(-1);}
  else if(e.key==='ArrowRight'&&!e.metaKey&&!e.ctrlKey&&!e.altKey){step(1);}
  else if(e.key==='Escape'&&!$('#grid').hidden){$('#grid').hidden=true;$('#pick').setAttribute('aria-expanded','false');}
});
window.addEventListener('hashchange',()=>{state();render();});
Promise.all([J(`/v1/sentences.json${VER}`),J(`/v1/summa.json${VER}`),J(`/v1/decks/texts.json${VER}`),J(`/v1/decks/canon.json${VER}`)])
  .then(([sent,summa,texts,canonD])=>{if(!sent||!summa||!texts)throw new Error('decks');if(canonD)texts.works={...canonD.works,...texts.works};
    D={sent,summa,texts,canon:canonD};state();if(S.r&&isPhone())show('b');render();})
  .catch(()=>{PANE.a.innerHTML='<p class="note" style="padding:1rem 1.2rem">The decks could not be loaded. Reload the page to try again.</p>';});
