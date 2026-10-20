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
let S={deck:'sentences',part:'1',place:null,art:null},D=null;
function state(){const h=decodeURIComponent(location.hash.slice(1)).split('/');
  if(h[0]==='summa')S={deck:'summa',part:PARTS.some(([k])=>k===h[1])?h[1]:'Ia',place:h[2]||null,art:h[3]!=null?h[3]:null};
  else if(h[0]==='decretals')S={deck:'decretals',part:['1','2','3','4','5'].includes(h[1])?h[1]:'1',place:h[2]||null,art:null};
  else if(h[0]==='decretum')S={deck:'decretum',part:DECRETUM.some(([k])=>k===h[1])?h[1]:'D',place:h[2]||null,art:null};
  else S={deck:'sentences',part:['1','2','3','4'].includes(h[1])?h[1]:'1',place:h[2]||null,art:null};}
function go(){location.hash=[S.deck,S.part,S.place,S.art].filter(x=>x!=null&&x!=='').join('/');}
// the canon-law decks (v1/decks/canon.json): X = the Decretals by [book, title], D = the Decretum by [run, number]; landings {slug: page}
const canon=k=>((D.canon||{})[k])||{titles:[],places:[],landings:{}};
function noun(){return {sentences:'distinction',summa:S.art?'article':'question',decretals:'title',decretum:S.part==='C'?'causa':'distinction'}[S.deck];}
function places(){
  if(S.deck==='decretals'){const L=canon('X');
    return L.titles.filter(t=>String(t[0])===S.part).map(t=>({k:String(t[1]),n:Object.keys(L.landings[`${t[0]}.${t[1]}`]||{}).length,name:t[2]}));}
  if(S.deck==='decretum'){const L=canon('D');
    return L.places.filter(x=>x[0]===S.part).map(x=>({k:String(x[1]),n:Object.keys(L.landings[`${x[0]}.${x[1]}`]||{}).length,name:x[2]}));}
  if(S.deck==='sentences'){const g=D.sent[S.part]||{},max={'1':48,'2':44,'3':40,'4':50}[S.part];
    return Array.from({length:max},(_,i)=>String(i+1)).map(k=>({k,n:new Set((g[k]||[]).map(r=>r[0])).size}));}
  const g=D.summa[S.part]||{},ks=Object.keys(g).filter(k=>/^\d+$/.test(k)).map(Number).sort((a,b)=>a-b);
  return ks.map(k=>({k:String(k),n:new Set(((g[k]||{}).works||[]).map(r=>r[0])).size}));
}
function rowsFor(){
  if(S.deck==='decretals'||S.deck==='decretum')return Object.entries(canon(S.deck==='decretals'?'X':'D').landings[`${S.part}.${S.place}`]||{}).map(([slug,p])=>[slug,p,'',0]);
  if(S.deck==='sentences')return (D.sent[S.part]||{})[S.place]||[];
  const q=(D.summa[S.part]||{})[S.place]||{},ws=q.works||[];
  return S.art==null?ws:ws.filter(r=>String(r[3]||0)===String(S.art));
}
function render(){
  document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.deck===S.deck)));
  const parts={sentences:[['1','Book I'],['2','Book II'],['3','Book III'],['4','Book IV']],summa:PARTS.map(([k])=>[k,k]),
    decretals:['1','2','3','4','5'].map(k=>[k,`Book ${ROMAN(+k)}`]),decretum:DECRETUM.map(([k,l])=>[k,l])}[S.deck];
  $('#parts').innerHTML=parts.map(([k,l])=>`<button type="button" data-part="${esc(k)}" aria-pressed="${k===S.part}" title="${esc(S.deck==='summa'?(PARTS.find(p=>p[0]===k)||[])[1]:l)}">${esc(l)}</button>`).join('');
  const ps=places(),N=noun(),cap=N[0].toUpperCase()+N.slice(1);
  $('#grid').setAttribute('aria-label',{sentences:'Distinctions',summa:'Questions',decretals:'Titles',decretum:(DECRETUM.find(d=>d[0]===S.part)||[])[1]}[S.deck]);
  $('#grid').innerHTML=ps.map(p=>`<button type="button" data-place="${p.k}" aria-pressed="${p.k===S.place}" class="${p.n?'':'empty'}"${p.name?` title="${esc(p.name)}"`:''} aria-label="${cap} ${p.k}${p.name?`, ${esc(p.name)}`:''}, ${p.n} ${p.n===1?'commentary':'commentaries'}">${p.k}<small>${p.n||'·'}</small></button>`).join('');
  const host=$('#place');
  if((S.deck==='decretals'||S.deck==='decretum')&&!D.canon){host.innerHTML='<p class="muted">The canon-law decks could not be loaded. Reload the page to try again.</p>';return;}
  if(!S.place){host.innerHTML=`<p class="muted">Choose a ${N}. The number under each is how many commentaries the library holds on it.</p>`;return;}
  let head='',text='',arts='';
  if(S.deck==='decretals'){
    const L=canon('X'),t=L.titles.find(x=>String(x[0])===S.part&&String(x[1])===S.place);
    head=`Book ${ROMAN(+S.part)}, Title ${ROMAN(+S.place)}${t?`<span class="what" style="display:block;font-size:1.05rem">${esc(t[2])}</span>`:''}`;
    text=t?`<a class="text-link" href="${read(L.text,t[3])}">Read the title in the Decretals</a>`:'';
  }else if(S.deck==='decretum'){
    const L=canon('D'),x=L.places.find(y=>y[0]===S.part&&String(y[1])===S.place);
    head=`${(DECRETUM.find(d=>d[0]===S.part)||[])[2]} ${ROMAN(+S.place)}`;
    text=x?`<a class="text-link" href="${read(L.text,x[3])}">Read Gratian</a>`:'';
  }else if(S.deck==='sentences'){
    head=`Book ${ROMAN(+S.part)}, Distinction ${ROMAN(+S.place)}`;
    const t=(D.texts.sentences[S.part]||{})[S.place];
    text=t?`<a class="text-link" href="${read(t[0],t[1])}">Read Lombard's distinction</a>`:'';
  }else{
    const q=(D.summa[S.part]||{})[S.place]||{},aq=(D.texts.summa[S.part]||{})[S.place]||{};
    head=`${(PARTS.find(p=>p[0]===S.part)||[])[1]}, Question ${S.place}${q.t?`<span class="what" style="display:block;font-size:1.05rem">${esc(q.t)}</span>`:''}`;
    const a=S.art&&S.art!=='0'?aq[S.art]:(aq['1']||aq['0']);
    text=a?`<a class="text-link" href="${read(a[0],a[1])}">Read Aquinas, ${S.art&&S.art!=='0'?`article ${S.art}`:'the question'}</a>`:'';
    const counts={};for(const r of q.works||[]){const k=String(r[3]||0);counts[k]=(counts[k]||new Set()).add(r[0]);}
    const artKeys=[...new Set([...Object.keys(aq).filter(k=>k!=='0'),...Object.keys(counts).filter(k=>k!=='0')])].map(Number).sort((a,b)=>a-b);
    if(artKeys.length)arts=`<div class="arts" role="group" aria-label="Articles"><button type="button" data-art="" aria-pressed="${S.art==null}">All</button><button type="button" data-art="0" aria-pressed="${S.art==='0'}">The question as a whole <small>${(counts['0']||new Set()).size}</small></button>${artKeys.map(k=>`<button type="button" data-art="${k}" aria-pressed="${String(k)===S.art}" title="${esc((aq[k]||[])[2]||'')}">Art. ${k} <small>${(counts[k]||new Set()).size}</small></button>`).join('')}</div>${
      S.art&&S.art!=='0'&&aq[S.art]?`<p class="what">${esc(aq[S.art][2])}</p>`:''}`;
  }
  // one row per work at its first page; by tradition, then by date
  const by=new Map();for(const r of rowsFor()){const k=r[0];if(!by.has(k)||+r[1]<+by.get(k)[1])by.set(k,r);}
  const rows=[...by.values()].map(r=>{const w=D.texts.works[r[0]]||[];return {slug:r[0],page:r[1],head:r[2],art:r[3],a:w[0]||'',t:w[1]||r[0],vol:w[2]||'',tr:w[3]||'Other',y:w[4]||9999};});
  const groups=[...TRADS,'Other'].map(t=>[t,rows.filter(r=>(TRADS.includes(r.tr)?r.tr:'Other')===t).sort((a,b)=>a.y-b.y||a.a.localeCompare(b.a))]).filter(([,rs])=>rs.length);
  const li=r=>`<li><span class="who">${esc(r.a||'Unknown')}</span><span class="work">${esc(r.t)}${r.vol?` · ${esc(r.vol)}`:''}</span>${r.head?`<span class="head">${esc(r.head)}${S.deck==='summa'&&S.art==null&&r.art?` (art. ${esc(r.art)})`:''}</span>`:''}<a class="read" href="${read(r.slug,r.page)}">Read p. ${esc(r.page)}</a></li>`;
  host.innerHTML=`<h2>${head}</h2>${text}${arts}${groups.length?groups.map(([t,rs])=>`<h3 class="trad">${esc(t)} <span class="muted">${rs.length}</span></h3><ul class="rows">${rs.map(li).join('')}</ul>`).join('')
    :`<p class="muted">No commentary on this ${N} is aligned yet.</p>`}`;
}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-deck]');if(t){S={deck:t.dataset.deck,part:FIRST[t.dataset.deck]||'1',place:null,art:null};go();return;}
  const p=e.target.closest('[data-part]');if(p){S.part=p.dataset.part;S.place=null;S.art=null;go();return;}
  const g=e.target.closest('[data-place]');if(g){S.place=g.dataset.place;S.art=null;go();$('#place').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});return;}
  const a=e.target.closest('[data-art]');if(a){S.art=a.dataset.art===''?null:a.dataset.art;go();}
});
window.addEventListener('hashchange',()=>{state();render();});
Promise.all([fetch(`${BLOB}/v1/sentences.json${VER}`).then(r=>r.json()),fetch(`${BLOB}/v1/summa.json${VER}`).then(r=>r.json()),fetch(`${BLOB}/v1/decks/texts.json${VER}`).then(r=>r.json()),
  fetch(`${BLOB}/v1/decks/canon.json${VER}`).then(r=>r.ok?r.json():null).catch(()=>null)])
  .then(([sent,summa,texts,canon])=>{if(canon)texts.works={...canon.works,...texts.works};D={sent,summa,texts,canon};state();render();})
  .catch(()=>{$('#place').innerHTML='<p class="muted">The decks could not be loaded. Reload the page to try again.</p>';});
