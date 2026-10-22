/* Maps of the tradition: ported from The Faith Received (tools/prdl_reader_prototype/maps.html, 2026-10-21); the data from the library worker, links into the reader on this site. */
window.__FR_BLOB_BASE__=window.__FR_BLOB_BASE__||"https://mo-tfr-library.mo-podcast-feed.workers.dev";
window.__FR_READER_PATH__=window.__FR_READER_PATH__||"/the-faith-received/read/";
const BASE=(window.__FR_BLOB_BASE__||'').replace(/\/$/,'');
const $=s=>document.querySelector(s),esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const J=u=>fetch(u).then(r=>r.ok?r.json():null).catch(()=>null);
const READER=(window.__FR_READER_PATH__||'/read');
const read=(w,p)=>`${READER}?w=${encodeURIComponent(w)}#b${encodeURIComponent(p)}-0`;
/* AUTHOR DATES (2026-10-22, owner: "date authors please"). v1/enrich/author_dates.json (tools/topic_graphics/build_author_dates.py) gives
   a year for every author the library can date, keyed by the names the pages spell and their other spellings. A holder the map leaves
   undated (y 9999) takes his year and dates from it when his question loads, so his row says when he wrote, his tradition's list runs in
   order, and the diagram places him at his year instead of in the undated row. Without the key the map draws as before. */
const DATES_P=J(`${BASE}/v1/enrich/author_dates.json?v=${encodeURIComponent(window.__FR_VER||'1')}`).then(k=>{
  const by=(k&&k.authors)||{},fold=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,''),f=new Map();
  for(const [n,r] of Object.entries(by))for(const x of [n].concat(r.aliases||[])){const key=fold(x);if(key&&!f.has(key))f.set(key,r);}
  return n=>by[n]||f.get(fold(n))||null;
});
function fillDates(d,dateOf){
  if(!d||!dateOf)return d;
  for(const h of [...(d.positions||[]).flatMap(p=>[...(p.holders||[]),...(p.first?[p.first]:[])]),...(d.unplaced||[])]){
    const y=Number(h.y);if(y>0&&y<9999)continue;
    const r=dateOf(h.author);if(!r||!(Number(r.y)>0))continue;
    h.y=Number(r.y);if(!h.dates)h.dates=r.dates||String(r.y);
  }
  return d;
}
/* THE PAGE PREVIEW (2026-10-22, owner: "make it easy to preview things in the controversies, indices, etc"). A page reference keeps
   its link to the reader and gains a Preview that opens the page itself under its row: the page window (page-window.js) shows the
   cited page with the passage marked, the page before and after, and English, the source text or both. A Father in Migne or an
   EEBO book, which the page window cannot read, is read by the Scripture page's reader of them (FRCommentaryText, commentary-pane.js,
   loaded on the first such preview with its pane left off), in the same markup. Failing both, the button turns into the reader link;
   never the reader in a frame. One preview a column (cfg.col): opening another there closes it; Escape closes it. The same block on
   the controversies, the maps, the atlas, the shared questions and the set indexes, and in Mere Orthodoxy's ports of them (where
   cfg.text is empty, so a Father in Migne opens the reader). */
const PVW=(cfg=>{
  const FAMILY=/^(?:pld|pg|po|eebo)-\d+$/,NONE=new Set(),OPEN=[];
  let seq=0,text=null;
  const at=(w,p)=>`${/^(?:pld|pg)-/.test(w)?'col.':'p.'} ${p}`;
  const can=w=>!FAMILY.test(w)||!!cfg.text;
  const reader=()=>text||(text=window.FRCommentaryText?Promise.resolve(window.FRCommentaryText):new Promise(res=>{
    window.FR_COMMENTARY_PANE=false;const s=document.createElement('script');s.src=cfg.text;
    s.onload=()=>res(window.FRCommentaryText||null);s.onerror=()=>res(null);document.head.appendChild(s);}));
  async function fill(el,w,p,hl){
    try{
      if(FAMILY.test(w)){const T=cfg.text?await reader():null;return T?await T.fill(el,{slug:w,page:p}):false;}
      return window.FRPageWindow?await window.FRPageWindow.fill(el,{slug:w,page:p,hl}):false;
    }catch(_){return false;}
  }
  const link=(w,p)=>`<a class="pvb" href="${esc(cfg.read(w,p))}" target="_blank" rel="noopener">Open in the reader</a>`;
  /* the button after a page link: w the work, p the page, hl the passage's own words to mark, ps every page the row cites there */
  function btn(w,p,hl,ps){
    if(!w||p==null||p==='')return '';
    if(!can(w)||NONE.has(`${w}|${p}`))return link(w,p);
    return `<button type="button" class="pvb" data-pv="${esc(w)}|${esc(p)}"${hl?` data-pv-hl="${esc(String(hl).slice(0,400))}"`:''}${ps&&ps.length>1?` data-pv-pages="${esc(ps.join(','))}"`:''} aria-expanded="false" aria-label="Preview ${esc(at(w,p))}">Preview</button>`;
  }
  /* an index's page number: the number itself opens its page here; with a modifier key it opens the reader, as a link does */
  function loc(w,p){
    const href=esc(cfg.read(w,p));
    return can(w)&&!NONE.has(`${w}|${p}`)?`<a class="pvl" href="${href}" data-pv="${esc(w)}|${esc(p)}" aria-expanded="false">${esc(p)}</a>`:`<a href="${href}">${esc(p)}</a>`;
  }
  function close(box,focus){
    if(!box)return false;
    const i=OPEN.indexOf(box);if(i>=0)OPEN.splice(i,1);
    const t=box._t,was=box.isConnected;box.remove();
    if(t&&t.isConnected){
      t.removeAttribute('aria-controls');
      if(t.dataset.pv)t.setAttribute('aria-expanded','false');else t.removeAttribute('aria-expanded');
      if(focus)t.focus();
    }
    return was;
  }
  async function show(box,w,p){
    const t=box._t,hl=((t.closest('[data-pv-hl]')||{}).dataset||{}).pvHl||'',body=document.createElement('div');
    body.className='pvw-body';body.innerHTML='<p class="pw-wait" role="status">Loading the page…</p>';
    box.querySelector('.pvw-body').replaceWith(body);
    box.querySelector('.pvw-at').textContent=at(w,p);box.querySelector('.pvw-open').href=cfg.read(w,p);
    box.querySelectorAll('[data-pv-page]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pvPage===String(p))));
    const ok=await fill(body,w,p,hl);
    if(!body.isConnected)return;
    if(ok){box.scrollIntoView({block:'nearest'});return;}
    NONE.add(`${w}|${p}`);
    if(t.tagName==='BUTTON'&&!box.querySelector('[data-pv-page]')){
      const a=document.createElement('a'),had=box.contains(document.activeElement)||document.activeElement===t;
      a.className='pvb';a.href=cfg.read(w,p);a.target='_blank';a.rel='noopener';a.textContent='Open in the reader';
      close(box,false);t.replaceWith(a);if(had)a.focus();return;
    }
    if(t.tagName==='A')t.removeAttribute('data-pv');
    body.innerHTML=`<p class="pw-wait">This page cannot be shown here. <a href="${esc(cfg.read(w,p))}" target="_blank" rel="noopener">Open ${esc(at(w,p))} in the reader ↗</a></p>`;
  }
  function open(t){
    const [w,p]=t.dataset.pv.split('|'),host=t.closest(cfg.host)||t.closest('div,section,article,li,figure')||t.parentElement,col=t.closest(cfg.col);
    const was=OPEN.some(b=>b.isConnected&&b._t===t);
    for(const b of OPEN.slice())if(!b.isConnected||b.closest(cfg.col)===col)close(b,false);
    if(was)return;
    const ps=(t.dataset.pvPages||'').split(',').filter(Boolean),box=document.createElement('div');
    box.className='pvw';box.id=`pvw-${++seq}`;box._t=t;box.setAttribute('aria-live','off');
    box.innerHTML=`<div class="pvw-head"><span class="pvw-at"></span>${ps.length>1?`<span class="pvw-pp" role="group" aria-label="The pages cited">${ps.map(x=>`<button type="button" data-pv-page="${esc(x)}" aria-pressed="false">${esc(x)}</button>`).join('')}</span>`:''}<a class="pvw-open" target="_blank" rel="noopener">Open in the reader ↗</a><button type="button" class="pvw-x" data-pv-close>Close preview</button></div><div class="pvw-body"></div>`;
    host.appendChild(box);t.setAttribute('aria-expanded','true');t.setAttribute('aria-controls',box.id);OPEN.push(box);
    show(box,w,p);
  }
  document.addEventListener('click',e=>{
    const x=e.target.closest('[data-pv-close]');if(x){close(x.closest('.pvw'),true);return;}
    const n=e.target.closest('[data-pv-page]');if(n){const box=n.closest('.pvw');if(box&&box._t&&box._t.dataset.pv)show(box,box._t.dataset.pv.split('|')[0],n.dataset.pvPage);return;}
    const t=e.target.closest('[data-pv]');
    if(!t||(t.tagName==='A'&&(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button!==0)))return;
    e.preventDefault();open(t);
  });
  return {btn,loc,can,escape(){const a=document.activeElement,box=(a&&a.closest&&a.closest('.pvw'))||OPEN.filter(b=>b.isConnected).pop();return close(box,true);}};
})({read,col:'#m',host:'.hr,.tps>li,.pth',text:''});
const ATLAS='/the-faith-received/disputed-questions/';
const ord=n=>n+(n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][Math.min(n%10,4)]||'th');
/* the shelves' colours: one a tradition, the same in the legend, the dots and the lists; a shelf not named falls to grey */
const COL={'Greek Fathers':'#2E6E8E','Latin Fathers':'#7A4E9B','Eastern Fathers':'#5E8C61','Byzantine':'#1F8A7A','Medieval':'#B07B2A','Lutheran':'#C1593C','Reformed':'#2F7D4F','Continental Reformed':'#2F7D4F','Roman Catholic':'#A63D5A','English Divines':'#3B5BA5','Humanism and Law':'#8C7B5C'};
const col=t=>COL[t]||'#7A7A76';
const fmt=n=>Number(n||0).toLocaleString('en-US');
const KINDS=[['refutes','Refutes','k'],['develops','Develops','k'],['follows','Follows','k'],['distinguishes','Distinguishes','k dash'],['reconciles','Reconciles','k dot']];
const SHOWN=6;
let IX=null,D=null,CUR=null,TRAD=new Set(),FOLD=0;const KIND=new Set(KINDS.map(k=>k[0]));
/* THE REFORMED AND LUTHERAN METAPHYSICIANS (2026-10-22, owner: "metaphysics is something that reformed and lutherans get into although
   they take the paths largely done by scotists thomists etc, this part of the map"). v1/enrich/controversies/paths/<debate>.json gives,
   under a question, the Reformed and Lutheran metaphysicians who answer it (Timpler, Alsted, Burgersdijk, Heereboord, Goclenius,
   Scheibler, Martini, Calov, Meisner) and the path each takes: the Thomists', the Scotists', Suárez's, the Nominalists' or his own. One
   who follows a school stands with the one position that holds the most of that school's authors here, by the school map of the
   controversies (SCHOOLS and SAME, copied from controversies.html); a follower of Suárez with Suárez where the map places him once. One
   whose school the map divides evenly, or does not place, and one who goes his own way, are named under the question's head. Each name
   opens his page in the page window; one placed with a position is drawn on the diagram as a ring at his birth year (the works' year,
   as an author's y here is his birth year), in his tradition's colour, switched by the legend. */
const PATH_FILES=['thomists-scotists'];
const SCHOOLS={"Thomist":["Thomas Aquinas","Johannes Capreolus","Thomas Cajetan","Sylvester of Ferrara","Domingo Báñez","John of St. Thomas","Poinsot / John of St. Thomas","Jean-Baptiste Gonet","Charles René Billuart","Domingo de Soto","Francisco de Vitoria","Melchior Cano","Salamanticenses","Vincent Contenson","Antoine Goudin","Thomas of Strasbourg"],"Scotist":["John Duns Scotus","Juan de Rada","Johannes Maria Zamora","Claude Frassen","Bartolomeo Mastri","Francis of Meyronnes","Antonius Andreas","William of Vaurouillon","Hugh Cavellus","Luke Wadding","John Punch","Francis Lychetus"],"Nominalist":["William of Ockham","Gabriel Biel","Gregory of Rimini","Pierre d'Ailly","Adam Wodeham","Marsilius of Inghen"],"Jesuit":["Francisco Suárez","Gabriel Vásquez","Luis de Molina","Robert Bellarmine","Leonard Lessius","Martin Becanus","Juan de Lugo","Diego Laínez","Alfonso Salmerón","Francisco de Toledo","Martínez de Ripalda","Jakob Gretser","Adam Tanner","Gregory of Valencia"],"Augustinian":["Giles of Rome","Gregory of Rimini","Cornelius Jansen","Henry Noris","Lorenzo Berti"],"Other medieval":["Durand of Saint-Pourçain","Peter Aureol","Henry of Ghent","Godfrey of Fontaines","Richard of Middleton","Bonaventure","Albertus Magnus","Alexander of Hales"]};
const SAME={'John of St. Thomas':'Poinsot / John of St. Thomas','Juan de Rada':'Juan de Rada Obs.','Bartolomeo Mastri':'Mastri / Mastrius','Melchior Cano':'Melchor Cano','Albertus Magnus':'Albert the Great','Lorenzo Berti':'Giovanni Lorenzo Berti','Henry Noris':'Enrico Noris'};
const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const pkey=n=>fold(SAME[n]||n);
const SCHOOL_OF=new Map();for(const [s,ns] of Object.entries(SCHOOLS))for(const n of ns)SCHOOL_OF.set(pkey(n),s);
const SUAREZ=pkey('Francisco Suárez');
/* a path: the school it follows here, and how a sentence says it (one man, several) */
const PATH={thomist:{s:'Thomist',one:'follows',many:'follow',whom:'the Thomists'},scotist:{s:'Scotist',one:'follows',many:'follow',whom:'the Scotists'},suarezian:{s:'Jesuit',one:'follows',many:'follow',whom:'Suárez',school:true},nominalist:{s:'Nominalist',one:'stands with',many:'stand with',whom:'the Nominalists'}};
const PATH_LABEL={thomist:'follows the Thomists',scotist:'follows the Scotists',suarezian:'follows Suárez',nominalist:'with the Nominalists',own:'his own way'};
const PATH_NOTE='The Reformed and Lutheran metaphysicians are read by machine from their own pages, with the path each takes: one who follows a school stands with the position that holds the most of its authors here (a follower of Suárez with Suárez), a ring at his birth year on the diagram; one whose school this map divides, or who goes his own way, is named under the question.';
const PQ=new Map(),PW={};let PL=null,RINGS=[],RING=true;
const PATHS_P=Promise.all(PATH_FILES.map(id=>J(`${BASE}/v1/enrich/controversies/paths/${encodeURIComponent(id)}.json?v=${Date.now()}`))).then(fs=>{
  for(const f of fs){if(!f||!f.questions||typeof f.questions!=='object')continue;Object.assign(PW,f.works||{});for(const [q,es] of Object.entries(f.questions)){if(!PQ.has(q))PQ.set(q,[]);PQ.get(q).push(...(es||[]));}}
});
const pyear=e=>{const y=Number((PW[e.slug]||[])[4]);return y>0&&y<2000?y:0;};
const ptrad=e=>e.tradition||(PW[e.slug]||[])[3]||'';
const NUM=['no','one','two','three','four','five','six','seven','eight','nine'];
/* where each stands on this map: the position that alone holds the most authors of his school (a follower of Suárez, the one position
   that holds Suárez); else under the question's head, with the number of positions his school is divided among (0: not placed) */
function placePaths(d){
  const es=(PQ.get(d.id)||[]).filter(e=>e.path==='own'||PATH[e.path]).slice().sort((a,b)=>(pyear(a)||9999)-(pyear(b)||9999)||String(a.author).localeCompare(String(b.author)));
  const tally=d.positions.map(p=>{const c=new Map(),seen=new Set(),who=new Set();let su=false;
    for(const h of p.holders){const k=pkey(h.author);who.add(k);if(k===SUAREZ)su=true;const s=SCHOOL_OF.get(k);if(s&&!seen.has(k)){seen.add(k);c.set(s,(c.get(s)||0)+1);}}
    return {c,su,who};});
  const at=d.positions.map(()=>[]),top=[];
  for(const e of es){
    if(e.path==='own'){top.push({e,n:-1});continue;}
    if(e.path==='suarezian'){const ks=tally.map((t,k)=>t.su?k:-1).filter(k=>k>=0);if(ks.length===1){at[ks[0]].push(e);continue;}}
    const ns=tally.map(t=>t.c.get(PATH[e.path].s)||0),max=Math.max(0,...ns),ks=ns.map((n,k)=>n===max?k:-1).filter(k=>k>=0);
    if(max>0&&ks.length===1)at[ks[0]].push(e);else top.push({e,n:max>0?ks.length:0});
  }
  return {at,top,tally};
}
const andList=xs=>xs.length<3?xs.join(' and '):`${xs.slice(0,-1).join(', ')} and ${xs[xs.length-1]}`;
/* a name, or a work's title: it opens his page in the page window (with a modifier key, the reader) */
function plink(e,text){
  const t=(PW[e.slug]||[])[1]||'',where=`${t}${t?', ':''}p. ${e.page}`;
  return `<a class="pvl" href="${read(e.slug,e.page)}" data-pv="${esc(e.slug)}|${esc(e.page)}"${e.quote?` data-pv-hl="${esc(String(e.quote).slice(0,400))}"`:''} aria-expanded="false" title="${esc(where)}" aria-label="${esc(`${e.author}, ${ptrad(e)}: ${where}`)}">${esc(text)}</a>`;
}
/* a man in a sentence: his name; a man there from two works also names each work, and each opens its own page */
const pman=es=>`${plink(es[0],es[0].author)}${es.length>1?` <span class="pth-w">(${es.map(e=>plink(e,(PW[e.slug]||[])[1]||`p. ${e.page}`)).join(', ')})</span>`:''}`;
/* one sentence a path: "Scheibler and Martini follow the Scotists." The head's add how the map divides the school, or that it does not place it */
function pathSentence(es,path,n){
  const by=new Map();for(const e of es){if(!by.has(e.author))by.set(e.author,[]);by.get(e.author).push(e);}
  const names=andList([...by.values()].map(pman)),many=by.size>1;
  if(path==='own')return `${names} ${many?'go their own way':'goes his own way'}.`;
  const P=PATH[path],split=n==null||n<0?'':n===0?`, ${P.school?'whose school':'whom'} this map does not place`:`, ${P.school?'whose school':'whom'} this map divides ${n===2?'between':'among'} ${NUM[n]||n} positions`;
  return `${names} ${many?P.many:P.one} ${P.whom}${split}.`;
}
/* the note's row, for a .lab list: its label and its sentences */
function pthHTML(groups,placed){
  const es=groups.flatMap(g=>g.es);if(!es.length)return '';
  const trads=[...new Set(es.map(ptrad))].join('|');
  return `<div class="pth"${placed?' data-placed=""':''} data-trads="${esc(trads)}"><dt>Reformed and Lutheran</dt><dd class="pth-t">${groups.map(g=>pathSentence(g.es,g.path,g.n)).join(' ')}</dd></div>`;
}
/* the groups of a line: a path, or for the head a path and how the map divides its school, in the paths' order */
function pathGroups(items){
  const order=['thomist','scotist','suarezian','nominalist','own'],m=new Map();
  for(const {e,n} of items){const k=`${e.path}|${n==null?'':n}`;if(!m.has(k))m.set(k,{path:e.path,n,es:[]});m.get(k).es.push(e);}
  return [...m.values()].sort((a,b)=>order.indexOf(a.path)-order.indexOf(b.path)||(a.n||0)-(b.n||0));
}
const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0)/4294967295};
const citedOf=h=>h.cited||(h.cite?[h.cite]:[]);
/* a holder's dates as the data gives them; a bare year only when it is a real one (9999 marks no date) */
const yrOf=h=>h.dates||(Number(h.y)>0&&Number(h.y)<9999?String(h.y):'');
/* the pages an answer stands on, a line a work: "p. 446", or "pp. 17, 18"; each opens the reader in a new tab, and the line's Preview
   opens its first page here (the others are in the preview's head) */
function pagesHTML(cited){
  const by=new Map();for(const [w,p,t] of cited){if(!by.has(w))by.set(w,{t:t||w,ps:[]});const g=by.get(w);if(!g.ps.includes(p))g.ps.push(p);}
  return [...by.entries()].map(([w,{t,ps}])=>ps.length===1
    ?`<span class="pp"><a class="pg" href="${read(w,ps[0])}" target="_blank" rel="noopener" title="${esc(t)}" aria-label="${esc(t)}, page ${esc(ps[0])}, opens the reader">p. ${esc(ps[0])}</a>${PVW.btn(w,ps[0])}</span>`
    :`<span class="pp" title="${esc(t)}">pp. ${ps.map(p=>`<a class="pg" href="${read(w,p)}" target="_blank" rel="noopener" aria-label="${esc(t)}, page ${esc(p)}, opens the reader">${esc(p)}</a>`).join(', ')}${PVW.btn(w,ps[0],'',ps)}</span>`).join('');
}
/* ONE ROW, the same here and in the atlas: who (name, dates) | his claim, and the work it stands in | the pages, at the right */
function rowHTML(h,k){
  const c=citedOf(h),works=[...new Set(c.map(x=>x[2]||x[0]))];
  return `<li class="hr"${k>=SHOWN?' hidden':''}><span class="h-who">${esc(h.author)}${yrOf(h)?`<small>${esc(yrOf(h))}</small>`:''}</span><span class="h-line">${esc(h.line)}${works.length?`<small class="h-src">${works.map(esc).join('; ')}</small>`:''}</span><span class="h-pg">${pagesHTML(c)}</span></li>`;
}
/* a list longer than six rows shows six and folds the rest behind "Show all N" */
function foldHTML(items,row,cls){
  const id=`fold${++FOLD}`;
  return `<ol class="${cls}" id="${id}">${items.map(row).join('')}</ol>${items.length>SHOWN?`<button type="button" class="more" aria-expanded="false" aria-controls="${id}" data-n="${items.length}">Show all ${items.length}</button>`:''}`;
}
function byTradition(hs){
  const by=new Map();for(const h of hs){const k=h.tradition||'Other';if(!by.has(k))by.set(k,[]);by.get(k).push(h);}
  return [...by.entries()].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0])).map(([t,xs])=>[t,xs.sort((a,b)=>(Number(a.y)||9999)-(Number(b.y)||9999))]);
}
function holdersHTML(hs){
  return byTradition(hs).map(([t,xs])=>`<section class="tg" data-trad="${esc(t)}"><h4><i class="sw" style="--c:${col(t)}" aria-hidden="true"></i>${esc(t)}<span class="ct"><span class="sr">, </span>${xs.length}</span></h4>${foldHTML(xs,rowHTML,'hl')}</section>`).join('');
}
/* A POSITION (2026-10-22, owner of the old block: "slop garbage, organize, apply design principles"): its name and its share of the
   authors who answer the question; that share as a bar in the traditions' colours, the traditions named under it with their counts
   (a colour never stands alone); the thesis; what it turns on and its earliest holder; then its authors by tradition behind one fold,
   open when there are six or fewer. "Not placed" takes the same block with its own note in place of a thesis. */
function profileHTML(hs,total){
  const tr=byTradition(hs),share=total?hs.length/total:1;
  return `<div class="pf"><span class="pf-bar" role="img" aria-label="${esc(`${fmt(hs.length)} of ${fmt(total)} authors: ${tr.map(([t,xs])=>`${t} ${xs.length}`).join(', ')}`)}"><span class="pf-fill" style="width:${Math.max(1.5,Math.min(1,share)*100).toFixed(1)}%">${tr.map(([t,xs])=>`<i style="flex-grow:${xs.length};--c:${col(t)}"></i>`).join('')}</span></span>
    <p class="pf-tr">${tr.map(([t,xs])=>`<span><i class="sw" style="--c:${col(t)}" aria-hidden="true"></i>${esc(t)}<span class="ct">${xs.length}</span></span>`).join('')}</p></div>`;
}
function positionHTML(id,label,hs,total,body,k){
  const n=hs.length,rl0=PL&&k!=null&&PL.at[k]?pthHTML(pathGroups(PL.at[k].map(e=>({e}))),true):'',rl=rl0?`<dl class="lab pth-dl">${rl0}</dl>`:'';
  return `<section class="sec pos" aria-labelledby="pos-${esc(id)}"><header class="pos-h"><h3 id="pos-${esc(id)}">${esc(label)}</h3><span class="ct">${fmt(n)} of ${fmt(total)} authors</span></header>
    ${profileHTML(hs,total)}${body}
    <details class="hold"${n<=6?' open':''}><summary>${n===1?'The author':`The ${fmt(n)} authors`}, by tradition</summary>${holdersHTML(hs)}</details>${rl}</section>`;
}
function posName(d,id){return (d.positions.find(p=>p.id===id)||{}).label||'';}
function endHTML(d,e){
  if(e.author)return `<span class="r-e">${esc(e.author)}${e.dates?`<small>${esc(e.dates)}</small>`:''}</span>`;
  return `<span class="r-e"><i>The position</i> ${esc(posName(d,e.position))}</span>`;
}
function relationsHTML(d){
  const groups=KINDS.map(([k,l])=>[k,l,d.relations.filter(r=>r.kind===k)]).filter(([,,rs])=>rs.length);
  const rest=d.relations.filter(r=>!KINDS.some(k=>k[0]===r.kind));if(rest.length)groups.push(['other','Other',rest]);
  return `<section class="sec" aria-labelledby="sec-rel"><h3 id="sec-rel">The lines between them<span class="ct"><span class="sr">, </span>${d.relations.length}</span></h3>${groups.map(([k,l,rs])=>`<section class="rk"><h4><i class="lk ${esc(k)}" aria-hidden="true"></i>${esc(l)}<span class="ct"><span class="sr">, </span>${rs.length}</span></h4>${foldHTML(rs,(r,i)=>`<li class="rr"${i>=SHOWN?' hidden':''}>${endHTML(d,r.from)}<span class="r-to" aria-hidden="true">→</span><span class="sr">${esc(l.toLowerCase())}</span>${endHTML(d,r.to)}${r.note?`<span class="r-note">${esc(r.note)}</span>`:''}</li>`,'hl')}</section>`).join('')}</section>`;
}
function turningHTML(d){
  return `<section class="sec" aria-labelledby="sec-tp"><h3 id="sec-tp">Turning points<span class="ct"><span class="sr">, </span>${d.turning_points.length}</span></h3><ol class="tps">${d.turning_points.map(t=>`<li><span class="tp-c">${esc(ord(t.century))} century</span><div><p>${esc(t.what)}</p>${t.who.length?`<p class="tp-who">${t.who.map(w=>{const c=citedOf(w)[0];return `${esc(w.author)}${c?` <span class="pgs"><a class="pg" href="${read(c[0],c[1])}" target="_blank" rel="noopener" title="${esc(c[2]||c[0])}">p. ${esc(c[1])}</a>${PVW.btn(c[0],c[1])}</span>`:''}`;}).join(' · ')}</p>`:''}</div></li>`).join('')}</ol></section>`;
}
function draw(d){
  const P=d.positions,all=P.flatMap(p=>p.holders.map(h=>({...h,pos:p.id})));
  const dated=h=>Number(h.y)>0&&Number(h.y)<2000,years=[...all.filter(dated).map(h=>Number(h.y)),...RINGS.map(r=>r.y)],y0=Math.floor((Math.min(...years,1700)-1)/100)*100,y1=Math.min(2000,Math.ceil(Math.max(...years,1700)/100)*100),step=(y1-y0)/100>12?200:100;
  const W=1000,L=56,R=12,T=14,B=38,H=Math.max(380,Math.min(720,(y1-y0)/100*44+T+B)),cw=(W-L-R)/P.length;
  const yOf=y=>T+(y-y0)/(y1-y0)*(H-T-B-26),undated=H-B+14;
  const xOf=(h,k)=>L+cw*(k+.5)+(hash(h.author)-.5)*cw*.72;
  const at=new Map();P.forEach((p,k)=>p.holders.forEach(h=>at.set(h.n,{x:xOf(h,k),y:dated(h)?yOf(Number(h.y)):undated,h,un:!dated(h)})));
  let g='';
  for(let k=0;k<P.length;k+=2){g+=`<rect class="band" x="${(L+cw*k).toFixed(1)}" y="${T}" width="${cw.toFixed(1)}" height="${H-B-T}"/>`;}
  for(let c=y0;c<=y1;c+=100){const y=yOf(c),lab=((c-y0)/100)%(step/100)===0;g+=`<line class="grid" x1="${L}" x2="${W-R}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>${lab&&c>0?`<text x="${L-8}" y="${(y+4).toFixed(1)}" text-anchor="end">${ord(c/100+1)}</text>`:''}`;}
  for(let k=1;k<P.length;k++){const x=L+cw*k;g+=`<line class="col" x1="${x}" x2="${x}" y1="${T}" y2="${H-B}"/>`;}
  if(all.some(h=>!dated(h)))g+=`<text x="${L-8}" y="${undated+4}" text-anchor="end">undated</text>`;
  const posX=k=>L+cw*(k+.5);
  let e='';
  for(const r of d.relations){
    const a=r.from.n?at.get(r.from.n):null,b=r.to.n?at.get(r.to.n):null;
    /* an undated author has no place on the time axis: no line to the undated band */
    if((a&&a.un)||(b&&b.un))continue;
    let x1,y1_,x2,y2;
    if(a){x1=a.x;y1_=a.y}else if(r.from.position){const k=P.findIndex(p=>p.id===r.from.position);if(k<0)continue;x1=posX(k);y1_=T-6}else continue;
    if(b){x2=b.x;y2=b.y}else if(r.to.position){const k=P.findIndex(p=>p.id===r.to.position);if(k<0)continue;x2=posX(k);y2=T-6}else continue;
    const mx=(x1+x2)/2,bend=Math.min(60,Math.abs(x2-x1)*.25);
    e+=`<path class="edge ${r.kind}${r.recorded?' recorded':''}" data-kind="${r.kind}" data-a="${r.from.n||''}" data-b="${r.to.n||''}" d="M${x1.toFixed(1)},${y1_.toFixed(1)} C${(mx).toFixed(1)},${(y1_-bend).toFixed(1)} ${(mx).toFixed(1)},${(y2-bend).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}"><title>${esc(`${r.from.author||r.from.position} ${r.kind} ${r.to.author||r.to.position}${r.note?`: ${r.note}`:''}`)}</title></path>`;
  }
  let dots='';
  for(const [n,o] of at){const {h} = o;dots+=`<a class="dot" data-n="${n}" data-trad="${esc(h.tradition||'')}" tabindex="0" role="button" aria-label="${esc(h.author)}, ${esc(h.tradition||'')}, ${esc(yrOf(h)||'undated')}: ${esc(h.answer)}"><circle cx="${o.x.toFixed(1)}" cy="${o.y.toFixed(1)}" r="5" fill="${col(h.tradition)}"/></a>`;}
  /* the Reformed and Lutheran metaphysicians placed with a position: a ring at his birth year in his position's column */
  RINGS.forEach((r,i)=>{const t=ptrad(r.e);dots+=`<a class="dot ring" data-r="${i}" data-trad="${esc(t)}" tabindex="0" role="button" style="--c:${col(t)}" aria-label="${esc(`${r.e.author}, ${t}, born ${r.y}: ${PATH_LABEL[r.e.path]||''}, ${P[r.k].label}`)}"><circle cx="${xOf(r.e,r.k).toFixed(1)}" cy="${yOf(r.y).toFixed(1)}" r="5"/></a>`;});
  const heads=`<div class="heads" style="grid-template-columns:repeat(${P.length},1fr)">${P.map(p=>`<div>${esc(p.label)}<small>${p.holders.length} ${p.holders.length===1?'author':'authors'}${p.first?` · from ${esc(p.first.author)}`:''}</small></div>`).join('')}</div>`;
  /* on a phone the diagram keeps a readable width and scrolls sideways inside its frame; the page never does */
  return `<div class="dscroll" style="--np:${P.length}"><div>${heads}<svg class="map" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(d.q)}: ${P.length} positions, ${all.length} authors placed by century">${g}${e}${dots}</svg></div></div><div class="tip" id="tip" hidden></div>`;
}
function apply(){
  document.querySelectorAll('svg.map .dot').forEach(el=>el.classList.toggle('off',(TRAD.size>0&&!TRAD.has(el.dataset.trad))||(!RING&&el.classList.contains('ring'))));
  document.querySelectorAll('svg.map .edge').forEach(el=>{const a=document.querySelector(`.dot[data-n="${el.dataset.a}"]`),b=document.querySelector(`.dot[data-n="${el.dataset.b}"]`);el.classList.toggle('off',!KIND.has(el.dataset.kind)||(a&&a.classList.contains('off'))||(b&&b.classList.contains('off')));});
  /* the lists follow the legend: a tradition switched off leaves the positions' lists too; the Reformed and Lutheran lines leave with
     their traditions, and those placed with a position with their rings */
  document.querySelectorAll('#m .tg').forEach(el=>{el.hidden=TRAD.size>0&&!TRAD.has(el.dataset.trad==='Other'?'':el.dataset.trad);});
  document.querySelectorAll('#m .pth').forEach(el=>{el.hidden=(TRAD.size>0&&!el.dataset.trads.split('|').some(x=>TRAD.has(x)))||(!RING&&el.hasAttribute('data-placed'));});
}
/* the note on a dot: an author the map places, or a Reformed or Lutheran metaphysician placed with a position (a ring) */
function tip(n,anchor){
  const t=$('#tip');if(!anchor){t.hidden=true;document.querySelectorAll('.dot.is-on,.dot.dim').forEach(x=>x.classList.remove('is-on','dim'));return;}
  const rg=anchor.dataset.r!=null?RINGS[Number(anchor.dataset.r)]:null;
  if(rg){
    const {e} = rg,tt=(PW[e.slug]||[])[1]||e.slug;
    t.innerHTML=`<button type="button" aria-label="Close">×</button><b>${esc(e.author)}</b> <span class="tt">born ${esc(rg.y)}${ptrad(e)?` · ${esc(ptrad(e))}`:''}</span><div class="tt">${esc(D.positions[rg.k].label)} · ${esc(PATH_LABEL[e.path]||'')}</div><p>${esc(e.position)}</p><a href="${read(e.slug,e.page)}" target="_blank" rel="noopener">${esc(tt)}, p. ${esc(e.page)}</a>`;
  }else{
    const h=D.positions.flatMap(p=>p.holders.map(x=>({...x,pos:p.label}))).find(x=>x.n===Number(n));if(!h)return;
    const c=citedOf(h)[0];
    t.innerHTML=`<button type="button" aria-label="Close">×</button><b>${esc(h.author)}</b> <span class="tt">${esc(yrOf(h))}${h.tradition?` · ${esc(h.tradition)}`:''}</span><div class="tt">${esc(h.pos)} · ${esc(h.answer)}</div><p>${esc(h.line)}</p>${c?`<a href="${read(c[0],c[1])}" target="_blank" rel="noopener">${esc(c[2]||c[0])}, p. ${esc(c[1])}</a>`:''}`;
  }
  t.hidden=false;
  const box=$('.diagram').getBoundingClientRect(),r=anchor.getBoundingClientRect();
  let x=r.left-box.left+12,y=r.top-box.top+12;if(x+t.offsetWidth>box.width-8)x=Math.max(8,r.left-box.left-t.offsetWidth-6);if(y+t.offsetHeight>box.height-4)y=Math.max(4,r.top-box.top-t.offsetHeight-6);
  t.style.left=`${x}px`;t.style.top=`${y}px`;
  document.querySelectorAll('.dot').forEach(x=>{x.classList.toggle('is-on',x===anchor);});
  const linked=new Set(rg?[]:[String(n)]);if(!rg)document.querySelectorAll('svg.map .edge:not(.off)').forEach(el=>{if(el.dataset.a===String(n))linked.add(el.dataset.b);if(el.dataset.b===String(n))linked.add(el.dataset.a);});
  document.querySelectorAll('.dot').forEach(x=>x.classList.toggle('dim',x!==anchor&&!(x.dataset.n&&linked.has(x.dataset.n))));
}
function show(id,push){
  const i=IX.questions.findIndex(q=>q.id===id);if(i<0)return;CUR=id;
  document.querySelectorAll('.loci li button').forEach(b=>b.setAttribute('aria-current',String(b.dataset.id===id)));
  keepInView(document.querySelector(`.loci button[data-id="${CSS.escape(id)}"]`));
  $('#m').innerHTML='<p class="muted">Drawing the map…</p>';
  Promise.all([J(`${BASE}/v1/maps/q/${encodeURIComponent(id)}.json`),PATHS_P,DATES_P]).then(([d,,dateOf])=>{
    if(!d||CUR!==id)return;D=fillDates(d,dateOf);TRAD=new Set();FOLD=0;RING=true;
    /* the Reformed and Lutheran metaphysicians on this question: placed, and the placed and dated drawn as rings (one a man a position,
       and none for a man the map already places there) */
    PL=placePaths(d);RINGS=[];
    PL.at.forEach((es,k)=>{const seen=new Set();for(const e of es){const a=pkey(e.author),y=pyear(e);if(!y||seen.has(a)||PL.tally[k].who.has(a))continue;seen.add(a);RINGS.push({e,k,y});}});
    const trads=Object.entries(d.traditions||{}).sort((a,b)=>b[1]-a[1]);
    const prev=IX.questions[i-1],next=IX.questions[i+1];
    const total=d.n||d.positions.reduce((n,p)=>n+p.holders.length,0)+(d.unplaced||[]).length;
    const secs=d.positions.map((p,k)=>positionHTML(p.id,p.label,p.holders,total,`${p.summary?`<p class="thesis">${esc(p.summary)}</p>`:''}${p.distinction||p.first?`<dl class="lab">${p.distinction?`<div><dt>Turns on</dt><dd>${esc(p.distinction)}</dd></div>`:''}${p.first&&p.first.author?`<div><dt>Earliest</dt><dd>${esc(p.first.author)}${yrOf(p.first)?`<span class="muted">, ${esc(yrOf(p.first))}</span>`:''}</dd></div>`:''}</dl>`:''}`,k)).join('');
    const unpl=(d.unplaced||[]).length?positionHTML('unplaced','Not placed',d.unplaced,total,'<p class="thesis muted">Answers the reading could not file under a position; each stands on his page.</p>'):'';
    const ptop=pthHTML(pathGroups(PL.top),false);
    $('#m').innerHTML=`<h2>${esc(d.q)}</h2>
      <p class="meta">${esc(d.locus)} · ${d.n} authors · ${d.positions.length} positions · <a href="${ATLAS}#${esc(d.id)}">every answer in the atlas</a></p>${/^q(29[4-9]|3[0-2]\d|330)$/.test(d.id)?`<p class="meta">Read the disputation as a course: <a href="/courses#metaphysics">Metaphysics with Suárez</a></p>`:''}
      ${d.note?`<p class="shape">${esc(d.note)}</p>`:''}${d.axes.length||ptop?`<dl class="lab">${d.axes.length?`<div><dt>Runs along</dt><dd><ol>${d.axes.map(a=>`<li>${esc(a)}</li>`).join('')}</ol></dd></div>`:''}${ptop}</dl>`:''}
      <div class="legend"><span class="lg-l" aria-hidden="true">Traditions</span><div class="lg" id="trads" role="group" aria-label="Traditions shown">${trads.map(([t,n])=>`<button type="button" data-trad="${esc(t)}" aria-pressed="true"><i style="--c:${col(t)}"></i>${esc(t||'Other')}<span class="ct">${n}</span></button>`).join('')}</div>
      ${d.relations.length?`<span class="lg-l" aria-hidden="true">Lines</span><div class="lg" id="kinds" role="group" aria-label="Lines shown">${KINDS.filter(k=>d.relations.some(r=>r.kind===k[0])).map(([k,l,c])=>`<button type="button" class="${c}" data-kind="${k}" aria-pressed="true"><i style="--c:${k==='refutes'?'var(--refutes)':'var(--muted)'}"></i>${l}</button>`).join('')}</div>`:''}
      ${RINGS.length?`<span class="lg-l" aria-hidden="true">By school</span><div class="lg" role="group" aria-label="Reformed and Lutheran metaphysicians placed by the school they follow"><button type="button" class="ring" id="rings" aria-pressed="true"><i></i>Reformed and Lutheran<span class="ct">${RINGS.length}</span></button></div>`:''}</div>
      <div class="diagram">${draw(d)}</div>
      ${secs}${unpl}${d.turning_points.length?turningHTML(d):''}${d.relations.length?relationsHTML(d):''}
      <nav class="next" aria-label="Previous and next question">${prev?`<button type="button" data-go="${esc(prev.id)}"><small>Previous question</small><span>${esc(prev.q)}</span></button>`:'<span></span>'}${next?`<button type="button" data-go="${esc(next.id)}"><small>Next question</small><span>${esc(next.q)}</span></button>`:'<span></span>'}</nav>`;
    $('#note').textContent=[d.method||'',PL.at.some(x=>x.length)||PL.top.length?PATH_NOTE:''].filter(Boolean).join(' ');
    if(push)history.replaceState(null,'',`#${id}`);
    document.title=`${d.q} | Maps of the tradition | The Faith Received | Mere Orthodoxy`;
  });
}
/* the question shown keeps its locus open and in sight: the phone's bounded list, or the sticky column */
function keepInView(el){
  if(!el)return;const d=el.closest('details');if(d)d.open=true;
  const box=[...document.querySelectorAll('.loci,.nav')].find(x=>x.contains(el)&&x.scrollHeight>x.clientHeight+4);if(!box)return;
  const r=el.getBoundingClientRect(),br=box.getBoundingClientRect();if(r.top<br.top||r.bottom>br.bottom)box.scrollTop+=r.top-br.top-box.clientHeight/3;
}
function list(){
  const q=($('#find').value||'').trim().toLowerCase(),by=new Map();
  for(const x of IX.questions){if(q&&!x.q.toLowerCase().includes(q))continue;if(!by.has(x.locus))by.set(x.locus,[]);by.get(x.locus).push(x);}
  $('#loci').innerHTML=[...by.entries()].map(([l,xs])=>`<li><details ${xs.some(x=>x.id===CUR)||q?'open':''}><summary>${esc(l)}<small>${xs.length}</small></summary><ul>${xs.map(x=>`<li><button type="button" data-id="${esc(x.id)}" aria-current="${String(x.id===CUR)}">${esc(x.q)}<small>${x.positions.length} positions · ${x.authors} authors</small></button></li>`).join('')}</ul></details></li>`).join('')||'<li class="muted">Nothing matches.</li>';
}
$('#loci').addEventListener('click',e=>{const b=e.target.closest('button[data-id]');if(b)show(b.dataset.id,true);});
$('#find').addEventListener('input',list);
$('#m').addEventListener('click',e=>{
  const go=e.target.closest('button[data-go]');if(go){show(go.dataset.go,true);$('#m').scrollIntoView({block:'start'});return;}
  const more=e.target.closest('button.more');if(more){const open=more.getAttribute('aria-expanded')!=='true',ol=document.getElementById(more.getAttribute('aria-controls'));
    [...ol.children].forEach((li,k)=>{if(k>=SHOWN)li.hidden=!open;});more.setAttribute('aria-expanded',String(open));more.textContent=open?'Show fewer':`Show all ${more.dataset.n}`;
    if(!open&&more.getBoundingClientRect().top<0)ol.scrollIntoView({block:'start'});return;}
  const t=e.target.closest('#trads button');if(t){const k=t.dataset.trad;if(TRAD.has(k))TRAD.delete(k);else TRAD.add(k);if(TRAD.size===document.querySelectorAll('#trads button').length)TRAD.clear();document.querySelectorAll('#trads button').forEach(b=>b.setAttribute('aria-pressed',String(!TRAD.size||TRAD.has(b.dataset.trad))));apply();return;}
  const k=e.target.closest('#kinds button');if(k){const kk=k.dataset.kind;if(KIND.has(kk))KIND.delete(kk);else KIND.add(kk);k.setAttribute('aria-pressed',String(KIND.has(kk)));apply();return;}
  const rb=e.target.closest('#rings');if(rb){RING=!RING;rb.setAttribute('aria-pressed',String(RING));apply();return;}
  const d=e.target.closest('.dot');if(d){tip(d.dataset.n,d);return;}
  if(e.target.closest('#tip button')){tip(null);return;}
  if(!e.target.closest('#tip'))tip(null);
});
$('#m').addEventListener('mouseover',e=>{const d=e.target.closest('.dot');if(d&&!document.querySelector('.dot.is-on'))tip(d.dataset.n,d);});
$('#m').addEventListener('focusin',e=>{const d=e.target.closest('.dot');if(d)tip(d.dataset.n,d);});
addEventListener('keydown',e=>{if(e.key==='Escape'){if(PVW.escape())e.preventDefault();tip(null);}if(e.target.matches('input')||e.target.closest('.pvw'))return;const i=IX?IX.questions.findIndex(q=>q.id===CUR):-1;if(i<0)return;if(e.key==='ArrowRight'&&IX.questions[i+1])show(IX.questions[i+1].id,true);if(e.key==='ArrowLeft'&&IX.questions[i-1])show(IX.questions[i-1].id,true);});
J(`${BASE}/v1/maps/index.json`).then(ix=>{
  if(!ix||!(ix.questions||[]).length){$('#m').innerHTML='<p class="muted">The maps could not be loaded. Reload the page to try again.</p>';return;}
  IX=ix;const want=decodeURIComponent(location.hash.slice(1));list();
  const first=ix.questions.find(q=>q.id===want)||ix.questions[0];if(first)show(first.id,false);
});
