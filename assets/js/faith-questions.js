/* Shared questions: ported from The Faith Received (tools/prdl_reader_prototype/questions.html); the data from the library worker, links into the reader on this site. */
window.__FR_BLOB_BASE__=window.__FR_BLOB_BASE__||"https://mo-tfr-library.mo-podcast-feed.workers.dev";
window.__FR_READER_PATH__=window.__FR_READER_PATH__||"/the-faith-received/read/";
const BLOB=(window.__FR_BLOB_BASE__||"").replace(/\/$/,"");
/* each data file is asked for at the build's stamp, so a CDN's older copy is never read (Mere Orthodoxy's port has no stamp) */
const VER=window.__FR_VER?`v=${encodeURIComponent(window.__FR_VER)}`:'';
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>Number(n||0).toLocaleString('en-US');
const J=u=>fetch(BLOB+u+(VER?(u.includes('?')?'&':'?')+VER:'')).then(r=>r.ok?r.json():null).catch(()=>null);
const READER=(window.__FR_READER_PATH__||'/read');
const read=(w,p)=>`${READER}?w=${encodeURIComponent(w)}#b${encodeURIComponent(p)}-0`;
/* the library's other pages, and the Scripture page's reader of Migne and EEBO pages for the previews (Mere Orthodoxy's port names its
   own pages and leaves the reader out) */
const PAGES={atlas:'/the-faith-received/disputed-questions/#',maps:'/the-faith-received/maps/#',topics:'/the-faith-received/topics/#',controversies:'/the-faith-received/controversies/#'};
const CPANE='';
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
})({read,col:'#entry',host:'.rows li',text:CPANE});
addEventListener('keydown',e=>{if(e.key==='Escape'&&PVW.escape())e.preventDefault();});
/* THE GRAPHICS: tradition-graphics.js draws the strip, the compact positions and the positions in full, and previews a position's
   pages (its own controller, one preview a position). A page without the module keeps its menus, its head, its pane and its rows. */
const G=window.FRTraditionGraphics||null;
const GPV=G?G.preview({read,text:CPANE,col:'.tg-pos',host:'.tg-hr'}):null;
const ORD=G?G.TRADITIONS.map(t=>t[0]).concat('x'):[];
const ord=n=>n+((n%100>=11&&n%100<=13)?'th':(['th','st','nd','rd'][n%10]||'th'));
/* the drawings come alive inside the page's columns (the module's mount: legend, readout, folds, label lanes) */
const COLS=document.getElementById('cols');
const NAMES={law:'Law',grace:'Grace',sacraments:'The sacraments',scripture:'Scripture',god:'God',predestination:'Predestination',trinity:'The Trinity',christ:'Christ','man-and-sin':'Man and sin',justification:'Justification',church:'The Church','worship-and-the-saints':'Worship and the saints','last-things':'Last things',ethics:'Law and ethics','philosophy-in-theology':'Philosophy in theology','creation-and-providence':'Creation and providence','angels-and-demons':'Angels and demons',covenant:'Covenant','revelation-and-reason':'Revelation and reason','repentance-and-conversion':'Repentance and conversion','sanctification-and-good-works':'Sanctification and good works',prayer:'Prayer','ministry-and-church-order':'Ministry and church order','christ-s-work':'Christ’s work','mary-and-the-saints':'Mary and the saints','soul-and-death':'Soul and death','papal-power-and-the-civil-order':'Papal power and the civil order','law-and-gospel':'Law and Gospel','councils-and-fathers':'Councils and Fathers','christian-life':'Christian life'};
/* EACH TOPIC ON ITS TOPIC PAGE (2026-10-21, owner: "disputed questions and topics feel like they should be combined"). The topics
   here are the loci of the atlas of disputed questions, and each has a home among the topic pages (/topics#<slug>): the first page
   topic-notes.js gives the locus in its LOCI table (keep the two in step). The three topics parted by subject (grace, law, the
   sacraments) also send a part that has a topic page of its own there. */
const HOME={grace:'grace',law:'the-law',sacraments:'sacraments','angels-and-demons':'angels',christ:'christ-christology','christ-s-work':'redemption','christian-life':'christian-liberty',church:'the-church','councils-and-fathers':'tradition',covenant:'covenant','creation-and-providence':'providence',ethics:'virtues-moral-theology',god:'god',justification:'justification','last-things':'last-things','law-and-gospel':'law-and-gospel','man-and-sin':'sin','mary-and-the-saints':'the-virgin-mary','ministry-and-church-order':'ministry','papal-power-and-the-civil-order':'the-civil-magistrate','philosophy-in-theology':'prolegomena-theological-method',prayer:'prayer',predestination:'predestination','repentance-and-conversion':'repentance','revelation-and-reason':'revelation','sanctification-and-good-works':'sanctification',scripture:'scripture','soul-and-death':'death',trinity:'the-trinity','worship-and-the-saints':'religion-true-worship'};
const PART_PAGE={'grace/free-will':'free-will','grace/justification':'justification','grace/merit':'merit','grace/predestination-and-election':'predestination','law/natural-law':'natural-law','law/obligation-and-conscience':'conscience','sacraments/baptism':'baptism','sacraments/confirmation-and-unction':'confirmation','sacraments/marriage':'marriage','sacraments/orders':'holy-orders','sacraments/penance':'penance','sacraments/the-eucharist':'the-lord-s-supper'};
/* DQS the atlas's questions; MAPQ each mapped question's positions, from the maps' index; TGK the published key of controversies by
   question (v1/enrich/topic_graphics.json), drawn where it loads */
let IX=null,T=null,B=null,CUR=null,SHOWN=40,DQS=[],MAPQ=new Map(),LABEL=new Map(),TGK=null;
// the atlas names its loci as these topics do ("Christ's work" is christ-s-work), save "Law and ethics" (ethics)
const topicOfLocus=l=>l==='Law and ethics'?'ethics':l.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
// a part named for a disputed question: the same question in the same locus (two loci share one question's words); the data cuts long names at 90 letters
const dqOf=(t,part)=>{const n=String(part.name||'').toLowerCase();return n.length>12&&DQS.find(q=>topicOfLocus(q.locus)===t&&q.q.toLowerCase().startsWith(n))||null;};
const PLAIN=['affirms','denies','distinguishes','reports only','unclear'];
function tallyHTML(t){const keys=Object.keys(t||{}),opts=keys.filter(k=>!PLAIN.includes(k)&&t[k]>0);
  if(opts.length)return `<b>${opts.length}</b> positions · <b>${opts.reduce((n,k)=>n+t[k],0).toLocaleString('en-US')}</b> authors take one`;
  return [['affirms','affirm'],['denies','deny'],['distinguishes','distinguish']].filter(([k])=>t[k]>0).map(([k,l])=>`<b>${t[k].toLocaleString('en-US')}</b> ${l}`).join(' · ')||'No author states an answer yet';}
const topicLink=s=>`<a href="${PAGES.topics}${encodeURIComponent(s)}">${esc(LABEL.get(s)||s.replace(/-/g,' '))}</a>`;
const partName=(t,x)=>{const dq=dqOf(t,x);return dq?dq.q:x.name==='other'?'Other questions':x.name[0].toUpperCase()+x.name.slice(1);};
const cache=new Map();const part=(t,b)=>{const k=`${t}/${b}`;if(!cache.has(k))cache.set(k,J(`/v1/questions/${t}/${b}.json`));return cache.get(k);};
const topic=()=>IX.topics.find(x=>x.topic===T);
const bucket=()=>topic().buckets.find(x=>x.slug===B);
function words(q){return String(q||'').toLowerCase().split(/\s+/).filter(Boolean);}

/* A WORK'S TRADITION AND YEAR. Its tradition as the set directory finds a set's (setindex.html): the shelf of the author's room in the
   library (v1/bible/<shelf>/rooms; ROOM_ORDER, the later shelves before the Fathers', whose rooms also hold their editors: a name in two
   rooms takes the first), else the shelf of the Patrologia the work is a volume of (Greek, Latin, Oriental), else none ("Shelf not
   recorded"); a name that names no one (anonymous, various authors) has no room. Its year is the asked row's (most often the author's
   birth); a work whose rows have none takes the library's date for its author (the module's author dates, v1/enrich/author_dates.json:
   his birth, else his floruit, else his death), else his room's year, printed "c.", as the set directory gives a set's author his. */
const ROOM_ORDER=['md','rc','lu','rf','ed','hl','gf','pl'];
const nameKey=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const UNNAMED=/^(?:unknown|anonymous|various|uncertain|unattributed)\b/i;
const PATROLOGIA={pg:'gf',pld:'pl',po:'po'};
let ROOM=new Map();
/* the rooms, and the author dates the module reads once (a page may wait for them: dates.ready), in before a year is drawn */
const ROOMS=Promise.all([...ROOM_ORDER.map(sh=>J(`/v1/bible/${sh}/rooms/index.json`)),G&&G.dates?G.dates.ready:null]).then(xs=>{
  const m=new Map();xs.slice(0,ROOM_ORDER.length).forEach((x,i)=>{for(const r of (x&&x.authors)||[]){const k=nameKey(r.a);if(k&&!m.has(k))m.set(k,[ROOM_ORDER[i],r.y]);}});
  ROOM=m;return m;});
const ROOM_OF=new Map();
function roomOf(name){
  if(!name||UNNAMED.test(name))return null;
  if(ROOM_OF.has(name))return ROOM_OF.get(name);
  let hit=null;
  for(const n of String(name).split(/;|\s+and\s+/)){hit=ROOM.get(nameKey(n))||null;if(hit)break;}
  if(ROOM.size)ROOM_OF.set(name,hit);
  return hit;
}
const shelfOf=(w,hit)=>hit?hit[0]:PATROLOGIA[(/^(pg|pld|po)-\d+$/.exec(w)||[])[1]]||'x';
/* the line of an author's dates from the library's author dates (dates.label), and the year of one the asked rows leave undated:
   the author dates' year (dates.get), else his room's year */
const dateLabel=name=>(G&&G.dates&&name&&!UNNAMED.test(name)?G.dates.label(name):'')||'';
function undatedYear(name,hit){
  const k=G&&G.dates&&name&&!UNNAMED.test(name)?G.dates.get(name):null;
  if(k&&k.y>0&&k.y<2100)return {y:k.y,d:k.dates||`c. ${k.y}`};
  return hit&&hit[1]>0?{y:hit[1],d:`c. ${hit[1]}`}:null;
}
const rowYear=a=>a.y>0?a.y:((undatedYear(a.a,roomOf(a.a))||{}).y||0);
/* the works among asked rows, each once, in the order of their first row: its author, his shelf, its year, its rows */
function worksOf(rows){
  const by=new Map();
  rows.forEach((a,i)=>{
    let r=by.get(a.w);
    if(!r){const hit=roomOf(a.a);r={w:a.w,a:a.a||'',t:a.t,d:a.d||'',y:a.y>0?a.y:null,room:hit,k:shelfOf(a.w,hit),i,rows:[]};by.set(a.w,r);}
    else if(r.y==null&&a.y>0){r.y=a.y;r.d=a.d||r.d;}
    r.rows.push(a);
  });
  for(const r of by.values()){
    if(r.y==null){const x=undatedYear(r.a,r.room);if(x){r.y=x.y;r.d=x.d;}}
    else if(!r.d)r.d=dateLabel(r.a);
  }
  return [...by.values()];
}
const whenOf=r=>r.d||(r.y?String(r.y):'');
const trName=k=>G?G.label(k):'';
const swatch=k=>G?`<i class="tg-sw" style="--c:${G.colour(k)}" aria-hidden="true"></i>`:'';

/* WHO ASKED IT, AND WHEN: the part's asking works, each once (all its questions' rows), on the library's time axis by quarter-century
   and tradition (the module's era strip and its legend), the author of each era who asks in the most works named at his year: an
   author with a page in the library, one name (not a compiler's course or a volume of several hands) */
function voices(ws){
  const by=new Map();
  for(const r of ws){
    if(!(r.y>0)||!r.room||/;/.test(r.a)||(r.a.match(/,/g)||[]).length>=2)continue;
    const k=nameKey(r.a),v=by.get(k)||{a:r.a,y:r.y,d:r.d,n:0};
    v.n+=1;if(r.y<v.y){v.y=r.y;v.d=r.d;}by.set(k,v);
  }
  const best=new Map();
  for(const v of by.values()){const e=G.ERAS.findIndex(([lo,hi])=>v.y>=lo&&v.y<hi);if(e<0)continue;const cur=best.get(e);if(!cur||v.n>cur.n||(v.n===cur.n&&v.y<cur.y))best.set(e,v);}
  const vs=[...best.values()],rank=vs.slice().sort((a,z)=>z.n-a.n||a.y-z.y);
  return vs.map(v=>({y:v.y,label:v.a,sub:/^\d{3,4}–\d{3,4}$/.test(v.d||'')?v.d:String(v.y),p:rank.indexOf(v)}));
}
function whoHTML(ws,label){
  const strip=G.eraStrip(G.bin(ws.map(r=>({y:r.y,t:r.k})),25),{unit:'work',units:'works',title:`${label}: the works that ask it`,marks:voices(ws),legendLabel:'Traditions shown'});
  return strip||`<p class="wait">None of the ${fmt(ws.length)} works that ask it is dated.</p>`;
}
/* SHARE BY TRADITION, a page-local extension: the module draws this bar only inside a position block (its share bar is not exported),
   so the open question's works are drawn here in the module's own markup and colours (.tg-pf, tradition-graphics.css), each tradition
   named under the bar with its count */
function shareHTML(ws){
  const by=new Map();for(const r of ws)by.set(r.k,(by.get(r.k)||0)+1);
  const tr=[...by].sort((a,z)=>z[1]-a[1]||ORD.indexOf(a[0])-ORD.indexOf(z[0]));
  const label=`${fmt(ws.length)} ${ws.length===1?'work':'works'} by tradition: ${tr.map(([k,n])=>`${trName(k)} ${n}`).join(', ')}`;
  return `<div class="tg tg-pf"><span class="tg-pf-bar" role="img" aria-label="${esc(label)}"><span class="tg-pf-fill" style="width:100%">${tr.map(([k,n])=>`<i style="flex-grow:${n};--c:${G.colour(k)}"></i>`).join('')}</span></span>`
    +`<p class="tg-pf-tr">${tr.map(([k,n])=>`<span>${swatch(k)}${esc(trName(k))}<span class="tg-ct">${fmt(n)}</span></span>`).join('')}</p></div>`;
}

/* the part's own heading: the disputed question it is, with its answers, its map and its controversies, then its topic pages; who
   asked it, drawn when the part's file and the rooms are in; its positions (compact, and in full behind one fold) */
function renderHere(){
  const bk=bucket(),dq=dqOf(T,bk),home=HOME[T],own=PART_PAGE[`${T}/${B}`];
  const m=dq&&MAPQ.get(dq.id),kg=dq&&TGK&&TGK.questions&&TGK.questions[dq.id],cv=kg&&(kg.d||[])[0];
  const doors=dq?[`<a href="${PAGES.atlas}${esc(dq.id)}" aria-label="Every answer: ${esc(dq.q)}">answers</a>`,
    m?`<a href="${PAGES.maps}${esc(dq.id)}" aria-label="The map of the tradition: ${esc(dq.q)}">map</a>`:'',
    cv?`<a href="${PAGES.controversies}debate/${encodeURIComponent(cv[0])}/${encodeURIComponent(cv[2]||dq.id)}" aria-label="${esc(`The controversies on ${dq.q}`)}">${fmt(cv[1])} ${cv[1]===1?'controversy':'controversies'}</a>`:''].filter(Boolean).join(' · '):'';
  const pos=m&&G?(m.positions||[]).slice().sort((a,z)=>z[1]-a[1]):[];
  $('#here').innerHTML=`<div class="dq">${dq?'<span class="dq-k">Disputed question</span>':''}<h2 class="dq-q" id="here-h">${esc(partName(T,bk))}</h2>${dq?`<p class="dq-m">${tallyHTML(dq.tally)} · ${doors}</p>`:''}</div>${
    home?`<p class="here-topic">Topic page: ${topicLink(home)}${own&&own!==home?` · this part: ${topicLink(own)}`:''}</p>`:''}`;
  $('#here').hidden=false;
  $('#gfx').innerHTML=(G?`<section class="here-sec" aria-labelledby="who-h"><h3 class="here-h" id="who-h">Who asked, and when<small id="who-n"></small></h3><div class="who-fig" id="who"><p class="wait" role="status">Drawing the works that ask it…</p></div></section>`:'')
    +(pos.length?`<section class="here-sec" aria-labelledby="ans-h"><h3 class="here-h" id="ans-h">How the tradition answers it<small>${pos.length} positions · ${fmt(m.authors)} authors</small></h3>${G.positionRows(pos)}<details class="dq-full" data-q="${esc(dq.id)}"><summary>Read the ${pos.length} positions in full</summary><div class="dq-full-b"></div></details></section>`:'');
  $('#gfx').hidden=!$('#gfx').innerHTML;
  const full=$('#gfx .dq-full');if(full)full.addEventListener('toggle',()=>{if(full.open)fullPositions(full);});
}
/* the positions in full, as the maps draw them: each its share of the authors in the traditions' colours, its thesis, what it turns
   on and its earliest holder, its authors by tradition behind a fold; largest first, as the compact bars */
async function fullPositions(det){
  const body=det.querySelector('.dq-full-b');if(body.dataset.state)return;body.dataset.state='wait';
  body.innerHTML='<p class="wait" role="status">Drawing the positions…</p>';
  const id=det.dataset.q,d=await J(`/v1/maps/q/${encodeURIComponent(id)}.json`);
  if(!det.isConnected)return;
  if(!d){body.dataset.state='';body.innerHTML=`<p class="wait">The positions could not load. <a href="${PAGES.maps}${esc(id)}">Open the map of this question</a></p>`;return;}
  body.dataset.state='done';
  const total=d.n||d.positions.reduce((n,p)=>n+p.holders.length,0)+(d.unplaced||[]).length;
  const o={total,read,preview:GPV.btn,level:4,open:false};
  body.innerHTML=d.positions.slice().sort((a,z)=>z.holders.length-a.holders.length).map(p=>G.positionBlock(p,o)).join('')
    +((d.unplaced||[]).length?G.positionBlock({id:'unplaced',label:'Not placed',holders:d.unplaced},{...o,note:'Answers the reading could not file under a position; each stands on his page.'}):'');
}
async function fillWho(t,b){
  if(!G)return;
  const [d]=await Promise.all([part(t,b),ROOMS]);
  const box=$('#who');
  if(T!==t||B!==b||!box)return;
  if(!d){box.innerHTML='<p class="wait">The works that ask it could not be loaded. Reload the page to try again.</p>';return;}
  const ws=worksOf(d.questions.flatMap(q=>q.asked));
  $('#who-n').textContent=`${fmt(ws.length)} ${ws.length===1?'work':'works'}`;
  box.innerHTML=whoHTML(ws,partName(t,bucket()));
  G.layout(COLS);
}

/* the list scrolls itself to the question open, never the page */
function keepInView(el){const l=el&&el.closest('.list');if(!l)return;const lr=l.getBoundingClientRect(),er=el.getBoundingClientRect();
  if(er.top<lr.top)l.scrollTop-=lr.top-er.top;else if(er.bottom>lr.bottom)l.scrollTop+=er.bottom-lr.bottom;}
/* each question's first and last asker, at the years its rows are placed by (as the strip and the rows place them), drawn once the
   part's file, the rooms and the author dates are in, so a tick never moves */
const AX0=100,AX1=1950,SPANS=new Map();
const axX=y=>Math.max(0,Math.min(100,(y-AX0)/(AX1-AX0)*100));
const spanTitle=s=>s[0]===s[1]?`Asked c. ${s[0]}`:`First asked c. ${s[0]}, last c. ${s[1]}`;
function spansOf(d){return d.questions.map(q=>{let lo=Infinity,hi=-Infinity;for(const a of q.asked){const y=rowYear(a);if(y>0){if(y<lo)lo=y;if(y>hi)hi=y;}}return lo<=hi?[lo,hi]:null;});}
const tickIn=s=>`<i style="left:${axX(s[0]).toFixed(2)}%;width:${(axX(s[1])-axX(s[0])).toFixed(2)}%"></i><b style="left:${axX(s[0]).toFixed(2)}%"></b>`;
const tickHTML=s=>`<span class="qt" aria-hidden="true"${s?` title="${spanTitle(s)}"`:''}>${s?tickIn(s):''}</span>`;
const firstSR=(n,s)=>` ${n===1?'work':'works'}${s?`, first asked c. ${s[0]}`:''}`;
function drawSpans(d){
  const k=`${T}/${B}`;if(!SPANS.has(k))SPANS.set(k,spansOf(d));const s=SPANS.get(k),qs=bucket().questions;
  document.querySelectorAll('#list button[data-i]').forEach(b=>{const n=Number(b.dataset.i),v=s[n],qt=b.querySelector('.qt'),sr=b.querySelector('small .sr');if(!v||!qt)return;
    qt.innerHTML=tickIn(v);qt.title=spanTitle(v);if(sr&&qs[n])sr.textContent=firstSR(qs[n].works,v);});
}
function renderList(){
  const ws=words($('#q').value),all=bucket().questions,qs=all.map((x,i)=>[x,i]).filter(([x])=>ws.every(w=>x.q.toLowerCase().includes(w))),sp=SPANS.get(`${T}/${B}`);
  $('#runhead').innerHTML=`<span>${ws.length?`${qs.length.toLocaleString()} of ${all.length.toLocaleString()} questions`:`${all.length.toLocaleString()} ${all.length===1?'question':'questions'}`}</span><span>works</span>${G?G.miniAxis({from:AX0,to:AX1}):''}`;
  $('#list').innerHTML=qs.length?qs.slice(0,800).map(([x,i])=>`<li><button type="button" data-i="${i}" aria-current="${i===CUR}">${esc(x.q)}<small>${x.works.toLocaleString()}<span class="sr">${firstSR(x.works,sp&&sp[i])}</span></small>${tickHTML(sp&&sp[i])}</button></li>`).join('')
    :'<li class="empty">No question in this part holds those words.</li>';
  keepInView($('#list [aria-current="true"]'));
}
// a work named only by its slug (a Patrologia piece): its name from its meta.json, fetched once a slug, filled in after the rows render
const WORK_NAMES=new Map();
function fillWorkNames(){document.querySelectorAll('[data-work-name]').forEach(el=>{const slug=el.getAttribute('data-work-name');el.removeAttribute('data-work-name');
  if(!WORK_NAMES.has(slug))WORK_NAMES.set(slug,J(`/v1/works/${encodeURIComponent(slug)}/meta.json`));
  WORK_NAMES.get(slug).then(m=>{if(!m)return;el.textContent=(m.title_en||m.title||slug)+(m.volume?` · ${m.volume}`:'');
    const who=el.parentElement&&el.parentElement.querySelector('.who .nm');if(who&&!who.textContent&&m.author)who.textContent=m.author;});});}
new MutationObserver(()=>fillWorkNames()).observe(document.body,{childList:true,subtree:true});
const slugTitle=a=>/^(?:pg|po|pld|eebo)-\d+$/.test(a.t||'')||!a.t;
/* the question before and after this one, in the pane's order (the find's when it holds this one) */
function navHTML(i){
  const qs=bucket().questions,shown=[...document.querySelectorAll('#list button[data-i]')].map(b=>Number(b.dataset.i));
  const order=shown.includes(i)?shown:qs.map((_,k)=>k),at=order.indexOf(i),prev=order[at-1],next=order[at+1];
  const go=(k,l)=>`<button type="button" data-go="${k}"><small>${l}</small><span>${esc(qs[k].q)}</span></button>`;
  return prev==null&&next==null?'':`<nav class="qnav" aria-label="Previous and next question">${prev!=null?go(prev,'Previous question'):'<span></span>'}${next!=null?go(next,'Next question'):'<span></span>'}</nav>`;
}
async function showQ(i,write){
  CUR=i;SHOWN=40;document.querySelectorAll('#list button').forEach(b=>b.setAttribute('aria-current',String(Number(b.dataset.i)===i)));
  keepInView($('#list [aria-current="true"]'));
  const t=T,b=B,[d]=await Promise.all([part(T,B),ROOMS]);if(CUR!==i||T!==t||B!==b)return;const x=d&&d.questions[i];
  if(!x){$('#entry').innerHTML='<p class="muted">This question could not be loaded. Reload the page to try again.</p>';return;}
  /* each work once, at its author's year, oldest first and the undated last, under its century; its pages under it */
  const ws=worksOf(x.asked).sort((a,z)=>(a.y==null)-(z.y==null)||(a.y||0)-(z.y||0)||a.i-z.i);
  const pageLine=a=>`<li><span class="pg"><a href="${read(a.w,a.p)}">p.&nbsp;${esc(a.p)}</a>${PVW.btn(a.w,a.p)}</span><span class="asked">${esc(a.q)}</span></li>`;
  const row=r=>`<li><span class="when">${esc(whenOf(r))}${G&&r.k!=='x'?`<span class="tr">${esc(trName(r.k))}</span>`:''}</span><span class="who">${swatch(r.k)}<span class="nm">${esc(r.a)}</span></span><span class="work"${slugTitle(r)?` data-work-name="${esc(r.w)}"`:''}>${esc(r.t||r.w)}</span><ul class="pp">${r.rows.map(pageLine).join('')}</ul></li>`;
  const draw=()=>{
    const groups=[];
    for(const r of ws.slice(0,SHOWN)){const c=r.y>0?Math.floor(r.y/100):-1,g=groups[groups.length-1];if(g&&g.c===c)g.ws.push(r);else groups.push({c,ws:[r]});}
    $('#entry').innerHTML=`<h2 id="entry-h" tabindex="-1">${esc(x.q)}</h2><p class="count">Asked in ${x.works.toLocaleString()} ${x.works===1?'work':'works'}${x.n>x.works?`, on ${x.n.toLocaleString()} pages`:''}.</p>${G?shareHTML(ws):''}${
      groups.map(g=>{const id=g.c<0?'cg-u':`cg-${g.c}`;return `<section class="cg" aria-labelledby="${id}"><h3 class="cg-h" id="${id}">${g.c<0?'Undated':`${ord(g.c+1)} century`}<small>${g.ws.length.toLocaleString()} ${g.ws.length===1?'work':'works'}</small></h3><ul class="rows">${g.ws.map(row).join('')}</ul></section>`;}).join('')
      }${ws.length>SHOWN?`<button type="button" class="more" id="more">Show ${Math.min(80,ws.length-SHOWN)} more works</button>`:''
      }${navHTML(i)}`;
  };
  draw();
  $('#entry').onclick=e=>{
    const go=e.target.closest('[data-go]');
    if(go){showQ(Number(go.dataset.go),true).then(()=>toEntry(true));return;}
    if(e.target.id==='more'){SHOWN+=80;draw();}
  };
  if(write)history.replaceState(null,'',`#${T}/${B}/${i}`);
}
function showB(b,i,write){
  B=b;$('#psel').value=b;$('#q').value='';
  CUR=null;renderHere();renderList();
  const t=T,n=bucket().questions.length;
  fillWho(t,b);
  Promise.all([part(t,b),ROOMS]).then(([d])=>{if(d&&T===t&&B===b)drawSpans(d);});
  return showQ(Number.isInteger(i)&&i<n?i:0,write);
}
function showT(t,b,i,write){
  T=t;$('#tsel').value=t;
  $('#psel').innerHTML=topic().buckets.map(x=>`<option value="${esc(x.slug)}">${esc(partName(t,x))} (${x.questions.length.toLocaleString()})</option>`).join('');
  return showB(topic().buckets.some(x=>x.slug===b)?b:topic().buckets[0].slug,i,write);
}
/* a question chosen (tapped or clicked, not reached by the arrow keys) brings its page into view when its head is out of sight: on a
   phone it sits under the pane, and beside the pane it sits under the part; Previous and Next take the reader to the new head */
function toEntry(force){
  const r=$('#entry').getBoundingClientRect();
  if(!force&&r.top>=0&&r.top<innerHeight*.6)return;
  $('#entry').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
  if(force){const h=$('#entry-h');if(h)h.focus({preventScroll:true});}
}
$('#tsel').addEventListener('change',e=>showT(e.target.value,null,null,true));
$('#psel').addEventListener('change',e=>showB(e.target.value,null,true));
document.addEventListener('click',e=>{const q=e.target.closest('#list [data-i]');if(q)showQ(Number(q.dataset.i),true).then(()=>{if(e.detail)toEntry(false);});});
/* Up and Down walk the questions, each opening as it is reached */
$('#list').addEventListener('keydown',e=>{const d={ArrowDown:1,ArrowUp:-1}[e.key];if(!d)return;
  const bs=[...$('#list').querySelectorAll('button')],i=bs.indexOf(document.activeElement);if(i<0)return;e.preventDefault();
  const b=bs[Math.max(0,Math.min(bs.length-1,i+d))];if(b!==bs[i]){b.focus();b.click();}});
$('#q').addEventListener('input',renderList);$('#find').addEventListener('submit',e=>e.preventDefault());
if(G)G.mount(COLS);
Promise.all([J('/v1/questions/index.json'),J('/v1/atlas/index.json'),J('/v1/maps/index.json'),J('/v1/mine/topic2-all/index.json'),J('/v1/enrich/topic_graphics.json')]).then(([d,ax,mx,tx,tg])=>{
  if(!d){$('#by').textContent='The questions could not be loaded. Reload the page to try again.';return;}
  DQS=(ax&&ax.questions)||[];MAPQ=new Map(((mx&&mx.questions)||[]).map(q=>[q.id,q]));LABEL=new Map(((tx&&tx.topics)||[]).map(x=>[x.s,x.t]));TGK=tg;
  IX=d;const total=d.topics.reduce((n,t)=>n+t.questions,0);
  $('#by').textContent=`${total.toLocaleString()} questions that three or more works of the library ask, each with every work and page that asks it, the oldest author first. ${d.topics.length} topics, one for each locus of the atlas of disputed questions.`;
  /* the page's one note on method */
  $('#note').textContent='How this page is drawn. The questions are grouped by a machine reading of each work’s questions: a question is listed under another’s wording when the two ask the same thing. A work is placed at the year the questions give its author (most often his year of birth); where they give none, at the library’s date for him or, failing that, the year of his author page, printed “c.”; a work with none is counted as undated and not drawn. Its color is its author’s tradition: the shelf of his author page, else the shelf of the Patrologia the work belongs to; a work with neither is gray. In the list, a tick marks each question’s earliest asker and a bar runs to its latest, at the same years. A disputed question’s tally and positions are the atlas’s and the maps’, read by machine from each author’s pages. Open a page to read how it is asked and answered.';
  $('#tsel').innerHTML=d.topics.map(t=>`<option value="${esc(t.topic)}">${esc(NAMES[t.topic]||t.topic)} (${t.questions.toLocaleString()})</option>`).join('');
  const [t,b,i]=(()=>{try{return decodeURIComponent(location.hash.slice(1));}catch(_){return location.hash.slice(1);}})().split('/');
  showT(d.topics.some(x=>x.topic===t)?t:d.topics[0].topic,b,i!==undefined&&i!==''?Number(i):null,false);
});
