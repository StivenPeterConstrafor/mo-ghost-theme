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
const FIRST={sentences:'1',summa:'Ia',decretals:'1',decretum:'D'};
// the traditions in a fixed order; a work's own (works-index) decides
const TRADS=['Medieval','Roman Catholic','Lutheran','Reformed','Continental Reformed','English Divines'];
// MereO hosts the same page with its own reader path (window.__FR_READER_PATH__ = '/the-faith-received/read/') and data address
const READER=(window.__FR_READER_PATH__||'/read');
const read=(slug,page)=>`${READER}?w=${encodeURIComponent(slug)}${page!=null?`#b${encodeURIComponent(page)}-0`:''}`;
const J=u=>fetch(BLOB+u).then(r=>r.ok?r.json():null).catch(()=>null);
let S={deck:'sentences',part:'1',place:null,art:null},D=null,LANE='en',PEEK=null;
try{LANE=localStorage.getItem('fr_deck_lane')||'en';}catch(_){}
const canon=k=>((D.canon||{})[k])||{titles:[],places:[],landings:{}};
function noun(){return {sentences:'distinction',summa:'question',decretals:'title',decretum:S.part==='C'?'causa':'distinction'}[S.deck];}
function state(){const h=decodeURIComponent(location.hash.slice(1)).split('/');
  if(h[0]==='summa')S={deck:'summa',part:PARTS.some(([k])=>k===h[1])?h[1]:'Ia',place:h[2]||null,art:h[3]!=null?h[3]:null};
  else if(h[0]==='decretals')S={deck:'decretals',part:['1','2','3','4','5'].includes(h[1])?h[1]:'1',place:h[2]||null,art:null};
  else if(h[0]==='decretum')S={deck:'decretum',part:DECRETUM.some(([k])=>k===h[1])?h[1]:'D',place:h[2]||null,art:null};
  else S={deck:'sentences',part:['1','2','3','4'].includes(h[1])?h[1]:'1',place:h[2]||null,art:null};}
function go(){location.hash=[S.deck,S.part,S.place,S.art].filter(x=>x!=null&&x!=='').join('/');}
function places(){
  if(S.deck==='decretals'){const L=canon('X');return L.titles.filter(t=>String(t[0])===S.part).map(t=>({k:String(t[1]),n:Object.keys(L.landings[`${t[0]}.${t[1]}`]||{}).length,name:t[2]}));}
  if(S.deck==='decretum'){const L=canon('D');return L.places.filter(x=>x[0]===S.part).map(x=>({k:String(x[1]),n:Object.keys(L.landings[`${x[0]}.${x[1]}`]||{}).length,name:x[2]}));}
  if(S.deck==='sentences'){const g=D.sent[S.part]||{},max={'1':48,'2':44,'3':40,'4':50}[S.part];
    return Array.from({length:max},(_,i)=>String(i+1)).map(k=>({k,n:new Set((g[k]||[]).map(r=>r[0])).size}));}
  const g=D.summa[S.part]||{},ks=Object.keys(g).filter(k=>/^\d+$/.test(k)).map(Number).sort((a,b)=>a-b);
  return ks.map(k=>({k:String(k),n:new Set(((g[k]||{}).works||[]).map(r=>r[0])).size,name:(g[k]||{}).t}));
}
function rowsFor(){
  if(S.deck==='decretals'||S.deck==='decretum')return Object.entries(canon(S.deck==='decretals'?'X':'D').landings[`${S.part}.${S.place}`]||{}).map(([slug,p])=>[slug,p,'',0]);
  if(S.deck==='sentences')return (D.sent[S.part]||{})[S.place]||[];
  const q=(D.summa[S.part]||{})[S.place]||{},ws=q.works||[];
  return S.art==null?ws:ws.filter(r=>String(r[3]||0)===String(S.art));
}
function placeName(k){
  if(S.deck==='sentences')return `Distinction ${ROMAN(+k)}`;
  if(S.deck==='summa')return `Question ${k}`;
  if(S.deck==='decretals')return `Title ${ROMAN(+k)}`;
  return `${(DECRETUM.find(d=>d[0]===S.part)||[])[2]} ${ROMAN(+k)}`;
}
function heading(){
  if(S.deck==='sentences')return [`Book ${ROMAN(+S.part)}, Distinction ${ROMAN(+S.place)}`,''];
  if(S.deck==='summa'){const q=(D.summa[S.part]||{})[S.place]||{};return [`${(PARTS.find(p=>p[0]===S.part)||[])[1]}, Question ${S.place}`,q.t||''];}
  if(S.deck==='decretals'){const t=canon('X').titles.find(x=>String(x[0])===S.part&&String(x[1])===S.place);return [`Book ${ROMAN(+S.part)}, Title ${ROMAN(+S.place)}`,t?t[2]:''];}
  return [placeName(S.place),''];
}
function renderNav(){
  document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.deck===S.deck)));
  const parts={sentences:[['1','Book I'],['2','Book II'],['3','Book III'],['4','Book IV']],summa:PARTS.map(([k])=>[k,k]),
    decretals:['1','2','3','4','5'].map(k=>[k,`Book ${ROMAN(+k)}`]),decretum:DECRETUM.map(([k,l])=>[k,l])}[S.deck];
  $('#parts').innerHTML=parts.map(([k,l])=>`<button type="button" class="chip" data-part="${esc(k)}" aria-pressed="${k===S.part}" title="${esc(S.deck==='summa'?(PARTS.find(p=>p[0]===k)||[])[1]:l)}">${esc(l)}</button>`).join('');
  const ps=places(),i=ps.findIndex(p=>p.k===S.place);
  $('#grid').innerHTML=ps.map(p=>`<button type="button" data-place="${p.k}" aria-pressed="${p.k===S.place}" class="${p.n?'':'empty'}"${p.name?` title="${esc(p.name)}"`:''} aria-label="${esc(placeName(p.k))}${p.name?`, ${esc(p.name)}`:''}, ${p.n} ${p.n===1?'commentary':'commentaries'}">${p.k}<small>${p.n||'·'}</small></button>`).join('');
  $('#pick').textContent=S.place?`${placeName(S.place)} ▾`:`Choose a ${noun()} ▾`;
  $('#prev').disabled=i<=0;$('#next').disabled=i<0||i>=ps.length-1;
}
// THE TEXT: the place's own words, English or the original or both, with its pages marked
let TEXT=null,TEXTKEY='';
async function renderText(){
  const host=$('#text'),[h2,sub]=heading();
  if(!S.place){host.innerHTML=`<p class="muted">Choose a ${noun()} above. The number under each is how many commentaries the library holds on it.</p>`;return;}
  const key=[S.deck,S.part,S.place].join('/');
  if(TEXTKEY!==key){TEXTKEY=key;TEXT=null;host.innerHTML=`<header><div><h2>${esc(h2)}${sub?`<span class="what">${esc(sub)}</span>`:''}</h2></div></header><p class="muted">Loading the text…</p>`;
    TEXT=await J(`/v1/decks/read/${encodeURIComponent(S.deck)}/${encodeURIComponent(S.part)}/${encodeURIComponent(S.place)}.json`);if(TEXTKEY!==key)return;}
  const t=TEXT;
  const lanes=t&&t.en&&t.en.length&&t.la&&t.la.length?['en','la','both']:t&&t.la&&t.la.length?['la']:['en'];
  if(!lanes.includes(LANE))LANE=lanes[0];
  const block=(blocks,lane)=>{let last=null;return blocks.map(([hh,txt,pg])=>{let m='';if(pg!=null&&pg!==last){last=pg;m=`<a class="pg" href="${read(t.slug,pg)}">${t.slug==='pld-7607'?'col.':'p.'} ${esc(pg)}</a>`;}
    return m+(hh?`<h3 lang="${lane}">${esc(txt)}</h3>`:`<p lang="${lane}">${esc(txt)}</p>`);}).join('');};
  let body='';
  if(!t)body='<p class="muted">The text of this place is not cut yet; open it in the reader.</p>';
  else if(LANE==='both')body=`<div class="body two"><div>${block(t.en,'en')}</div><div>${block(t.la,'la')}</div></div>`;
  else body=`<div class="body">${block(LANE==='la'?t.la:t.en,LANE)}</div>`;
  const arts=S.deck==='summa'?artsBar():'';
  const open=t?`<a href="${read(t.slug,t.from)}">Open in the reader ↗</a>`:'';
  host.innerHTML=`<header><div><h2>${esc(h2)}${sub?`<span class="what">${esc(sub)}</span>`:''}</h2></div>
    <div class="lanes" role="group" aria-label="Text">${lanes.length>1?lanes.map(l=>`<button type="button" data-lane="${l}" aria-pressed="${l===LANE}">${{en:'English',la:'Latin',both:'Both'}[l]}</button>`).join(''):''}</div></header>
    ${arts}${body}<p class="more">${t&&t.to&&t.to>t.from?`Pages ${esc(t.from)}–${esc(t.to)} of the text. `:''}${open}</p>`;
  if(S.deck==='summa'&&S.art)jumpArt(S.art);
}
function artsBar(){
  const q=(D.summa[S.part]||{})[S.place]||{},aq=(D.texts.summa[S.part]||{})[S.place]||{};
  const counts={};for(const r of q.works||[]){const k=String(r[3]||0);counts[k]=(counts[k]||new Set()).add(r[0]);}
  const ks=[...new Set([...Object.keys(aq).filter(k=>k!=='0'),...Object.keys(counts).filter(k=>k!=='0')])].map(Number).sort((a,b)=>a-b);
  if(!ks.length)return '';
  return `<div class="arts" role="group" aria-label="Articles"><button type="button" class="chip" data-art="" aria-pressed="${S.art==null}">All articles</button>${ks.map(k=>`<button type="button" class="chip" data-art="${k}" aria-pressed="${String(k)===S.art}" title="${esc((aq[k]||[])[2]||'')}">Art. ${k} <small>${(counts[k]||new Set()).size}</small></button>`).join('')}</div>`;
}
function jumpArt(a){
  const re=new RegExp(`^(?:A\\.|Art\\.?|Article|ARTICULUS|Articulus)\\s*${a}\\b`);
  const el=[...document.querySelectorAll('#text .body h3,#text .body p')].find(x=>re.test(x.textContent.trim()));
  document.querySelectorAll('#text .hit').forEach(x=>x.classList.remove('hit'));
  if(el){el.classList.add('hit');el.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
}
// THE COMMENTATORS: by tradition, then by date; each one's page opens beside the text
function renderRail(){
  const host=$('#rail');
  if(!S.place){host.innerHTML='';return;}
  const by=new Map();for(const r of rowsFor()){const k=r[0];if(!by.has(k)||+r[1]<+by.get(k)[1])by.set(k,r);}
  const rows=[...by.values()].map(r=>{const w=D.texts.works[r[0]]||[];return {slug:r[0],page:r[1],head:r[2],art:r[3],a:w[0]||'',t:w[1]||r[0],vol:w[2]||'',tr:w[3]||'Other',y:w[4]||9999};}).filter(r=>r.a||r.t!==r.slug);
  const groups=[...TRADS,'Other'].map(t=>[t,rows.filter(r=>(TRADS.includes(r.tr)?r.tr:'Other')===t).sort((a,b)=>a.y-b.y||a.a.localeCompare(b.a))]).filter(([,rs])=>rs.length);
  const li=r=>`<li data-row="${esc(r.slug)}" aria-current="${Boolean(PEEK&&PEEK.slug===r.slug)}"><span class="who">${esc(r.a||'Unknown')}${r.y<9999?`<small>b. ${r.y}</small>`:''}</span><span class="work">${esc(r.t)}${r.vol?` · ${esc(r.vol)}`:''}</span>${r.head?`<span class="head">${esc(r.head)}${S.deck==='summa'&&S.art==null&&r.art?` (art. ${esc(r.art)})`:''}</span>`:''}
    <span class="acts"><button type="button" data-peek="${esc(r.slug)}" data-page="${esc(r.page)}">Read here, p. ${esc(r.page)}</button><a href="${read(r.slug,r.page)}">Open ↗</a></span></li>`;
  host.innerHTML=`<h2>Commentators</h2><p class="count">${rows.length?`${rows.length} on this ${noun()}${S.deck==='summa'&&S.art?`, article ${esc(S.art)}`:''}`:`None aligned to this ${noun()} yet`}</p><div id="peekhost"></div>${
    groups.map(([t,rs])=>`<h3 class="trad">${esc(t)} <span class="muted">${rs.length}</span></h3><ul class="rows">${rs.map(li).join('')}</ul>`).join('')}`;
  if(PEEK&&rows.some(r=>r.slug===PEEK.slug))peek(PEEK.slug,PEEK.page,false);else PEEK=null;
}
async function peek(slug,page,scroll){
  PEEK={slug,page};
  document.querySelectorAll('#rail li[data-row]').forEach(li=>li.setAttribute('aria-current',String(li.dataset.row===slug)));
  const w=D.texts.works[slug]||[],narrow=matchMedia('(max-width:980px)').matches;
  const box=document.createElement('section');box.className='peek';
  box.innerHTML=`<header><strong>${esc(w[0]||'')}, p. ${esc(page)}</strong><span><a href="${read(slug,page)}">Open in the reader ↗</a> <button type="button" data-unpeek>Close</button></span></header><div class="peekbody"><p class="muted" style="padding:.6rem .7rem">Loading the page…</p></div>`;
  document.querySelectorAll('#rail .peek').forEach(x=>x.remove());
  const host=narrow?document.querySelector(`#rail li[data-row="${CSS.escape(slug)}"]`):$('#peekhost');
  if(!host)return;host.appendChild(box);
  if(scroll)box.scrollIntoView({block:'nearest'});
  const ok=window.FRPageWindow?await window.FRPageWindow.fill(box.querySelector('.peekbody'),{slug,page,hl:''}):false;
  if(!ok)box.querySelector('.peekbody').innerHTML=`<p class="muted" style="padding:.6rem .7rem"><a href="${read(slug,page)}">Open p. ${esc(page)} in the reader</a></p>`;
}
async function render(){
  // a part with no place chosen opens on its first place, so there is always a text to read
  if(!S.place){const ps=places();const f=ps.find(p=>p.n)||ps[0];if(f){S.place=f.k;history.replaceState(null,'',`#${[S.deck,S.part,S.place].join('/')}`);}}
  renderNav();renderRail();await renderText();
}
function step(d){const ps=places(),i=ps.findIndex(p=>p.k===S.place);const n=ps[i+d];if(n){S.place=n.k;S.art=null;PEEK=null;go();}}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-deck]');if(t){S={deck:t.dataset.deck,part:FIRST[t.dataset.deck]||'1',place:null,art:null};PEEK=null;go();return;}
  const p=e.target.closest('[data-part]');if(p){S.part=p.dataset.part;S.place=null;S.art=null;PEEK=null;go();return;}
  const g=e.target.closest('[data-place]');if(g){S.place=g.dataset.place;S.art=null;PEEK=null;$('#grid').hidden=true;$('#pick').setAttribute('aria-expanded','false');go();return;}
  const a=e.target.closest('[data-art]');if(a){S.art=a.dataset.art===''?null:a.dataset.art;go();return;}
  const l=e.target.closest('[data-lane]');if(l){LANE=l.dataset.lane;try{localStorage.setItem('fr_deck_lane',LANE);}catch(_){}renderText();return;}
  const k=e.target.closest('[data-peek]');if(k){peek(k.dataset.peek,k.dataset.page,true);return;}
  if(e.target.closest('[data-unpeek]')){PEEK=null;document.querySelectorAll('#rail .peek').forEach(x=>x.remove());document.querySelectorAll('#rail li[aria-current]').forEach(li=>li.setAttribute('aria-current','false'));return;}
  if(e.target.closest('#pick')){const g2=$('#grid');g2.hidden=!g2.hidden;$('#pick').setAttribute('aria-expanded',String(!g2.hidden));return;}
  if(e.target.closest('#prev')){step(-1);return;}
  if(e.target.closest('#next')){step(1);}
});
document.addEventListener('keydown',e=>{
  if(e.target.closest&&e.target.closest('input,textarea,select,[contenteditable]'))return;
  if(e.key==='ArrowLeft'&&!e.metaKey&&!e.ctrlKey&&!e.altKey){step(-1);}
  else if(e.key==='ArrowRight'&&!e.metaKey&&!e.ctrlKey&&!e.altKey){step(1);}
  else if(e.key==='Escape'&&!$('#grid').hidden){$('#grid').hidden=true;$('#pick').setAttribute('aria-expanded','false');}
});
window.addEventListener('hashchange',()=>{state();render();});
Promise.all([fetch(`${BLOB}/v1/sentences.json${VER}`).then(r=>r.json()),fetch(`${BLOB}/v1/summa.json${VER}`).then(r=>r.json()),fetch(`${BLOB}/v1/decks/texts.json${VER}`).then(r=>r.json()),
  fetch(`${BLOB}/v1/decks/canon.json${VER}`).then(r=>r.ok?r.json():null).catch(()=>null)])
  .then(([sent,summa,texts,canonD])=>{if(canonD)texts.works={...canonD.works,...texts.works};D={sent,summa,texts,canon:canonD};state();render();})
  .catch(()=>{$('#text').innerHTML='<p class="muted">The decks could not be loaded. Reload the page to try again.</p>';});
