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
const MAPS='/the-faith-received/maps/',ATLAS='/the-faith-received/disputed-questions/',DECKS='/the-faith-received/commentary-decks/',TAIL=' | Controversies | The Faith Received | Mere Orthodoxy';
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
const SCHOOLS={"Thomist":["Thomas Aquinas","Johannes Capreolus","Thomas Cajetan","Sylvester of Ferrara","Domingo Báñez","John of St. Thomas","Poinsot / John of St. Thomas","Jean-Baptiste Gonet","Charles René Billuart","Domingo de Soto","Francisco de Vitoria","Melchior Cano","Salamanticenses","Vincent Contenson","Antoine Goudin","Thomas of Strasbourg","Charles-René Billuart","Franciscus Sylvius","Norberto del Prado","Tommaso Zigliara","Francisco Zumel"],"Scotist":["John Duns Scotus","Juan de Rada","Johannes Maria Zamora","Claude Frassen","Bartolomeo Mastri","Francis of Meyronnes","Antonius Andreas","William of Vaurouillon","Hugh Cavellus","Luke Wadding","John Punch","Francis Lychetus","Joannes Poncius","Mastri / Mastrius","Joannes de Bassolis","Bonaventura Baro, O.F.M.","Juan de Rada Obs."],"Nominalist":["William of Ockham","Gabriel Biel","Gregory of Rimini","Pierre d'Ailly","Adam Wodeham","Marsilius of Inghen"],"Jesuit":["Francisco Suárez","Gabriel Vásquez","Luis de Molina","Robert Bellarmine","Leonard Lessius","Martin Becanus","Juan de Lugo","Diego Laínez","Alfonso Salmerón","Francisco de Toledo","Martínez de Ripalda","Jakob Gretser","Adam Tanner","Gregory of Valencia"],"Augustinian":["Giles of Rome","Gregory of Rimini","Cornelius Jansen","Henry Noris","Lorenzo Berti"],"Other medieval":["Durand of Saint-Pourçain","Peter Aureol","Henry of Ghent","Godfrey of Fontaines","Richard of Middleton","Bonaventure","Albertus Magnus","Alexander of Hales"]};
const SAME={'John of St. Thomas':'Poinsot / John of St. Thomas','Juan de Rada':'Juan de Rada Obs.','Bartolomeo Mastri':'Mastri / Mastrius','Melchior Cano':'Melchor Cano','Albertus Magnus':'Albert the Great','Lorenzo Berti':'Giovanni Lorenzo Berti','Henry Noris':'Enrico Noris','John Punch':'Joannes Poncius','John Punch (Poncius)':'Joannes Poncius','Bonaventura Baro':'Bonaventura Baro, O.F.M.','Sylvester of Ferrara (Ferrariensis)':'Sylvester of Ferrara'};
/* WHOSE WORDS: a pair file's own-words passages carry the work, not its author. own.py chose them from one catalogue author's works a
   side: the pair's own author for side a and for a fixed side b; for a side b that varies by question, the first opponent its name
   mentions (NAMES, in order) whom the library holds. AUTH and NAMES are copied from pairs.py. NOTHELD is a snapshot of the NAMES authors
   the library did not hold when the files were built (2026-10-21): if one of them is ingested and the files rebuilt, take him out. */
const AUTH={"thomas-scotus":[["Thomas Aquinas"],"John Duns Scotus"],"thomas-capreolus":[["Thomas Aquinas"],"varies"],"turretin-opponents":[["François Turretin"],"varies"],"trent-chemnitz":[["Acts of the Council of Trent"],"Martin Chemnitz"],"bellarmine-reformers":[["Robert Bellarmine"],"varies"],"ames-bellarmine":[["William Ames"],"Robert Bellarmine"],"whitaker-rome":[["William Whitaker"],"varies"],"chamier-rome":[["Daniel Chamier"],"varies"],"calov-socinians":[["Abraham Calov"],"varies"],"suarez-schools":[["Francisco Suárez"],"varies"],"voetius-opponents":[["Gisbertus Voetius"],"varies"],"synopsis-opponents":[["Johannes Polyander, André Rivet, Antonius Walaeus and Antonius Thysius","André Rivet","Antonius Walaeus"],"varies"],"saumur-opponents":[["Saumur Divines (Cappel · Amyraut · La Place)","Moïse Amyraut"],"varies"],"sedan-opponents":[["Sedan Academy","Louis Le Blanc de Beaulieu"],"varies"],"maresius-adversaries":[["Samuel Maresius / Desmarets"],"varies"],"hommius-papists":[["Festus Hommius"],"varies"],"gomarus-adversaries":[["Franciscus Gomarus"],"varies"],"spanheim-adversaries":[["Friedrich Spanheim"],"varies"],"zamora-schools":[["Johannes Maria Zamora"],"varies"],"cajetan-scotus":[["Thomas Cajetan"],"John Duns Scotus"],"banez-thomists":[["Domingo Báñez"],"varies"],"jst-thomists":[["Poinsot / John of St. Thomas"],"varies"],"gonet-thomists":[["Jean-Baptiste Gonet"],"varies"],"billuart-thomists":[["Charles-René Billuart"],"varies"],"sylvius-thomists":[["Franciscus Sylvius"],"varies"],"contenson-thomists":[["Vincent Contenson"],"varies"],"ferrara-thomists":[["Sylvester of Ferrara"],"varies"],"delprado-thomists":[["Norberto del Prado"],"varies"],"zigliara-thomists":[["Tommaso Zigliara"],"varies"],"cajetan-thomists":[["Thomas Cajetan"],"varies"],"mastri-scotists":[["Mastri / Mastrius"],"varies"],"mastri-belluto-scotists":[["Mastri / Mastrius"],"varies"],"poncius-scotists":[["Joannes Poncius"],"varies"],"baro-scotists":[["Bonaventura Baro, O.F.M."],"varies"],"frassen-scotists":[["Claude Frassen"],"varies"],"wadding-scotists":[["John Duns Scotus"],"varies"],"covenant-english":[[],"varies"]};
const NAMES=[["ball","John Ball"],["burgess","Anthony Burgess"],["bolton","Samuel Bolton"],["william strong","William Strong"],["mr. strong","William Strong"],["rutherf","Samuel Rutherford"],["sedgwick","Obadiah Sedgwick"],["preston","John Preston"],["downame","George Downame"],["downham","George Downame"],["cotton","John Cotton"],["thomas hooker","Thomas Hooker"],["mr. hooker","Thomas Hooker"],["marrow","Edward Fisher"],["fisher","Edward Fisher"],["crisp","Tobias Crisp"],["baxter","Richard Baxter"],["bunyan","John Bunyan"],["flavel","John Flavel"],["william bridge","William Bridge"],["mr. bridge","William Bridge"],["willard","Samuel Willard"],["keach","Benjamin Keach"],["calamy","Edmund Calamy"],["colquhoun","John Colquhoun"],["hadow","James Hadow"],["owen","John Owen"],["saltmarsh","John Saltmarsh"],["eaton","John Eaton"],["gataker","Thomas Gataker"],["chauncy","Isaac Chauncy"],["daniel williams","Daniel Williams"],["mr. williams","Daniel Williams"],["neonomian","Daniel Williams"],["davenant","John Davenant"],["ussher","James Ussher"],["usher","James Ussher"],["armagh","James Ussher"],["cameron","John Cameron"],["witsius","Herman Witsius"],["goodwin",null],["blake",null],["tombes",null],["gillespie",null],["roberts",null],["bulkeley",null],["antinomian",null],["john of st","Poinsot / John of St. Thomas"],["joannes a s","Poinsot / John of St. Thomas"],["ioannes a s","Poinsot / John of St. Thomas"],["poinsot","Poinsot / John of St. Thomas"],["báñez","Domingo Báñez"],["bañez","Domingo Báñez"],["banez","Domingo Báñez"],["bannes","Domingo Báñez"],["bañes","Domingo Báñez"],["gonet","Jean-Baptiste Gonet"],["billuart","Charles-René Billuart"],["contenson","Vincent Contenson"],["sylvius","Franciscus Sylvius"],["del prado","Norberto del Prado"],["zigliara","Tommaso Zigliara"],["zumel","Francisco Zumel"],["soto","Domingo de Soto"],["ferrariensis","Sylvester of Ferrara"],["medina",null],["nazari",null],["álvarez",null],["alvarez",null],["lemos",null],["godoy",null],["salmantic",null],["complutens",null],["goudin",null],["javell",null],["soncin",null],["herv",null],["curiel",null],["ledesma",null],["araujo",null],["gotti",null],["poncius","Joannes Poncius"],["pontius","Joannes Poncius"],["punch","Joannes Poncius"],["mastri","Mastri / Mastrius"],["frassen","Claude Frassen"],["bassol","Joannes de Bassolis"],["mayron","Francis of Meyronnes"],["meyron","Francis of Meyronnes"],["mairon","Francis of Meyronnes"],["cavell","Hugh Cavellus"],["bonaventura baro","Bonaventura Baro, O.F.M."],["de rada","Juan de Rada Obs."],["zamora","Johannes Maria Zamora"],["lychet",null],["lichet",null],["hiqu",null],["brancat",null],["laurea",null],["vulpes",null],["volpe",null],["belluto",null],["bellut",null],["tartaret",null],["trombet",null],["smising",null],["faber",null],["ferchi",null],["herrera",null],["antonius andreas",null],["wadding",null],["scotus","John Duns Scotus"],["duns","John Duns Scotus"],["durand","Durand of Saint-Pourçain"],["durandus","Durand of Saint-Pourçain"],["thomas","Thomas Aquinas"],["aquinas","Thomas Aquinas"],["bonaventure","Bonaventure"],["henry of ghent","Henry of Ghent"],["giles","Giles of Rome"],["aegidius","Giles of Rome"],["albert","Albertus Magnus"],["ockham","William of Ockham"],["occam","William of Ockham"],["gregory of rimini","Gregory of Rimini"],["godfrey","Godfrey of Fontaines"],["richard of middleton","Richard of Middleton"],["bellarmine","Robert Bellarmine"],["papist","Robert Bellarmine"],["romanist","Robert Bellarmine"],["roman","Robert Bellarmine"],["jesuit","Robert Bellarmine"],["becanus","Robert Bellarmine"],["chemnitz","Martin Chemnitz"],["gerhard","Johann Gerhard"],["calov","Abraham Calov"],["lutheran","Abraham Calov"],["ubiquitarian","Abraham Calov"],["arminius","Jacobus Arminius"],["episcopius","Simon Episcopius"],["remonstrant","Jacobus Arminius"],["arminian","Jacobus Arminius"],["molina","Luis de Molina"],["molinist","Luis de Molina"],["jansen","Cornelius Jansen"],["calvin","John Calvin"],["calvinist","John Calvin"],["luther","Martin Luther"],["kemnit","Martin Chemnitz"],["chemnit","Martin Chemnitz"],["brenz","Johannes Brenz"],["brentius","Johannes Brenz"],["melanchthon","Philipp Melanchthon"],["trent","Acts of the Council of Trent"],["tridentine","Acts of the Council of Trent"],["stapleton","Thomas Stapleton"],["ames","William Ames"],["whitaker","William Whitaker"],["chamier","Daniel Chamier"],["becan","Martinus Becanus"],["gretser","Jakob Gretser"],["baronius","Caesar Baronius"],["socinus",null],["crell",null],["smalcius",null],["suarez","Francisco Suárez"],["suárez","Francisco Suárez"],["cajetan","Thomas Cajetan"],["caietan","Thomas Cajetan"],["capreol","Johannes Capreolus"],["ferrar","Sylvester of Ferrara"],["sylvester","Sylvester of Ferrara"],["nominal","William of Ockham"],["biel","Gabriel Biel"],["vasquez","Gabriel Vásquez"],["vázquez","Gabriel Vásquez"],["zabarella","Jacopo Zabarella"],["thomist","Thomas Aquinas"],["scotist","John Duns Scotus"],["fonseca",null],["javelli",null],["soncinas",null],["toletus",null],["cocceius","Johannes Cocceius"],["cocceian","Johannes Cocceius"],["grotius","Hugo Grotius"],["vorstius","Conrad Vorstius"],["amyraut","Moïse Amyraut"],["amyrald","Moïse Amyraut"],["salmurian","Moïse Amyraut"],["saumur","Moïse Amyraut"],["la place","Saumur Divines (Cappel · Amyraut · La Place)"],["placaeus","Saumur Divines (Cappel · Amyraut · La Place)"],["cappel","Saumur Divines (Cappel · Amyraut · La Place)"],["testard","Paul Testard"],["maccovius","Johannes Maccovius"],["jansenist","Cornelius Jansen"],["limborch","Philippus van Limborch"],["maresius","Samuel Maresius / Desmarets"],["desmarets","Samuel Maresius / Desmarets"],["lessius","Leonard Lessius"],["vedelius","Nicolaus Vedelius"],["lubbertus","Sibrandus Lubbertus"],["daill","Jean Daillé"],["hoornbeeck","Johannes Hoornbeeck"],["twisse","William Twisse"],["perkins","William Perkins"],["gomarus","Franciscus Gomarus"],["voetius","Gisbertus Voetius"],["voetian","Gisbertus Voetius"],["spanheim","Friedrich Spanheim"],["heidegger","Johann Heinrich Heidegger"],["wittich","Christoph Wittich"],["burman","Frans Burman"],["le blanc","Louis Le Blanc de Beaulieu"],["rivet","André Rivet"],["walaeus","Antonius Walaeus"],["hommius","Festus Hommius"],["junius","Franciscus Junius"],["zanchi","Girolamo Zanchi"],["musculus","Wolfgang Musculus"],["socinian",null],["ostorod",null],["volkel",null],["schlichting",null],["cartesian",null],["descartes",null],["hobbes",null],["spinoza",null],["anabaptist",null],["menno",null],["curcell",null],["servet",null],["pelagian",null],["pelagius",null]];
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
  /* a work of many authors (the English divines, each book one divine's) names each controversy's own (`a.name`) */
  if(side==='a')return A[0].length===1?A[0][0]:(c&&c.a&&c.a.name)||'';
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
  return {holder:o.holder||au||'',author:au,school:s,party:partyOf(o.party),reported:o.reported||'',args:o.arguments||[],position:o.position||'',picks:o.picks||[]};
});
/* THE PARTIES (2026-10-22, the covenant and its controversies): each opinion's `party`, one vocabulary for every covenant work
   (orthodox, antinomian, neonomian, baxterian, amyraldian, cocceian, voetian, arminian, baptist, papist, socinian, lutheran, other, in
   that order), and each controversy's `among` (true where the difference is among the English divines themselves). A party is a chip,
   its word after a dot (the colour table above); "other" names nothing, so it has no chip. A file without them shows none. */
const PARTY={orthodox:'Orthodox',antinomian:'Antinomian',neonomian:'Neonomian',baxterian:'Baxterian',amyraldian:'Amyraldian',cocceian:'Cocceian',voetian:'Voetian',arminian:'Arminian',baptist:'Baptist',papist:'Papist',socinian:'Socinian',lutheran:'Lutheran',other:'Other'};
const PARTY_ORDER=Object.keys(PARTY);
const partyOf=p=>{const k=String(p||'').trim().toLowerCase();return PARTY[k]?k:'';};
const chip=p=>{const k=partyOf(p);return k&&k!=='other'?`<span class="pty pt-${k}"><i class="dot" aria-hidden="true"></i>${PARTY[k]}</span>`:'';};
/* the work's own author as a holder ("the author", "his own") is the controversy's author where the work names him */
const holderLabel=(o,c)=>/^(the author|his own)$/i.test(String(o.holder).trim())&&c&&c.a&&c.a.name?c.a.name:o.holder;
/* a work of many authors (the English divines: each book one divine's, `a.name` on each controversy) names a book by its author, lists
   its controversies by author, and states each position as its author's */
const byAuthor=d=>{if(d._BA==null){const n=new Set(d.controversies.map(c=>c.a&&c.a.name).filter(Boolean));d._BA=n.size>1;}return d._BA;};
const srcOf=(d,c)=>(c&&c.a&&c.a.name)||d.source;
/* a debate within one school (Báñez parting from the fellow Thomists): its file names one school, and its other side is that school's men */
const intraSchool=d=>{const s=Object.values(d.schools||{});return s.length===1&&fold(d.b_slug)===fold(`${s[0]}s`);};
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
/* a book's name; a work in one volume names it by the volume's address (zamora-disputationes-…), so it goes by the work's title, and a
   work in several so named by its title and the volume's number */
const bookOf=(d,b)=>{const B=d.books||{},t=B[String(b)]||'',slug=/^[a-z0-9]+(-[a-z0-9]+)+$/;if(!slug.test(t))return t;return Object.keys(B).length>1&&d.source_title?`${d.source_title}, volume ${b}`:(d.source_title||t);};
const bookLabel=(d,c)=>byAuthor(d)&&c.a&&c.a.name?c.a.name:bookOf(d,c.book);
/* the metaphysical questions are also mapped across the whole tradition (v1/maps q294 onward) and answered in the atlas */
const ALSO={'suarez-schools':`The same questions across the tradition: <a href="${MAPS}#q294">maps of the metaphysical questions</a> · <a href="${ATLAS}#q294">every answer in the atlas</a>. Read the disputation as a course: <a href="${DECKS}#metaphysics">Metaphysics with Suárez</a>`};
let IX=null,LIVE=[],DS=[],D=null,CUR=null,PAIR=null,OPEN=null,LUOPEN=null,PMOPEN=null,LAND=false,VIEW='',DEB=null,RUN=0,AMONG=false,NET=null;const KINDS=new Set(),DSCH=new Set();
const AMONG_LABEL='Among the English divines themselves';
/* A DEBATE RENAMED (2026-10-22): the English covenant debate is widening into the covenant (federal theology and its controversies);
   once the index names `covenant` and no longer `covenant-english`, the old addresses, a controversy's own debate and the network's
   key follow it there. While the index keeps the old id, nothing is aliased. */
const DEB_ALIAS={'covenant-english':'covenant'};
const hasDeb=id=>!!(IX&&IX.debates&&IX.debates[id])||DS.some(g=>g.id===id);
const debId=id=>id&&!hasDeb(id)&&DEB_ALIAS[id]&&hasDeb(DEB_ALIAS[id])?DEB_ALIAS[id]:id;
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
  const add=(id,title,p,n)=>{if(!n)return;if(!by.has(id))by.set(id,{id,title,pairs:[],n:0});const g=by.get(id),ex=g.pairs.find(x=>x.pair===p.pair);if(ex)ex.n+=n;else g.pairs.push({...p,n});g.n+=n;};
  /* a work's count under a debate the map has renamed goes to the debate's new id */
  const gid=id=>map&&!map[id]&&DEB_ALIAS[id]&&map[DEB_ALIAS[id]]?DEB_ALIAS[id]:id;
  if(map){for(const [id,t] of Object.entries(map))by.set(id,{id,title:t,pairs:[],n:0});for(const p of LIVE)for(const [id,n] of Object.entries(p.debates||{[p.debate||'other']:p.n}))add(gid(id),map[gid(id)]||id,p,n);}
  else for(const p of LIVE)add(p.debate||'other',p.debate_title||'Other works of controversy',p,p.n);
  for(const g of by.values())g.pairs.sort((a,b)=>b.n-a.n);
  return [...by.values()].filter(g=>g.pairs.length);
}
const debTitle=i=>{const id=debId(i);return (IX&&IX.debates&&IX.debates[id])||((DS.find(g=>g.id===id)||{}).title)||id;};
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
  const row=LIVE.find(p=>p.pair===D.pair)||{},dm0=row.debates||D.debates||(D.debate?{[D.debate]:D.n}:{}),dm={};
  for(const [id,n] of Object.entries(dm0))dm[debId(id)]=(dm[debId(id)]||0)+n;
  const ds=Object.entries(dm).filter(([,n])=>n).sort((a,b)=>b[1]-a[1]);
  $('#src').innerHTML=`<h2 id="pairH">${esc(labelOf(D))}<span class="ct"><span class="sr">, </span>${fmt(D.n)}<span class="sr"> controversies</span></span></h2>
    <dl class="lab">${ds.length?`<div><dt>${ds.length>1?'Debates':'Debate'}</dt><dd>${ds.map(([id,n])=>`<a href="#debate/${esc(id)}">${esc(ds.length>1?shortTitle(debTitle(id)):debTitle(id))}</a>${ds.length>1?`<span class="ct"> ${fmt(n)}</span>`:''}`).join(' · ')}</dd></div>`:''}<div><dt>Sides</dt><dd>${sides[0]} and ${sides[1]}</dd></div>
    <div><dt>Argued in</dt><dd><em>${esc(D.source_title)}</em>, ${esc(D.source)}${D.source_note?` (${esc(D.source_note)})`:''}</dd></div></dl>${alsoHTML([D.pair])}`;
}
const quoteHTML=q=>`<figure class="own"><blockquote><p>${esc(q.quote)}</p></blockquote><figcaption><span>${esc(q.t)}</span>${pg(q.w,q.p,'',q.quote)}</figcaption>${q.says?`<p class="says">${esc(q.says)}</p>`:''}</figure>`;
const whoLine=n=>{const s=schoolOf(n);return `<p class="who">${dot(s)}${who(n)}${schTag(s)}</p>`;};
function sideHTML(c,side){
  const s=c[side],args=s.arguments||[],own=s.picks||[],varies=side==='b'&&sidesOf(D)[1]==='varies';
  const name=side==='a'?(c.a.name||D.a):(c.b.name||D.b),slug=side==='a'?(c.a.name?'':D.a_slug):(c.b.name?'':D.b_slug),hs=sideSchool(D,side),au=varies?authorOf(D,c,'b'):'';
  const their=au?many('',au):many(slug,name);
  return `<section class="side"><h4 class="sd-h${String(name).length>48?' long':''}">${dot(hs)}${esc(name)}${schTag(hs)}</h4>
    <h5 class="lbl">Position, as ${esc(srcOf(D,c))} states it</h5><p class="pos">${s.reported?esc(s.reported):'<span class="muted">Not stated.</span>'}</p>
    ${args.length?`<h5 class="lbl">Arguments <span class="ct">${args.length}</span></h5><ol class="rows args">${args.map(a=>`<li><span>${esc(a.arg)}</span>${pg(c.source.w,a.page)}</li>`).join('')}</ol>`:''}
    ${own.length?`<h5 class="lbl">In ${their?'their':'his'} own words <span class="ct">${own.length}</span></h5>${au?whoLine(au):''}${s.position?`<p class="gist">${esc(s.position)}</p>`:''}${own.map(quoteHTML).join('')}`:''}</section>`;
}
/* the opinions in the work's order, each read from the top: who holds it (his school or party, the author whose pages answer for him:
   the heading itself where the work names him by his name), what the work reports, the arguments with their pages, his own words where
   his pages answer (a heading over nothing is never drawn) */
function opinionsHTML(c){
  return `<div class="ops">${opsOf(c).map((o,i)=>{
    const p=(o.author?many('',o.author):many('',o.holder))?'their':'his',hl=holderLabel(o,c),same=!!o.author&&fold(o.author)===fold(hl);
    return `<section class="op">${/\bopinion\b/i.test(o.holder)?'':`<p class="op-n">Opinion ${i+1}</p>`}<h4 class="op-h${hl.length>60?' long':''}">${dot(o.school)}${same?who(o.author,hl):esc(hl)}${schTag(o.school)}${chip(o.party)}</h4>${o.author&&!same?`<p class="who">${who(o.author)}</p>`:''}
      <h5 class="lbl">Position, as ${esc(srcOf(D,c))} states it</h5><p class="pos">${o.reported?esc(o.reported):'<span class="muted">Not stated.</span>'}</p>
      ${o.args.length?`<h5 class="lbl">Arguments <span class="ct">${o.args.length}</span></h5><ol class="rows args">${o.args.map(a=>`<li><span>${esc(a.arg)}</span>${pg(c.source.w,a.page)}</li>`).join('')}</ol>`:''}
      ${o.picks.length?`<h5 class="lbl">In ${p} own words <span class="ct">${o.picks.length}</span></h5>${o.position?`<p class="gist">${esc(o.position)}</p>`:''}${o.picks.map(quoteHTML).join('')}`:''}</section>`;
  }).join('')}</div>`;
}
/* the work's resolution: whom it sides with, or its own way, at its page; then the work's author in his own words where his pages answer */
function resolutionHTML(c){
  const r=c.resolution||{},h=sidesWith(c),o=h?opsOf(c).find(x=>fold(x.holder)===fold(h)):null,me=authorOf(D,c,'a'),ms=schoolOf(me),own=c.a.picks||[];
  return `<section class="judgment"><h4 class="jd-h">${dot(ms)}${esc(srcOf(D,c))} ${h?`sides with ${o?dot(o.school):''}${esc(h)}`:'resolves it his own way'}</h4><div class="r1"><p>${r.why?esc(r.why):'<span class="muted">Not stated.</span>'}</p>${pg(c.source.w,r.page)}</div>
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
  const bn=c.b.name||D.b,jd=c.judgment||{},whom=jd.side==='a'?(c.a.name||D.a):jd.side==='b'?bn:jd.side==='both'?'both':'neither';
  const prev=D.controversies[i-1],next=D.controversies[i+1],arts=c.articles||[];
  $('#c').innerHTML=`<header class="c-head"><h3 class="qh">${esc(c.question)}</h3>
    <dl class="lab"><div class="partof" hidden><dt>Part of</dt><dd></dd></div><div><dt>Between them</dt><dd><span class="kind">${esc(KIND[c.kind]||c.kind)}</span></dd></div>
    ${c.place?`<div><dt>Treated at</dt><dd>${esc(c.place)}</dd></div>`:''}
    <div><dt>Source</dt><dd class="r1"><span>${bookLabel(D,c)?`${esc(bookLabel(D,c))}, `:''}controversy ${c.n}${c.source.title?`: <em>${esc(c.source.title)}</em>`:''}</span>${pg(c.source.w,c.source.p0,range(c.source),c.source.title)}</dd></div></dl>
    ${arts.length?`<details class="fold"><summary>${esc(srcOf(D,c))}'s articles <span class="ct">${arts.length}</span></summary><ol class="rows">${arts.map(a=>`<li><span>${esc(a.title)}</span>${pg(c.source.w,a.page,'',a.title)}</li>`).join('')}</ol></details>`:''}</header>
    ${hasOps(c)?`${opinionsHTML(c)}${resolutionHTML(c)}`:`<div class="sides">${sideHTML(c,'a')}${sideHTML(c,'b')}</div>
    <section class="judgment"><h4 class="jd-h">${D.self_judge?`${esc(srcOf(D,c))}'s conclusion`:`${esc(srcOf(D,c))}'s judgment${whom==='both'?': they agree':whom==='neither'?'':`: for ${esc(whom)}`}`}</h4><div class="r1"><p>${jd.why?esc(jd.why):'<span class="muted">Not stated.</span>'}</p>${pg(c.source.w,jd.page)}</div></section>`}
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
  const el=$('#c .partof'),deb=debId(c.debate||(D&&D.debate));if(!el||!deb)return;
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
  const q=($('#find').value||'').trim().toLowerCase(),ba=byAuthor(D);
  const byBook=new Map();
  for(const c of D.controversies){
    if(KINDS.size&&!KINDS.has(c.kind))continue;
    if(AMONG&&c.among!==true)continue;
    if(q&&!(c.question.toLowerCase().includes(q)||(c.keywords||[]).some(k=>k.toLowerCase().includes(q))||(c.opinions||[]).some(o=>`${o.holder} ${o.author}`.toLowerCase().includes(q))||(ba&&String(c.a.name||'').toLowerCase().includes(q))))continue;
    /* a work of many authors lists its controversies by author, a work of one by book */
    const k=ba?c.a.name||'':c.book;
    if(!byBook.has(k))byBook.set(k,[]);byBook.get(k).push(c);
  }
  /* a work that argues in several debates names each controversy's */
  const several=new Set(D.controversies.map(c=>c.debate).filter(Boolean)).size>1;
  $('#books').innerHTML=[...byBook.entries()].map(([b,cs])=>`<li><details open><summary>${esc((ba?b:bookOf(D,b))||`Book ${b}`)}<small>${cs.length}</small></summary><ul>${cs.map(c=>`<li><button type="button" data-id="${esc(c.id)}" aria-current="${String(c.id===CUR)}">${esc(c.question)}<small>${esc(KIND[c.kind]||c.kind)}${hasOps(c)?` · ${c.opinions.length} ${c.opinions.length===1?'opinion':'opinions'}`:''}${several&&c.debate?` · ${esc(shortTitle(debTitle(c.debate)))}`:''}</small></button></li>`).join('')}</ul></details></li>`).join('')||'<li class="muted">Nothing matches.</li>';
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
  D=d;CUR=null;KINDS.clear();AMONG=false;$('#find').value='';
  pairHead();
  /* the kinds of difference; and where the work marks them, the controversies among the Protestant divines themselves */
  const am=D.controversies.filter(c=>c.among===true).length;
  $('#chips').innerHTML=Object.keys(KIND).filter(k=>D.kinds[k]).map(k=>`<button type="button" data-kind="${k}" aria-pressed="false">${esc(KIND[k])} <span class="ct">${D.kinds[k]}</span></button>`).join('')+(am?`<button type="button" data-among aria-pressed="false">${AMONG_LABEL} <span class="ct">${fmt(am)}</span></button>`:'');
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
   controversies come from works argued by a man of a school, and the schools are more than one; its authors are lined up by school
   above its questions. A debate within one school (the Thomists among themselves) shows who parts from whom instead. */
const schoolsMode=g=>{let t=0,k=0;const ss=new Set();for(const p of g.pairs){const A=AUTH[p.pair],s=A&&A[0].length===1?schoolOf(A[0][0]):'';t+=p.n;if(s){k+=p.n;ss.add(s);}}return t>0&&k>=t*.75&&ss.size>1;};
/* a controversy in this debate (a file without per-controversy debates counts every one) */
const inDeb=c=>!c.debate||!DEB||c.debate===DEB.id||debId(c.debate)===DEB.id;
const DEBF=new Map(),DEBQ=new Map(),DEBI=new Map();
const debFile=id=>{if(!DEBF.has(id))DEBF.set(id,J(`${BASE}/v1/enrich/controversies/debates/${encodeURIComponent(id)}.json`).then(f=>{if(f&&Array.isArray(f.questions)){DEBQ.set(id,f);return f;}DEBF.delete(id);return null;}));return DEBF.get(id);};
const isLive=pair=>LIVE.some(p=>p.pair===pair);
const worksOf=()=>DEB.file?DEB.file.works:DEB.g.pairs.map(p=>({pair:p.pair,label:labelOf(p),source:p.source,source_title:p.source_title,n:p.n}));
function showDebate(id,key){
  viewIs('debate');
  const g=DS.find(x=>x.id===id)||DS[0];if(!g)return;
  if(!DEB||DEB.id!==g.id){
    const run=++RUN,sch=schoolsMode(g),one=g.pairs.length===1?g.pairs[0].pair:'';
    DEB={id:g.id,g,run,mode:sch?'schools':'sides',file:null,fallback:false,qs:null,byQ:new Map(),byItem:new Map(),loaded:new Map(),failed:0,asked:false,docs:[],vis:[],sel:null,want:key,deep:!!key,tab:key==='works'?'w':'q',shared:sch,among:false,item:'',goItem:'',pm:null,raf:0};
    debateShell();
    /* a debate of one work waits for that work as well: its head counts the work's books and authors, and its questions name theirs */
    Promise.all([debFile(g.id),one?doc(one):null]).then(([f,d1])=>{
      if(!DEB||DEB.run!==run)return;
      if(d1)DEB.loaded.set(one,d1);
      if(f){DEB.file=f;setQuestions(f.questions);debNote(f.note||'');questionsUI();}
      else{DEB.fallback=true;loadAll();}
      $('#dhead').innerHTML=headHTML();
      renderBoard();
    });
    pathsFile(g.id).then(f=>{if(!f||!DEB||DEB.run!==run)return;$('#dhead').innerHTML=headHTML();debNote();if(DEB.sel)fillPaths(DEB.sel);});
    netFile().then(n=>{NET=n;if(DEB&&DEB.run===run)pmLoad(run);});
  }else{DEB.want=key;debNote();if(key==='works')setTab('w',false);else{if(key||DEB.tab!=='w')setTab('q',false);if(DEB.qs&&DEB.tab==='q')pickQuestion(key,true);}}
  renderBoard();
  if(!DEB.sel)document.title=`${(DEB.file&&DEB.file.title)||g.title}${TAIL}`;
}
/* the debate's name, the company its parenthesis names under it (as the board has them), and the works it is argued in */
function headHTML(){
  const f=DEB.file,ws=worksOf(),[t,sub]=splitTitle((f&&f.title)||DEB.g.title);
  return `<h2 id="debH">${esc(t)}<span class="ct"><span class="sr">, </span>${f?`${fmt(f.n_questions)} questions · ${fmt(f.n_controversies)} controversies`:`${fmt(DEB.g.n)} controversies`}</span></h2>${sub?`<p class="deb-sub">${esc(sub)}</p>`:''}
    <p class="argued">${arguedHTML(ws)}</p>${pathsLine()}${alsoHTML(ws.map(w=>w.pair))}`;
}
const nCon=n=>`<span class="ct"> ${fmt(n)}<span class="sr"> ${n===1?'controversy':'controversies'}</span></span>`;
/* the works, each with its count; a debate of one work whose books are each one author's (the English divines) counts its books and
   names their authors once the work is read, and until then names the work without a count */
function arguedHTML(ws){
  const one=ws.length===1?ws[0]:null,d=one&&DEB.loaded.get(one.pair);
  if(d&&byAuthor(d)){
    const m=new Map(),books=new Set();
    for(const c of d.controversies){if(!inDeb(c)||!(c.a&&c.a.name))continue;books.add(c.book);if(!m.has(c.a.name))m.set(c.a.name,{name:c.a.name,n:0,first:c.id});m.get(c.a.name).n++;}
    /* the twelve who argue most of it here; the rest in the By work tab */
    const au=[...m.values()].sort((a,b)=>(b.n-a.n)||a.name.localeCompare(b.name)),top=au.slice(0,12),more=au.length-top.length;
    return `Argued in ${fmt(books.size)} works by ${fmt(au.length)} authors: ${top.map(a=>`<a href="#${esc(a.first)}">${esc(a.name)}</a>${nCon(a.n)}`).join(' · ')}${more?` · <a href="#debate/${esc(DEB.id)}/works">and ${fmt(more)} more</a>`:''}`;
  }
  if(one&&!d)return `Argued in ${isLive(one.pair)?`<a href="#${esc(one.pair)}">${esc(one.source)}</a>`:esc(one.source)}${one.source_title?`, <em>${esc(one.source_title)}</em>`:''}`;
  return `Argued in ${fmt(ws.length)} ${ws.length===1?'work':'works'}: ${ws.map(w=>`${isLive(w.pair)?`<a href="#${esc(w.pair)}">${esc(w.source)}</a>`:esc(w.source)}${nCon(w.n)}`).join(' · ')}`;
}
function debateShell(){
  const sch=DEB.mode==='schools',luOpen=LUOPEN!=null?LUOPEN:!matchMedia('(max-width:760px)').matches&&!DEB.want;
  $('#deb').innerHTML=`<header class="deb-head" id="dhead">${headHTML()}</header>
    <div id="dnet"></div>
    <div class="tabs" role="tablist" aria-label="The debate by its questions, or by its works"><button type="button" role="tab" id="tab-q" aria-controls="tp-q">Questions</button><button type="button" role="tab" id="tab-w" aria-controls="tp-w">By work</button></div>
    <p class="status" id="dstat" role="status" hidden></p>
    <section id="tp-q" role="tabpanel" aria-labelledby="tab-q">
      ${sch?`<details class="lu" id="lufold"${luOpen?' open':''}><summary><h3 class="lu-h">The authors, by school</h3><span class="lu-dig" aria-hidden="true">${Object.keys(SCHOOLS).map(s=>`<span>${dot(s)}${esc(s)}</span>`).join('')}</span><span class="lu-key">Counts: the controversies that quote him</span></summary>
        <div id="lu"><p class="muted">Reading the works…</p></div></details>`:''}
      <div class="cols"><nav class="nav" aria-label="The questions of this debate">
        <input class="find" id="dfind" type="search" placeholder="Find a question" aria-label="Find a question" autocomplete="off">
        <div class="qf"><select id="dloc" aria-label="Locus"><option value="">Every locus</option></select><button type="button" class="tgl" id="dshared" aria-pressed="${DEB.shared}">Shared by 2 or more works</button><button type="button" class="tgl" id="damong" aria-pressed="false" hidden>${AMONG_LABEL}</button></div>
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
    else if(DEB.qs){let ch=false;for(const x of DEB.qs)ch=enrich(x)||ch;if(ch)amongUI();}
  });
}
/* without the debate's file: its questions gathered from its works, in the file's shape (the classic question, else the controversy's own);
   in a work of many authors each controversy's author stands for its work */
function questionsFromPairs(docs){
  const by=new Map();
  for(const d of docs){const ba=byAuthor(d);for(const c of d.controversies){
    if(!inDeb(c))continue;
    const aid=c.atlas&&c.atlas.id,k=aid?`a:${aid}`:`q:${fold(c.question)}`,who=ba&&c.a&&c.a.name||'';
    if(!by.has(k))by.set(k,{id:aid||c.id,q:aid?c.atlas.q:c.question,locus:aid?(c.atlas.locus||''):'',atlas:aid||null,works:[],n:0,items:[]});
    const x=by.get(k);x.n++;if(!x.works.includes(who||d.source))x.works.push(who||d.source);
    x.items.push({pair:d.pair,id:c.id,source:d.source,question:c.question,kind:c.kind,place:c.place,title:c.source.title,among:typeof c.among==='boolean'?c.among:null,who,_e:1});
  }}
  return [...by.values()].sort((a,b)=>(b.works.length-a.works.length)||(b.n-a.n));
}
const hayOf=x=>fold([x.q,x.locus,...x.works,...x.items.map(i=>i.question)].join(' '));
/* what a debate's file does not carry, taken from a work once it is read: whether the difference is among the Protestant divines
   (`among`), and in a work of many authors each controversy's author, by whom the question then counts its works */
const cOf=(d,id)=>{if(!d._BY)d._BY=new Map(d.controversies.map(c=>[c.id,c]));return d._BY.get(id);};
function enrich(x){
  let ch=false;
  for(const it of x.items){
    if(it._e)continue;const d=LOADED.get(it.pair);if(!d)continue;
    it._e=1;const c=cOf(d,it.id);if(!c)continue;
    if(typeof c.among==='boolean'){it.among=c.among;ch=true;}
    if(byAuthor(d)&&c.a&&c.a.name){it.who=c.a.name;ch=true;}
  }
  if(ch){x.among=x.items.filter(i=>i.among===true).length;if(x.items.some(i=>i.who))x.works=[...new Set(x.items.map(i=>i.who||i.source))];x.hay=hayOf(x);}
  return ch;
}
function setQuestions(qs){
  let re=false;
  for(const x of qs){const w=x.works.length;enrich(x);x.among=x.items.filter(i=>i.among===true).length;x.hay=hayOf(x);if(x.works.length!==w)re=true;}
  /* questions whose works were counted again (by author) are ordered again, as the file orders them: by how many works ask them */
  if(re)qs.sort((a,b)=>(b.works.length-a.works.length)||(b.n-a.n));
  DEB.qs=qs;DEB.byQ=new Map(qs.map(x=>[x.id,x]));DEB.byItem=new Map();
  for(const x of qs)for(const i of x.items)DEB.byItem.set(i.id,x);
}
/* the toggle for the controversies among the Protestant divines themselves, with the number of questions it leaves; hidden where no
   controversy is so marked */
function amongUI(){
  const b=$('#damong');if(!b||!DEB.qs)return;
  const am=DEB.qs.filter(x=>x.among).length;if(!am)DEB.among=false;
  b.hidden=!am;b.innerHTML=`${AMONG_LABEL}<span class="ct">${fmt(am)}</span>`;b.setAttribute('aria-pressed',String(DEB.among));
}
/* the filters (a locus, or the questions not in the atlas; the questions two or more works share) and the list, then the question shown */
function questionsUI(){
  const {qs} = DEB,loc=new Map();for(const x of qs){const l=x.locus||'-';loc.set(l,(loc.get(l)||0)+1);}
  const ls=[...loc].filter(([l])=>l!=='-').sort((a,b)=>(b[1]-a[1])||a[0].localeCompare(b[0]));
  $('#dloc').innerHTML=`<option value="">Every locus (${fmt(qs.length)})</option>${ls.map(([l,n])=>`<option value="${esc(l)}">${esc(l)} (${fmt(n)})</option>`).join('')}${loc.has('-')?`<option value="-">Not in the atlas (${fmt(loc.get('-'))})</option>`:''}`;
  const sh=qs.filter(x=>x.works.length>1).length,b=$('#dshared');
  if(!sh)DEB.shared=false;
  b.hidden=!sh;b.innerHTML=`Shared by 2 or more works<span class="ct">${fmt(sh)}</span>`;b.setAttribute('aria-pressed',String(DEB.shared));
  amongUI();
  listQ();
  if(DEB.tab==='q')pickQuestion(DEB.want,false);
}
function listQ(){
  if(!DEB.qs)return;
  const q=fold($('#dfind').value),loc=$('#dloc').value;
  DEB.vis=DEB.qs.filter(x=>(!DEB.shared||x.works.length>1)&&(!DEB.among||x.among)&&(!loc||(loc==='-'?!x.locus:x.locus===loc))&&(!q||x.hay.includes(q)));
  let last=-1;const per=new Map();for(const x of DEB.vis)per.set(x.works.length,(per.get(x.works.length)||0)+1);
  $('#dlist').innerHTML=DEB.vis.map(x=>{const k=x.works.length,n=DEB.among?x.among:x.n,h=k!==last?`<li class="lh"><span>Argued in ${fmt(k)} ${k===1?'work':'works'}</span><span class="ct">${fmt(per.get(k))}<span class="sr"> ${per.get(k)===1?'question':'questions'}</span></span></li>`:'';last=k;
    return `${h}<li><button type="button" data-q="${esc(x.id)}" aria-current="${String(!!DEB.sel&&DEB.sel.id===x.id)}">${esc(x.q)}<small>${k>1?'':`${esc(x.works[0]||'')} · `}${fmt(n)} ${n===1?'controversy':'controversies'}${x.locus?` · ${esc(x.locus)}`:''}</small></button></li>`;}).join('')||'<li class="muted">Nothing matches.</li>';
}
/* the question an address names (a question's id, or one of its controversies', whose fold then opens); one the filters hide clears
   them; else the first shown */
function pickQuestion(key,push){
  if(!DEB.qs)return;
  const k=key&&key!=='works'?key:'',item=k&&!DEB.byQ.has(k)&&DEB.byItem.has(k)?k:'';
  let x=k?(DEB.byQ.get(k)||DEB.byItem.get(k)):null;
  if(x&&(!DEB.vis.includes(x)||(item&&DEB.among&&!x.items.some(i=>i.id===item&&i.among===true)))){DEB.shared=false;DEB.among=false;$('#dshared').setAttribute('aria-pressed','false');$('#damong').setAttribute('aria-pressed','false');$('#dloc').value='';$('#dfind').value='';listQ();}
  if(!x)x=DEB.vis[0]||DEB.qs[0];
  if(x)showQuestion(x,push&&!!k,item);
}
/* how many of the debate's controversies quote each author (a side or an opinion his, with at least one passage) */
function speakerCounts(docs){
  const m=new Map();
  for(const d of docs)for(const c of d.controversies)if(inDeb(c))for(const x of speakersOf(d,c)){
    const k=pkey(x.name);if(!m.has(k))m.set(k,{name:x.name,ids:new Set()});m.get(k).ids.add(c.id);
  }
  return m;
}
const quoted=(name,n)=>`<span class="q">${who(name)}<span class="ct">${fmt(n)}<span class="sr"> ${n===1?'controversy':'controversies'}</span></span></span>`;
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
/* BY WORK: each work with its two sides and who stands on them, with how many of its controversies. On the work's own side its author
   (in a work of many authors each book's, with his party); on the other, where the network has the work (who parts from whom), those
   its author parts from or answers, each with his school or party; else those its pages quote. In a debate of schools a man of none
   of them named in one or two controversies only stands under Others, after the schools' men. */
function lineupSides(){
  const ds=debSchools();
  return `<ol class="plr">${DEB.docs.map(d=>{
    const n=d.controversies.filter(inDeb).length;
    return `<li><h3 class="plr-t"><a href="#${esc(d.pair)}">${esc(labelOf(d))}</a><span class="ct">${fmt(n)}${n<d.n?` of ${fmt(d.n)}`:''} ${n===1?'controversy':'controversies'}</span></h3><div class="plr-s">${sideCell(d,'a',ds)}${sideCell(d,'b',ds)}</div></li>`;
  }).join('')}</ol>`;
}
/* the schools a debate is argued among: the map's every school where its works are of several, its one school where all are of one */
function debSchools(){
  if(DEB.mode==='schools')return new Set(Object.keys(SCHOOLS));
  const s=new Set();for(const p of DEB.g.pairs){const A=AUTH[p.pair];s.add(A&&A[0].length===1?schoolOf(A[0][0]):'');}
  return s.size===1&&!s.has('')?s:null;
}
function sideRows(d,s){
  const G=netOf(DEB.id),party=n=>G?partyOf(((G.nodes||{})[n]||{}).school):'';
  if(s==='a'&&byAuthor(d)){
    const m=new Map();for(const c of d.controversies)if(inDeb(c)&&c.a&&c.a.name)m.set(c.a.name,(m.get(c.a.name)||0)+1);
    return [...m].map(([name,n])=>({name,n,party:party(name)}));
  }
  if(s==='b'&&G){
    const ids=new Set(d.controversies.filter(inDeb).map(c=>c.id)),m=new Map();
    for(const e of G.edges||[]){const xs=(e[3]||[]).filter(id=>ids.has(id));if(!xs.length)continue;if(!m.has(e[1]))m.set(e[1],new Set());for(const id of xs)m.get(e[1]).add(id);}
    if(m.size)return [...m].map(([name,set])=>({name,n:set.size,party:party(name)}));
  }
  const m=new Map();
  for(const c of d.controversies)if(inDeb(c))for(const x of speakersOf(d,c))if(x.side===s){const k=pkey(x.name);if(!m.has(k))m.set(k,{name:x.name,n:0,party:''});m.get(k).n++;}
  /* a work of one author whose own words were not read: its author, with all its controversies */
  if(!m.size&&s==='a'){const A=sidesOf(d);if(A[0].length===1)return [{name:A[0][0],n:d.controversies.filter(inDeb).length,party:''}];}
  return [...m.values()];
}
function sideCell(d,s,ds){
  const rows=sideRows(d,s).sort((x,y)=>(y.n-x.n)||x.name.localeCompare(y.name)),member=r=>!!ds&&ds.has(schoolOf(r.name));
  const rare=ds&&rows.some(member)?rows.filter(r=>!member(r)&&r.n<=2):[],main=rows.filter(r=>!rare.includes(r));
  const li=r=>{const h=schoolOf(r.name);return `<li><span>${dot(h)}${who(r.name)}${schTag(h)}${chip(r.party)}</span>${nCon(r.n)}</li>`;};
  return `<div><p class="plr-n">${esc(s==='a'?d.a:d.b)}</p>${main.length?`<ul class="spk">${main.map(li).join('')}</ul>`:'<p class="plr-none">No work of theirs in the library answers yet.</p>'}${rare.length?`<p class="also">Others: ${rare.map(r=>`${who(r.name)}${nCon(r.n)}`).join(', ')}</p>`:''}</div>`;
}
/* ONE QUESTION: each work's controversies on it, in the works' order, each a fold that reads its controversy from its work when opened
   (the first of each work open): where the work puts it, the two sides as it states them with each side's own words, or the opinions
   it weighs by school, and its judgment or resolution; then the classic question across the tradition, once. A work of many authors
   (the English divines) shows each author's controversies under his name; with the toggle on, only those among the Protestant divines.
   An address that names one controversy opens that one alone. */
function showQuestion(x,push,item){
  DEB.sel=x;DEB.want=item||x.id;DEB.item=item||'';
  document.querySelectorAll('#dlist button[data-q]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.q===x.id)));
  const ws=worksOf(),items=DEB.among?x.items.filter(it=>it.among===true):x.items,by=new Map();
  for(const it of items){const k=it.who?`${it.pair}|${it.who}`:it.pair;if(!by.has(k))by.set(k,[]);by.get(k).push(it);}
  const rank=k=>{const r=ws.findIndex(w=>w.pair===k.split('|')[0]);return r<0?ws.length:r;};
  const order=[...by.keys()].map((k,n)=>[k,n]).sort((a,b)=>(rank(a[0])-rank(b[0]))||(a[1]-b[1])).map(a=>a[0]);
  const wk=k=>{const its=by.get(k),p=its[0].pair;return its[0].who?{pair:p,source:its[0].who,source_title:'',first:its[0].id}:(ws.find(w=>w.pair===p)||{pair:p,source:its[0].source,source_title:''});};
  const v=DEB.vis,i=v.indexOf(x),prev=i>0?v[i-1]:null,next=i>=0?v[i+1]:null;
  $('#dq').innerHTML=`<header class="c-head"><h3 class="qh">${esc(x.q)}</h3><dl class="lab">${x.atlas?`<div><dt>Classic question</dt><dd>${x.locus?`${esc(x.locus)} · `:''}<a href="${MAPS}#${esc(x.atlas)}">Map of the tradition</a> · <a href="${ATLAS}#${esc(x.atlas)}">Answers in the atlas</a></dd></div>`:''}<div><dt>Argued in</dt><dd>${order.map(k=>`${esc(wk(k).source)}<span class="ct"> ${by.get(k).length}</span>`).join(' · ')}</dd></div></dl></header>
    ${order.map((k,n)=>{const w=wk(k),its=by.get(k);return `<section class="qw" aria-labelledby="qw-${n}"><h4 class="qw-h" id="qw-${n}"><span>${w.first?`<a href="#${esc(w.first)}">${esc(w.source)}</a>`:isLive(w.pair)?`<a href="#${esc(w.pair)}">${esc(w.source)}</a>`:esc(w.source)}${w.source_title?`, <em>${esc(w.source_title)}</em>`:''}</span><span class="ct">${its.length}<span class="sr"> ${its.length===1?'controversy':'controversies'}</span></span></h4>
      <ol class="qis">${its.map((it,j)=>`<li><details class="qi" data-pair="${esc(it.pair)}" data-id="${esc(it.id)}"${(item?it.id===item:j===0)?' open':''}><summary><span class="qi-q">${esc(it.question)}</span><small>${esc(KIND[it.kind]||it.kind||'')}${it.place?` · ${esc(it.place)}`:''}</small></summary><div class="qi-b"><p class="muted">Reading the controversy…</p></div></details></li>`).join('')}</ol></section>`;}).join('')}
    ${pathsSlot(x)}${x.atlas?`<div class="dq-across" data-q="${esc(x.atlas)}"></div>`:''}
    <nav class="next" aria-label="Previous and next question">${prev?`<button type="button" data-q="${esc(prev.id)}"><small>Previous question</small><span>${esc(prev.q)}</span></button>`:'<span></span>'}${next?`<button type="button" data-q="${esc(next.id)}"><small>Next question</small><span>${esc(next.q)}</span></button>`:'<span></span>'}</nav>`;
  document.querySelectorAll('#dq details.qi[open]').forEach(fillItem);
  fillPaths(x);
  if(x.atlas)fillAcross(x);
  if(LAND){LAND=false;$('#dq').scrollIntoView({block:'start'});}
  /* a controversy chosen from the grid's list: its fold, in view */
  if(item&&DEB.goItem===item){DEB.goItem='';const t=document.querySelector(`#dq details.qi[data-id="${CSS.escape(item)}"]`);if(t)t.scrollIntoView({block:'start'});}
  if(push)history.replaceState(null,'',`#debate/${DEB.id}/${item||x.id}`);
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
  const b=bookLabel(d,c),me=srcOf(d,c);
  const src=`<p class="qi-src"><span>${b?`${esc(b)}, `:''}controversy ${c.n}${c.source.title?`: <em>${esc(c.source.title)}</em>`:''}</span>${pg(c.source.w,c.source.p0,range(c.source),c.source.title)}<a class="qi-open" href="#${esc(c.id)}">Open in the work</a></p>`;
  if(hasOps(c))return src+opinionSides([{c}],d)+resolutionLine(d,c);
  const A=sidesOf(d),jd=c.judgment||{},bn=c.b.name||d.b,whom=jd.side==='a'?(c.a.name||d.a):jd.side==='b'?bn:jd.side==='both'?'both':'neither';
  const side=s=>{
    const varies=s==='b'&&A[1]==='varies',name=s==='a'?(c.a.name||d.a):bn,hs=sideSchool(d,s),au=varies?authorOf(d,c,'b'):'',p=(c[s].picks||[])[0];
    return `<section class="side"><h5 class="sd-h${String(name).length>48?' long':''}">${dot(hs)}${esc(name)}${schTag(hs)}</h5><p class="lbl">As ${esc(me)} states it</p><p class="pos">${c[s].reported?esc(c[s].reported):'<span class="muted">Not stated.</span>'}</p>${p?`${au?whoLine(au):'<p class="lbl">In his own words</p>'}${quoteHTML(p)}`:''}</section>`;
  };
  return `${src}<div class="sides">${side('a')}${side('b')}</div><div class="res"><p class="lbl">${d.self_judge?`${esc(me)}'s conclusion`:`${esc(me)}'s judgment${whom==='both'?': they agree':whom==='neither'?'':`: for ${esc(whom)}`}`}</p><div class="r1"><p class="pos">${jd.why?esc(jd.why):'Not stated.'}</p>${pg(c.source.w,jd.page)}</div></div>`;
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
  let parts=raw.trim().split(/\s+\u2014\s+/),last=true;
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
/* the debate's note, with the note on the Reformed and Lutherans and on who parts from whom where the debate has them: one note a page */
const PM_NOTE='Who parts from whom is counted from the same reading: each controversy\'s author and those its work names against him.';
function debNote(base){if(base!=null)DEB.note=base;$('#note').textContent=[DEB.note||'',PATHD.has(DEB.id)?PATH_NOTE:'',DEB.pm?PM_NOTE:''].filter(Boolean).join(' ');}
/* a work's opinions as sides: the holders of one school together under it, the schools in their order, each holder with one passage of
   his own words or else what the work reports of him; the holders of no school are named after them ("Also weighed"), or, where no
   holder has a school, they are the sides. Where the opinions carry parties (the English divines) the parties are the sides, in their
   order; where the work parts from fellows of its own school (the Thomists among themselves) each holder is a side, his school named only
   where it is another. */
function opinionSides(items,d){
  const all=[];for(const {c} of items)for(const o of opsOf(c))all.push({o,c});
  const say=(o,p)=>p?quoteHTML(p):`<p class="pos">${esc(o.reported||'Not stated.')}</p>`;
  const named=(o,c)=>{const hl=holderLabel(o,c);return o.author?who(o.author,hl):`<span>${esc(hl)}</span>`;};
  /* one row a holder in each group, with his first passage */
  const group=gk=>{const m=new Map();for(const {o,c} of all){const g=gk(o,c);if(!m.has(g))m.set(g,new Map());const rows=m.get(g),k=o.author?pkey(o.author):`h:${fold(holderLabel(o,c))}`,cur=rows.get(k);if(!cur)rows.set(k,{o,c,p:o.picks[0]||null});else if(!cur.p&&o.picks[0])cur.p=o.picks[0];}return m;};
  if(all.some(({o})=>o.party)){
    const m=group(o=>o.party||'other'),ks=[...m.keys()].sort((a,b)=>PARTY_ORDER.indexOf(a)-PARTY_ORDER.indexOf(b));
    return `<div class="sides">${ks.map(g=>`<section class="side"><h5 class="sd-h">${g==='other'?'Others':`<i class="dot pt-${g}" aria-hidden="true"></i>${PARTY[g]}`}</h5>${[...m.get(g).values()].map(({o,c,p})=>`<p class="who">${named(o,c)}</p>${say(o,p)}`).join('')}</section>`).join('')}</div>`;
  }
  if((d&&intraSchool(d))||!all.some(({o})=>o.school)){
    const home=Object.values((d&&d.schools)||{})[0]||'',m=group((o,c)=>o.author?pkey(o.author):`h:${fold(holderLabel(o,c))}`);
    return `<div class="sides">${[...m.values()].map(rows=>{const {o,c,p}=[...rows.values()][0],hl=holderLabel(o,c);return `<section class="side"><h5 class="sd-h${hl.length>48?' long':''}">${dot(o.school)}${named(o,c)}${o.school&&o.school!==home?schTag(o.school):''}</h5>${say(o,p)}</section>`;}).join('')}</div>`;
  }
  const sides=new Map(),others=new Map(),order=Object.keys(SCHOOLS);
  for(const {o} of all){
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
/* WHO PARTS FROM WHOM (2026-10-22: the Thomists among themselves, the Scotists among themselves, the covenant among the English
   divines). v1/enrich/controversies/schools_network.json gives each such debate its authors (`nodes`: name → year of birth, school or
   party, room) and who parts from whom (`edges`: [the author who parts, the one he parts from, the number of controversies, their ids]).
   Under the debate's head it is an ordered grid read across: a row for each author who parts, a column for each one he parts from, both
   in order of birth (the network's year, else the author dates' birth, else a floruit or a death set back to a likely birth, for the
   order alone; the undated after them, the schools and parties last); in a cell the number of controversies, shaded in five steps. A
   cell chosen lists its controversies under the grid, each opening its question in this debate or its place in its work. Drawn once a
   debate, after the author dates come (or a second and a half), and never reordered. A debate the file does not name has no grid. */
const NETF={p:null};
const netFile=()=>NETF.p||(NETF.p=J(`${BASE}/v1/enrich/controversies/schools_network.json?v=${Date.now()}`).then(f=>f&&f.debates&&typeof f.debates==='object'?f:null));
/* a debate's network, under its own id or the id it had before a rename */
const netOf=id=>{const N=NET&&NET.debates;if(!N)return null;return N[id]||N[Object.keys(DEB_ALIAS).find(k=>DEB_ALIAS[k]===id&&N[k])]||null;};
const PM_STEPS=[1,2,4,10,30],PM_KEY=['1','2–3','4–9','10–29','30 or more'];
const pmStep=n=>PM_STEPS.reduce((s,t,i)=>n>=t?i+1:s,0);
const isGroup=n=>/^the\s/i.test(String(n||''));
function pmYear(name,node){
  if(node&&Number(node.year))return Number(node.year);
  const T=window.FRTraditionGraphics,r=T&&T.dates&&T.dates.get(name);
  if(!r)return 0;
  return Number(r.born)||(r.fl&&Number(r.y)?r.y-25:0)||(Number(r.died)?r.died-55:0)||Number(r.y)||0;
}
function pmDates(name,node){
  const T=window.FRTraditionGraphics,l=T&&T.dates&&T.dates.label(name);
  return l||(node&&Number(node.year)?`b. ${node.year}`:'');
}
const pmOrder=(names,nodes)=>names.map(n=>({n,g:isGroup(n)?1:0,y:isGroup(n)?0:pmYear(n,nodes[n])})).sort((a,b)=>(a.g-b.g)||((a.y?0:1)-(b.y?0:1))||(a.y-b.y)||a.n.localeCompare(b.n)).map(x=>x.n);
/* a name short enough for a phone's column: the name the works use where the catalogue's carries it in brackets (Poncius), else the
   surname (with its del or van), the place a man is named from (Ferrara), or the whole of John of St. Thomas; two men of one surname
   keep an initial */
function pmShort(names){
  const one=n=>{
    const s=String(n);if(isGroup(s))return s.replace(/\s*\(.*$/,'');
    const br=s.match(/\(([^)]+)\)\s*$/);if(br&&!/[,;]/.test(br[1]))return br[1];
    const b=s.replace(/\s*\(.*$/,'').replace(/,.*$/,'').trim();
    if(/\bof\s+St\.?\s/i.test(b))return b;
    const of=b.match(/\bof\s+(.+)$/);if(of)return of[1];
    const w=b.split(/\s+/);if(w.length<2)return b;
    return /^(del|della|van|von)$/i.test(w[w.length-2])?`${w[w.length-2]} ${w[w.length-1]}`:w[w.length-1];
  };
  const m=new Map(names.map(n=>[n,one(n)])),k=new Map();for(const v of m.values())k.set(v,(k.get(v)||0)+1);
  for(const [n,v] of m)if(k.get(v)>1&&!isGroup(n))m.set(n,`${String(n).trim().charAt(0)}. ${v}`);
  return m;
}
function pmLoad(run){
  const G=netOf(DEB.id);if(!G||!(G.edges||[]).length)return;
  const T=window.FRTraditionGraphics,wait=T&&T.dates?Promise.race([T.dates.ready,new Promise(r=>setTimeout(r,1500))]):Promise.resolve();
  wait.then(()=>{if(DEB&&DEB.run===run&&!DEB.pm)pmDraw(G);});
}
function pmDraw(G){
  const nodes=G.nodes||{},E=(G.edges||[]).filter(e=>e&&e[0]&&e[1]&&Number(e[2])>0);
  const rows=pmOrder([...new Set(E.map(e=>e[0]))],nodes),cols=pmOrder([...new Set(E.map(e=>e[1]))],nodes);
  const ri=new Map(rows.map((r,i)=>[r,i])),ci=new Map(cols.map((c,j)=>[c,j])),cell=new Map();
  for(const e of E)cell.set(`${ri.get(e[0])}|${ci.get(e[1])}`,e);
  DEB.pm={rows,cols,cell,nodes,short:pmShort([...rows,...cols]),sel:null};
  const box=$('#dnet');if(!box)return;
  box.innerHTML=pmHTML();
  const first=box.querySelector('button[data-pm]');if(first)first.tabIndex=0;
  debNote();
  if(DEB.tab==='w')debateFill();
}
function pmHTML(){
  const P=DEB.pm,{rows,cols,cell,nodes,short}=P,open=PMOPEN!=null?PMOPEN:!matchMedia('(max-width:760px)').matches&&!DEB.deep;
  const top=[...cell.values()].sort((a,b)=>b[2]-a[2]).slice(0,3).map(e=>`${short.get(e[0])} from ${short.get(e[1])} ${fmt(e[2])}`).join(' · ');
  const td=(i,j)=>{
    if(rows[i]===cols[j])return '<td class="pm-self"></td>';
    const e=cell.get(`${i}|${j}`);if(!e)return '<td></td>';
    return `<td><button type="button" class="pm-${pmStep(e[2])}" data-pm="${i}|${j}" tabindex="-1" aria-pressed="false" aria-label="${esc(rows[i])} parts from ${esc(cols[j])} in ${fmt(e[2])} ${e[2]===1?'controversy':'controversies'}">${fmt(e[2])}</button></td>`;
  };
  const tip=n=>{const d=pmDates(n,nodes[n]);return d?`${n}, ${d}`:n;};
  return `<details class="lu" id="pmfold"${open?' open':''}><summary><h3 class="lu-h">Who parts from whom</h3><span class="lu-dig">${esc(top)}</span><span class="lu-key">Counts: the controversies where one parts from the other</span></summary>
    <div class="tg pmw"><div class="pm-top"><p class="pm-key">Read across: each row an author, each column one he parts from, both in order of birth, the undated and then the schools and parties after them. Choose a number to list its controversies.</p><p class="pm-lg" aria-hidden="true">${PM_KEY.map((l,k)=>`<span><i class="pm-${k+1}"></i>${l}</span>`).join('')}</p></div>
    <div class="pm-box"><table class="pm"><caption class="sr tg-sr">Who parts from whom: a row for each author who parts, a column for each one he parts from, in each cell the number of controversies</caption>
      <thead><tr><td class="pm-corner"></td>${cols.map((c,j)=>`<th scope="col" data-j="${j}" title="${esc(tip(c))}"><span class="pm-ch"><span class="pm-full">${esc(c)}</span><span class="pm-short">${esc(short.get(c))}</span></span></th>`).join('')}</tr></thead>
      <tbody>${rows.map((r,i)=>{const d=pmDates(r,nodes[r]);return `<tr><th scope="row" data-i="${i}" title="${esc(tip(r))}"><span class="pm-full">${esc(r)}</span><span class="pm-short">${esc(short.get(r))}</span>${d?`<small>${esc(d)}</small>`:''}</th>${cols.map((c,j)=>td(i,j)).join('')}</tr>`;}).join('')}</tbody></table></div>
    <div class="pm-sel" id="pmsel" hidden></div></div></details>`;
}
/* a cell chosen (again, it closes): its row and column named, its controversies listed, read from their works as they come */
function pmPick(b){
  const P=DEB.pm;if(!P)return;
  const [i,j]=b.dataset.pm.split('|').map(Number),same=P.sel&&P.sel[0]===i&&P.sel[1]===j;
  P.sel=same?null:[i,j];
  document.querySelectorAll('#dnet button[data-pm]').forEach(x=>{x.setAttribute('aria-pressed',String(!same&&x===b));x.tabIndex=x===b?0:-1;});
  pmList();
}
function pmList(){
  const P=DEB&&DEB.pm,box=$('#pmsel');if(!P||!box)return;
  if(!P.sel){box.hidden=true;box.innerHTML='';return;}
  const [i,j]=P.sel,e=P.cell.get(`${i}|${j}`),ids=(e&&e[3])||[],want=new Set();
  const li=id=>{
    const p=pairFor(id),d=p&&LOADED.get(p.pair),c=d&&cOf(d,id);
    if(p&&!d)want.add(p.pair);
    if(!c)return `<li><span class="muted">${d?'This controversy is not in its work as read now.':'Reading the work…'}</span><a class="qi-open" href="#${esc(id)}">Open in the work</a></li>`;
    return `<li><a href="#debate/${esc(DEB.id)}/${esc(id)}" data-pmgo="${esc(id)}">${esc(c.question)}</a><small>${esc(KIND[c.kind]||c.kind||'')}${c.place?` · ${esc(placeOf(c.place))}`:''}</small><a class="qi-open" href="#${esc(id)}">Open in the work</a></li>`;
  };
  box.hidden=false;
  box.innerHTML=`<div class="pm-sh"><h4 class="pm-h">${esc(P.rows[i])} parts from ${esc(P.cols[j])}<span class="ct">${fmt(ids.length)} ${ids.length===1?'controversy':'controversies'}</span></h4><button type="button" class="pm-x" data-pm-close>Close the list</button></div><ol class="pm-list">${ids.map(li).join('')}</ol>`;
  for(const p of want)doc(p).then(()=>{if(DEB&&DEB.pm===P&&P.sel&&P.sel[0]===i&&P.sel[1]===j)pmList();});
}
/* a controversy from the list: its question in this debate, its fold open and in view */
function pmGo(id){
  DEB.goItem=id;DEB.want=id;
  if(DEB.tab!=='q')setTab('q',false);
  if(DEB.qs)pickQuestion(id,true);
}
/* the arrows move among the grid's numbers: the next one along the row or down the column */
function pmKey(e){
  const b=e.target.closest('button[data-pm]'),d={ArrowRight:[0,1],ArrowLeft:[0,-1],ArrowDown:[1,0],ArrowUp:[-1,0]}[e.key];
  if(!b||!d||!DEB.pm)return false;
  e.preventDefault();
  let [y,x]=b.dataset.pm.split('|').map(Number);
  for(y+=d[0],x+=d[1];y>=0&&x>=0&&y<DEB.pm.rows.length&&x<DEB.pm.cols.length;y+=d[0],x+=d[1]){
    const t=document.querySelector(`#dnet button[data-pm="${y}|${x}"]`);if(t){b.tabIndex=-1;t.tabIndex=0;t.focus();break;}
  }
  return true;
}
/* the row and the column of the number under the pointer or the focus, named in their heads */
function pmCross(b,on){
  if(!b||!b.dataset.pm)return;const [i,j]=b.dataset.pm.split('|');
  for(const h of document.querySelectorAll(`#dnet th[data-i="${i}"],#dnet th[data-j="${j}"]`))h.classList.toggle('is-on',on);
}
/* the side the work takes, under its opinions */
function resolutionLine(d,c){
  const r=c.resolution;if(!r||!(r.why||r.holder))return '';
  const h=sidesWith(c),me=authorOf(d,c,'a'),ms=schoolOf(me);
  return `<div class="res"><p class="lbl">${dot(ms)}${esc(srcOf(d,c))} ${h?`sides with ${esc(h)}`:'resolves it his own way'}</p><div class="r1"><p class="pos">${esc(r.why||'')}</p>${pg(c.source.w,r.page)}</div></div>`;
}
function route(){
  const h=want();
  if(!h||h==='debate'||h.startsWith('debate/')){
    const rest=h.slice(7),i=rest.indexOf('/'),was=i<0?rest:rest.slice(0,i),key=i<0?'':rest.slice(i+1),id=debId(was);
    /* a renamed debate's old address keeps its question and takes the new id */
    if(id!==was)history.replaceState(null,'',`#debate/${id}${key?`/${key}`:''}`);
    showDebate(id,key);return;
  }
  const p=pairFor(h);
  if(!p){showDebate('','');return;}
  showPair(p.pair,idFor(h,p.pair));
}
$('#books').addEventListener('click',e=>{const b=e.target.closest('button[data-id]');if(b)show(b.dataset.id,true);});
$('#c').addEventListener('click',e=>{const b=e.target.closest('button[data-go]');if(b){show(b.dataset.go,true);$('#c').scrollIntoView({block:'start'});}});
$('#find').addEventListener('input',()=>{if(D)list();});
$('#chips').addEventListener('click',e=>{
  const a=e.target.closest('button[data-among]');if(a){AMONG=!AMONG;a.setAttribute('aria-pressed',String(AMONG));list();return;}
  const b=e.target.closest('button[data-kind]');if(!b)return;const k=b.dataset.kind;if(KINDS.has(k))KINDS.delete(k);else KINDS.add(k);b.setAttribute('aria-pressed',String(KINDS.has(k)));list();
});
$('#deb').addEventListener('click',e=>{
  if(!DEB)return;
  /* the grid: a number chosen, the list closed, a controversy of the list opened in its question (a modified click keeps the link's way) */
  const pm=e.target.closest('#dnet button[data-pm]');if(pm){pmPick(pm);return;}
  if(e.target.closest('[data-pm-close]')){const s=DEB.pm&&DEB.pm.sel,b=s&&document.querySelector(`#dnet button[data-pm="${s[0]}|${s[1]}"]`);if(b)pmPick(b);if(b)b.focus();return;}
  const go=e.target.closest('a[data-pmgo]');
  if(go){if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button!==0)return;e.preventDefault();pmGo(go.dataset.pmgo);return;}
  if(e.target.closest('#damong')){DEB.among=!DEB.among;$('#damong').setAttribute('aria-pressed',String(DEB.among));listQ();if(DEB.sel&&DEB.tab==='q'){const x=DEB.vis.includes(DEB.sel)?DEB.sel:DEB.vis[0];if(x)showQuestion(x,true);}return;}
  const q=e.target.closest('button[data-q]');
  if(q){const x=DEB.byQ.get(q.dataset.q);if(x){showQuestion(x,true);if(q.closest('.next'))$('#dq').scrollIntoView({block:'start'});}return;}
  const t=e.target.closest('[role="tab"]');
  if(t){setTab(t.id==='tab-w'?'w':'q',true);return;}
  if(e.target.closest('#dshared')){DEB.shared=!DEB.shared;$('#dshared').setAttribute('aria-pressed',String(DEB.shared));listQ();}
});
$('#deb').addEventListener('input',e=>{if(DEB&&e.target.id==='dfind')listQ();});
$('#deb').addEventListener('change',e=>{if(DEB&&e.target.id==='dloc')listQ();});
/* a fold opened: the authors' lineup reads every work; a controversy reads its own */
$('#deb').addEventListener('toggle',e=>{const t=e.target;if(!DEB)return;if(t.id==='lufold')LUOPEN=t.open;if(t.id==='pmfold')PMOPEN=t.open;if(!t.open)return;if(t.id==='lufold'){loadAll();debateFill();}else if(t.matches('details.qi'))fillItem(t);},true);
/* the grid's row and column, named in their heads while a number is under the pointer or has the focus */
for(const [ev,on] of [['pointerover',true],['pointerout',false],['focusin',true],['focusout',false]])$('#deb').addEventListener(ev,e=>{const b=e.target.closest&&e.target.closest('#dnet button[data-pm]');if(b)pmCross(b,on);});
$('#pairs').addEventListener('toggle',e=>{if(e.target.matches('details.pairs'))OPEN=e.target.open;},true);
/* on a phone the board folds away once a debate or a work is chosen, so it is in view */
$('#pairs').addEventListener('click',e=>{if(e.target.closest('a.pl,a.dl')&&matchMedia('(max-width:760px)').matches)OPEN=false;});
addEventListener('hashchange',()=>{if(IX)route();});
addEventListener('keydown',e=>{
  if(e.key==='Escape'&&PVW.escape()){e.preventDefault();return;}
  if(VIEW==='debate'&&DEB&&e.target.closest&&e.target.closest('#dnet .pm')){pmKey(e);return;}
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
