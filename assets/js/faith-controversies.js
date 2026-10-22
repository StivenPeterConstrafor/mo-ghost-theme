/* The controversies: ported from The Faith Received (tools/prdl_reader_prototype/controversies.html, 2026-10-22); the data from the
   library worker, links into the reader and the author pages on this site. One function scope, so its names meet no other script's. */
window.__FR_BLOB_BASE__=window.__FR_BLOB_BASE__||"https://mo-tfr-library.mo-podcast-feed.workers.dev";
window.__FR_READER_PATH__=window.__FR_READER_PATH__||"/the-faith-received/read/";
(() => {
const BASE=(window.__FR_BLOB_BASE__||'').replace(/\/$/,'');
const $=s=>document.querySelector(s),esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const J=u=>fetch(u).then(r=>r.ok?r.json():null).catch(()=>null);
const READER=(window.__FR_READER_PATH__||'/read');
const read=(w,p)=>`${READER}?w=${encodeURIComponent(w)}#b${encodeURIComponent(p)}-0`;
const MAPS='/the-faith-received/maps/',ATLAS='/the-faith-received/disputed-questions/',TAIL=' | Controversies | The Faith Received | Mere Orthodoxy';
/* an author's page on this site, by his name folded as the author page folds it */
const roomHref=r=>`/the-faith-received/author/?a=${encodeURIComponent(fold(r.a))}`;
const KIND={contradiction:'They contradict',distinction:'A distinction, not a denial',emphasis:'A difference of emphasis',agreement:'They agree'};
const fmt=n=>Number(n||0).toLocaleString('en-US');
const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
/* THE DEBATES (2026-10-22): each pair file and index row names its debate (`debate`, `debate_title`) and carries a label that says the
   debate first; the board groups the works by it. ORDER only orders the debates the data names; one it does not know comes after them. */
const ORDER=['thomists-scotists','rome-reformation','reformed-adversaries','lutherans-socinians'];
/* THE SCHOOLS, copied from runs/minimax_1019/controversies/pairs.py (SCHOOLS, the curated map that also fills each pair file's
   `schools`). A name in two schools (Gregory of Rimini) takes the later, as the build does. SAME: the name the library's rooms and maps
   give a man the school map names otherwise (one person, two spellings). */
const SCHOOLS={"Thomist":["Thomas Aquinas","Johannes Capreolus","Thomas Cajetan","Sylvester of Ferrara","Domingo Báñez","John of St. Thomas","Poinsot / John of St. Thomas","Jean-Baptiste Gonet","Charles René Billuart","Domingo de Soto","Francisco de Vitoria","Melchior Cano","Salamanticenses","Vincent Contenson","Antoine Goudin","Thomas of Strasbourg"],"Scotist":["John Duns Scotus","Juan de Rada","Johannes Maria Zamora","Claude Frassen","Bartolomeo Mastri","Francis of Meyronnes","Antonius Andreas","William of Vaurouillon","Hugh Cavellus","Luke Wadding","John Punch","Francis Lychetus"],"Nominalist":["William of Ockham","Gabriel Biel","Gregory of Rimini","Pierre d'Ailly","Adam Wodeham","Marsilius of Inghen"],"Jesuit":["Francisco Suárez","Gabriel Vásquez","Luis de Molina","Robert Bellarmine","Leonard Lessius","Martin Becanus","Juan de Lugo","Diego Laínez","Alfonso Salmerón","Francisco de Toledo","Martínez de Ripalda","Jakob Gretser","Adam Tanner","Gregory of Valencia"],"Augustinian":["Giles of Rome","Gregory of Rimini","Cornelius Jansen","Henry Noris","Lorenzo Berti"],"Other medieval":["Durand of Saint-Pourçain","Peter Aureol","Henry of Ghent","Godfrey of Fontaines","Richard of Middleton","Bonaventure","Albertus Magnus","Alexander of Hales"]};
const SAME={'John of St. Thomas':'Poinsot / John of St. Thomas','Juan de Rada':'Juan de Rada Obs.','Bartolomeo Mastri':'Mastri / Mastrius','Melchior Cano':'Melchor Cano','Albertus Magnus':'Albert the Great','Lorenzo Berti':'Giovanni Lorenzo Berti','Henry Noris':'Enrico Noris'};
/* WHOSE WORDS: a pair file's own-words passages carry the work, not its author. own.py chose them from one catalogue author's works a
   side: the pair's own author for side a and for a fixed side b; for a side b that varies by question, the first opponent its name
   mentions (NAMES, in order) whom the library holds. AUTH and NAMES are copied from pairs.py. NOTHELD is a snapshot of the NAMES authors
   the library did not hold when the files were built (2026-10-21): if one of them is ingested and the files rebuilt, take him out. */
const AUTH={"thomas-scotus":[["Thomas Aquinas"],"John Duns Scotus"],"thomas-capreolus":[["Thomas Aquinas"],"varies"],"turretin-opponents":[["François Turretin"],"varies"],"trent-chemnitz":[["Acts of the Council of Trent"],"Martin Chemnitz"],"bellarmine-reformers":[["Robert Bellarmine"],"varies"],"ames-bellarmine":[["William Ames"],"Robert Bellarmine"],"whitaker-rome":[["William Whitaker"],"varies"],"chamier-rome":[["Daniel Chamier"],"varies"],"calov-socinians":[["Abraham Calov"],"varies"],"suarez-schools":[["Francisco Suárez"],"varies"],"voetius-opponents":[["Gisbertus Voetius"],"varies"],"synopsis-opponents":[["Johannes Polyander, André Rivet, Antonius Walaeus and Antonius Thysius","André Rivet","Antonius Walaeus"],"varies"],"saumur-opponents":[["Saumur Divines (Cappel · Amyraut · La Place)","Moïse Amyraut"],"varies"],"sedan-opponents":[["Sedan Academy","Louis Le Blanc de Beaulieu"],"varies"],"maresius-adversaries":[["Samuel Maresius / Desmarets"],"varies"],"hommius-papists":[["Festus Hommius"],"varies"],"gomarus-adversaries":[["Franciscus Gomarus"],"varies"],"spanheim-adversaries":[["Friedrich Spanheim"],"varies"],"zamora-schools":[["Johannes Maria Zamora"],"varies"],"cajetan-scotus":[["Thomas Cajetan"],"John Duns Scotus"]};
const NAMES=[["scotus","John Duns Scotus"],["duns","John Duns Scotus"],["durand","Durand of Saint-Pourçain"],["durandus","Durand of Saint-Pourçain"],["thomas","Thomas Aquinas"],["aquinas","Thomas Aquinas"],["bonaventure","Bonaventure"],["henry of ghent","Henry of Ghent"],["giles","Giles of Rome"],["aegidius","Giles of Rome"],["albert","Albertus Magnus"],["ockham","William of Ockham"],["occam","William of Ockham"],["gregory of rimini","Gregory of Rimini"],["godfrey","Godfrey of Fontaines"],["richard of middleton","Richard of Middleton"],["bellarmine","Robert Bellarmine"],["papist","Robert Bellarmine"],["romanist","Robert Bellarmine"],["roman","Robert Bellarmine"],["jesuit","Robert Bellarmine"],["becanus","Robert Bellarmine"],["chemnitz","Martin Chemnitz"],["gerhard","Johann Gerhard"],["calov","Abraham Calov"],["lutheran","Abraham Calov"],["ubiquitarian","Abraham Calov"],["arminius","Jacobus Arminius"],["episcopius","Simon Episcopius"],["remonstrant","Jacobus Arminius"],["arminian","Jacobus Arminius"],["molina","Luis de Molina"],["molinist","Luis de Molina"],["jansen","Cornelius Jansen"],["calvin","John Calvin"],["calvinist","John Calvin"],["luther","Martin Luther"],["kemnit","Martin Chemnitz"],["chemnit","Martin Chemnitz"],["brenz","Johannes Brenz"],["brentius","Johannes Brenz"],["melanchthon","Philipp Melanchthon"],["trent","Acts of the Council of Trent"],["tridentine","Acts of the Council of Trent"],["stapleton","Thomas Stapleton"],["ames","William Ames"],["whitaker","William Whitaker"],["chamier","Daniel Chamier"],["becan","Martinus Becanus"],["gretser","Jakob Gretser"],["baronius","Caesar Baronius"],["socinus",null],["crell",null],["smalcius",null],["suarez","Francisco Suárez"],["suárez","Francisco Suárez"],["cajetan","Thomas Cajetan"],["caietan","Thomas Cajetan"],["capreol","Johannes Capreolus"],["ferrar","Sylvester of Ferrara"],["sylvester","Sylvester of Ferrara"],["nominal","William of Ockham"],["biel","Gabriel Biel"],["vasquez","Gabriel Vásquez"],["vázquez","Gabriel Vásquez"],["zabarella","Jacopo Zabarella"],["thomist","Thomas Aquinas"],["scotist","John Duns Scotus"],["fonseca",null],["javelli",null],["soncinas",null],["soto",null],["toletus",null],["cocceius","Johannes Cocceius"],["cocceian","Johannes Cocceius"],["grotius","Hugo Grotius"],["vorstius","Conrad Vorstius"],["amyraut","Moïse Amyraut"],["amyrald","Moïse Amyraut"],["salmurian","Moïse Amyraut"],["saumur","Moïse Amyraut"],["la place","Saumur Divines (Cappel · Amyraut · La Place)"],["placaeus","Saumur Divines (Cappel · Amyraut · La Place)"],["cappel","Saumur Divines (Cappel · Amyraut · La Place)"],["testard","Paul Testard"],["maccovius","Johannes Maccovius"],["jansenist","Cornelius Jansen"],["limborch","Philippus van Limborch"],["maresius","Samuel Maresius / Desmarets"],["desmarets","Samuel Maresius / Desmarets"],["lessius","Leonard Lessius"],["vedelius","Nicolaus Vedelius"],["lubbertus","Sibrandus Lubbertus"],["daill","Jean Daillé"],["hoornbeeck","Johannes Hoornbeeck"],["twisse","William Twisse"],["perkins","William Perkins"],["gomarus","Franciscus Gomarus"],["voetius","Gisbertus Voetius"],["voetian","Gisbertus Voetius"],["spanheim","Friedrich Spanheim"],["heidegger","Johann Heinrich Heidegger"],["wittich","Christoph Wittich"],["burman","Frans Burman"],["le blanc","Louis Le Blanc de Beaulieu"],["rivet","André Rivet"],["walaeus","Antonius Walaeus"],["hommius","Festus Hommius"],["junius","Franciscus Junius"],["zanchi","Girolamo Zanchi"],["musculus","Wolfgang Musculus"],["socinian",null],["ostorod",null],["volkel",null],["schlichting",null],["cartesian",null],["descartes",null],["hobbes",null],["spinoza",null],["anabaptist",null],["menno",null],["curcell",null],["servet",null],["pelagian",null],["pelagius",null]];
const NOTHELD=new Set(["Albertus Magnus","Giles of Rome","Godfrey of Fontaines","Martinus Becanus","Richard of Middleton","Thomas Stapleton"]);
const pkey=n=>fold(SAME[n]||n);
const SCHOOL_OF=new Map();for(const [s,ns] of Object.entries(SCHOOLS))for(const n of ns)SCHOOL_OF.set(pkey(n),s);
const schoolOf=n=>(n&&SCHOOL_OF.get(pkey(n)))||'';
const sc=s=>s?` sc-${fold(s)}`:'';
const dot=s=>s?`<i class="dot${sc(s)}" aria-hidden="true"></i>`:'';
const schTag=s=>s?`<span class="sch"> · ${esc(s)}</span>`:'';
/* the authors' rooms: a name links only where the library has his room (the shelves these debates draw on) */
const ROOMS=new Map();
const ROOMS_P=Promise.all(['md','rc','rf','lu','ed'].map(sh=>J(`${BASE}/v1/bible/${sh}/rooms/index.json`))).then(xs=>{for(const x of xs)for(const r of (x&&x.authors)||[]){const k=fold(r.a);if(!ROOMS.has(k))ROOMS.set(k,r);}});
const roomOf=n=>ROOMS.get(pkey(n))||ROOMS.get(fold(n));
const who=(n,label)=>{const r=n&&roomOf(n);return r?`<a href="${roomHref(r)}">${esc(label||n)}</a>`:`<span>${esc(label||n)}</span>`;};
const sidesOf=d=>{if(!d._A)d._A=AUTH[d.pair]||[[d.a],d.controversies.some(c=>c.b&&c.b.name)?'varies':d.b];return d._A;};
function authorOf(d,c,side){
  const A=sidesOf(d);
  if(side==='a')return A[0].length===1?A[0][0]:'';
  if(A[1]!=='varies')return A[1];
  const own=A[0].length===1?A[0][0]:'',nm=String((c.b&&c.b.name)||'').toLowerCase();
  for(const [k,v] of NAMES)if(v&&v!==own&&!NOTHELD.has(v)&&nm.includes(k))return v;
  return '';
}
/* the speaker of a side: its author, or for a side whose works are a group's (the Leiden four, Saumur, Sedan) the side itself */
const speaker=(d,c,side)=>authorOf(d,c,side)||(side==='a'?d.a:'');
/* the school of a side as a whole: the pair file's `schools` names it; a side that varies by question has none */
function sideSchool(d,side){
  const A=sidesOf(d);if(side==='b'&&A[1]==='varies')return '';
  const name=side==='a'?d.a:d.b,sch=d.schools||{};
  for(const k of Object.keys(sch))if(name===k||name.startsWith(`${k} `))return sch[k];
  return schoolOf(side==='a'?(A[0].length===1?A[0][0]:''):A[1]);
}
const labelOf=p=>p.label||`${p.a} and ${p.b}`;
/* a book's name; a work in one volume names it by the volume's address (zamora-disputationes-…), so it goes by the work's title */
const bookOf=(d,b)=>{const t=(d.books||{})[String(b)]||'';return /^[a-z0-9]+(-[a-z0-9]+)+$/.test(t)?(d.source_title||t):t;};
/* the metaphysical questions are also mapped across the whole tradition (v1/maps q294 onward) and answered in the atlas */
const ALSO={'suarez-schools':`The same questions across the tradition: <a href="${MAPS}#q294">maps of the metaphysical questions</a> · <a href="${ATLAS}#q294">every answer in the atlas</a>`};
let IX=null,LIVE=[],DS=[],D=null,CUR=null,PAIR=null,OPEN=null,VIEW='',DEB=null,RUN=0;const KINDS=new Set(),DSCH=new Set();
const DOCS=new Map();
const doc=p=>{if(!DOCS.has(p))DOCS.set(p,J(`${BASE}/v1/enrich/controversies/${encodeURIComponent(p)}.json`).then(d=>{if(!d)DOCS.delete(p);return d;}));return DOCS.get(p);};
const pg=(w,p,label)=>p?`<a class="pg" href="${read(w,p)}" target="_blank" rel="noopener">${esc(label||`p. ${p}`)}</a>`:'';
const range=s=>s.p1&&String(s.p1)!==String(s.p0)?`pp. ${s.p0}–${s.p1}`:`p. ${s.p0}`;
/* a side that is a party (the Reformers, the schools, the Council, an academy) speaks in their own words; one man in his */
const many=(slug,name)=>/^(critics|opponents|adversaries|reformers|rome|socinians|schools|papists|council-of-trent|bellarmine-stapleton)$/.test(slug||'')||/;|\band\b|\b(divines|academy|acts|salamanticenses)\b/i.test(name||'')||/^(the|schools|papists|opponents)\b/i.test(name||'');

/* THE BOARD: the debates, each a link to its own view, and under each its works of controversy with a read (n > 0) */
function debates(){
  const by=new Map();
  for(const p of LIVE){const id=p.debate||'other';if(!by.has(id))by.set(id,{id,title:p.debate_title||(id==='other'?'Other works of controversy':id),pairs:[],n:0});const g=by.get(id);g.pairs.push(p);g.n+=p.n;}
  const rank=id=>{const k=ORDER.indexOf(id);return k<0?(id==='other'?99:50):k;};
  return [...by.values()].sort((a,b)=>rank(a.id)-rank(b.id));
}
function renderBoard(){
  const host=$('#pairs');if(!IX)return;
  /* the board opens on a wide screen for the landing and a work; an address that names one controversy or one debate lands on it; a phone keeps it folded */
  if(OPEN==null){const h=want();OPEN=!matchMedia('(max-width:760px)').matches&&(!h||LIVE.some(p=>p.pair===h));}
  const curP=VIEW==='pair'?LIVE.find(p=>p.pair===PAIR):null,curD=VIEW==='debate'&&DEB?DEB.g:null,cur=curP?labelOf(curP):curD?curD.title:'';
  host.innerHTML=`<details class="pairs"${OPEN?' open':''}><summary><span>The debates</span><span class="ct">${LIVE.length} works</span>${cur?`<span class="cur">${esc(cur)}</span>`:''}</summary>
    <nav class="pg-groups" aria-label="The debates and their works of controversy">${DS.map(g=>`<section class="pg-group" aria-labelledby="pg-${esc(g.id)}"><h2 id="pg-${esc(g.id)}"><a class="dl" href="#debate/${esc(g.id)}"${curD&&curD.id===g.id?' aria-current="page"':''}><span>${esc(g.title)}</span><span class="ct">${fmt(g.n)}<span class="sr"> controversies</span></span></a></h2><ul>${g.pairs.map(p=>
      `<li><a class="pl" href="#${esc(p.pair)}"${curP&&p.pair===curP.pair?' aria-current="page"':''}><span>${esc(labelOf(p))}</span><span class="ct">${fmt(p.n)}<span class="sr"> controversies</span></span></a>${ALSO[p.pair]?`<p class="pg-also">${ALSO[p.pair]}</p>`:''}</li>`).join('')}</ul></section>`).join('')}</nav></details>`;
}
function viewIs(v){VIEW=v;$('#deb').hidden=v!=='debate';$('#pv').hidden=v!=='pair';}

/* THE PAIR VIEW: one work of controversy, its controversies one by one */
function pairHead(){
  const sides=['a','b'].map(s=>{const h=sideSchool(D,s);return `${dot(h)}${esc(s==='a'?D.a:D.b)}${schTag(h)}`;});
  $('#src').innerHTML=`<h2 id="pairH">${esc(labelOf(D))}<span class="ct"><span class="sr">, </span>${fmt(D.n)}<span class="sr"> controversies</span></span></h2>
    <dl class="lab">${D.debate?`<div><dt>Debate</dt><dd><a href="#debate/${esc(D.debate)}">${esc(D.debate_title||D.debate)}</a></dd></div>`:''}<div><dt>Sides</dt><dd>${sides[0]} and ${sides[1]}</dd></div>
    <div><dt>Argued in</dt><dd><em>${esc(D.source_title)}</em>, ${esc(D.source)}${D.source_note?` (${esc(D.source_note)})`:''}</dd></div></dl>`;
}
const quoteHTML=q=>`<figure class="own"><blockquote><p>${esc(q.quote)}</p></blockquote><figcaption><span>${esc(q.t)}</span>${pg(q.w,q.p)}</figcaption>${q.says?`<p class="says">${esc(q.says)}</p>`:''}</figure>`;
const whoLine=n=>{const s=schoolOf(n);return `<p class="who">${dot(s)}${who(n)}${schTag(s)}</p>`;};
function sideHTML(c,side){
  const s=c[side],args=s.arguments||[],own=s.picks||[],varies=side==='b'&&sidesOf(D)[1]==='varies';
  const name=side==='a'?D.a:(c.b.name||D.b),slug=side==='a'?D.a_slug:(c.b.name?'':D.b_slug),hs=sideSchool(D,side),au=varies?authorOf(D,c,'b'):'';
  const their=au?many('',au):many(slug,name);
  return `<section class="side"><h3${String(name).length>48?' class="long"':''}>${dot(hs)}${esc(name)}${schTag(hs)}</h3>
    <h4>Position, as ${esc(D.source)} states it</h4><p class="pos">${s.reported?esc(s.reported):'<span class="muted">Not stated.</span>'}</p>
    ${args.length?`<h4>Arguments <span class="ct">${args.length}</span></h4><ol class="rows args">${args.map(a=>`<li><span>${esc(a.arg)}</span>${pg(c.source.w,a.page)}</li>`).join('')}</ol>`:''}
    <h4>In ${their?'their':'his'} own words${own.length?` <span class="ct">${own.length}</span>`:''}</h4>
    ${own.length?`${au?whoLine(au):''}${s.position?`<p class="gist">${esc(s.position)}</p>`:''}${own.map(quoteHTML).join('')}`
      :`<p class="muted">No page of ${their?'their':'his'} works was found to answer this question yet.</p>`}</section>`;
}
/* ACROSS THE TRADITION (2026-10-21, owner: "line up people for or against"): the classic question nearest the controversy, the positions
   the map of the tradition gives it and how many authors stand in each; once the map arrives, the authors of the schools placed at each
   position, by school; a door to the map and to every answer. */
const MQ=new Map();
const mapQ=id=>{if(!MQ.has(id))MQ.set(id,J(`${BASE}/v1/maps/q/${encodeURIComponent(id)}.json`));return MQ.get(id);};
function acrossHTML(a,uid,h){
  const pos=(a.positions||[]),tot=pos.reduce((n,p)=>n+p[1],0)||1;
  const bars=pos.length?`<ol class="across-pos" data-q="${esc(a.id)}">${pos.map(([l,n])=>`<li data-pos="${esc(l)}"><span class="ap-l">${esc(l)}</span><span class="ap-bar" aria-hidden="true"><i style="width:${Math.max(2,Math.round(n/tot*100))}%"></i></span><span class="ap-n">${n}</span></li>`).join('')}</ol>`:(a.tally?`<p class="muted">${Object.entries(a.tally).filter(([k])=>k!=='unclear').map(([k,n])=>`${n} ${esc(k)}`).join(' · ')}</p>`:'');
  return `<section class="across" aria-labelledby="across-${uid}"><${h} id="across-${uid}">Across the tradition</${h}><p class="across-q">${esc(a.q)}<span class="muted"> · ${esc(a.locus)}${a.authors?` · ${a.authors} authors answer`:''}</span></p>${bars}<p class="across-links">${pos.length?`<a href="${MAPS}#${esc(a.id)}">The map: every author placed, the lines between them</a> · `:''}<a href="${ATLAS}#${esc(a.id)}">Every answer in the atlas</a></p></section>`;
}
function fillHolders(root){
  const ol=root&&root.querySelector('.across-pos[data-q]');if(!ol)return;
  mapQ(ol.dataset.q).then(m=>{
    if(!m||!ol.isConnected||ol.dataset.filled)return;ol.dataset.filled='1';
    const P=new Map((m.positions||[]).map(p=>[p.label,p]));
    for(const li of ol.querySelectorAll('li[data-pos]')){
      const p=P.get(li.dataset.pos);if(!p)continue;
      const by=new Map(),seen=new Set();
      for(const x of p.holders||[]){const s=schoolOf(x.author),k=pkey(x.author);if(!s||seen.has(k))continue;seen.add(k);if(!by.has(s))by.set(s,[]);by.get(s).push(x.author);}
      if(by.size)li.insertAdjacentHTML('beforeend',`<span class="ap-who">${Object.keys(SCHOOLS).filter(s=>by.has(s)).map(s=>`<span class="run">${dot(s)}<span><b>${esc(s)}</b>${by.get(s).map(n=>who(n)).join(', ')}</span></span>`).join('')}</span>`);
    }
  });
}
function show(id,push){
  const i=D.controversies.findIndex(c=>c.id===id);if(i<0)return;const c=D.controversies[i];CUR=id;
  document.querySelectorAll('#books button[data-id]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.id===id)));
  const bn=c.b.name||D.b,jd=c.judgment||{},whom=jd.side==='a'?D.a:jd.side==='b'?bn:jd.side==='both'?'both':'neither';
  const prev=D.controversies[i-1],next=D.controversies[i+1],arts=c.articles||[];
  $('#c').innerHTML=`<header class="c-head"><h2>${esc(c.question)}</h2>
    <dl class="lab"><div><dt>Between them</dt><dd><span class="kind">${esc(KIND[c.kind]||c.kind)}</span></dd></div>
    ${c.place?`<div><dt>Treated at</dt><dd>${esc(c.place)}</dd></div>`:''}
    <div><dt>Source</dt><dd class="r1"><span>${bookOf(D,c.book)?`${esc(bookOf(D,c.book))}, `:''}controversy ${c.n}${c.source.title?`: <em>${esc(c.source.title)}</em>`:''}</span>${pg(c.source.w,c.source.p0,range(c.source))}</dd></div></dl>
    ${arts.length?`<details class="fold"><summary>${esc(D.source)}'s articles <span class="ct">${arts.length}</span></summary><ol class="rows">${arts.map(a=>`<li><span>${esc(a.title)}</span>${pg(c.source.w,a.page)}</li>`).join('')}</ol></details>`:''}</header>
    <div class="sides">${sideHTML(c,'a')}${sideHTML(c,'b')}</div>
    <section class="judgment"><h3>${D.self_judge?`${esc(D.source)}'s conclusion`:`${esc(D.source)}'s judgment${whom==='both'?': they agree':whom==='neither'?'':`: for ${esc(whom)}`}`}</h3><div class="r1"><p>${jd.why?esc(jd.why):'<span class="muted">Not stated.</span>'}</p>${pg(c.source.w,jd.page)}</div></section>
    ${c.atlas?acrossHTML(c.atlas,'c','h3'):''}
    <nav class="next" aria-label="Previous and next controversy">${prev?`<button type="button" data-go="${esc(prev.id)}">‹ ${esc(prev.question)}</button>`:'<span></span>'}${next?`<button type="button" data-go="${esc(next.id)}">${esc(next.question)} ›</button>`:'<span></span>'}</nav>`;
  fillHolders($('#c'));
  if(push)history.replaceState(null,'',`#${id}`);
  document.title=`${c.question}${TAIL}`;
  /* the list keeps the controversy shown in sight: the phone's bounded list, or the sticky column beside the text */
  inSight(document.querySelector(`#books button[data-id="${CSS.escape(id)}"]`),[$('#books'),$('#pv .nav')]);
}
function inSight(b,boxes){
  const box=boxes.find(x=>x&&x.scrollHeight>x.clientHeight+4);
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
  $('#books').innerHTML=[...byBook.entries()].map(([b,cs])=>`<li><details open><summary>${esc(bookOf(D,b)||`Book ${b}`)}<small>${cs.length}</small></summary><ul>${cs.map(c=>`<li><button type="button" data-id="${esc(c.id)}" aria-current="${String(c.id===CUR)}">${esc(c.question)}<small>${esc(KIND[c.kind]||c.kind)}</small></button></li>`).join('')}</ul></details></li>`).join('')||'<li class="muted">Nothing matches.</li>';
}
/* the address: #<pair>, #<controversy id> (it begins with its pair: thomas-scotus-1-01), #<pair>/<controversy id>; a debate is
   #debate/<debate>, one of its questions #debate/<debate>/<classic question id, or the first controversy's id>; no address is the first debate */
function want(){let h='';try{h=decodeURIComponent(location.hash.slice(1));}catch(_){}return h;}
function pairFor(h){let best=null;for(const p of LIVE){if((h===p.pair||h.startsWith(`${p.pair}-`)||h.startsWith(`${p.pair}/`))&&(!best||p.pair.length>best.pair.length))best=p;}return best;}
function idFor(h,pair){if(!h.startsWith(`${pair}/`))return h;const rest=h.slice(pair.length+1);return rest.startsWith(`${pair}-`)?rest:`${pair}-${rest}`;}
async function loadPair(pair,id){
  PAIR=pair;renderBoard();
  $('#src').innerHTML='';$('#books').innerHTML='<li class="muted">Loading…</li>';$('#chips').innerHTML='';
  $('#c').innerHTML='<p class="muted">Loading the controversies…</p>';
  const d=await doc(pair);
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
function showPair(pair,id){
  viewIs('pair');
  if(!D||D.pair!==pair){if(PAIR!==pair)loadPair(pair,id);else renderBoard();return;}
  PAIR=pair;renderBoard();$('#note').textContent=D.note||'';
  if(id!==CUR)show((D.controversies.find(c=>c.id===id)||D.controversies[0]).id,false);
  else document.title=`${(D.controversies.find(c=>c.id===CUR)||{}).question||labelOf(D)}${TAIL}`;
}

/* THE DEBATE VIEW: the authors lined up (by school, or side by side where the sides are not schools), then the questions where they
   split: controversies on the same classic question (`atlas`) gathered, the rest by their own question under their work; each side in
   its authors' own words, one passage each. A debate is in schools when every one of its works is argued by a man of a school. */
const schoolsMode=g=>g.pairs.every(p=>{const A=AUTH[p.pair];return !!(A&&A[0].length===1&&schoolOf(A[0][0]));});
function showDebate(id,key){
  viewIs('debate');
  const g=DS.find(x=>x.id===id)||DS[0];if(!g)return;
  if(!DEB||DEB.id!==g.id){
    const run=++RUN;DSCH.clear();
    DEB={id:g.id,g,run,mode:schoolsMode(g)?'schools':'sides',loaded:new Map(),failed:0,docs:[],groups:[],by:new Map(),vis:[],sel:null,selN:0,want:key,raf:0};
    debateShell();
    for(const p of g.pairs)doc(p.pair).then(d=>{if(!DEB||DEB.run!==run)return;if(d)DEB.loaded.set(p.pair,d);else DEB.failed++;debateFill();});
  }else{DEB.want=key;if(DEB.groups.length)pickGroup(key,true);}
  renderBoard();
  if(!DEB.sel)document.title=`${g.title}${TAIL}`;
}
function debateShell(){
  const {g} = DEB,sch=DEB.mode==='schools';
  $('#deb').innerHTML=`<header class="deb-head"><h2 id="debH">${esc(g.title)}<span class="ct"><span class="sr">, </span>${fmt(g.n)}<span class="sr"> controversies</span></span></h2>
    <dl class="lab"><div><dt>Argued in</dt><dd><ul class="argued">${g.pairs.map(p=>`<li><a href="#${esc(p.pair)}">${esc(p.source)}, <em>${esc(p.source_title)}</em></a><span class="ct">${fmt(p.n)}<span class="sr"> controversies</span></span></li>`).join('')}</ul></dd></div></dl>
    <p class="status" id="dstat" role="status">Reading the works of controversy…</p></header>
    <section class="part" aria-labelledby="luH"><h3 id="luH">${sch?'The authors, by school':'The authors, side by side'}</h3>
      <p class="hint">${sch?"A name opens the author's room; the number counts this debate's controversies that quote him in his own words.":"Each work of controversy and the authors quoted in their own words for each of its sides; the number counts its controversies that quote them."}</p><div id="lu"></div></section>
    <section class="part" aria-labelledby="spH"><h3 id="spH">${sch?'Where the schools split':'Where the sides split'}</h3>
      <p class="hint">Controversies on the same classic question are gathered under it; each side speaks in its authors' own words, one passage each.</p>
      <div class="cols"><nav class="nav" aria-label="The questions of this debate">
        <input class="find" id="dfind" type="search" placeholder="Find a question or an author" aria-label="Find a question or an author" autocomplete="off">
        <div class="chips" id="dchips" role="group" aria-label="Show the questions where these schools are quoted" hidden></div>
        <ol class="books" id="dlist"><li class="muted">Loading…</li></ol></nav>
      <article class="c" id="dq" aria-live="polite"></article></div></section>`;
}
function debateFill(){
  if(DEB.raf)return;
  DEB.raf=requestAnimationFrame(()=>{
    DEB.raf=0;const {g} = DEB;
    DEB.docs=g.pairs.map(p=>DEB.loaded.get(p.pair)).filter(Boolean);
    const done=DEB.docs.length+DEB.failed,all=g.pairs.length;
    $('#dstat').textContent=done<all?`Reading the works of controversy: ${done} of ${all}`:DEB.failed?`${DEB.failed} of the works could not be loaded. Reload the page to try again.`:'';
    $('#dstat').hidden=done>=all&&!DEB.failed;
    if(DEB.docs[0])$('#note').textContent=DEB.docs[0].note||'';
    buildGroups();
    $('#lu').innerHTML=DEB.mode==='schools'?lineupSchools():lineupSides();
    chipsD();listD();
    /* the question shown: the one the address names once its work has arrived; with none named, the first of the whole list once
       every work is read (not the first of whichever work came in first) */
    const w=DEB.want,old=DEB.sel,cur=old&&DEB.by.get(old.key);
    const hit=w&&(DEB.by.get(w)||DEB.groups.find(x=>x.items.some(({c})=>c.id===w)));
    if(hit&&hit!==cur)showGroup(hit,false);
    else if(cur&&cur.items.length!==DEB.selN)showGroup(cur,false);
    else if(cur)DEB.sel=cur;
    else if(done>=all)pickGroup(w,false);
    else $('#dq').innerHTML='<p class="muted">Reading the works of controversy…</p>';
  });
}
function buildGroups(){
  const by=new Map(),order=new Map(DEB.g.pairs.map((p,i)=>[p.pair,i]));
  for(const d of DEB.docs)for(const c of d.controversies){
    const aid=c.atlas&&c.atlas.id,k=aid?`a:${aid}`:`q:${fold(c.question)}`;
    let g=by.get(k);
    if(!g){g={key:aid||c.id,atlas:aid?c.atlas:null,q:aid?c.atlas.q:c.question,locus:aid?(c.atlas.locus||'Other'):'',items:[],sch:new Set(),hay:''};by.set(k,g);}
    g.items.push({d,c});
  }
  const groups=[...by.values()],loc=new Map();
  for(const g of groups){
    const names=[];
    for(const {d,c} of g.items)for(const s of ['a','b']){if(!(c[s].picks||[]).length)continue;const au=speaker(d,c,s);if(!au)continue;names.push(au);const h=schoolOf(au);if(h)g.sch.add(h);}
    g.hay=fold([g.q,...g.items.map(({c})=>`${c.question} ${(c.keywords||[]).join(' ')}`),...names].join(' '));
    if(g.atlas)loc.set(g.locus,(loc.get(g.locus)||0)+g.items.length);
  }
  const first=g=>g.items[0];
  groups.sort((x,y)=>{
    if(!!x.atlas!==!!y.atlas)return x.atlas?-1:1;
    if(x.atlas)return (loc.get(y.locus)-loc.get(x.locus))||x.locus.localeCompare(y.locus)||(y.items.length-x.items.length)||x.q.localeCompare(y.q);
    const a=first(x),b=first(y);
    return (order.get(a.d.pair)-order.get(b.d.pair))||(a.c.book-b.c.book)||(a.c.n-b.c.n);
  });
  DEB.groups=groups;DEB.by=new Map(groups.map(g=>[g.key,g]));
}
/* how many of the debate's controversies quote each author (a side his, with at least one passage) */
function speakerCounts(docs){
  const m=new Map();
  for(const d of docs)for(const c of d.controversies)for(const s of ['a','b']){
    if(!(c[s].picks||[]).length)continue;const au=speaker(d,c,s);if(!au)continue;
    const k=pkey(au);if(!m.has(k))m.set(k,{name:au,ids:new Set()});m.get(k).ids.add(c.id);
  }
  return m;
}
function lineupSchools(){
  const cnt=speakerCounts(DEB.docs),placed=new Set();
  const cols=Object.entries(SCHOOLS).map(([s,names])=>{
    const seen=new Set(),rows=[];
    for(const n of names){const k=pkey(n);if(seen.has(k))continue;seen.add(k);placed.add(k);rows.push({n,c:cnt.has(k)?cnt.get(k).ids.size:0});}
    const q=rows.filter(r=>r.c).sort((a,b)=>b.c-a.c),rest=rows.filter(r=>!r.c);
    return `<section class="school${sc(s)}"><h4>${dot(s)}${esc(s)}<span class="ct">${q.length?`${q.length} quoted`:'none quoted yet'}</span></h4>${q.length?`<ol class="names">${q.map(r=>`<li>${who(r.n)}<span class="ct">${fmt(r.c)}<span class="sr"> controversies</span></span></li>`).join('')}</ol>`:''}${rest.length?`<p class="also">${q.length?'Also of the school: ':''}${rest.map(r=>who(r.n)).join(', ')}</p>`:''}</section>`;
  });
  const others=[...cnt.entries()].filter(([k])=>!placed.has(k)).map(([,v])=>v).sort((a,b)=>b.ids.size-a.ids.size);
  if(others.length)cols.push(`<section class="school"><h4>Of no school named<span class="ct">${others.length} quoted</span></h4><ol class="names">${others.map(r=>`<li>${who(r.name)}<span class="ct">${fmt(r.ids.size)}<span class="sr"> controversies</span></span></li>`).join('')}</ol></section>`);
  return `<div class="schools">${cols.join('')}</div>`;
}
function lineupSides(){
  return `<ol class="plr">${DEB.docs.map(d=>{
    const by={a:new Map(),b:new Map()};
    for(const c of d.controversies)for(const s of ['a','b']){if(!(c[s].picks||[]).length)continue;const au=speaker(d,c,s);if(!au)continue;const k=pkey(au);if(!by[s].has(k))by[s].set(k,{name:au,n:0});by[s].get(k).n++;}
    const cell=s=>{const rows=[...by[s].values()].sort((x,y)=>y.n-x.n),varies=s==='b'&&sidesOf(d)[1]==='varies';
      return `<div>${varies?`<p class="plr-n">${esc(d.b)}</p>`:''}${rows.length?`<ul class="spk">${rows.map(r=>{const h=schoolOf(r.name);return `<li><span>${dot(h)}${who(r.name)}${schTag(h)}</span><span class="ct">${fmt(r.n)}<span class="sr"> controversies</span></span></li>`;}).join('')}</ul>`:'<p class="plr-n">No work of theirs in the library answers yet.</p>'}</div>`;};
    return `<li><p class="plr-t"><a href="#${esc(d.pair)}">${esc(labelOf(d))}</a><span class="ct">${fmt(d.n)}<span class="sr"> controversies</span></span></p>${cell('a')}${cell('b')}</li>`;
  }).join('')}</ol>`;
}
function chipsD(){
  const cnt=new Map();for(const g of DEB.groups)for(const s of g.sch)cnt.set(s,(cnt.get(s)||0)+1);
  const ss=Object.keys(SCHOOLS).filter(s=>cnt.has(s)),box=$('#dchips');
  for(const s of [...DSCH])if(!cnt.has(s))DSCH.delete(s);
  box.hidden=ss.length<2;
  box.innerHTML=ss.length<2?'':ss.map(s=>`<button type="button" data-sch="${esc(s)}" aria-pressed="${DSCH.has(s)}">${dot(s)}${esc(s)}<span class="ct">${fmt(cnt.get(s))}</span></button>`).join('');
}
const passD=(g,q)=>{if(q&&!g.hay.includes(q))return false;for(const s of DSCH)if(!g.sch.has(s))return false;return true;};
function itemD(g){
  const n=g.items.length,{c} = g.items[0],sch=Object.keys(SCHOOLS).filter(s=>g.sch.has(s));
  return `<li><button type="button" data-g="${esc(g.key)}" aria-current="${String(!!DEB.sel&&g.key===DEB.sel.key)}">${esc(g.q)}<small>${n>1?`${n} controversies`:esc(KIND[c.kind]||c.kind)}${sch.length?` · ${sch.join(', ')}`:''}</small></button></li>`;
}
function listD(){
  const q=fold($('#dfind').value),filt=!!(q||DSCH.size);
  DEB.vis=DEB.groups.filter(g=>passD(g,q));
  const fa=new Map(),fw=new Map();
  for(const g of DEB.vis){const m=g.atlas?fa:fw,l=g.atlas?g.locus:g.items[0].d.source;if(!m.has(l))m.set(l,[]);m.get(l).push(g);}
  let first=true;
  const li=([l,gs])=>{const open=filt||first||(!!DEB.sel&&gs.some(g=>g.key===DEB.sel.key));first=false;return `<li><details${open?' open':''}><summary>${esc(l)}<small>${gs.length}</small></summary><ul>${gs.map(itemD).join('')}</ul></details></li>`;};
  $('#dlist').innerHTML=(fa.size?`<li class="lh">Classic questions, by locus</li>${[...fa].map(li).join('')}`:'')+(fw.size?`<li class="lh">${fa.size?'The other questions, by work':'The questions, by work'}</li>${[...fw].map(li).join('')}`:'')||'<li class="muted">Nothing matches.</li>';
}
function pickGroup(key,push){
  let g=key&&DEB.by.get(key);
  if(!g&&key)g=DEB.groups.find(x=>x.items.some(({c})=>c.id===key));
  if(!g)g=DEB.vis[0]||DEB.groups[0];
  if(g)showGroup(g,push&&!!key);
}
function workHTML(w,open){
  const {d} = w,n=w.items.length,A=sidesOf(d);
  const side=s=>{
    const varies=s==='b'&&A[1]==='varies',name=s==='a'?d.a:d.b,hs=sideSchool(d,s),m=new Map();
    for(const {c} of w.items){const p=(c[s].picks||[])[0];if(!p)continue;const au=speaker(d,c,s),k=au?pkey(au):`#${c.id}`;if(!m.has(k))m.set(k,{au,p});}
    const rows=[...m.values()];
    return `<section class="side"><h5${name.length>48?' class="long"':''}>${dot(hs)}${esc(name)}${schTag(hs)}</h5>${rows.length?rows.map(r=>`${varies&&r.au?whoLine(r.au):''}${quoteHTML(r.p)}`).join('')
      :`<p class="lbl">Position, as ${esc(d.source)} states it</p><p class="pos">${esc(w.items[0].c[s].reported||'Not stated.')}</p>`}</section>`;
  };
  /* the controversies themselves, each opening in its work; more than five fold behind their count */
  const rows=`<ol class="rows cl">${w.items.map(({c})=>{const b=bookOf(d,c.book);return `<li><a href="#${esc(c.id)}">${esc(c.question)}<small>${b?`${esc(b)}, `:''}controversy ${c.n} · ${esc(KIND[c.kind]||c.kind)}</small></a></li>`;}).join('')}</ol>`;
  return `<details class="wk"${open?' open':''}><summary><span>${esc(d.source)}, <em>${esc(d.source_title)}</em></span><span class="ct">${n}<span class="sr"> ${n===1?'controversy':'controversies'}</span></span></summary>
    <div class="sides">${side('a')}${side('b')}</div>
    ${n>5?`<details class="fold"><summary>The ${n} controversies</summary>${rows}</details>`:`<p class="lbl">${n===1?'The controversy':`The ${n} controversies`}</p>${rows}`}</details>`;
}
function showGroup(g,push){
  DEB.sel=g;DEB.selN=g.items.length;
  document.querySelectorAll('#dlist button[data-g]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.g===g.key)));
  const works=[];for(const it of g.items){let w=works.find(x=>x.d===it.d);if(!w){w={d:it.d,items:[]};works.push(w);}w.items.push(it);}
  works.sort((x,y)=>y.items.length-x.items.length);
  const v=DEB.vis,i=v.indexOf(g),prev=i>0?v[i-1]:null,next=i>=0?v[i+1]:null;
  $('#dq').innerHTML=`<header class="c-head"><h4 class="qh">${esc(g.q)}</h4><dl class="lab">${g.atlas?`<div><dt>Classic question</dt><dd>${esc(g.locus)}${g.atlas.authors?` · ${fmt(g.atlas.authors)} authors answer it across the tradition`:''}</dd></div>`:''}<div><dt>Argued in</dt><dd>${works.map(w=>`${esc(w.d.source)}<span class="ct"> ${w.items.length}</span>`).join(' · ')}</dd></div></dl></header>
    ${works.map((w,k)=>workHTML(w,k<3)).join('')}
    ${g.atlas?acrossHTML(g.atlas,'dq','h5'):''}
    <nav class="next" aria-label="Previous and next question">${prev?`<button type="button" data-g="${esc(prev.key)}">‹ ${esc(prev.q)}</button>`:'<span></span>'}${next?`<button type="button" data-g="${esc(next.key)}">${esc(next.q)} ›</button>`:'<span></span>'}</nav>`;
  fillHolders($('#dq'));
  if(push)history.replaceState(null,'',`#debate/${DEB.id}/${g.key}`);
  if(VIEW==='debate')document.title=`${g.q}${TAIL}`;
  inSight(document.querySelector(`#dlist button[data-g="${CSS.escape(g.key)}"]`),[$('#dlist'),$('#deb .nav')]);
}
function route(){
  const h=want();
  if(!h||h==='debate'||h.startsWith('debate/')){const rest=h.slice(7),i=rest.indexOf('/');showDebate(i<0?rest:rest.slice(0,i),i<0?'':rest.slice(i+1));return;}
  const p=pairFor(h);
  if(!p){showDebate('','');return;}
  showPair(p.pair,idFor(h,p.pair));
}
$('#books').addEventListener('click',e=>{const b=e.target.closest('button[data-id]');if(b)show(b.dataset.id,true);});
$('#c').addEventListener('click',e=>{const b=e.target.closest('button[data-go]');if(b){show(b.dataset.go,true);$('#c').scrollIntoView({block:'start'});}});
$('#find').addEventListener('input',()=>{if(D)list();});
$('#chips').addEventListener('click',e=>{const b=e.target.closest('button[data-kind]');if(!b)return;const k=b.dataset.kind;if(KINDS.has(k))KINDS.delete(k);else KINDS.add(k);b.setAttribute('aria-pressed',String(KINDS.has(k)));list();});
$('#deb').addEventListener('click',e=>{
  if(!DEB)return;
  const g=e.target.closest('button[data-g]');
  if(g){const x=DEB.by.get(g.dataset.g);if(x){DEB.want=x.key;showGroup(x,true);if(g.closest('.next'))$('#dq').scrollIntoView({block:'start'});}return;}
  const s=e.target.closest('#dchips button[data-sch]');
  if(s){const k=s.dataset.sch;if(DSCH.has(k))DSCH.delete(k);else DSCH.add(k);s.setAttribute('aria-pressed',String(DSCH.has(k)));listD();}
});
$('#deb').addEventListener('input',e=>{if(DEB&&e.target.id==='dfind')listD();});
$('#pairs').addEventListener('toggle',e=>{if(e.target.matches('details.pairs'))OPEN=e.target.open;},true);
/* on a phone the board folds away once a debate or a work is chosen, so it is in view */
$('#pairs').addEventListener('click',e=>{if(e.target.closest('a.pl,a.dl')&&matchMedia('(max-width:760px)').matches)OPEN=false;});
addEventListener('hashchange',()=>{if(IX)route();});
addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select')||e.altKey||e.ctrlKey||e.metaKey||(e.key!=='ArrowRight'&&e.key!=='ArrowLeft'))return;
  const step=e.key==='ArrowRight'?1:-1;
  if(VIEW==='debate'&&DEB&&DEB.sel){const v=DEB.vis,i=v.findIndex(g=>g.key===DEB.sel.key),g=i<0?null:v[i+step];if(g){DEB.want=g.key;showGroup(g,true);}return;}
  if(VIEW!=='pair'||!D)return;
  const i=D.controversies.findIndex(c=>c.id===CUR),c=i<0?null:D.controversies[i+step];if(c)show(c.id,true);
});
Promise.all([J(`${BASE}/v1/enrich/controversies/index.json`),ROOMS_P]).then(([ix])=>{
  LIVE=((ix&&ix.pairs)||[]).filter(p=>p.n>0);
  if(!LIVE.length){viewIs('pair');$('#books').innerHTML='';$('#c').innerHTML='<p class="muted">The controversies could not be loaded. Reload the page to try again.</p>';return;}
  IX=ix;DS=debates();route();
});
})();
