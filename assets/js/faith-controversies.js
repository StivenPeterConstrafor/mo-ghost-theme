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
/* THE DEBATES (2026-10-22, owner: "lutherans fought with reformed too, and reformed and lutherans fought socinians"): a controversy's
   debate is the adversary it names, so a work can argue in several (Turretin against Rome, the Lutherans, the Remonstrants, the
   Socinians). index.json names the debates and their order (`debates`: id → title) and each work's count in each (`debates` on its
   row); each controversy carries its own `debate`. Nothing here names a debate: an index without that map falls back to each work's
   own (`debate`). */
const shortTitle=t=>String(t||'').replace(/\s*\(.*$/,'');
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
/* THE OPINIONS (2026-10-22, owner: "fix suarez more … what thomas and scotus etc hold and trace it to their own pages"): a work that
   weighs several schools (Suárez, Zamora) gives a controversy its opinions one by one, `opinions` (the holder as the work names him,
   the catalogue author whose pages answer for him, his school, what the work reports, the arguments, his own words), and the side it
   takes, `resolution`. They replace the two sides. A holder with no author whom the work names by his school ("the Nominalists") takes
   that school. */
const SCHOOL_WORDS=[[/thomist/i,'Thomist'],[/scotist/i,'Scotist'],[/nominalist/i,'Nominalist'],[/jesuit/i,'Jesuit'],[/augustinian/i,'Augustinian']];
const hasOps=c=>!!(c.opinions&&c.opinions.length);
/* a holder with no author yet (his own words not read) takes his school from his name, as own.py would name his author (NAMES) */
const holderAuthor=h=>{const nm=String(h||'').toLowerCase();for(const [k,v] of NAMES)if(v&&!NOTHELD.has(v)&&nm.includes(k))return v;return '';};
const opsOf=c=>(c.opinions||[]).map(o=>{
  const au=o.author||'';let s=o.school||schoolOf(au);
  if(!s&&!au){for(const [re,x] of SCHOOL_WORDS)if(re.test(o.holder||'')){s=x;break;}if(!s)s=schoolOf(holderAuthor(o.holder));}
  return {holder:o.holder||au||'',author:au,school:s,reported:o.reported||'',args:o.arguments||[],position:o.position||'',picks:o.picks||[]};
});
/* who is quoted in a controversy, and for which side: each opinion's author with a passage of his own (and the work's own author where
   his pages answer), or else the two sides' authors */
function speakersOf(d,c){
  const out=[],seen=new Set(),add=(name,side)=>{const k=`${side}|${pkey(name)}`;if(name&&!seen.has(k)){seen.add(k);out.push({name,side});}};
  if((c.a.picks||[]).length)add(speaker(d,c,'a'),'a');
  if(hasOps(c)){for(const o of opsOf(c))if(o.author&&o.picks.length)add(o.author,'b');}
  else if((c.b.picks||[]).length)add(speaker(d,c,'b'),'b');
  return out;
}
/* the side a work takes: a holder it names, or its own way */
const sidesWith=c=>{const h=String((c.resolution||{}).holder||'').trim();return !h||/^his own\b/i.test(h)?'':h;};
const labelOf=p=>p.label||`${p.a} and ${p.b}`;
/* a book's name; a work in one volume names it by the volume's address (zamora-disputationes-…), so it goes by the work's title */
const bookOf=(d,b)=>{const t=(d.books||{})[String(b)]||'';return /^[a-z0-9]+(-[a-z0-9]+)+$/.test(t)?(d.source_title||t):t;};
/* the metaphysical questions are also mapped across the whole tradition (v1/maps q294 onward) and answered in the atlas */
const ALSO={'suarez-schools':`The same questions across the tradition: <a href="${MAPS}#q294">maps of the metaphysical questions</a> · <a href="${ATLAS}#q294">every answer in the atlas</a>`};
let IX=null,LIVE=[],DS=[],D=null,CUR=null,PAIR=null,OPEN=null,LUOPEN=null,LAND=false,VIEW='',DEB=null,RUN=0;const KINDS=new Set(),DSCH=new Set();
const DOCS=new Map(),LOADED=new Map();
const doc=p=>{if(!DOCS.has(p))DOCS.set(p,J(`${BASE}/v1/enrich/controversies/${encodeURIComponent(p)}.json`).then(d=>{if(d)LOADED.set(p,d);else DOCS.delete(p);return d;}));return DOCS.get(p);};
const pgLink=(w,p,label)=>p?`<a class="pg" href="${read(w,p)}" target="_blank" rel="noopener">${esc(label||`p. ${p}`)}</a>`:'';
const range=s=>s.p1&&String(s.p1)!==String(s.p0)?`pp. ${s.p0}–${s.p1}`:`p. ${s.p0}`;
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
})({read,col:'.side,.op,#c,#dq',host:'li,figure.own,.judgment,.res,.c-head',text:''});
/* a page reference: its link to the reader and its Preview; hl, the words to mark on the page (a heading or a quotation, never a
   paraphrase) */
const pg=(w,p,label,hl)=>p?`<span class="pgs">${pgLink(w,p,label)}${PVW.btn(w,p,hl)}</span>`:'';
/* a side that is a party (the Reformers, the schools, the Council, an academy) speaks in their own words; one man in his */
const many=(slug,name)=>/^(critics|opponents|adversaries|reformers|rome|socinians|schools|papists|council-of-trent|bellarmine-stapleton)$/.test(slug||'')||/;|\band\b|\b(divines|academy|acts|salamanticenses)\b/i.test(name||'')||/^(the|schools|papists|opponents)\b/i.test(name||'');

/* THE BOARD: the debates, each a link to its own view, and under each its works of controversy with a read (n > 0) */
/* the debates in the index's order, each with the works that argue in it and their count there (a work under every debate it argues in) */
function debates(){
  const by=new Map(),map=IX.debates&&typeof IX.debates==='object'?IX.debates:null;
  const add=(id,title,p,n)=>{if(!n)return;if(!by.has(id))by.set(id,{id,title,pairs:[],n:0});const g=by.get(id);g.pairs.push({...p,n});g.n+=n;};
  if(map){for(const [id,t] of Object.entries(map))by.set(id,{id,title:t,pairs:[],n:0});for(const p of LIVE)for(const [id,n] of Object.entries(p.debates||{[p.debate||'other']:p.n}))add(id,map[id]||id,p,n);}
  else for(const p of LIVE)add(p.debate||'other',p.debate_title||'Other works of controversy',p,p.n);
  for(const g of by.values())g.pairs.sort((a,b)=>b.n-a.n);
  return [...by.values()].filter(g=>g.pairs.length);
}
const debTitle=id=>(IX&&IX.debates&&IX.debates[id])||((DS.find(g=>g.id===id)||{}).title)||id;
/* a debate's title and the company its parenthesis names: "Thomists and Scotists" over "With the Nominalists and the Jesuits" */
const splitTitle=t=>{const m=String(t||'').match(/^(.*?)\s*\((.*)\)\s*$/);return m?[m[1],m[2].charAt(0).toUpperCase()+m[2].slice(1)]:[String(t||''),''];};
/* the extra lines a work carries (the metaphysical questions mapped across the tradition), for a debate's head and a work's */
const alsoHTML=ps=>[...new Set(ps.map(p=>ALSO[p]).filter(Boolean))].map(a=>`<p class="deb-also">${a}</p>`).join('');
function renderBoard(){
  const host=$('#pairs');if(!IX)return;
  /* the board opens on a wide screen for the landing and a debate's own address; an address that names a question or a work lands on it
     with the board folded and its summary naming what is shown; a phone keeps it folded */
  if(OPEN==null){const h=want();OPEN=!matchMedia('(max-width:760px)').matches&&(!h||h==='debate'||/^debate\/[^/]+$/.test(h));}
  const curP=VIEW==='pair'?LIVE.find(p=>p.pair===PAIR):null,curD=VIEW==='debate'&&DEB?DEB.g:null,cur=curP?labelOf(curP):curD?shortTitle(curD.title):'';
  host.innerHTML=`<details class="pairs"${OPEN?' open':''}><summary><span>The debates</span><span class="ct">${fmt(DS.length)} debates, ${fmt(LIVE.length)} works</span>${cur?`<span class="cur">${esc(cur)}</span>`:''}</summary>
    <nav aria-label="The debates"><ol class="dbl">${DS.map(g=>{const [t,sub]=splitTitle(g.title);
      return `<li><a class="dl" href="#debate/${esc(g.id)}"${curD&&curD.id===g.id?' aria-current="page"':''}><span class="dl-t">${esc(t)}</span><span class="dl-s"><span class="ct">${fmt(g.n)} controversies</span>${sub?` · ${esc(sub)}`:''}</span></a></li>`;}).join('')}</ol></nav></details>`;
}
function viewIs(v){VIEW=v;$('#deb').hidden=v!=='debate';$('#pv').hidden=v!=='pair';}

/* THE PAIR VIEW: one work of controversy, its controversies one by one */
function pairHead(){
  const sides=['a','b'].map(s=>{const h=sideSchool(D,s);return `${dot(h)}${esc(s==='a'?D.a:D.b)}${schTag(h)}`;});
  /* the debates this work argues in, with its count in each (its index row; else the file's own; else its one debate) */
  const row=LIVE.find(p=>p.pair===D.pair)||{},dm=row.debates||D.debates||(D.debate?{[D.debate]:D.n}:{}),ds=Object.entries(dm).filter(([,n])=>n).sort((a,b)=>b[1]-a[1]);
  $('#src').innerHTML=`<h2 id="pairH">${esc(labelOf(D))}<span class="ct"><span class="sr">, </span>${fmt(D.n)}<span class="sr"> controversies</span></span></h2>
    <dl class="lab">${ds.length?`<div><dt>${ds.length>1?'Debates':'Debate'}</dt><dd>${ds.map(([id,n])=>`<a href="#debate/${esc(id)}">${esc(ds.length>1?shortTitle(debTitle(id)):debTitle(id))}</a>${ds.length>1?`<span class="ct"> ${fmt(n)}</span>`:''}`).join(' · ')}</dd></div>`:''}<div><dt>Sides</dt><dd>${sides[0]} and ${sides[1]}</dd></div>
    <div><dt>Argued in</dt><dd><em>${esc(D.source_title)}</em>, ${esc(D.source)}${D.source_note?` (${esc(D.source_note)})`:''}</dd></div></dl>${alsoHTML([D.pair])}`;
}
const quoteHTML=q=>`<figure class="own"><blockquote><p>${esc(q.quote)}</p></blockquote><figcaption><span>${esc(q.t)}</span>${pg(q.w,q.p,'',q.quote)}</figcaption>${q.says?`<p class="says">${esc(q.says)}</p>`:''}</figure>`;
const whoLine=n=>{const s=schoolOf(n);return `<p class="who">${dot(s)}${who(n)}${schTag(s)}</p>`;};
function sideHTML(c,side){
  const s=c[side],args=s.arguments||[],own=s.picks||[],varies=side==='b'&&sidesOf(D)[1]==='varies';
  const name=side==='a'?D.a:(c.b.name||D.b),slug=side==='a'?D.a_slug:(c.b.name?'':D.b_slug),hs=sideSchool(D,side),au=varies?authorOf(D,c,'b'):'';
  const their=au?many('',au):many(slug,name);
  return `<section class="side"><h4 class="sd-h${String(name).length>48?' long':''}">${dot(hs)}${esc(name)}${schTag(hs)}</h4>
    <h5 class="lbl">Position, as ${esc(D.source)} states it</h5><p class="pos">${s.reported?esc(s.reported):'<span class="muted">Not stated.</span>'}</p>
    ${args.length?`<h5 class="lbl">Arguments <span class="ct">${args.length}</span></h5><ol class="rows args">${args.map(a=>`<li><span>${esc(a.arg)}</span>${pg(c.source.w,a.page)}</li>`).join('')}</ol>`:''}
    <h5 class="lbl">In ${their?'their':'his'} own words${own.length?` <span class="ct">${own.length}</span>`:''}</h5>
    ${own.length?`${au?whoLine(au):''}${s.position?`<p class="gist">${esc(s.position)}</p>`:''}${own.map(quoteHTML).join('')}`
      :`<p class="muted">No page of ${their?'their':'his'} works was found to answer this question yet.</p>`}</section>`;
}
/* the opinions in the work's order, each read from the top: who holds it (his school, the author whose pages answer for him), what the
   work reports, the arguments with their pages, his own words */
function opinionsHTML(c){
  return `<div class="ops">${opsOf(c).map((o,i)=>{
    const p=(o.author?many('',o.author):many('',o.holder))?'their':'his';
    return `<section class="op">${/\bopinion\b/i.test(o.holder)?'':`<p class="op-n">Opinion ${i+1}</p>`}<h4 class="op-h${o.holder.length>60?' long':''}">${dot(o.school)}${esc(o.holder)}${schTag(o.school)}</h4>${o.author?`<p class="who">${who(o.author)}</p>`:''}
      <h5 class="lbl">Position, as ${esc(D.source)} states it</h5><p class="pos">${o.reported?esc(o.reported):'<span class="muted">Not stated.</span>'}</p>
      ${o.args.length?`<h5 class="lbl">Arguments <span class="ct">${o.args.length}</span></h5><ol class="rows args">${o.args.map(a=>`<li><span>${esc(a.arg)}</span>${pg(c.source.w,a.page)}</li>`).join('')}</ol>`:''}
      ${o.picks.length?`<h5 class="lbl">In ${p} own words <span class="ct">${o.picks.length}</span></h5>${o.position?`<p class="gist">${esc(o.position)}</p>`:''}${o.picks.map(quoteHTML).join('')}`
        :o.author?`<h5 class="lbl">In ${p} own words</h5><p class="muted">No page of ${p} works was found to answer this question yet.</p>`:''}</section>`;
  }).join('')}</div>`;
}
/* the work's resolution: whom it sides with, or its own way, at its page; then the work's author in his own words where his pages answer */
function resolutionHTML(c){
  const r=c.resolution||{},h=sidesWith(c),o=h?opsOf(c).find(x=>fold(x.holder)===fold(h)):null,me=authorOf(D,c,'a'),ms=schoolOf(me),own=c.a.picks||[];
  return `<section class="judgment"><h4 class="jd-h">${dot(ms)}${esc(D.source)} ${h?`sides with ${o?dot(o.school):''}${esc(h)}`:'resolves it his own way'}</h4><div class="r1"><p>${r.why?esc(r.why):'<span class="muted">Not stated.</span>'}</p>${pg(c.source.w,r.page)}</div>
    ${own.length?`<h5 class="lbl">In his own words <span class="ct">${own.length}</span></h5>${c.a.position?`<p class="gist">${esc(c.a.position)}</p>`:''}${own.map(quoteHTML).join('')}`:''}</section>`;
}
/* ACROSS THE TRADITION (2026-10-21, owner: "line up people for or against"): the classic question nearest the controversy, the positions
   the map of the tradition gives it and how many authors stand in each; once the map arrives, the authors of the schools placed at each
   position, by school, each with the page that places him and its Preview (2026-10-22); a door to the map and to every answer. */
const MQ=new Map();
const mapQ=id=>{if(!MQ.has(id))MQ.set(id,J(`${BASE}/v1/maps/q/${encodeURIComponent(id)}.json`));return MQ.get(id);};
function acrossHTML(a,uid,h){
  const pos=(a.positions||[]),tot=pos.reduce((n,p)=>n+p[1],0)||1;
  const bars=pos.length?`<ol class="across-pos" data-q="${esc(a.id)}">${pos.map(([l,n])=>`<li data-pos="${esc(l)}"><span class="ap-l">${esc(l)}</span><span class="ap-bar" aria-hidden="true"><i style="width:${Math.max(2,Math.round(n/tot*100))}%"></i></span><span class="ap-n">${n}</span></li>`).join('')}</ol>`:(a.tally?`<p class="muted">${Object.entries(a.tally).filter(([k])=>k!=='unclear').map(([k,n])=>`${n} ${esc(k)}`).join(' · ')}</p>`:'');
  return `<section class="across" aria-labelledby="across-${uid}"><${h} class="ac-h" id="across-${uid}">Across the tradition</${h}><p class="across-q">${esc(a.q)}<span class="muted"> · ${esc(a.locus)}${a.authors?` · ${a.authors} authors answer`:''}</span></p>${bars}<p class="across-links">${pos.length?`<a href="${MAPS}#${esc(a.id)}">The map: every author placed, the lines between them</a> · `:''}<a href="${ATLAS}#${esc(a.id)}">Every answer in the atlas</a></p></section>`;
}
function fillHolders(root){
  const ol=root&&root.querySelector('.across-pos[data-q]');if(!ol)return;
  mapQ(ol.dataset.q).then(m=>{
    if(!m||!ol.isConnected||ol.dataset.filled)return;ol.dataset.filled='1';
    const P=new Map((m.positions||[]).map(p=>[p.label,p]));
    for(const li of ol.querySelectorAll('li[data-pos]')){
      const p=P.get(li.dataset.pos);if(!p)continue;
      const by=new Map(),seen=new Set();
      for(const x of p.holders||[]){const s=schoolOf(x.author),k=pkey(x.author);if(!s||seen.has(k))continue;seen.add(k);if(!by.has(s))by.set(s,[]);by.get(s).push(x);}
      const page=x=>{const c=(x.cited&&x.cited[0])||x.cite;return c&&c[0]&&c[1]?pg(c[0],c[1]):'';};
      if(by.size)li.insertAdjacentHTML('beforeend',`<span class="ap-who">${Object.keys(SCHOOLS).filter(s=>by.has(s)).map(s=>`<span class="run">${dot(s)}<span><b>${esc(s)}</b>${by.get(s).map(x=>`${who(x.author)}${page(x)}`).join(', ')}</span></span>`).join('')}</span>`);
    }
  });
}
function show(id,push){
  const i=D.controversies.findIndex(c=>c.id===id);if(i<0)return;const c=D.controversies[i];CUR=id;
  document.querySelectorAll('#books button[data-id]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.id===id)));
  const bn=c.b.name||D.b,jd=c.judgment||{},whom=jd.side==='a'?D.a:jd.side==='b'?bn:jd.side==='both'?'both':'neither';
  const prev=D.controversies[i-1],next=D.controversies[i+1],arts=c.articles||[];
  $('#c').innerHTML=`<header class="c-head"><h3 class="qh">${esc(c.question)}</h3>
    <dl class="lab"><div class="partof" hidden><dt>Part of</dt><dd></dd></div><div><dt>Between them</dt><dd><span class="kind">${esc(KIND[c.kind]||c.kind)}</span></dd></div>
    ${c.place?`<div><dt>Treated at</dt><dd>${esc(c.place)}</dd></div>`:''}
    <div><dt>Source</dt><dd class="r1"><span>${bookOf(D,c.book)?`${esc(bookOf(D,c.book))}, `:''}controversy ${c.n}${c.source.title?`: <em>${esc(c.source.title)}</em>`:''}</span>${pg(c.source.w,c.source.p0,range(c.source),c.source.title)}</dd></div></dl>
    ${arts.length?`<details class="fold"><summary>${esc(D.source)}'s articles <span class="ct">${arts.length}</span></summary><ol class="rows">${arts.map(a=>`<li><span>${esc(a.title)}</span>${pg(c.source.w,a.page,'',a.title)}</li>`).join('')}</ol></details>`:''}</header>
    ${hasOps(c)?`${opinionsHTML(c)}${resolutionHTML(c)}`:`<div class="sides">${sideHTML(c,'a')}${sideHTML(c,'b')}</div>
    <section class="judgment"><h4 class="jd-h">${D.self_judge?`${esc(D.source)}'s conclusion`:`${esc(D.source)}'s judgment${whom==='both'?': they agree':whom==='neither'?'':`: for ${esc(whom)}`}`}</h4><div class="r1"><p>${jd.why?esc(jd.why):'<span class="muted">Not stated.</span>'}</p>${pg(c.source.w,jd.page)}</div></section>`}
    ${c.atlas?acrossHTML(c.atlas,'c','h4'):''}
    <nav class="next" aria-label="Previous and next controversy">${prev?`<button type="button" data-go="${esc(prev.id)}"><small>Previous controversy</small><span>${esc(prev.question)}</span></button>`:'<span></span>'}${next?`<button type="button" data-go="${esc(next.id)}"><small>Next controversy</small><span>${esc(next.question)}</span></button>`:'<span></span>'}</nav>`;
  fillHolders($('#c'));partOf(c);
  if(LAND){LAND=false;$('#c').scrollIntoView({block:'start'});}
  if(push)history.replaceState(null,'',`#${id}`);
  document.title=`${c.question}${TAIL}`;
  /* the list keeps the controversy shown in sight: the phone's bounded list, or the sticky column beside the text */
  inSight(document.querySelector(`#books button[data-id="${CSS.escape(id)}"]`),[$('#books'),$('#pv .nav')]);
}
function inSight(b,boxes){
  const box=boxes.find(x=>x&&x.scrollHeight>x.clientHeight+4);
  if(b&&box){const r=b.getBoundingClientRect(),br=box.getBoundingClientRect();if(r.top<br.top||r.bottom>br.bottom)box.scrollTop+=r.top-br.top-box.clientHeight/3;}
}
/* PART OF: the controversy's own debate and the question it is filed under there (the debate's file), a step up to every work's
   answer to it; with no file for that debate, the debate alone */
function partOf(c){
  const el=$('#c .partof'),deb=c.debate||(D&&D.debate);if(!el||!deb)return;
  const dl=`<a href="#debate/${esc(deb)}">${esc(debTitle(deb))}</a>`,put=h=>{el.querySelector('dd').innerHTML=h;el.hidden=false;};
  put(dl);
  debFile(deb).then(f=>{
    if(!f||!el.isConnected)return;
    if(!DEBI.has(deb)){const m=new Map();for(const x of f.questions)for(const it of x.items)m.set(it.id,x);DEBI.set(deb,m);}
    const x=DEBI.get(deb).get(c.id);if(!x)return;
    put(`<a href="#debate/${esc(deb)}/${esc(x.id)}">${esc(x.q)}</a><span class="ct"> ${x.works.length>1?`${fmt(x.works.length)} works, `:''}${fmt(x.n)} ${x.n===1?'controversy':'controversies'}</span><br><span class="muted">in </span>${dl}`);
  });
}
function list(){
  const q=($('#find').value||'').trim().toLowerCase();
  const byBook=new Map();
  for(const c of D.controversies){
    if(KINDS.size&&!KINDS.has(c.kind))continue;
    if(q&&!(c.question.toLowerCase().includes(q)||(c.keywords||[]).some(k=>k.toLowerCase().includes(q))||(c.opinions||[]).some(o=>`${o.holder} ${o.author}`.toLowerCase().includes(q))))continue;
    if(!byBook.has(c.book))byBook.set(c.book,[]);byBook.get(c.book).push(c);
  }
  /* a work that argues in several debates names each controversy's */
  const several=new Set(D.controversies.map(c=>c.debate).filter(Boolean)).size>1;
  $('#books').innerHTML=[...byBook.entries()].map(([b,cs])=>`<li><details open><summary>${esc(bookOf(D,b)||`Book ${b}`)}<small>${cs.length}</small></summary><ul>${cs.map(c=>`<li><button type="button" data-id="${esc(c.id)}" aria-current="${String(c.id===CUR)}">${esc(c.question)}<small>${esc(KIND[c.kind]||c.kind)}${hasOps(c)?` · ${c.opinions.length} ${c.opinions.length===1?'opinion':'opinions'}`:''}${several&&c.debate?` · ${esc(shortTitle(debTitle(c.debate)))}`:''}</small></button></li>`).join('')}</ul></details></li>`).join('')||'<li class="muted">Nothing matches.</li>';
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

/* THE DEBATE VIEW (2026-10-22, owner: "why do we need zamora? when we can combine because it's the same conceptual thing? same with
   capreolus, and cajetan? this is what i mean"): the debate is the unit and the question its row; the works are where its controversies
   come from. v1/enrich/controversies/debates/<debate>.json files every controversy of the debate's works under one question (the atlas's
   classic question where it is one, else a question the works share), ordered by how many works ask it. A question shows each work's
   controversies on it in the works' order, each read from its work when opened, then the classic question across the tradition. The
   works stay one step away: the By work tab, and each work's own view. A debate whose file has not come yet is gathered here from its
   works, by classic question and else by each controversy's own question. A debate is in schools when three quarters of its
   controversies come from works argued by a man of a school; its authors are lined up by school above its questions. */
const schoolsMode=g=>{let t=0,k=0;for(const p of g.pairs){const A=AUTH[p.pair];t+=p.n;if(A&&A[0].length===1&&schoolOf(A[0][0]))k+=p.n;}return t>0&&k>=t*.75;};
/* a controversy in this debate (a file without per-controversy debates counts every one) */
const inDeb=c=>!c.debate||!DEB||c.debate===DEB.id;
const DEBF=new Map(),DEBQ=new Map(),DEBI=new Map();
const debFile=id=>{if(!DEBF.has(id))DEBF.set(id,J(`${BASE}/v1/enrich/controversies/debates/${encodeURIComponent(id)}.json`).then(f=>{if(f&&Array.isArray(f.questions)){DEBQ.set(id,f);return f;}DEBF.delete(id);return null;}));return DEBF.get(id);};
const isLive=pair=>LIVE.some(p=>p.pair===pair);
const worksOf=()=>DEB.file?DEB.file.works:DEB.g.pairs.map(p=>({pair:p.pair,label:labelOf(p),source:p.source,source_title:p.source_title,n:p.n}));
function showDebate(id,key){
  viewIs('debate');
  const g=DS.find(x=>x.id===id)||DS[0];if(!g)return;
  if(!DEB||DEB.id!==g.id){
    const run=++RUN,sch=schoolsMode(g);
    DEB={id:g.id,g,run,mode:sch?'schools':'sides',file:null,fallback:false,qs:null,byQ:new Map(),byItem:new Map(),loaded:new Map(),failed:0,asked:false,docs:[],vis:[],sel:null,want:key,tab:key==='works'?'w':'q',shared:sch,raf:0};
    debateShell();
    debFile(g.id).then(f=>{
      if(!DEB||DEB.run!==run)return;
      if(f){DEB.file=f;setQuestions(f.questions);$('#dhead').innerHTML=headHTML();debNote(f.note||'');questionsUI();}
      else{DEB.fallback=true;loadAll();}
      renderBoard();
    });
    pathsFile(g.id).then(f=>{if(!f||!DEB||DEB.run!==run)return;$('#dhead').innerHTML=headHTML();debNote();if(DEB.sel)fillPaths(DEB.sel);});
  }else{DEB.want=key;debNote();if(key==='works')setTab('w',false);else{if(key||DEB.tab!=='w')setTab('q',false);if(DEB.qs&&DEB.tab==='q')pickQuestion(key,true);}}
  renderBoard();
  if(!DEB.sel)document.title=`${(DEB.file&&DEB.file.title)||g.title}${TAIL}`;
}
function headHTML(){
  const f=DEB.file,ws=worksOf();
  return `<h2 id="debH">${esc((f&&f.title)||DEB.g.title)}<span class="ct"><span class="sr">, </span>${f?`${fmt(f.n_questions)} questions · ${fmt(f.n_controversies)} controversies`:`${fmt(DEB.g.n)} controversies`}</span></h2>
    <p class="argued">Argued in ${fmt(ws.length)} ${ws.length===1?'work':'works'}: ${ws.map(w=>`${isLive(w.pair)?`<a href="#${esc(w.pair)}">${esc(w.source)}</a>`:esc(w.source)}<span class="ct"> ${fmt(w.n)}<span class="sr"> controversies</span></span>`).join(' · ')}</p>${pathsLine()}${alsoHTML(ws.map(w=>w.pair))}`;
}
function debateShell(){
  const sch=DEB.mode==='schools',luOpen=LUOPEN!=null?LUOPEN:!matchMedia('(max-width:760px)').matches&&!DEB.want;
  $('#deb').innerHTML=`<header class="deb-head" id="dhead">${headHTML()}</header>
    <div class="tabs" role="tablist" aria-label="The debate by its questions, or by its works"><button type="button" role="tab" id="tab-q" aria-controls="tp-q">Questions</button><button type="button" role="tab" id="tab-w" aria-controls="tp-w">By work</button></div>
    <p class="status" id="dstat" role="status" hidden></p>
    <section id="tp-q" role="tabpanel" aria-labelledby="tab-q">
      ${sch?`<details class="lu" id="lufold"${luOpen?' open':''}><summary><h3 class="lu-h">The authors, by school</h3><span class="lu-dig" aria-hidden="true">${Object.keys(SCHOOLS).map(s=>`<span>${dot(s)}${esc(s)}</span>`).join('')}</span><span class="lu-key">Counts: the controversies that quote him</span></summary>
        <div id="lu"><p class="muted">Reading the works…</p></div></details>`:''}
      <div class="cols"><nav class="nav" aria-label="The questions of this debate">
        <input class="find" id="dfind" type="search" placeholder="Find a question" aria-label="Find a question" autocomplete="off">
        <div class="qf"><select id="dloc" aria-label="Locus"><option value="">Every locus</option></select><button type="button" class="tgl" id="dshared" aria-pressed="${DEB.shared}">Shared by 2 or more works</button></div>
        <ol class="books" id="dlist"><li class="muted">Loading the questions…</li></ol></nav>
      <article class="c" id="dq" aria-live="polite"></article></div>
    </section>
    <section id="tp-w" role="tabpanel" aria-labelledby="tab-w" hidden>
      <div id="lw"></div>
    </section>`;
  setTab(DEB.tab,false);
  if(sch&&$('#lufold').open)loadAll();
}
/* the tabs: the questions, or the works (whose lineup reads every work) */
function setTab(k,push){
  DEB.tab=k;const w=k==='w',tq=$('#tab-q'),tw=$('#tab-w');if(!tq)return;
  tq.setAttribute('aria-selected',String(!w));tw.setAttribute('aria-selected',String(w));tq.tabIndex=w?-1:0;tw.tabIndex=w?0:-1;
  $('#tp-q').hidden=w;$('#tp-w').hidden=!w;
  if(w){loadAll();debateFill();}
  else if(DEB.qs&&!DEB.sel)pickQuestion(DEB.want,false);
  if(push)history.replaceState(null,'',`#debate/${DEB.id}${w?'/works':DEB.sel?`/${DEB.sel.id}`:''}`);
}
/* every work of the debate, read for the lineups (and, without the debate's file, for its questions) */
function loadAll(){
  if(DEB.asked)return;DEB.asked=true;const {run} = DEB,ps=worksOf().map(w=>w.pair);
  $('#dstat').hidden=false;$('#dstat').textContent='Reading the works of controversy…';
  for(const p of ps)doc(p).then(d=>{if(!DEB||DEB.run!==run)return;if(d)DEB.loaded.set(p,d);else DEB.failed++;debateFill();});
}
function debateFill(){
  if(DEB.raf)return;
  DEB.raf=requestAnimationFrame(()=>{
    DEB.raf=0;const ps=worksOf().map(w=>w.pair);
    DEB.docs=ps.map(p=>DEB.loaded.get(p)).filter(Boolean);
    if(!DEB.asked)return;
    const done=DEB.docs.length+DEB.failed,all=ps.length,st=$('#dstat');
    st.textContent=done<all?`Reading the works of controversy: ${done} of ${all}`:DEB.failed?`${fmt(DEB.failed)} of the works could not be read yet.`:'';
    st.hidden=done>=all&&!DEB.failed;
    const lu=$('#lu');if(lu&&DEB.docs.length)lu.innerHTML=lineupSchools();
    if(DEB.tab==='w')$('#lw').innerHTML=DEB.docs.length?lineupSides():'<p class="muted">Reading the works of controversy…</p>';
    if(DEB.fallback&&done>=all&&!DEB.qs){setQuestions(questionsFromPairs(DEB.docs));if(DEB.docs[0])debNote(DEB.docs[0].note||'');if(PATHD.has(DEB.id))$('#dhead').innerHTML=headHTML();questionsUI();}
  });
}
/* without the debate's file: its questions gathered from its works, in the file's shape (the classic question, else the controversy's own) */
function questionsFromPairs(docs){
  const by=new Map();
  for(const d of docs)for(const c of d.controversies){
    if(!inDeb(c))continue;
    const aid=c.atlas&&c.atlas.id,k=aid?`a:${aid}`:`q:${fold(c.question)}`;
    if(!by.has(k))by.set(k,{id:aid||c.id,q:aid?c.atlas.q:c.question,locus:aid?(c.atlas.locus||''):'',atlas:aid||null,works:[],n:0,items:[]});
    const x=by.get(k);x.n++;if(!x.works.includes(d.source))x.works.push(d.source);
    x.items.push({pair:d.pair,id:c.id,source:d.source,question:c.question,kind:c.kind,place:c.place,title:c.source.title});
  }
  return [...by.values()].sort((a,b)=>(b.works.length-a.works.length)||(b.n-a.n));
}
function setQuestions(qs){
  DEB.qs=qs;DEB.byQ=new Map(qs.map(x=>[x.id,x]));DEB.byItem=new Map();
  for(const x of qs){x.hay=fold([x.q,x.locus,...x.works,...x.items.map(i=>i.question)].join(' '));for(const i of x.items)DEB.byItem.set(i.id,x);}
}
/* the filters (a locus, or the questions not in the atlas; the questions two or more works share) and the list, then the question shown */
function questionsUI(){
  const {qs} = DEB,loc=new Map();for(const x of qs){const l=x.locus||'-';loc.set(l,(loc.get(l)||0)+1);}
  const ls=[...loc].filter(([l])=>l!=='-').sort((a,b)=>(b[1]-a[1])||a[0].localeCompare(b[0]));
  $('#dloc').innerHTML=`<option value="">Every locus (${fmt(qs.length)})</option>${ls.map(([l,n])=>`<option value="${esc(l)}">${esc(l)} (${fmt(n)})</option>`).join('')}${loc.has('-')?`<option value="-">Not in the atlas (${fmt(loc.get('-'))})</option>`:''}`;
  const sh=qs.filter(x=>x.works.length>1).length,b=$('#dshared');
  if(!sh)DEB.shared=false;
  b.hidden=!sh;b.innerHTML=`Shared by 2 or more works<span class="ct">${fmt(sh)}</span>`;b.setAttribute('aria-pressed',String(DEB.shared));
  listQ();
  if(DEB.tab==='q')pickQuestion(DEB.want,false);
}
function listQ(){
  if(!DEB.qs)return;
  const q=fold($('#dfind').value),loc=$('#dloc').value;
  DEB.vis=DEB.qs.filter(x=>(!DEB.shared||x.works.length>1)&&(!loc||(loc==='-'?!x.locus:x.locus===loc))&&(!q||x.hay.includes(q)));
  let last=-1;const per=new Map();for(const x of DEB.vis)per.set(x.works.length,(per.get(x.works.length)||0)+1);
  $('#dlist').innerHTML=DEB.vis.map(x=>{const k=x.works.length,h=k!==last?`<li class="lh"><span>Argued in ${fmt(k)} ${k===1?'work':'works'}</span><span class="ct">${fmt(per.get(k))}<span class="sr"> ${per.get(k)===1?'question':'questions'}</span></span></li>`:'';last=k;
    return `${h}<li><button type="button" data-q="${esc(x.id)}" aria-current="${String(!!DEB.sel&&DEB.sel.id===x.id)}">${esc(x.q)}<small>${k>1?'':`${esc(x.works[0]||'')} · `}${fmt(x.n)} ${x.n===1?'controversy':'controversies'}${x.locus?` · ${esc(x.locus)}`:''}</small></button></li>`;}).join('')||'<li class="muted">Nothing matches.</li>';
}
/* the question an address names (a question's id, or one of its controversies'); one the filters hide clears them; else the first shown */
function pickQuestion(key,push){
  if(!DEB.qs)return;
  let x=key&&key!=='works'?(DEB.byQ.get(key)||DEB.byItem.get(key)):null;
  if(x&&!DEB.vis.includes(x)){DEB.shared=false;$('#dshared').setAttribute('aria-pressed','false');$('#dloc').value='';$('#dfind').value='';listQ();}
  if(!x)x=DEB.vis[0]||DEB.qs[0];
  if(x)showQuestion(x,push&&!!key);
}
/* how many of the debate's controversies quote each author (a side or an opinion his, with at least one passage) */
function speakerCounts(docs){
  const m=new Map();
  for(const d of docs)for(const c of d.controversies)if(inDeb(c))for(const x of speakersOf(d,c)){
    const k=pkey(x.name);if(!m.has(k))m.set(k,{name:x.name,ids:new Set()});m.get(k).ids.add(c.id);
  }
  return m;
}
const quoted=(name,n)=>`<span class="q">${who(name)}<span class="ct">${fmt(n)}<span class="sr"> controversies</span></span></span>`;
function lineupSchools(){
  const cnt=speakerCounts(DEB.docs),placed=new Set();
  const rows=Object.entries(SCHOOLS).map(([s,names])=>{
    const seen=new Set(),rs=[];
    for(const n of names){const k=pkey(n);if(seen.has(k))continue;seen.add(k);placed.add(k);rs.push({n,c:cnt.has(k)?cnt.get(k).ids.size:0});}
    const q=rs.filter(r=>r.c).sort((a,b)=>b.c-a.c),rest=rs.filter(r=>!r.c);
    return `<li><p class="lu-s">${dot(s)}${esc(s)}<span class="ct">${q.length?`${fmt(q.length)} quoted`:'none quoted yet'}</span></p><div>${q.length?`<p class="lu-n">${q.map(r=>quoted(r.n,r.c)).join(', ')}</p>`:''}${rest.length?`<p class="lu-also">${q.length?'Also of the school: ':''}${rest.map(r=>who(r.n)).join(', ')}</p>`:''}</div></li>`;
  });
  const others=[...cnt.entries()].filter(([k])=>!placed.has(k)).map(([,v])=>v).sort((a,b)=>b.ids.size-a.ids.size);
  if(others.length)rows.push(`<li><p class="lu-s">Of no school named<span class="ct">${fmt(others.length)} quoted</span></p><div><p class="lu-n">${others.map(r=>quoted(r.name,r.ids.size)).join(', ')}</p></div></li>`);
  return `<ol class="lu-rows">${rows.join('')}</ol>`;
}
function lineupSides(){
  return `<ol class="plr">${DEB.docs.map(d=>{
    const by={a:new Map(),b:new Map()},n=d.controversies.filter(inDeb).length;
    for(const c of d.controversies)if(inDeb(c))for(const x of speakersOf(d,c)){const k=pkey(x.name),b=by[x.side];if(!b.has(k))b.set(k,{name:x.name,n:0});b.get(k).n++;}
    const cell=s=>{const rows=[...by[s].values()].sort((x,y)=>y.n-x.n);
      return `<div><p class="plr-n">${esc(s==='a'?d.a:d.b)}</p>${rows.length?`<ul class="spk">${rows.map(r=>{const h=schoolOf(r.name);return `<li><span>${dot(h)}${who(r.name)}${schTag(h)}</span><span class="ct">${fmt(r.n)}<span class="sr"> controversies</span></span></li>`;}).join('')}</ul>`:'<p class="plr-none">No work of theirs in the library answers yet.</p>'}</div>`;};
    return `<li><h3 class="plr-t"><a href="#${esc(d.pair)}">${esc(labelOf(d))}</a><span class="ct">${fmt(n)}${n<d.n?` of ${fmt(d.n)}`:''} controversies</span></h3><div class="plr-s">${cell('a')}${cell('b')}</div></li>`;
  }).join('')}</ol>`;
}
/* ONE QUESTION: each work's controversies on it, in the works' order, each a fold that reads its controversy from its work when opened
   (the first of each work open): where the work puts it, the two sides as it states them with each side's own words, or the opinions
   it weighs by school, and its judgment or resolution; then the classic question across the tradition, once */
function showQuestion(x,push){
  DEB.sel=x;DEB.want=x.id;
  document.querySelectorAll('#dlist button[data-q]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.q===x.id)));
  const ws=worksOf(),by=new Map();for(const it of x.items){if(!by.has(it.pair))by.set(it.pair,[]);by.get(it.pair).push(it);}
  const order=[...ws.map(w=>w.pair).filter(p=>by.has(p)),...[...by.keys()].filter(p=>!ws.some(w=>w.pair===p))];
  const wk=p=>ws.find(w=>w.pair===p)||{pair:p,source:by.get(p)[0].source,source_title:''};
  const v=DEB.vis,i=v.indexOf(x),prev=i>0?v[i-1]:null,next=i>=0?v[i+1]:null;
  $('#dq').innerHTML=`<header class="c-head"><h3 class="qh">${esc(x.q)}</h3><dl class="lab">${x.atlas?`<div><dt>Classic question</dt><dd>${x.locus?`${esc(x.locus)} · `:''}<a href="${MAPS}#${esc(x.atlas)}">Map of the tradition</a> · <a href="${ATLAS}#${esc(x.atlas)}">Answers in the atlas</a></dd></div>`:''}<div><dt>Argued in</dt><dd>${order.map(p=>`${esc(wk(p).source)}<span class="ct"> ${by.get(p).length}</span>`).join(' · ')}</dd></div></dl></header>
    ${order.map((p,k)=>{const w=wk(p),its=by.get(p);return `<section class="qw" aria-labelledby="qw-${k}"><h4 class="qw-h" id="qw-${k}"><span>${isLive(p)?`<a href="#${esc(p)}">${esc(w.source)}</a>`:esc(w.source)}${w.source_title?`, <em>${esc(w.source_title)}</em>`:''}</span><span class="ct">${its.length}<span class="sr"> ${its.length===1?'controversy':'controversies'}</span></span></h4>
      <ol class="qis">${its.map((it,j)=>`<li><details class="qi" data-pair="${esc(it.pair)}" data-id="${esc(it.id)}"${j===0?' open':''}><summary><span class="qi-q">${esc(it.question)}</span><small>${esc(KIND[it.kind]||it.kind||'')}${it.place?` · ${esc(it.place)}`:''}</small></summary><div class="qi-b"><p class="muted">Reading the controversy…</p></div></details></li>`).join('')}</ol></section>`;}).join('')}
    ${pathsSlot(x)}${x.atlas?`<div class="dq-across" data-q="${esc(x.atlas)}"></div>`:''}
    <nav class="next" aria-label="Previous and next question">${prev?`<button type="button" data-q="${esc(prev.id)}"><small>Previous question</small><span>${esc(prev.q)}</span></button>`:'<span></span>'}${next?`<button type="button" data-q="${esc(next.id)}"><small>Next question</small><span>${esc(next.q)}</span></button>`:'<span></span>'}</nav>`;
  document.querySelectorAll('#dq details.qi[open]').forEach(fillItem);
  fillPaths(x);
  if(x.atlas)fillAcross(x);
  if(LAND){LAND=false;$('#dq').scrollIntoView({block:'start'});}
  if(push)history.replaceState(null,'',`#debate/${DEB.id}/${x.id}`);
  if(VIEW==='debate')document.title=`${x.q}${TAIL}`;
  inSight(document.querySelector(`#dlist button[data-q="${CSS.escape(x.id)}"]`),[$('#dlist'),$('#deb .nav')]);
}
function fillItem(det){
  if(det.dataset.filled)return;det.dataset.filled='1';
  const box=det.querySelector('.qi-b'),{id} = det.dataset;
  doc(det.dataset.pair).then(d=>{
    if(!box.isConnected)return;
    const c=d&&d.controversies.find(y=>y.id===id);
    if(!c){delete det.dataset.filled;box.innerHTML=`<p class="muted">${d?'This controversy has not been read yet.':'This work could not be read. Open the question again to retry.'}</p>`;return;}
    box.innerHTML=itemBody(d,c);
    if(DEB&&DEB.sel&&DEB.sel.atlas)fillAcross(DEB.sel);
  });
}
function itemBody(d,c){
  const b=bookOf(d,c.book);
  const src=`<p class="qi-src"><span>${b?`${esc(b)}, `:''}controversy ${c.n}${c.source.title?`: <em>${esc(c.source.title)}</em>`:''}</span>${pg(c.source.w,c.source.p0,range(c.source),c.source.title)}<a class="qi-open" href="#${esc(c.id)}">Open in the work</a></p>`;
  if(hasOps(c))return src+opinionSides([{c}])+resolutionLine(d,c);
  const A=sidesOf(d),jd=c.judgment||{},bn=c.b.name||d.b,whom=jd.side==='a'?d.a:jd.side==='b'?bn:jd.side==='both'?'both':'neither';
  const side=s=>{
    const varies=s==='b'&&A[1]==='varies',name=s==='a'?d.a:bn,hs=sideSchool(d,s),au=varies?authorOf(d,c,'b'):'',p=(c[s].picks||[])[0];
    return `<section class="side"><h5 class="sd-h${String(name).length>48?' long':''}">${dot(hs)}${esc(name)}${schTag(hs)}</h5><p class="lbl">As ${esc(d.source)} states it</p><p class="pos">${c[s].reported?esc(c[s].reported):'<span class="muted">Not stated.</span>'}</p>${p?`${au?whoLine(au):'<p class="lbl">In his own words</p>'}${quoteHTML(p)}`:''}</section>`;
  };
  return `${src}<div class="sides">${side('a')}${side('b')}</div><div class="res"><p class="lbl">${d.self_judge?`${esc(d.source)}'s conclusion`:`${esc(d.source)}'s judgment${whom==='both'?': they agree':whom==='neither'?'':`: for ${esc(whom)}`}`}</p><div class="r1"><p class="pos">${jd.why?esc(jd.why):'Not stated.'}</p>${pg(c.source.w,jd.page)}</div></div>`;
}
/* the classic question across the tradition, from its map; the count of the authors who answer it, from a controversy of the question
   that carries the atlas's own entry */
function fillAcross(x){
  const box=document.querySelector(`#dq .dq-across[data-q="${CSS.escape(x.atlas)}"]`);if(!box||box.dataset.done==='2')return;
  mapQ(x.atlas).then(m=>{
    if(!box.isConnected||box.dataset.done==='2')return;
    const it=x.items.map(i=>{const d=LOADED.get(i.pair);return d&&d.controversies.find(y=>y.id===i.id);}).find(y=>y&&y.atlas&&y.atlas.id===x.atlas);
    if(box.dataset.done==='1'&&!it)return;
    const a=m?{id:x.atlas,q:m.q||x.q,locus:m.locus||x.locus,authors:it?it.atlas.authors:0,positions:(m.positions||[]).map(p=>[p.label,(p.holders||[]).length])}:(it?it.atlas:{id:x.atlas,q:x.q,locus:x.locus,positions:[]});
    box.innerHTML=acrossHTML(a,'dq','h4');box.dataset.done=it?'2':'1';fillHolders(box);
  });
}
/* AMONG THE REFORMED AND LUTHERANS (2026-10-22, owner: "metaphysics is something that reformed and lutherans get into although they
   take the paths largely done by scotists thomists etc, this part of the map"). v1/enrich/controversies/paths/<debate>.json files under
   the debate's classic questions (by the atlas's id) the Reformed and Lutheran metaphysicians who answer them (Timpler, Alsted,
   Burgersdijk, Heereboord, Goclenius, Scheibler, Martini, Calov, Meisner): each with his position in his work's words, the path he takes
   (the Thomists', the Scotists', Suárez's, the Nominalists' or his own), a line of his own words and its page. A question shows them after
   the works' controversies and before the question across the tradition, and the debate's head counts the questions they answer. PATHS
   names the debates that have a file (no index lists them); a file that does not come shows nothing. */
const PATHS=new Set(['thomists-scotists']),PATHF=new Map(),PATHD=new Map();
const pathsFile=id=>{
  if(!PATHS.has(id))return Promise.resolve(null);
  if(!PATHF.has(id))PATHF.set(id,J(`${BASE}/v1/enrich/controversies/paths/${encodeURIComponent(id)}.json?v=${Date.now()}`).then(f=>{if(!f||!f.questions||typeof f.questions!=='object')return null;PATHD.set(id,f);return f;}));
  return PATHF.get(id);
};
/* the shelves' colours, as the maps' colour table has them */
const TRAD_COL={'Greek Fathers':'#2E6E8E','Latin Fathers':'#7A4E9B','Eastern Fathers':'#5E8C61','Byzantine':'#1F8A7A','Medieval':'#B07B2A','Lutheran':'#C1593C','Reformed':'#2F7D4F','Continental Reformed':'#2F7D4F','Roman Catholic':'#A63D5A','English Divines':'#3B5BA5','Humanism and Law':'#8C7B5C'};
const PATH_LABEL={thomist:'follows the Thomists',scotist:'follows the Scotists',suarezian:'follows Suárez',nominalist:'with the Nominalists',own:'his own way'};
const PATH_ORDER=['thomist','scotist','suarezian','nominalist','own','unplaced'];
const PATH_NOTE='Among the Reformed and Lutherans, each metaphysician\'s position, the path it takes and his line are read by machine from his own pages: open the page to check it.';
/* a place as the work heads it: an English heading with its Latin after a dash keeps the English; a heading the file cut short ends at
   a whole word */
const LATIN_HEAD=/^(?:caput|quaestio|articulus|disputatio|sectio|liber|capitulum|theoremata|problema|de|an|utrum)\b/i;
function placeOf(s){
  const raw=String(s||''),cut=raw.length>=150;
  let parts=raw.trim().split(/\s+—\s+/),last=true;
  if(parts.length>1&&LATIN_HEAD.test(parts[1])){parts=[parts[0]];last=false;}
  let t=parts.reduce((a,b)=>a?`${a}${/[.?!:]$/.test(a)?' ':': '}${b}`:b,'');
  if(cut&&last&&!/[.?!)]$/.test(t)){if(!/\s$/.test(raw))t=t.replace(/\s*\S+$/,'');t=`${t.replace(/[\s,;:]+$/,'')}…`;}
  return t;
}
function pathsHTML(qid,f){
  const W=f.works||{},yr=e=>Number((W[e.slug]||[])[4])||9999;
  const es=(f.questions[qid]||[]).slice().sort((a,b)=>(PATH_ORDER.indexOf(a.path)-PATH_ORDER.indexOf(b.path))||(yr(a)-yr(b))||String(a.author).localeCompare(String(b.author))||(Number(a.page)-Number(b.page)));
  if(!es.length)return '';
  const more=Number((f.n_more||{})[qid])||0;
  return `<section class="qw pth" aria-labelledby="pth-h"><h4 class="qw-h" id="pth-h"><span>Among the Reformed and Lutherans</span><span class="ct">${fmt(es.length)}<span class="sr"> ${es.length===1?'answer':'answers'}</span></span></h4>
    <ol class="pth-rows">${es.map(e=>{const w=W[e.slug]||[],t=e.tradition||w[3]||'',lab=PATH_LABEL[e.path]||'',place=placeOf(e.place);
      return `<li><p class="pth-who"><i class="sw" style="--c:${TRAD_COL[t]||'#7A7A76'}" aria-hidden="true"></i>${who(e.author)}${t?`<small>${esc(t)}</small>`:''}${lab?`<small>${esc(lab)}</small>`:''}</p><div class="pth-b"><p>${esc(e.position)}</p>${e.quote?`<p class="pth-q">“${esc(e.quote)}”</p>`:''}${w[1]||place?`<p class="pth-src">${w[1]?`<em>${esc(w[1])}</em>`:''}${w[1]&&place?', ':''}${esc(place)}</p>`:''}</div>${pg(e.slug,e.page,'',e.quote)}</li>`;}).join('')}</ol>
    ${more?`<p class="pth-more">and ${fmt(more)} more in these works</p>`:''}</section>`;
}
/* the question's place for them: drawn at once when the file is here, else filled when it comes */
function pathsSlot(x){
  if(!PATHS.has(DEB.id))return '';
  const qid=x.atlas||x.id,f=PATHD.get(DEB.id);
  return `<div class="pth-box" data-q="${esc(qid)}"${f?' data-done="1"':''}>${f?pathsHTML(qid,f):''}</div>`;
}
function fillPaths(x){
  const qid=x.atlas||x.id,box=document.querySelector(`#dq .pth-box[data-q="${CSS.escape(qid)}"]`);if(!box||box.dataset.done)return;
  pathsFile(DEB.id).then(f=>{if(!f||!box.isConnected||box.dataset.done)return;box.dataset.done='1';box.innerHTML=pathsHTML(qid,f);});
}
/* under the debate's head: how many of its questions they answer, once the debate's questions and their file are both here */
function pathsLine(){
  const f=DEB&&PATHD.get(DEB.id);if(!f||!DEB.qs)return '';
  const n=DEB.qs.filter(x=>(f.questions[x.atlas||x.id]||[]).length).length;
  return n?`<p class="deb-also">Reformed and Lutheran metaphysicians stand on ${fmt(n)} of these questions.</p>`:'';
}
/* the debate's note, and the note on the Reformed and Lutherans where the debate has them */
function debNote(base){if(base!=null)DEB.note=base;$('#note').textContent=[DEB.note||'',PATHD.has(DEB.id)?PATH_NOTE:''].filter(Boolean).join(' ');}
/* a work's opinions as sides: the holders of one school together under it, the schools in their order, each holder with one passage of
   his own words or else what the work reports of him; the holders of no school are named after them ("Also weighed"), or, where no
   holder has a school, they are the sides */
function opinionSides(items){
  const sides=new Map(),others=new Map(),order=Object.keys(SCHOOLS);
  for(const {c} of items)for(const o of opsOf(c)){
    const k=o.school?`s:${o.school}`:`h:${fold(o.holder)}`,m=o.school?sides:others;
    if(!m.has(k))m.set(k,{school:o.school,label:o.school||o.holder,rows:new Map()});
    const {rows} = m.get(k),rk=o.author?pkey(o.author):`h:${fold(o.holder)}`,cur=rows.get(rk);
    if(!cur)rows.set(rk,{o,p:o.picks[0]||null});else if(!cur.p&&o.picks[0])cur.p=o.picks[0];
  }
  /* how the work names him, where that is not his own name ("the Thomists" for Thomas Aquinas) */
  const as=o=>o.author&&!fold(o.author).includes(fold(o.holder).replace(/^(the|st|saint)/,''))?`<span class="sch"> · ${esc(o.holder)}</span>`:'';
  const sideHTML2=sd=>`<section class="side"><h5 class="sd-h${sd.label.length>48?' long':''}">${dot(sd.school)}${esc(sd.label)}</h5>${[...sd.rows.values()].map(({o,p})=>
    `${sd.school||o.author?`<p class="who">${o.author?who(o.author):esc(o.holder)}${as(o)}</p>`:''}${p?quoteHTML(p):`<p class="pos">${esc(o.reported||'Not stated.')}</p>`}`).join('')}</section>`;
  const sch=[...sides.values()].sort((x,y)=>order.indexOf(x.school)-order.indexOf(y.school)),rest=[...others.values()];
  if(!sch.length)return `<div class="sides">${rest.map(sideHTML2).join('')}</div>`;
  return `<div class="sides">${sch.map(sideHTML2).join('')}</div>${rest.length?`<p class="also">Also weighed: ${rest.map(sd=>{const {o}=[...sd.rows.values()][0];return o.author?who(o.author,o.holder):`<span>${esc(o.holder)}</span>`;}).join(', ')}</p>`:''}`;
}
/* the side the work takes, under its opinions */
function resolutionLine(d,c){
  const r=c.resolution;if(!r||!(r.why||r.holder))return '';
  const h=sidesWith(c),me=authorOf(d,c,'a'),ms=schoolOf(me);
  return `<div class="res"><p class="lbl">${dot(ms)}${esc(d.source)} ${h?`sides with ${esc(h)}`:'resolves it his own way'}</p><div class="r1"><p class="pos">${esc(r.why||'')}</p>${pg(c.source.w,r.page)}</div></div>`;
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
  const q=e.target.closest('button[data-q]');
  if(q){const x=DEB.byQ.get(q.dataset.q);if(x){showQuestion(x,true);if(q.closest('.next'))$('#dq').scrollIntoView({block:'start'});}return;}
  const t=e.target.closest('[role="tab"]');
  if(t){setTab(t.id==='tab-w'?'w':'q',true);return;}
  if(e.target.closest('#dshared')){DEB.shared=!DEB.shared;$('#dshared').setAttribute('aria-pressed',String(DEB.shared));listQ();}
});
$('#deb').addEventListener('input',e=>{if(DEB&&e.target.id==='dfind')listQ();});
$('#deb').addEventListener('change',e=>{if(DEB&&e.target.id==='dloc')listQ();});
/* a fold opened: the authors' lineup reads every work; a controversy reads its own */
$('#deb').addEventListener('toggle',e=>{const t=e.target;if(!DEB)return;if(t.id==='lufold')LUOPEN=t.open;if(!t.open)return;if(t.id==='lufold'){loadAll();debateFill();}else if(t.matches('details.qi'))fillItem(t);},true);
$('#pairs').addEventListener('toggle',e=>{if(e.target.matches('details.pairs'))OPEN=e.target.open;},true);
/* on a phone the board folds away once a debate or a work is chosen, so it is in view */
$('#pairs').addEventListener('click',e=>{if(e.target.closest('a.pl,a.dl')&&matchMedia('(max-width:760px)').matches)OPEN=false;});
addEventListener('hashchange',()=>{if(IX)route();});
addEventListener('keydown',e=>{
  if(e.key==='Escape'&&PVW.escape()){e.preventDefault();return;}
  if(e.target.matches('input,textarea,select')||e.target.closest('.pvw')||e.altKey||e.ctrlKey||e.metaKey||(e.key!=='ArrowRight'&&e.key!=='ArrowLeft'))return;
  const step=e.key==='ArrowRight'?1:-1;
  if(VIEW==='debate'&&DEB){
    if(e.target.closest('[role="tab"]')){setTab(DEB.tab==='w'?'q':'w',true);$(DEB.tab==='w'?'#tab-w':'#tab-q').focus();return;}
    const v=DEB.vis,i=DEB.sel&&DEB.tab==='q'?v.indexOf(DEB.sel):-1,x=i<0?null:v[i+step];if(x)showQuestion(x,true);return;
  }
  if(VIEW!=='pair'||!D)return;
  const i=D.controversies.findIndex(c=>c.id===CUR),c=i<0?null:D.controversies[i+step];if(c)show(c.id,true);
});
Promise.all([J(`${BASE}/v1/enrich/controversies/index.json`),ROOMS_P]).then(([ix])=>{
  LIVE=((ix&&ix.pairs)||[]).filter(p=>p.n>0);
  if(!LIVE.length){viewIs('pair');$('#books').innerHTML='';$('#c').innerHTML='<p class="muted">The controversies could not be loaded. Reload the page to try again.</p>';return;}
  IX=ix;DS=debates();
  {const h=want(),p=pairFor(h);LAND=matchMedia('(max-width:760px)').matches&&(/^debate\/[^/]+\/(?!works$)./.test(h)||!!(p&&h!==p.pair));}
  route();
});
})();
