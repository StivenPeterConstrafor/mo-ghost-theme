/* The controversies: ported from The Faith Received (tools/prdl_reader_prototype/controversies.html, 2026-10-21); the data from the library worker, links into the reader on this site. */
window.__FR_BLOB_BASE__=window.__FR_BLOB_BASE__||"https://mo-tfr-library.mo-podcast-feed.workers.dev";
window.__FR_READER_PATH__=window.__FR_READER_PATH__||"/the-faith-received/read/";
const BASE=(window.__FR_BLOB_BASE__||'').replace(/\/$/,'');
const $=s=>document.querySelector(s),esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const J=u=>fetch(u).then(r=>r.ok?r.json():null).catch(()=>null);
const READER=(window.__FR_READER_PATH__||'/read');
const read=(w,p)=>`${READER}?w=${encodeURIComponent(w)}#b${encodeURIComponent(p)}-0`;
const MAPS='/the-faith-received/maps/',ATLAS='/the-faith-received/disputed-questions/';
const KIND={contradiction:'They contradict',distinction:'A distinction, not a denial',emphasis:'A difference of emphasis',agreement:'They agree'};
/* THE WORKS OF CONTROVERSY, under their headings (2026-10-21). Membership is data-driven: every pair v1/enrich/controversies/index.json
   lists is shown, under the heading and in the order this table gives it, with its label and, quieter, its work; a pair the table does
   not know falls under "Other" with the index's own names. Rows: [pair id, heading, label, the work (or its places and date)]. */
const GROUPS=[['schools','The schools: Thomas, Scotus, Suárez'],['rome','Rome and the Reformation'],['reformed','The Reformed and their adversaries'],['socinians','Lutherans and Socinians'],['other','Other']];
const PAIRS=[
  ['thomas-scotus','schools','Thomas and Scotus, question by question','Juan de Rada, Controversiae, 1620'],
  ['thomas-capreolus','schools','Thomas defended against Scotus, Durandus, Aureol and Ockham','Capreolus, Defensiones'],
  ['suarez-schools','schools','The metaphysical questions: Suárez and the schools','Disputationes metaphysicae'],
  ['zamora-schools','schools','The Scotist questions on God: Zamora and the schools','Disputationes de Deo uno et trino, 1626'],
  ['trent-chemnitz','rome','The Council of Trent, examined by Chemnitz','Examen Concilii Tridentini'],
  ['bellarmine-reformers','rome','Bellarmine and the Reformers he answers','Disputationes de controversiis'],
  ['ames-bellarmine','rome','Ames answers Bellarmine','Bellarminus enervatus'],
  ['whitaker-rome','rome','Whitaker answers Bellarmine and Stapleton','Disputatio de Sacra Scriptura'],
  ['chamier-rome','rome','Chamier answers Bellarmine and the Roman doctors','Panstratia catholica'],
  ['turretin-opponents','reformed','Turretin and the adversaries each question names','Institutio theologiae elencticae'],
  ['synopsis-opponents','reformed','The Leiden Synopsis and the errors it rejects',''],
  ['voetius-opponents','reformed','Voetius and the adversaries of the Utrecht disputations',''],
  ['gomarus-adversaries','reformed','Gomarus and the adversaries of his disputations','Leiden, Saumur, Groningen'],
  ['hommius-papists','reformed',"Hommius's seventy disputations against the Roman doctors",'1614'],
  ['saumur-opponents','reformed','The Saumur theses (Cappel, Amyraut, La Place) and their adversaries',''],
  ['sedan-opponents','reformed','The Sedan theses (Du Moulin, Le Blanc de Beaulieu) and their adversaries',''],
  ['spanheim-adversaries','reformed','Spanheim and the adversaries of the Geneva disputations','1652'],
  ['maresius-adversaries','reformed','Maresius and the adversaries of the Groningen disputations','Sylloge, 1660–1663'],
  ['calov-socinians','socinians','Calov answers the Socinians','Socinismus profligatus'],
];
/* the metaphysical questions are also mapped across the whole tradition (v1/maps q294 onward) and answered in the atlas */
const ALSO={'suarez-schools':`The same questions across the tradition: <a href="${MAPS}#q294">maps of the metaphysical questions</a> · <a href="${ATLAS}#q294">every answer in the atlas</a>`};
const known=p=>PAIRS.find(r=>r[0]===p.pair);
const labelOf=p=>{const r=known(p);return r?{g:r[1],label:r[2],work:r[3]}:{g:'other',label:`${p.a} and ${p.b}`,work:p.source_title||''};};
let IX=null,D=null,CUR=null,PAIR=null,OPEN=null;const KINDS=new Set();
const pg=(w,p,label)=>p?`<a class="pg" href="${read(w,p)}" target="_blank" rel="noopener">${esc(label||`p. ${p}`)}</a>`:'';
const range=s=>s.p1&&String(s.p1)!==String(s.p0)?`pp. ${s.p0}–${s.p1}`:`p. ${s.p0}`;
/* a side that is a party (the Reformers, the schools, the Council) speaks in their own words; one man in his */
const many=(slug,name)=>/^(critics|opponents|adversaries|reformers|rome|socinians|schools|papists|council-of-trent|bellarmine-stapleton)$/.test(slug||'')||/;|\band\b/.test(name||'')||/^(the|schools|papists|opponents)\b/i.test(name||'');

function renderPairs(){
  const host=$('#pairs');if(!IX)return;
  /* the board opens on a wide screen, unless the address names one controversy (a link to it should land on it); a phone keeps it folded */
  if(OPEN==null){const h=want();OPEN=!matchMedia('(max-width:760px)').matches&&!IX.pairs.some(p=>h!==p.pair&&(h.startsWith(`${p.pair}-`)||h.startsWith(`${p.pair}/`)));}
  const order=p=>{const k=PAIRS.findIndex(r=>r[0]===p.pair);return k<0?PAIRS.length:k;};
  const cur=IX.pairs.find(p=>p.pair===PAIR);
  const groups=GROUPS.map(([g,h])=>[g,h,IX.pairs.filter(p=>labelOf(p).g===g).sort((x,y)=>order(x)-order(y))]).filter(([,,ps])=>ps.length);
  host.innerHTML=`<details class="pairs"${OPEN?' open':''}><summary><span>Works of controversy</span><span class="ct">${IX.pairs.length}</span>${cur?`<span class="cur">${esc(labelOf(cur).label)}</span>`:''}</summary>
    <nav class="pg-groups" aria-label="Works of controversy">${groups.map(([g,h,ps])=>`<section class="pg-group" aria-labelledby="pg-${g}"><h2 id="pg-${g}">${esc(h)}</h2><ul>${ps.map(p=>{const m=labelOf(p);
      return `<li><a class="pl" href="#${esc(p.pair)}"${p.pair===PAIR?' aria-current="page"':''}><span>${esc(m.label)}${m.work?`<small>${esc(m.work)}</small>`:''}</span><span class="ct">${p.n}<span class="sr"> controversies</span></span></a>${ALSO[p.pair]?`<p class="pg-also">${ALSO[p.pair]}</p>`:''}</li>`;}).join('')}</ul></section>`).join('')}</nav></details>`;
}
function pairHead(){
  const m=labelOf(D);
  $('#src').innerHTML=`<h2 id="pairH">${esc(m.label)}<span class="ct"><span class="sr">, </span>${D.n}<span class="sr"> controversies</span></span></h2>
    <dl class="lab"><div><dt>Sides</dt><dd>${esc(D.a)} and ${esc(D.b)}</dd></div>
    <div><dt>Argued in</dt><dd><em>${esc(D.source_title)}</em>, ${esc(D.source)}${D.source_note?` (${esc(D.source_note)})`:''}</dd></div></dl>`;
}
function sideHTML(name,slug,s,src){
  const args=s.arguments||[],own=s.picks||[];
  return `<section class="side"><h3${String(name).length>48?' class="long"':''}>${esc(name)}</h3>
    <h4>Position, as ${esc(D.source)} states it</h4><p class="pos">${s.reported?esc(s.reported):'<span class="muted">Not stated.</span>'}</p>
    ${args.length?`<h4>Arguments <span class="ct">${args.length}</span></h4><ol class="rows args">${args.map(a=>`<li><span>${esc(a.arg)}</span>${pg(src.w,a.page)}</li>`).join('')}</ol>`:''}
    <h4>In ${many(slug,name)?'their':'his'} own words${own.length?` <span class="ct">${own.length}</span>`:''}</h4>
    ${own.length?`${s.position?`<p class="gist">${esc(s.position)}</p>`:''}${own.map(q=>`<figure class="own"><blockquote><p>${esc(q.quote)}</p></blockquote><figcaption><span>${esc(q.t)}</span>${pg(q.w,q.p)}</figcaption>${q.says?`<p class="says">${esc(q.says)}</p>`:''}</figure>`).join('')}`
      :`<p class="muted">No page of ${many(slug,name)?'their':'his'} works was found to answer this question yet.</p>`}</section>`;
}
/* ACROSS THE TRADITION (2026-10-21, owner: "line up people for or against"): the classic question nearest this controversy, with the
   positions the map of the tradition gives it and how many authors stand in each; a door to the map and to every answer. */
function acrossHTML(a){
  const pos=(a.positions||[]),tot=pos.reduce((n,p)=>n+p[1],0)||1;
  const bars=pos.length?`<ol class="across-pos">${pos.map(([l,n])=>`<li><span class="ap-l">${esc(l)}</span><span class="ap-bar" aria-hidden="true"><i style="width:${Math.max(2,Math.round(n/tot*100))}%"></i></span><span class="ap-n">${n}</span></li>`).join('')}</ol>`:(a.tally?`<p class="muted">${Object.entries(a.tally).filter(([k])=>k!=='unclear').map(([k,n])=>`${n} ${esc(k)}`).join(' · ')}</p>`:'');
  return `<section class="across" aria-labelledby="acrossH"><h3 id="acrossH">Across the tradition</h3><p class="across-q">${esc(a.q)}<span class="muted"> · ${esc(a.locus)}${a.authors?` · ${a.authors} authors answer`:''}</span></p>${bars}<p class="across-links">${pos.length?`<a href="${MAPS}#${esc(a.id)}">The map: every author placed, the lines between them</a> · `:''}<a href="${ATLAS}#${esc(a.id)}">Every answer in the atlas</a></p></section>`;
}
function show(id,push){
  const i=D.controversies.findIndex(c=>c.id===id);if(i<0)return;const c=D.controversies[i];CUR=id;
  document.querySelectorAll('#books button[data-id]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.id===id)));
  const bn=c.b.name||D.b,jd=c.judgment||{},who=jd.side==='a'?D.a:jd.side==='b'?bn:jd.side==='both'?'both':'neither';
  const prev=D.controversies[i-1],next=D.controversies[i+1],arts=c.articles||[];
  $('#c').innerHTML=`<header class="c-head"><h2>${esc(c.question)}</h2>
    <dl class="lab"><div><dt>Between them</dt><dd><span class="kind">${esc(KIND[c.kind]||c.kind)}</span></dd></div>
    ${c.place?`<div><dt>Treated at</dt><dd>${esc(c.place)}</dd></div>`:''}
    <div><dt>Source</dt><dd class="r1"><span>${esc(D.books[String(c.book)]||'')}, controversy ${c.n}${c.source.title?`: <em>${esc(c.source.title)}</em>`:''}</span>${pg(c.source.w,c.source.p0,range(c.source))}</dd></div></dl>
    ${arts.length?`<details class="fold"><summary>${esc(D.source)}'s articles <span class="ct">${arts.length}</span></summary><ol class="rows">${arts.map(a=>`<li><span>${esc(a.title)}</span>${pg(c.source.w,a.page)}</li>`).join('')}</ol></details>`:''}</header>
    <div class="sides">${sideHTML(D.a,D.a_slug,c.a,c.source)}${sideHTML(bn,c.b.name?'':D.b_slug,c.b,c.source)}</div>
    <section class="judgment"><h3>${D.self_judge?`${esc(D.source)}'s conclusion`:`${esc(D.source)}'s judgment${who==='both'?': they agree':who==='neither'?'':`: for ${esc(who)}`}`}</h3><div class="r1"><p>${jd.why?esc(jd.why):'<span class="muted">Not stated.</span>'}</p>${pg(c.source.w,jd.page)}</div></section>
    ${c.atlas?acrossHTML(c.atlas):''}
    <nav class="next" aria-label="Previous and next controversy">${prev?`<button type="button" data-go="${esc(prev.id)}">‹ ${esc(prev.question)}</button>`:'<span></span>'}${next?`<button type="button" data-go="${esc(next.id)}">${esc(next.question)} ›</button>`:'<span></span>'}</nav>`;
  if(push)history.replaceState(null,'',`#${id}`);
  document.title=`${c.question} | Controversies | The Faith Received | Mere Orthodoxy`;
  /* the list keeps the controversy shown in sight: the phone's bounded list, or the sticky column beside the text */
  const b=document.querySelector(`#books button[data-id="${CSS.escape(id)}"]`),box=[$('#books'),$('.nav')].find(x=>x.scrollHeight>x.clientHeight+4);
  if(b&&box){const r=b.getBoundingClientRect(),br=box.getBoundingClientRect();if(r.top<br.top||r.bottom>br.bottom)box.scrollTop+=r.top-br.top-box.clientHeight/3;}
}
function list(){
  const q=($('#find').value||'').trim().toLowerCase();
  const byBook=new Map();
  for(const c of D.controversies){
    if(KINDS.size&&!KINDS.has(c.kind))continue;
    if(q&&!(c.question.toLowerCase().includes(q)||(c.keywords||[]).some(k=>k.toLowerCase().includes(q))))continue;
    if(!byBook.has(c.book))byBook.set(c.book,[]);byBook.get(c.book).push(c);
  }
  $('#books').innerHTML=[...byBook.entries()].map(([b,cs])=>`<li><details open><summary>${esc(D.books[String(b)]||`Book ${b}`)}<small>${cs.length}</small></summary><ul>${cs.map(c=>`<li><button type="button" data-id="${esc(c.id)}" aria-current="${String(c.id===CUR)}">${esc(c.question)}<small>${esc(KIND[c.kind]||c.kind)}</small></button></li>`).join('')}</ul></details></li>`).join('')||'<li class="muted">Nothing matches.</li>';
}
/* the address: #<pair>, #<controversy id> (it begins with its pair: thomas-scotus-1-01) or #<pair>/<controversy id> */
function want(){let h='';try{h=decodeURIComponent(location.hash.slice(1));}catch(_){}return h;}
function pairFor(h){let best=null;for(const p of IX.pairs){if((h===p.pair||h.startsWith(`${p.pair}-`)||h.startsWith(`${p.pair}/`))&&(!best||p.pair.length>best.pair.length))best=p;}return best;}
function idFor(h,pair){if(!h.startsWith(`${pair}/`))return h;const rest=h.slice(pair.length+1);return rest.startsWith(`${pair}-`)?rest:`${pair}-${rest}`;}
async function loadPair(pair,id){
  PAIR=pair;renderPairs();
  $('#c').innerHTML='<p class="muted">Loading the controversies…</p>';
  const d=await J(`${BASE}/v1/enrich/controversies/${encodeURIComponent(pair)}.json`);
  if(PAIR!==pair)return;
  if(!d){$('#c').innerHTML='<p class="muted">The controversies could not be loaded. Reload the page to try again.</p>';return;}
  D=d;CUR=null;KINDS.clear();$('#find').value='';
  pairHead();
  $('#chips').innerHTML=Object.keys(KIND).filter(k=>D.kinds[k]).map(k=>`<button type="button" data-kind="${k}" aria-pressed="false">${esc(KIND[k])} <span class="ct">${D.kinds[k]}</span></button>`).join('');
  $('#note').textContent=D.note||'';
  list();
  const first=D.controversies.find(c=>c.id===id)||D.controversies[0];
  if(first)show(first.id,false);
}
function route(){
  const h=want(),p=pairFor(h)||IX.pairs[0];if(!p)return;
  const id=idFor(h,p.pair);
  if(!D||D.pair!==p.pair){if(PAIR!==p.pair)loadPair(p.pair,id);return;}
  if(id!==CUR)show((D.controversies.find(c=>c.id===id)||D.controversies[0]).id,false);
}
$('#books').addEventListener('click',e=>{const b=e.target.closest('button[data-id]');if(b)show(b.dataset.id,true);});
$('#c').addEventListener('click',e=>{const b=e.target.closest('button[data-go]');if(b){show(b.dataset.go,true);$('#c').scrollIntoView({block:'start'});}});
$('#find').addEventListener('input',()=>{if(D)list();});
$('#chips').addEventListener('click',e=>{const b=e.target.closest('button[data-kind]');if(!b)return;const k=b.dataset.kind;if(KINDS.has(k))KINDS.delete(k);else KINDS.add(k);b.setAttribute('aria-pressed',String(KINDS.has(k)));list();});
$('#pairs').addEventListener('toggle',e=>{if(e.target.matches('details.pairs'))OPEN=e.target.open;},true);
/* on a phone the board folds away once a work is chosen, so the controversy is in view */
$('#pairs').addEventListener('click',e=>{if(e.target.closest('a.pl')&&matchMedia('(max-width:760px)').matches)OPEN=false;});
addEventListener('hashchange',()=>{if(IX)route();});
addEventListener('keydown',e=>{if(e.target.matches('input'))return;const i=D?D.controversies.findIndex(c=>c.id===CUR):-1;if(i<0)return;if(e.key==='ArrowRight'&&D.controversies[i+1])show(D.controversies[i+1].id,true);if(e.key==='ArrowLeft'&&D.controversies[i-1])show(D.controversies[i-1].id,true);});
J(`${BASE}/v1/enrich/controversies/index.json`).then(ix=>{
  if(!ix||!(ix.pairs||[]).length){$('#c').innerHTML='<p class="muted">The controversies could not be loaded. Reload the page to try again.</p>';return;}
  IX=ix;route();
});
