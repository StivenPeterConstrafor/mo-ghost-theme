/* The controversies: ported from The Faith Received (tools/prdl_reader_prototype/controversies.html, 2026-10-22); the data from the
   library worker, links into the reader and the author pages on this site. One function scope, so its names meet no other script's. */
window.__FR_BLOB_BASE__=window.__FR_BLOB_BASE__||"https://mo-tfr-library.mo-podcast-feed.workers.dev";
window.__FR_READER_PATH__=window.__FR_READER_PATH__||"/the-faith-received/read/";
window.__FR_SEARCH_PATH__=window.__FR_SEARCH_PATH__||"/the-faith-received/search/";
window.__FR_LEXICON_PATH__=window.__FR_LEXICON_PATH__||"/the-faith-received/lexicon/";
(() => {
const BASE=(window.__FR_BLOB_BASE__||'').replace(/\/$/,'');
const $=s=>document.querySelector(s),esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const J=u=>fetch(u).then(r=>r.ok?r.json():null).catch(()=>null);
const READER=(window.__FR_READER_PATH__||'/read');
const read=(w,p)=>`${READER}?w=${encodeURIComponent(w)}#b${encodeURIComponent(p)}-0`;
const MAPS='/the-faith-received/maps/',ATLAS='/the-faith-received/disputed-questions/',COURSES='/the-faith-received/courses/',TAIL=' | Controversies | The Faith Received | Mere Orthodoxy';
/* an author's page on this site, by his name folded as the author page folds it */
const roomHref=r=>`/the-faith-received/author/?a=${encodeURIComponent(fold(r.a))}`;
/* the library searched for a man no room holds (his name in every page), and the lexicon's entry for a term; on Mere Orthodoxy the port
   names its own addresses (window.__FR_SEARCH_PATH__, window.__FR_LEXICON_PATH__) */
const SEARCH=window.__FR_SEARCH_PATH__||'/search',LEX=window.__FR_LEXICON_PATH__||'/lexicon';
const searchHref=n=>`${SEARCH}?q=${encodeURIComponent(n)}&m=full`;
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
/* WHO A HOLDER IS (2026-10-22): a holder the work names by one name alone ("Medina", "Soncinas") and the reading gave no catalogue
   author is the catalogue's man whose name in the school map's list (NAMES, as own.py reads them) begins a word of it, else the one man
   of the debate's network (who parts from whom) whose name holds every word of it; a holder of several names, or of a school, stays as
   the work names him. A man's school: the school map's; else what the reading gives; else, in a debate within one school, the network's
   (its men are that school's). A man of no school named, where the schools organize the debate, carries the ring (sc-none). */
const STOPW=new Set(['saint','the','and','von','van','der','della','del','des','with','his']);
const wordsOf=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>=3&&!STOPW.has(w));
const oneName=s=>{const t=String(s||'').trim(),n=wordsOf(t).length;return n>0&&n<=3&&!/[;,&/]|\s(and|or|as|by|with|against|versus|vs\.?)\s/i.test(t)&&!/^(the|some|many|certain|other|others|all|most|an?|his|their)\b/i.test(t)&&!/\bopinion|school|author\b/i.test(t);};
const reEsc=k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
let NAMES_RX=null;
const nameKey=h=>{if(!NAMES_RX)NAMES_RX=NAMES.filter(([,v])=>v&&!NOTHELD.has(v)).map(([k,v])=>[new RegExp(`(^|[^a-zà-ÿ])${reEsc(k)}`),v]);const nm=String(h||'').toLowerCase();for(const [rx,v] of NAMES_RX)if(rx.test(nm))return v;return '';};
const netNodesOf=deb=>{const G=deb&&netOf(deb);return (G&&G.nodes)||null;};
function netHolder(h,deb){
  const N=netNodesOf(deb);if(!N)return '';
  const ws=wordsOf(h),hits=Object.keys(N).filter(n=>!isGroup(n)&&ws.every(w=>wordsOf(n).includes(w)));
  return hits.length===1?hits[0]:'';
}
const holderMan=(o,deb)=>o.author||(oneName(o.holder)?nameKey(o.holder)||netHolder(o.holder,deb):'');
/* the one school a debate's network is of (the Thomists among themselves), else none */
const intraNet=deb=>{const N=netNodesOf(deb);if(!N)return '';const ks=new Set(Object.values(N).map(n=>fold(n.school)));if(ks.size!==1)return '';const k=[...ks][0];return Object.keys(SCHOOLS).find(x=>fold(x)===k)||'';};
function schoolFor(name,deb,given){
  const s=schoolOf(name);if(s)return s;if(given)return given;
  const N=netNodesOf(deb),home=N&&name&&N[name]?intraNet(deb):'';return home||'';
}
/* a man's mark: his school's dot; the ring where the schools organize the debate and he has none; else nothing */
const tok=(s,on)=>s?dot(s):on?'<i class="dot sc-none" aria-hidden="true"></i>':'';
/* the authors' rooms, on all nine shelves (the Fathers and the doctors the works cite as well as their own authors), each room knowing
   its shelf: a name links to his room; a man no room holds links to a search of the library where the author dates know him (2026-10-22);
   else he is named alone */
const ROOMS=new Map(),SHELVES=['md','rc','rf','lu','ed','gf','pl','po','hl'];
const ROOMS_P=Promise.all(SHELVES.map(sh=>J(`${BASE}/v1/bible/${sh}/rooms/index.json`).then(x=>[sh,x]))).then(xs=>{for(const [sh,x] of xs)for(const r of (x&&x.authors)||[]){const k=fold(r.a);if(!ROOMS.has(k))ROOMS.set(k,{...r,sh});}});
const roomOf=n=>ROOMS.get(pkey(n))||ROOMS.get(fold(n));
const datesOf=n=>{const T=window.FRTraditionGraphics;return n&&T&&T.dates?T.dates.get(n):null;};
const who=(n,label)=>{const r=n&&roomOf(n);if(r)return `<a href="${roomHref(r)}">${esc(label||n)}</a>`;return datesOf(n)?`<a href="${esc(searchHref(n))}" title="${esc(`Search the library for ${n}`)}">${esc(label||n)}</a>`:`<span>${esc(label||n)}</span>`;};
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
const opsOf=(c,d)=>{
  const deb=debId((c&&c.debate)||(d&&d.debate)||'');
  return (c.opinions||[]).map(o=>{
    const au=o.author||'',man=holderMan(o,deb);let s=schoolFor(man||au,deb,o.school||'');
    if(!s&&!au){for(const [re,x] of SCHOOL_WORDS)if(re.test(o.holder||'')){s=x;break;}if(!s)s=schoolOf(holderAuthor(o.holder));}
    return {holder:o.holder||au||'',author:au,man,school:s,party:partyOf(o.party),parts_from:o.parts_from||null,reported:o.reported||'',args:o.arguments||[],position:o.position||'',picks:o.picks||[]};
  });
};
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
  if(hasOps(c)){for(const o of opsOf(c,d))if(o.author&&o.picks.length)add(o.author,'b');}
  else if((c.b.picks||[]).length)add(speaker(d,c,'b'),'b');
  return out;
}
/* the side a work takes: a holder it names, or its own way */
const sidesWith=c=>{const h=String((c.resolution||{}).holder||'').trim();return !h||/^his own\b/i.test(h)?'':h;};
const labelOf=p=>p.label||`${p.a} and ${p.b}`;
/* a book's name; a work in one volume names it by the volume's address (zamora-disputationes-…), so it goes by the work's title, and a
   work in several so named by its title and the volume's number */
/* THE PRINTED VOLUME (2026-10-22): a book of a work in several is named by the label the works index gives its volume (Tomus II, Vol. 10,
   Leonine vol. 4), never by its place in the work's list of books; a work that joins several (John of St. Thomas's two courses) names the
   volume's own title with it. VOLS is a snapshot of the works index for the books of the files built so far (slug: [label, title]); a
   book it lacks takes its label from its own meta.json when that comes. */
const VOLS={"banez-in-primam-partem-tomus-i":["Tomus I"],"banez-in-primam-partem-tomus-ii":["Tomus II"],"banez-in-secundam-secundae":["","Scholastic Commentaries on the Second Part of the Second Part"],"banez-decisiones-de-iure-et-iustitia":["Tomus IV"],"bonaventura-baro-scotus-defensus-1":["Tom. I"],"bonaventura-baro-scotus-defensus-2":["Tom. II"],"bonaventura-baro-scotus-defensus-3":["Tom. III"],"billuart-summa-s-thomae-vol-1":["Vol. 1"],"billuart-summa-s-thomae-vol-2":["Vol. 2"],"billuart-summa-s-thomae-vol-3":["Vol. 3"],"billuart-summa-s-thomae-vol-4":["Vol. 4"],"billuart-summa-s-thomae-vol-5":["Vol. 5"],"billuart-summa-s-thomae-vol-6":["Vol. 6"],"billuart-summa-s-thomae-vol-7":["Vol. 7"],"cajetan-summa-leonine-vol-10":["Leonine vol. 10 · Secunda secundae, qq. 123–189 (Rome, 1899)"],"cajetan-summa-leonine-vol-11":["Leonine vol. 11 · Tertia pars, qq. 1–59 (Rome, 1903)"],"cajetan-summa-leonine-vol-12":["Leonine vol. 12 · Tertia pars, qq. 60–90 (Rome, 1906)"],"cajetan-summa-leonine-vol-4":["Leonine vol. 4 · Prima pars, qq. 1–49 (Rome, 1888)"],"cajetan-summa-leonine-vol-5":["Leonine vol. 5 · Prima pars, qq. 50–119 (Rome, 1889)"],"cajetan-summa-leonine-vol-6":["Leonine vol. 6 · Prima secundae, qq. 1–70 (Rome, 1891)"],"cajetan-summa-leonine-vol-7":["Leonine vol. 7 · Prima secundae, qq. 71–114 (Rome, 1892)"],"cajetan-summa-leonine-vol-8":["Leonine vol. 8 · Secunda secundae, qq. 1–56 (Rome, 1895)"],"cajetan-summa-leonine-vol-9":["Leonine vol. 9 · Secunda secundae, qq. 57–122 (Rome, 1897)"],"contenson-theologia-mentis-et-cordis-vol-1":["Tomus I"],"contenson-theologia-mentis-et-cordis-vol-2":["Tomus II"],"contenson-theologia-mentis-et-cordis-vol-3":["Tomus III"],"contenson-theologia-mentis-et-cordis-vol-4":["Tomus IV"],"delprado-de-gratia-et-libero-arbitrio-vol-1":["","On Grace and Free Will, Part I: On Grace"],"delprado-de-gratia-et-libero-arbitrio-vol-2":["","On Grace and Free Will, Part II: Concord of Free Will with Divine Motion according to St. Augustine and St. Thomas"],"delprado-de-gratia-et-libero-arbitrio-vol-3":["","On Grace and Free Will, Part III: Concordia of Molina"],"delprado-de-veritate-fundamentali-philosophiae-christianae":["","On the Fundamental Truth of Christian Philosophy"],"sylvester-of-ferrara-commentaria-in-libros-quatuor-contra-gentiles-vol-1":["Vol. 1"],"sylvester-of-ferrara-commentaria-in-libros-quatuor-contra-gentiles-vol-2":["Vol. 2"],"sylvester-of-ferrara-commentaria-in-libros-quatuor-contra-gentiles-vol-3":["Vol. 3"],"sylvester-of-ferrara-commentaria-in-libros-quatuor-contra-gentiles-vol-4":["Vol. 4"],"frassen-scotus-academicus-vol-1":["Vol. 1"],"frassen-scotus-academicus-vol-10":["Vol. 10"],"frassen-scotus-academicus-vol-2":["Vol. 2"],"frassen-scotus-academicus-vol-3":["Vol. 3"],"frassen-scotus-academicus-vol-4":["Vol. 4"],"frassen-scotus-academicus-vol-5":["Vol. 5"],"frassen-scotus-academicus-vol-6":["Vol. 6"],"frassen-scotus-academicus-vol-7":["Vol. 7"],"frassen-scotus-academicus-vol-8":["Vol. 8"],"frassen-scotus-academicus-vol-9":["Vol. 9"],"gonet-clypeus-thomistarum-vol-1":["Vol. 1"],"gonet-clypeus-thomistarum-vol-2":["Vol. 2"],"gonet-clypeus-thomistarum-vol-3":["Vol. 3"],"gonet-clypeus-thomistarum-vol-4":["Vol. 4"],"gonet-clypeus-thomistarum-vol-5":["Vol. 5"],"poinsot-john-of-st-thomas-cursus-philosophicus-vol-1":["Vol. 1","Philosophical Course (Cursus Philosophicus)"],"poinsot-john-of-st-thomas-cursus-philosophicus-vol-2":["Vol. 2","Philosophical Course (Cursus Philosophicus)"],"poinsot-john-of-st-thomas-cursus-philosophicus-vol-3":["Vol. 3","Philosophical Course (Cursus Philosophicus)"],"poinsot-john-of-st-thomas-cursus-theologicus-vol-1":["Vol. 1","Theological Course (Cursus Theologicus)"],"poinsot-john-of-st-thomas-cursus-theologicus-vol-10":["Vol. 10","Theological Course (Cursus Theologicus)"],"poinsot-john-of-st-thomas-cursus-theologicus-vol-2":["Vol. 2","Theological Course (Cursus Theologicus)"],"poinsot-john-of-st-thomas-cursus-theologicus-vol-3-pt-1":["Vol. 3 · Pt. 1","Theological Course (Cursus Theologicus)"],"poinsot-john-of-st-thomas-cursus-theologicus-vol-3-pt-2":["Vol. 3 · Pt. 2","Theological Course (Cursus Theologicus)"],"poinsot-john-of-st-thomas-cursus-theologicus-vol-4-pt-1":["Vol. 4 · Pt. 1","Theological Course (Cursus Theologicus)"],"poinsot-john-of-st-thomas-cursus-theologicus-vol-4-pt-2":["Vol. 4 · Pt. 2","Theological Course (Cursus Theologicus)"],"poinsot-john-of-st-thomas-cursus-theologicus-vol-5-pt-1":["Vol. 5 · Pt. 1","Theological Course (Cursus Theologicus)"],"poinsot-john-of-st-thomas-cursus-theologicus-vol-5-pt-2":["Vol. 5 · Pt. 2","Theological Course (Cursus Theologicus)"],"poinsot-john-of-st-thomas-cursus-theologicus-vol-6-pt-1":["Vol. 6 · Pt. 1","Theological Course (Cursus Theologicus)"],"poinsot-john-of-st-thomas-cursus-theologicus-vol-6-pt-2":["Vol. 6 · Pt. 2","Theological Course (Cursus Theologicus)"],"poinsot-john-of-st-thomas-cursus-theologicus-vol-7-pt-1":["Vol. 7 · Pt. 1","Theological Course (Cursus Theologicus)"],"poinsot-john-of-st-thomas-cursus-theologicus-vol-7-pt-2":["Vol. 7 · Pt. 2","Theological Course (Cursus Theologicus)"],"poinsot-john-of-st-thomas-cursus-theologicus-vol-8":["Vol. 8","Theological Course (Cursus Theologicus)"],"poinsot-john-of-st-thomas-cursus-theologicus-vol-9":["Vol. 9","Theological Course (Cursus Theologicus)"],"mastrius-bellutus-cursus-philosophicus-vol-1":["Tom. I (Venice, 1727): Disputations on Aristotle's Logic"],"mastrius-bellutus-cursus-philosophicus-vol-2":["Tom. II (Venice, 1727): Disputations on Aristotle's Physics"],"mastrius-bellutus-cursus-philosophicus-vol-3":["Tom. III (Venice, 1727): Disputations on Aristotle's On the Soul, On Generation and Corruption, On the Heavens and Meteorology"],"mastrius-bellutus-cursus-philosophicus-vol-4":["Tom. IV (Venice, 1727): Disputations on the Twelve Books of Aristotle's Metaphysics, Part 1"],"mastrius-bellutus-cursus-philosophicus-vol-5":["Tom. V (Venice, 1727): Disputations on the Twelve Books of Aristotle's Metaphysics, Part 2"],"mastri-mastrius-scotist-commentary-vol-1":["Vol. 1"],"mastri-mastrius-scotist-commentary-vol-2":["Vol. 2"],"mastri-mastrius-scotist-commentary-vol-3":["Vol. 3"],"mastri-mastrius-scotist-commentary-vol-4":["Vol. 4"],"poncius-philosophiae-cursus-integer-lyon-1672":["","Complete Course of Philosophy according to the Mind of Scotus"],"poncius-theologiae-cursus-integer":["","Complete Course of Theology according to the Mind of Scotus"],"poncius-commentarii-theologici-tom-1-pars-1":["Tom. I, pars 1 (Paris, 1661): Book I of the Sentences","Theological Commentaries Explaining and Illustrating Duns Scotus's Questions on the Books of the Sentences"],"poncius-commentarii-theologici-tom-1-pars-2":["Tom. I, pars 2 (Paris, 1661): Book I of the Sentences","Theological Commentaries Explaining and Illustrating Duns Scotus's Questions on the Books of the Sentences"],"poncius-commentarii-theologici-tom-2-pars-1":["Tom. II, pars 1 (Paris, 1661): Book II of the Sentences","Theological Commentaries Explaining and Illustrating Duns Scotus's Questions on the Books of the Sentences"],"poncius-commentarii-theologici-tom-2-pars-2":["Tom. II, pars 2 (Paris, 1661): Book II of the Sentences","Theological Commentaries Explaining and Illustrating Duns Scotus's Questions on the Books of the Sentences"],"poncius-commentarii-theologici-tom-3":["Tom. III (Paris, 1661): Book III of the Sentences, dist. 1-24","Theological Commentaries Explaining and Illustrating Duns Scotus's Questions on the Books of the Sentences"],"poncius-commentarii-theologici-tom-4":["Tom. IV (Paris, 1661): Book III of the Sentences, dist. 25-40","Theological Commentaries Explaining and Illustrating Duns Scotus's Questions on the Books of the Sentences"],"franciscus-sylvius-opera-omnia-tom-1":["Tom. I"],"franciscus-sylvius-opera-omnia-tom-2":["Tom. II"],"franciscus-sylvius-opera-omnia-tom-3":["Tom. III"],"franciscus-sylvius-opera-omnia-tom-4":["Tom. IV"],"duns-scotus-opera-t01":["Tomus I"],"duns-scotus-opera-t02":["Tomus II"],"duns-scotus-opera-t03":["Tomus III"],"duns-scotus-opera-t04":["Tomus IV"],"duns-scotus-opera-t05":["Tomus V"],"duns-scotus-opera-t06":["Tomus VI"],"duns-scotus-opera-t07":["Tomus VII"],"duns-scotus-opera-t08":["Tomus VIII"],"duns-scotus-opera-t09":["Tomus IX"],"duns-scotus-opera-t10":["Tomus X"],"duns-scotus-opera-t11":["Tomus XI"],"duns-scotus-opera-t12":["Tomus XII"],"duns-scotus-opera-t13":["Tomus XIII"],"duns-scotus-opera-t14":["Tomus XIV"],"duns-scotus-opera-t15":["Tomus XV"],"duns-scotus-opera-t16":["Tomus XVI"],"duns-scotus-opera-t17":["Tomus XVII"],"duns-scotus-opera-t18":["Tomus XVIII"],"duns-scotus-opera-t19":["Tomus XIX"],"duns-scotus-opera-t20":["Tomus XX"],"duns-scotus-opera-t21":["Tomus XXI"],"duns-scotus-opera-t22":["Tomus XXII"],"duns-scotus-opera-t23":["Tomus XXIII"],"duns-scotus-opera-t24":["Tomus XXIV"],"duns-scotus-opera-t25":["Tomus XXV"],"duns-scotus-opera-t26":["Tomus XXVI"],"tommaso-zigliara-summa-philosophica-vol-1":["Vol. 1"],"tommaso-zigliara-summa-philosophica-vol-2":["Vol. 2"],"tommaso-zigliara-summa-philosophica-vol-3":["Vol. 3"]};
const VOLM=new Map();
const volLike=v=>/\b(vol|vols|tom|tomus|pars|part|leonine)\b\.?|^tom\./i.test(String(v||''));
function bookOf(d,b){
  const B=d.books||{},t=B[String(b)]||'',slug=/^[a-z0-9]+(-[a-z0-9]+)+$/;if(!slug.test(t))return t;
  if(Object.keys(B).length<2)return d.source_title||t;
  const several=/\band\b|;/.test(d.source_title||''),e=VOLS[t]||VOLM.get(t);
  if(!e){volFetch(t);return d.source_title||t;}
  const [v,ti]=e;return several?`${ti||d.source_title}${v?`, ${v}`:''}`:v?`${d.source_title}, ${v}`:(ti||d.source_title);
}
/* a book the snapshot lacks: its meta's volume and title, then the names already drawn are drawn again */
function volFetch(slug){if(VOLM.has(slug))return;VOLM.set(slug,null);J(`${BASE}/v1/works/${encodeURIComponent(slug)}/meta.json`).then(m=>{if(!m)return;VOLM.set(slug,[volLike(m.volume)?String(m.volume):'',String(m.title||'')]);if(VIEW==='pair'&&D&&Object.values(D.books||{}).includes(slug)){list();if(CUR)show(CUR,false);}});}
const bookLabel=(d,c)=>byAuthor(d)&&c.a&&c.a.name?c.a.name:bookOf(d,c.book);
/* the metaphysical questions are also mapped across the whole tradition (v1/maps q294 onward) and answered in the atlas */
const ALSO={'suarez-schools':`The same questions across the tradition: <a href="${MAPS}#q294">maps of the metaphysical questions</a> · <a href="${ATLAS}#q294">every answer in the atlas</a>. Read the disputation as a course: <a href="${COURSES}#metaphysics">Metaphysics with Suárez</a>`};
let IX=null,LIVE=[],DS=[],D=null,CUR=null,PAIR=null,OPEN=null,LUOPEN=null,PMOPEN=null,LAND=false,VIEW='',DEB=null,RUN=0,AMONG=false,NET=null;const KINDS=new Set(),DSCH=new Set();
const AMONG_LABEL='Among the English divines themselves';
/* COMPACT OR IN FULL (2026-10-22, owner: "i dont want just two sentences i like the depth the old controversies had"): a question's
   controversies open in full, each the card the work's own view draws; "Compact" folds them to their questions, the first of each work
   open in brief. The reader's choice is kept in this browser where it can be, and the page reads right without it. */
let COMPACT=(()=>{try{return localStorage.getItem('fr_contro_compact')==='1';}catch(_){return false;}})();
const setCompact=v=>{COMPACT=!!v;try{localStorage.setItem('fr_contro_compact',COMPACT?'1':'0');}catch(_){}};
/* what is shown, said to a screen reader in a line (the cards are not a live region); a list a filter changed, faded in once */
const say=t=>{const el=$('#say');if(el)el.textContent=String(t||'');};
const flash=(el,c)=>{if(!el)return;el.classList.remove(c);void el.offsetWidth;el.classList.add(c);};
/* A DEBATE RENAMED (2026-10-22): the English covenant debate is widening into the covenant (federal theology and its controversies);
   once the index names `covenant` and no longer `covenant-english`, the old addresses, a controversy's own debate and the network's
   key follow it there; while the index keeps the old id, the new address opens it (#debate/covenant reads #debate/covenant-english). */
const DEB_ALIAS={'covenant-english':'covenant'};
const hasDeb=id=>!!(IX&&IX.debates&&IX.debates[id])||DS.some(g=>g.id===id);
const debId=id=>{if(!id||hasDeb(id))return id;if(DEB_ALIAS[id]&&hasDeb(DEB_ALIAS[id]))return DEB_ALIAS[id];return Object.keys(DEB_ALIAS).find(k=>DEB_ALIAS[k]===id&&hasDeb(k))||id;};
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
})({read,col:'.side,.op,#c,#dq,.rcp',host:'li,figure.own,.judgment,.res,.c-head',text:''});
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
/* THE CARD (2026-10-22 evening, owner: "now other controversies should do that too"): one renderer for the work's own view and a
   debate's question. A controversy as its work argues it: the sides, each with its position, every argument with its page, and its own
   words; or the opinions the work weighs, each with its school or party, what the work reports, its arguments and its own words; then
   the work's judgment or resolution with its reasons and its page, and its author's own words. lv is the level of a side's heading, its
   labels a level under it. A row with nothing in it is left out, never filled with a sentence saying so. */
const Hx=(lv,cls,inner)=>{const n=Math.min(6,lv);return `<h${n} class="${cls}">${inner}</h${n}>`;};
/* a passage set in: the words, then the work, the page with its Preview and the Latin toggle on the line under them, then what it says;
   where the data gives the Latin too (q.la), the two are set side by side */
const latinOK=w=>!!w&&!/^eebo-/.test(w)&&!NOLA.has(w);
const quoteHTML=q=>{
  const en=String(q.quote||'').trim(),la=String(q.la||'').trim();if(!en&&!la)return '';
  const tog=en&&!la&&q.p!=null&&q.p!==''&&latinOK(q.w)?`<button type="button" class="ql" data-ql="${esc(q.w)}|${esc(q.p)}" aria-expanded="false">Latin</button>`:'';
  return `<figure class="own${en&&la?' duo':''}">${en?`<blockquote lang="en"><p>${esc(en)}</p></blockquote>`:''}${la?`<blockquote class="own-la" lang="la"><p>${esc(la)}</p></blockquote>`:''}<figcaption>${q.t?`<span>${esc(q.t)}</span>`:''}${pg(q.w,q.p,'',en||la)}${tog}</figcaption>${tog?'<div class="own-la" hidden></div>':''}${q.says?`<p class="says">${esc(q.says)}</p>`:''}</figure>`;
};
const whoLine=(n,deb,on)=>{const s=schoolFor(n,deb,'');return `<p class="who">${tok(s,on)}${who(n)}${schTag(s)}</p>`;};
/* the debate a controversy is argued in, and whether the schools organize it (where the ring is drawn) */
const debOf=(d,c)=>debId((c&&c.debate)||(d&&d.debate)||'');
const schooledDeb=deb=>{const g=DS.find(x=>x.id===deb);return !!g&&(schoolsMode(g)||!!intraNet(deb));};
const schooledIn=(d,deb)=>schooledDeb(deb)||(!!d&&intraSchool(d));
const argsHTML=(c,args)=>`<ol class="rows args">${args.map(a=>`<li><span>${esc(a.arg)}</span>${pg(c.source.w,a.page)}</li>`).join('')}</ol>`;
function sideHTML(d,c,side,lv){
  const s=c[side]||{},args=s.arguments||[],own=s.picks||[],varies=side==='b'&&sidesOf(d)[1]==='varies',deb=debOf(d,c);
  const name=side==='a'?(c.a.name||d.a):(c.b.name||d.b),slug=side==='a'?(c.a.name?'':d.a_slug):(c.b.name?'':d.b_slug),hs=sideSchool(d,side),au=varies?authorOf(d,c,'b'):'';
  const their=au?many('',au):many(slug,name),lab=t=>Hx(lv+1,'lbl',t);
  return `<section class="side">${Hx(lv,`sd-h${String(name).length>48?' long':''}`,`${dot(hs)}${esc(name)}${schTag(hs)}`)}
    ${s.reported?`${lab(`Position, as ${esc(srcOf(d,c))} states it`)}<p class="pos">${esc(s.reported)}</p>`:''}
    ${args.length?`${lab(`Arguments <span class="ct">${args.length}</span>`)}${argsHTML(c,args)}`:''}
    ${own.length?`${lab(`In ${their?'their':'his'} own words <span class="ct">${own.length}</span>`)}${au?whoLine(au,deb,schooledIn(d,deb)):''}${s.position?`<p class="gist">${esc(s.position)}</p>`:''}${own.map(quoteHTML).join('')}`:''}</section>`;
}
/* PARTS FROM (2026-10-22, the Bonaventurians): whom a holder or the work parts from, with that man's school; the data gives a name, a
   list of names, or {name, school} */
function partsFromHTML(pf,deb,bare){
  const xs=(Array.isArray(pf)?pf:pf?[pf]:[]).map(x=>typeof x==='string'?{name:x}:x||{}).filter(x=>x.name);
  if(!xs.length)return '';
  const one=x=>{const s=schoolFor(x.name,deb,x.school||'');return `${dot(s)}${who(x.name)}${schTag(s)}`;};
  return bare?xs.map(one).join(', '):`<p class="pf">parts from ${xs.map(one).join(', ')}</p>`;
}
/* the opinions in the work's order, each read from the top: who holds it (his school's dot or the ring, his party; the man whose pages
   answer for him, the heading itself where the work names him by his name), whom he parts from, what the work reports, the arguments
   with their pages, his own words */
function opinionsHTML(d,c,lv){
  const deb=debOf(d,c),on=schooledIn(d,deb);
  return `<div class="ops">${opsOf(c,d).map(o=>{
    const p=(o.man?many('',o.man):many('',o.holder))?'their':'his',hl=holderLabel(o,c),same=!!o.man&&fold(o.man)===fold(hl),lab=t=>Hx(lv+1,'lbl',t);
    return `<section class="op">${Hx(lv,`op-h${hl.length>60?' long':''}`,`${tok(o.school,on&&(!!o.man||oneName(o.holder)))}${same?who(o.man,hl):esc(hl)}${schTag(o.school)}${chip(o.party)}`)}${o.man&&!same?`<p class="who">${who(o.man)}</p>`:''}${partsFromHTML(o.parts_from,deb)}
      ${o.reported?`${lab(`Position, as ${esc(srcOf(d,c))} states it`)}<p class="pos">${esc(o.reported)}</p>`:''}
      ${o.args.length?`${lab(`Arguments <span class="ct">${o.args.length}</span>`)}${argsHTML(c,o.args)}`:''}
      ${o.picks.length?`${lab(`In ${p} own words <span class="ct">${o.picks.length}</span>`)}${o.position?`<p class="gist">${esc(o.position)}</p>`:''}${o.picks.map(quoteHTML).join('')}`:''}</section>`;
  }).join('')}</div>`;
}
/* the work's resolution: whom it sides with, or its own way, its reasons at its page; then the work's author in his own words */
function resolutionHTML(d,c,lv){
  const r=c.resolution||{},h=sidesWith(c),o=h?opsOf(c,d).find(x=>fold(x.holder)===fold(h)):null,me=authorOf(d,c,'a'),ms=schoolOf(me),own=c.a.picks||[];
  if(!r.why&&!r.page&&!own.length)return '';
  return `<section class="judgment">${Hx(lv,'jd-h',`${dot(ms)}${esc(srcOf(d,c))} ${h?`sides with ${o?dot(o.school):''}${esc(h)}`:'resolves it his own way'}`)}${r.why||r.page?`<div class="r1">${r.why?`<p>${esc(r.why)}</p>`:'<span></span>'}${pg(c.source.w,r.page)}</div>`:''}
    ${own.length?`${Hx(lv+1,'lbl',`In his own words <span class="ct">${own.length}</span>`)}${c.a.position?`<p class="gist">${esc(c.a.position)}</p>`:''}${own.map(quoteHTML).join('')}`:''}</section>`;
}
/* the work's judgment between two sides, the side it finds for marked with its school */
function judgmentHTML(d,c,lv){
  const jd=c.judgment||{},bn=c.b.name||d.b,whom=jd.side==='a'?(c.a.name||d.a):jd.side==='b'?bn:jd.side==='both'?'both':'neither';
  if(!jd.why&&!jd.page)return '';
  const mark=jd.side==='a'||jd.side==='b'?dot(sideSchool(d,jd.side)):'';
  return `<section class="judgment">${Hx(lv,'jd-h',d.self_judge?`${esc(srcOf(d,c))}'s conclusion`:`${esc(srcOf(d,c))}'s judgment${whom==='both'?': they agree':whom==='neither'?'':`: for ${mark}${esc(whom)}`}`)}<div class="r1">${jd.why?`<p>${esc(jd.why)}</p>`:'<span></span>'}${pg(c.source.w,jd.page)}</div></section>`;
}
const cardHTML=(d,c,lv)=>hasOps(c)?`${opinionsHTML(d,c,lv)}${resolutionHTML(d,c,lv)}`:`<div class="sides">${sideHTML(d,c,'a',lv)}${sideHTML(d,c,'b',lv)}</div>${judgmentHTML(d,c,lv)}`;
/* beside the question: the controversy's topic (the covenant) and whom its author parts from (the Bonaventurians), where the data has them */
const factsHTML=(d,c)=>`${c.topic?`<div><dt>Topic</dt><dd>${esc(c.topic)}</dd></div>`:''}${c.parts_from?`<div><dt>Parts from</dt><dd>${partsFromHTML(c.parts_from,debOf(d,c),true)}</dd></div>`:''}`;
const articlesHTML=(d,c)=>{const arts=c.articles||[];return arts.length?`<details class="fold"><summary>${esc(srcOf(d,c))}'s articles <span class="ct">${arts.length}</span></summary><ol class="rows">${arts.map(a=>`<li><span>${esc(a.title)}</span>${pg(c.source.w,a.page,'',a.title)}</li>`).join('')}</ol></details>`:'';};
const MQ=new Map();
const mapQ=id=>{if(!MQ.has(id))MQ.set(id,J(`${BASE}/v1/maps/q/${encodeURIComponent(id)}.json`));return MQ.get(id);};
/* ACROSS THE TRADITION (2026-10-21, owner: "line up people for or against"; in the reception pane from 2026-10-22): the men the map
   places at each position, by school where the schools organize the debate and else by shelf, each with the page that places him and its
   Preview; those the controversies here quote are set in bold */
function fillHolders(root,bySchool,here){
  const ol=root&&root.querySelector('.across-pos[data-q]');if(!ol)return;
  mapQ(ol.dataset.q).then(m=>{
    if(!m||!ol.isConnected||ol.dataset.filled)return;ol.dataset.filled='1';
    const P=new Map((m.positions||[]).map(p=>[p.label,p])),T=window.FRTraditionGraphics;
    for(const li of ol.querySelectorAll('li[data-pos]')){
      const p=P.get(li.dataset.pos);if(!p)continue;
      const by=new Map(),seen=new Set();
      for(const x of p.holders||[]){const k=pkey(x.author),g=bySchool?schoolOf(x.author):(T?T.key(x.tradition):'');if(!g||g==='x'||seen.has(k))continue;seen.add(k);if(!by.has(g))by.set(g,[]);by.get(g).push(x);}
      const page=x=>{const c=(x.cited&&x.cited[0])||x.cite;return c&&c[0]&&c[1]?pg(c[0],c[1]):'';};
      const nm=x=>here&&here.has(pkey(x.author))?`<strong>${who(x.author)}</strong>`:who(x.author);
      const keys=bySchool?Object.keys(SCHOOLS).filter(s=>by.has(s)):(T?T.TRADITIONS.map(t=>t[0]).filter(k=>by.has(k)):[]);
      const men=xs=>{const top=xs.slice(0,8),more=xs.length-top.length;return `${top.map(x=>`<span class="ap-man">${nm(x)}${page(x)}</span>`).join('')}${more?`<a class="ap-more" href="${MAPS}#${esc(ol.dataset.q)}">and ${fmt(more)} more on the map</a>`:''}`;};
      if(keys.length)li.insertAdjacentHTML('beforeend',`<span class="ap-who">${keys.map(g=>`<span class="run">${bySchool?dot(g):`<i class="sw" style="--c:var(--tg-${g})" aria-hidden="true"></i>`}<span class="run-b"><b>${esc(bySchool?g:T.label(g))}</b>${men(by.get(g))}</span></span>`).join('')}</span>`);
    }
  });
}
function show(id,push){
  const i=D.controversies.findIndex(c=>c.id===id);if(i<0)return;const c=D.controversies[i];CUR=id;
  document.querySelectorAll('#books button[data-id]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.id===id)));
  const prev=D.controversies[i-1],next=D.controversies[i+1];
  $('#c').innerHTML=`<header class="c-head"><h3 class="qh">${esc(c.question)}</h3>
    <dl class="lab"><div class="partof" hidden><dt>Part of</dt><dd></dd></div><div><dt>Between them</dt><dd><span class="kind">${esc(KIND[c.kind]||c.kind)}</span></dd></div>${factsHTML(D,c)}
    ${c.place?`<div><dt>Treated at</dt><dd>${esc(c.place)}</dd></div>`:''}
    <div><dt>Source</dt><dd class="r1"><span>${bookLabel(D,c)?`${esc(bookLabel(D,c))}, `:''}controversy ${c.n}${c.source.title?`: <em>${esc(c.source.title)}</em>`:''}</span>${pg(c.source.w,c.source.p0,range(c.source),c.source.title)}</dd></div></dl>
    ${articlesHTML(D,c)}</header>
    ${cardHTML(D,c,4)}
    <nav class="next" aria-label="Previous and next controversy">${prev?`<button type="button" data-go="${esc(prev.id)}"><small>Previous controversy</small><span>${esc(prev.question)}</span></button>`:'<span></span>'}${next?`<button type="button" data-go="${esc(next.id)}"><small>Next controversy</small><span>${esc(next.question)}</span></button>`:'<span></span>'}</nav>`;
  partOf(c);
  paneFor($('#crcp'),{atlas:(c.atlas&&c.atlas.id)||'',q:(c.atlas&&c.atlas.q)||'',deb:debOf(D,c),items:[{pair:D.pair,id:c.id}],one:true});
  say(c.question);
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
  $('#src').innerHTML='';$('#books').innerHTML='<li class="muted">Loading…</li>';$('#chips').innerHTML='';$('#cfilt').innerHTML='';$('#cfilt').hidden=true;$('#crcp').innerHTML='';
  $('#c').innerHTML='<p class="muted">Loading the controversies…</p>';
  const d=await doc(pair);
  if(PAIR!==pair)return;
  if(!d){$('#c').innerHTML='<p class="muted">The controversies could not be loaded. Reload the page to try again.</p>';return;}
  D=d;CUR=null;KINDS.clear();AMONG=false;$('#find').value='';
  pairHead();
  /* the kinds of difference; and where the work marks them, the controversies among the Protestant divines themselves */
  const am=D.controversies.filter(c=>c.among===true).length;
  $('#chips').innerHTML=Object.keys(KIND).filter(k=>D.kinds[k]).map(k=>`<button type="button" data-kind="${k}" aria-pressed="false">${esc(KIND[k])} <span class="ct">${D.kinds[k]}</span></button>`).join('');
  $('#cfilt').innerHTML=am?`<button type="button" class="tgl" data-among aria-pressed="false">${AMONG_LABEL}<span class="ct">${fmt(am)}</span></button>`:'';$('#cfilt').hidden=!am;
  $('#note').textContent=cleanNote(D.note);
  list();
  const first=D.controversies.find(c=>c.id===id)||D.controversies[0];
  if(first)show(first.id,false);
}
function showPair(pair,id){
  viewIs('pair');
  if(!D||D.pair!==pair){if(PAIR!==pair)loadPair(pair,id);else renderBoard();return;}
  PAIR=pair;renderBoard();$('#note').textContent=cleanNote(D.note);
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
    pathsFile(g.id).then(f=>{if(!f||!DEB||DEB.run!==run)return;$('#dhead').innerHTML=headHTML();debNote();rcPaths($('#drcp'));});
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
    <div class="dtabs"><div class="tabs" role="tablist" aria-label="The debate by its questions, or by its works"><button type="button" role="tab" id="tab-q" aria-controls="tp-q">Questions</button><button type="button" role="tab" id="tab-w" aria-controls="tp-w">By work</button></div><button type="button" class="tgl" id="dcompact" aria-pressed="${COMPACT}">Compact</button></div>
    <p class="status" id="dstat" role="status" hidden></p>
    <section id="tp-q" role="tabpanel" aria-labelledby="tab-q">
      ${sch?`<details class="lu" id="lufold"${luOpen?' open':''}><summary><h3 class="lu-h">The authors, by school</h3><span class="lu-dig" aria-hidden="true">${Object.keys(SCHOOLS).map(s=>`<span>${dot(s)}${esc(s)}</span>`).join('')}</span><span class="lu-key">Counts: the controversies that quote him</span></summary>
        <div id="lu"><p class="muted">Reading the works…</p></div></details>`:''}
      <div class="cols has-rcp"><nav class="nav" aria-label="The questions of this debate">
        <input class="find" id="dfind" type="search" placeholder="Find a question" aria-label="Find a question" autocomplete="off">
        <div class="qf"><select id="dloc" aria-label="Locus"><option value="">Every locus</option></select><select id="dtopic" aria-label="Topic" hidden><option value="">Every topic</option></select><button type="button" class="tgl" id="dshared" aria-pressed="${DEB.shared}">Shared by 2 or more works</button><button type="button" class="tgl" id="damong" aria-pressed="false" hidden>${AMONG_LABEL}</button></div>
        <ol class="books" id="dlist"><li class="muted">Loading the questions…</li></ol></nav>
      <article class="c" id="dq"></article><aside class="rcp" id="drcp" aria-label="Reception"></aside></div>
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
  $('#tp-q').hidden=w;$('#tp-w').hidden=!w;$('#dcompact').hidden=w;
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
    else if(DEB.qs){let ch=false;for(const x of DEB.qs)ch=enrich(x)||ch;if(ch){amongUI();topicUI();listQ();}}
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
    x.items.push({pair:d.pair,id:c.id,source:d.source,question:c.question,kind:c.kind,place:c.place,title:c.source.title,among:typeof c.among==='boolean'?c.among:null,topic:c.topic?String(c.topic):'',who,_e:1});
  }}
  return [...by.values()].sort((a,b)=>(b.works.length-a.works.length)||(b.n-a.n));
}
const hayOf=x=>fold([x.q,x.locus,x.topic||'',...x.works,...x.items.map(i=>i.question)].join(' '));
/* a question's topic (the covenant): the one most of its controversies carry */
const topicOf=x=>{const m=new Map();for(const i of x.items)if(i.topic)m.set(i.topic,(m.get(i.topic)||0)+1);let t='',n=0;for(const [k,v] of m)if(v>n){n=v;t=k;}return t;};
/* what a debate's file does not carry, taken from a work once it is read: whether the difference is among the Protestant divines
   (`among`), and in a work of many authors each controversy's author, by whom the question then counts its works */
const cOf=(d,id)=>{if(!d._BY)d._BY=new Map(d.controversies.map(c=>[c.id,c]));return d._BY.get(id);};
function enrich(x){
  let ch=false;
  for(const it of x.items){
    if(it._e)continue;const d=LOADED.get(it.pair);if(!d)continue;
    it._e=1;const c=cOf(d,it.id);if(!c)continue;
    if(typeof c.among==='boolean'){it.among=c.among;ch=true;}
    if(c.topic&&!it.topic){it.topic=String(c.topic);ch=true;}
    if(byAuthor(d)&&c.a&&c.a.name){it.who=c.a.name;ch=true;}
  }
  if(ch){x.among=x.items.filter(i=>i.among===true).length;x.topic=topicOf(x);if(x.items.some(i=>i.who))x.works=[...new Set(x.items.map(i=>i.who||i.source))];x.hay=hayOf(x);}
  return ch;
}
function setQuestions(qs){
  let re=false;
  for(const x of qs){const w=x.works.length;enrich(x);x.among=x.items.filter(i=>i.among===true).length;x.topic=topicOf(x);x.hay=hayOf(x);if(x.works.length!==w)re=true;}
  /* questions whose works were counted again (by author) are ordered again, as the file orders them: by how many works ask them */
  if(re)qs.sort((a,b)=>(b.works.length-a.works.length)||(b.n-a.n));
  DEB.qs=qs;DEB.byQ=new Map(qs.map(x=>[x.id,x]));DEB.byItem=new Map();
  for(const x of qs)for(const i of x.items)DEB.byItem.set(i.id,x);
  if(qs.some(x=>x.topic)&&!DEB.asked)loadAll();
}
/* the topics (the covenant), a select beside the locus: a question has one topic, as it has one locus */
function topicUI(){
  const sel=$('#dtopic');if(!sel||!DEB||!DEB.qs)return;
  const tn=new Map();for(const x of DEB.qs)if(x.topic)tn.set(x.topic,(tn.get(x.topic)||0)+1);
  sel.hidden=!tn.size;if(!tn.size)return;
  const cur=sel.value,ts=[...tn].sort((a,b)=>(b[1]-a[1])||a[0].localeCompare(b[0]));
  sel.innerHTML=`<option value="">Every topic (${fmt(DEB.qs.length)})</option>${ts.map(([t,n])=>`<option value="${esc(t)}"${t===cur?' selected':''}>${esc(t)} (${fmt(n)})</option>`).join('')}`;
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
  amongUI();topicUI();
  listQ();
  if(DEB.tab==='q')pickQuestion(DEB.want,false);
}
function listQ(){
  if(!DEB.qs)return;
  const q=fold($('#dfind').value),loc=$('#dloc').value,top=($('#dtopic')||{}).value||'',byTopic=DEB.qs.some(x=>x.topic);
  let vis=DEB.qs.filter(x=>(!DEB.shared||x.works.length>1)&&(!DEB.among||x.among)&&(!loc||(loc==='-'?!x.locus:x.locus===loc))&&(!top||x.topic===top)&&(!q||x.hay.includes(q)));
  /* the covenant's questions under their topics, the largest first (a question of no topic last); else under how many works argue each */
  if(byTopic){const tn=new Map();for(const x of DEB.qs)if(x.topic)tn.set(x.topic,(tn.get(x.topic)||0)+1);const tk=t=>t?-(tn.get(t)||0):1;vis=vis.map((x,i)=>[x,i]).sort((a,b)=>(tk(a[0].topic)-tk(b[0].topic))||String(a[0].topic).localeCompare(String(b[0].topic))||(a[1]-b[1])).map(a=>a[0]);}
  DEB.vis=vis;
  const gk=x=>byTopic?(x.topic||''):x.works.length;
  let last=null;const per=new Map();for(const x of vis)per.set(gk(x),(per.get(gk(x))||0)+1);
  $('#dlist').innerHTML=vis.map(x=>{const g=gk(x),k=x.works.length,n=DEB.among?x.among:x.n,h=g!==last?`<li class="lh"><span>${byTopic?esc(g||'Other questions'):`Argued in ${fmt(k)} ${k===1?'work':'works'}`}</span><span class="ct">${fmt(per.get(g))}<span class="sr"> ${per.get(g)===1?'question':'questions'}</span></span></li>`:'';last=g;
    return `${h}<li><button type="button" data-q="${esc(x.id)}" aria-current="${String(!!DEB.sel&&DEB.sel.id===x.id)}">${esc(x.q)}<small>${k>1?(byTopic?`${fmt(k)} works · `:''):`${esc(x.works[0]||'')} · `}${fmt(n)} ${n===1?'controversy':'controversies'}${x.locus?` · ${esc(x.locus)}`:''}</small></button></li>`;}).join('')||'<li class="muted">Nothing matches.</li>';
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
  if(others.length)rows.push(`<li><p class="lu-s"><i class="dot sc-none" aria-hidden="true"></i>Of no school named<span class="ct">${fmt(others.length)} quoted</span></p><div><p class="lu-n">${others.map(r=>quoted(r.name,r.ids.size)).join(', ')}</p></div></li>`);
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
/* A WORK ON ITS AUTHORITY (2026-10-22): the Wadding Opera is Scotus's text with his commentators' notes; its passages were chosen from
   Scotus's pages (AUTH), but the work that parts from the fellow Scotists is the commentators'. By work names them, and Scotus as the
   authority they comment. */
const COMMENTED={'wadding-scotists':'John Duns Scotus'};
function sideRows(d,s){
  if(s==='a'&&COMMENTED[d.pair])return [{name:d.source,n:d.controversies.filter(inDeb).length,party:'',on:COMMENTED[d.pair]}];
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
/* the men a side's controversies name, as the work names them (one name each), where the library has no words of theirs */
function namedRows(d,s){
  const m=new Map();
  for(const c of d.controversies){if(!inDeb(c))continue;
    const ns=s==='b'&&hasOps(c)?(c.opinions||[]).map(o=>o.author||o.holder):String((c[s]||{}).name||'').split(';');
    for(const raw of ns){const n=String(raw||'').trim();if(!oneName(n))continue;const k=pkey(n);if(!m.has(k))m.set(k,{name:n,n:0,party:''});m.get(k).n++;}}
  return [...m.values()];
}
function sideCell(d,s,ds){
  let rows=sideRows(d,s);if(!rows.length)rows=namedRows(d,s);
  rows=rows.sort((x,y)=>(y.n-x.n)||x.name.localeCompare(y.name));
  const deb=DEB.id,on=!!ds&&ds.size>0,member=r=>!!ds&&ds.has(schoolFor(r.name,deb,''));
  const rare=ds&&rows.some(member)?rows.filter(r=>!member(r)&&r.n<=2):[],main=rows.filter(r=>!rare.includes(r));
  const li=r=>{const h=schoolFor(r.on||r.name,deb,'');return `<li><span>${tok(h,on&&!r.party)}${who(r.name)}${schTag(h)}${chip(r.party)}${r.on?`<small class="on-auth">on ${who(r.on)}, the authority they comment</small>`:''}</span>${nCon(r.n)}</li>`;};
  return `<div><p class="plr-n">${esc(s==='a'?d.a:d.b)}</p>${main.length?`<ul class="spk">${main.map(li).join('')}</ul>`:''}${rare.length?`<p class="also">Others: ${rare.map(r=>`${who(r.name)}${nCon(r.n)}`).join(', ')}</p>`:''}</div>`;
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
  /* in full every controversy is open; Compact opens the first of each work, or the one the address names */
  const open=(it,j)=>!COMPACT||(item?it.id===item:j===0);
  $('#dq').innerHTML=`<header class="c-head"><h3 class="qh">${esc(x.q)}</h3><dl class="lab">${x.atlas?`<div><dt>Classic question</dt><dd>${x.locus?`${esc(x.locus)} · `:''}<a href="${MAPS}#${esc(x.atlas)}">Map of the tradition</a> · <a href="${ATLAS}#${esc(x.atlas)}">Answers in the atlas</a></dd></div>`:''}${x.topic?`<div><dt>Topic</dt><dd>${esc(x.topic)}</dd></div>`:''}<div><dt>Argued in</dt><dd>${order.map(k=>`${esc(wk(k).source)}<span class="ct"> ${by.get(k).length}</span>`).join(' · ')}</dd></div></dl></header>
    ${order.map((k,n)=>{const w=wk(k),its=by.get(k);return `<section class="qw" aria-labelledby="qw-${n}"><h4 class="qw-h" id="qw-${n}"><span>${w.first?`<a href="#${esc(w.first)}">${esc(w.source)}</a>`:isLive(w.pair)?`<a href="#${esc(w.pair)}">${esc(w.source)}</a>`:esc(w.source)}${w.source_title?`, <em>${esc(w.source_title)}</em>`:''}</span><span class="ct">${its.length}<span class="sr"> ${its.length===1?'controversy':'controversies'}</span></span></h4>
      <ol class="qis">${its.map((it,j)=>`<li><details class="qi" data-pair="${esc(it.pair)}" data-id="${esc(it.id)}"${open(it,j)?' open':''}><summary><span class="qi-q">${esc(it.question)}</span><small>${esc(KIND[it.kind]||it.kind||'')}${it.place?` · ${esc(it.place)}`:''}</small></summary><div class="qi-b"><p class="muted">Reading the controversy…</p></div></details></li>`).join('')}</ol></section>`;}).join('')}
    <nav class="next" aria-label="Previous and next question">${prev?`<button type="button" data-q="${esc(prev.id)}"><small>Previous question</small><span>${esc(prev.q)}</span></button>`:'<span></span>'}${next?`<button type="button" data-q="${esc(next.id)}"><small>Next question</small><span>${esc(next.q)}</span></button>`:'<span></span>'}</nav>`;
  /* a controversy chosen from the grid's list: in view once its card is drawn */
  if(item&&DEB.goItem===item){DEB.goItem='';DEB.scrollTo=item;}
  fillOpen();
  /* the reception reads every work of the question, folded or not */
  for(const p of new Set(items.map(it=>it.pair)))doc(p).then(rcSoon);
  paneFor($('#drcp'),{atlas:x.atlas||'',q:x.q,deb:DEB.id,items:items.map(it=>({pair:it.pair,id:it.id}))});
  say(x.q);
  if(LAND){LAND=false;$('#dq').scrollIntoView({block:'start'});}
  if(push)history.replaceState(null,'',`#debate/${DEB.id}/${item||x.id}`);
  if(VIEW==='debate')document.title=`${x.q}${TAIL}`;
  inSight(document.querySelector(`#dlist button[data-q="${CSS.escape(x.id)}"]`),[$('#dlist'),$('#deb .nav')]);
}
/* the open cards are drawn as their works come, a few at a time so a long question never holds the page; a fold opened later is drawn
   when it opens */
const FILLQ=[];let FILLR=0;
function fillItem(det){if(det.dataset.filled)return;det.dataset.filled='1';doc(det.dataset.pair).then(()=>{FILLQ.push(det);if(!FILLR)FILLR=requestAnimationFrame(drainFill);});}
function fillOpen(){document.querySelectorAll('#dq details.qi[open]').forEach(fillItem);}
function drainFill(){
  FILLR=0;const t=performance.now();
  while(FILLQ.length&&performance.now()-t<14){const det=FILLQ.shift();if(det.isConnected)renderItem(det);}
  if(FILLQ.length)FILLR=requestAnimationFrame(drainFill);else rcSoon();
}
function renderItem(det){
  const box=det.querySelector('.qi-b'),{id} = det.dataset,d=LOADED.get(det.dataset.pair),c=d&&cOf(d,id);
  if(!c){delete det.dataset.filled;box.innerHTML=`<p class="muted">${d?'This controversy has not been read yet.':'This work could not be read. Open the question again to retry.'}</p>`;return;}
  box.innerHTML=itemBody(d,c);
  if(DEB&&DEB.scrollTo===id){DEB.scrollTo='';det.scrollIntoView({block:'start'});}
}
/* a controversy in a debate's question: where its work puts it, then its card in full (Compact: each side in brief) */
function itemBody(d,c){
  const b=bookLabel(d,c);
  const src=`<p class="qi-src"><span>${b?`${esc(b)}, `:''}controversy ${c.n}${c.source.title?`: <em>${esc(c.source.title)}</em>`:''}</span>${pg(c.source.w,c.source.p0,range(c.source),c.source.title)}<a class="qi-open" href="#${esc(c.id)}">Open in the work</a></p>`;
  if(COMPACT)return src+compactBody(d,c);
  const facts=factsHTML(d,c);
  return `${src}${facts?`<dl class="lab">${facts}</dl>`:''}${articlesHTML(d,c)}${cardHTML(d,c,5)}`;
}
/* Compact: each side as the work states it with one passage of its own words, or the opinions grouped by school, and the judgment in a line */
function compactBody(d,c){
  if(hasOps(c))return opinionSides([{c}],d)+resolutionLine(d,c);
  const A=sidesOf(d),jd=c.judgment||{},bn=c.b.name||d.b,whom=jd.side==='a'?(c.a.name||d.a):jd.side==='b'?bn:jd.side==='both'?'both':'neither',me=srcOf(d,c),deb=debOf(d,c);
  const side=s=>{
    const varies=s==='b'&&A[1]==='varies',name=s==='a'?(c.a.name||d.a):bn,hs=sideSchool(d,s),au=varies?authorOf(d,c,'b'):'',p=(c[s].picks||[])[0];
    return `<section class="side"><h5 class="sd-h${String(name).length>48?' long':''}">${dot(hs)}${esc(name)}${schTag(hs)}</h5>${c[s].reported?`<p class="lbl">As ${esc(me)} states it</p><p class="pos">${esc(c[s].reported)}</p>`:''}${p?`${au?whoLine(au,deb,schooledIn(d,deb)):'<p class="lbl">In his own words</p>'}${quoteHTML(p)}`:''}</section>`;
  };
  return `<div class="sides">${side('a')}${side('b')}</div>${jd.why||jd.page?`<div class="res"><p class="lbl">${d.self_judge?`${esc(me)}'s conclusion`:`${esc(me)}'s judgment${whom==='both'?': they agree':whom==='neither'?'':`: for ${esc(whom)}`}`}</p><div class="r1"><p class="pos">${esc(jd.why||'')}</p>${pg(c.source.w,jd.page)}</div></div>`:''}`;
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
  return `<h4>Among the Reformed and Lutherans<span class="ct">${fmt(es.length)}<span class="sr"> ${es.length===1?'answer':'answers'}</span></span></h4>
    <ol class="pth-rows">${es.map(e=>{const w=W[e.slug]||[],t=e.tradition||w[3]||'',lab=PATH_LABEL[e.path]||'',place=placeOf(e.place);
      return `<li><p class="pth-who"><i class="sw" style="--c:${TRAD_COL[t]||'#7A7A76'}" aria-hidden="true"></i>${who(e.author)}${lab?`<small>${esc(lab)}</small>`:''}</p>${pg(e.slug,e.page,'',e.quote)}<div class="pth-b"><p>${esc(e.position)}</p>${e.quote?`<p class="pth-q">“${esc(e.quote)}”</p>`:''}${w[1]||place||t?`<p class="pth-src">${t?`${esc(t)}. `:''}${w[1]?`<em>${esc(w[1])}</em>`:''}${w[1]&&place?', ':''}${esc(place)}</p>`:''}</div></li>`;}).join('')}</ol>
    ${more?`<p class="pth-more">and ${fmt(more)} more in these works</p>`:''}`;
}
function pathsLine(){
  const f=DEB&&PATHD.get(DEB.id);if(!f||!DEB.qs)return '';
  const n=DEB.qs.filter(x=>(f.questions[x.atlas||x.id]||[]).length).length;
  return n?`<p class="deb-also">Reformed and Lutheran metaphysicians stand on ${fmt(n)} of these questions.</p>`:'';
}
/* the debate's note, with the note on the Reformed and Lutherans and on who parts from whom where the debate has them: one note a page */
const PM_NOTE='Who parts from whom is counted from the same reading as the controversies: each controversy once, from its author to each fellow its reading names on the other side.';
/* a file's note says how it was read; the name of the model that read it is not for the page (2026-10-22): "machine reading (MiniMax,
   2026-10-22)" reads "a machine reading of the pages, checked against the page (22 October 2026)", and any other parenthesis naming a
   model keeps its date alone */
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const longDate=t=>{const m=String(t||'').match(/(\d{4})-(\d{2})-(\d{2})/);return m?`${Number(m[3])} ${MONTHS[Number(m[2])-1]} ${m[1]}`:'';};
const MODEL_RX=/\b(?:MiniMax|Gemini|GPT|Claude|DeepSeek|Qwen|Llama|Mistral|OpenAI|Vertex|Flash(?:-Lite)?)\b/i;
function cleanNote(t){
  let s=String(t||'').replace(/\b(by\s+)?machine[- ]reading\s*\(([^()]*)\)/gi,(m,by,inner)=>{if(!MODEL_RX.test(inner))return m;const d=longDate(inner);return `${by||''}a machine reading of the pages, checked against the page${d?` (${d})`:''}`;});
  s=s.replace(/\s*\(([^()]*)\)/g,(m,inner)=>{if(!MODEL_RX.test(inner))return m;const d=longDate(inner);return d?` (${d})`:'';});
  return s.replace(/\s{2,}/g,' ').trim();
}
function debNote(base){if(base!=null)DEB.note=cleanNote(base);$('#note').textContent=[DEB.note||'',PATHD.has(DEB.id)?PATH_NOTE:'',DEB.pm?PM_NOTE:''].filter(Boolean).join(' ');}
/* a work's opinions as sides: the holders of one school together under it, the schools in their order, each holder with one passage of
   his own words or else what the work reports of him; the holders of no school are named after them ("Also weighed"), or, where no
   holder has a school, they are the sides. Where the opinions carry parties (the English divines) the parties are the sides, in their
   order; where the work parts from fellows of its own school (the Thomists among themselves) each holder is a side, his school named only
   where it is another. */
function opinionSides(items,d){
  const all=[];for(const {c} of items)for(const o of opsOf(c,d))all.push({o,c});
  const say=(o,p)=>p?quoteHTML(p):o.reported?`<p class="pos">${esc(o.reported)}</p>`:'';
  const named=(o,c)=>{const hl=holderLabel(o,c);return o.man?who(o.man,hl):`<span>${esc(hl)}</span>`;};
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
    `${sd.school||o.man?`<p class="who">${o.man?who(o.man):esc(o.holder)}${as(o)}</p>`:''}${p?quoteHTML(p):o.reported?`<p class="pos">${esc(o.reported)}</p>`:''}`).join('')}</section>`;
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
const pmOrder=(names,nodes,gf)=>names.map(n=>({n,g:isGroup(n)?1:0,y:isGroup(n)?0:pmYear(n,nodes[n])})).sort((a,b)=>(gf?b.g-a.g:a.g-b.g)||((a.y?0:1)-(b.y?0:1))||(a.y-b.y)||a.n.localeCompare(b.n)).map(x=>x.n);
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
  /* the columns: where the parties and schools hold most of the counts (the covenant, where a divine parts from "the Antinomians" more
     than from any man), they come first, beside the names, and the men after them; else the men first and the groups last */
  const tot=E.reduce((n,e)=>n+Number(e[2]),0),grp=E.filter(e=>isGroup(e[1])).reduce((n,e)=>n+Number(e[2]),0),gf=grp*2>tot;
  const rows=pmOrder([...new Set(E.map(e=>e[0]))],nodes,false),cols=pmOrder([...new Set(E.map(e=>e[1]))],nodes,gf);
  const ri=new Map(rows.map((r,i)=>[r,i])),ci=new Map(cols.map((c,j)=>[c,j])),cell=new Map();
  for(const e of E)cell.set(`${ri.get(e[0])}|${ci.get(e[1])}`,e);
  DEB.pm={rows,cols,cell,nodes,short:pmShort([...rows,...cols]),sel:null,gf};
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
    <div class="tg pmw"><div class="pm-top"><p class="pm-key">${P.gf?'Read across: each row an author, in order of birth; each column one he parts from, the parties and schools first (most of the counts are theirs), then the men in order of birth. Choose a number to list its controversies.':'Read across: each row an author, each column one he parts from, both in order of birth, the undated and then the schools and parties after them. Choose a number to list its controversies.'}</p><p class="pm-lg" aria-hidden="true">${PM_KEY.map((l,k)=>`<span><i class="pm-${k+1}"></i>${l}</span>`).join('')}</p></div>
    <div class="pm-box"><table class="pm"><caption class="sr tg-sr">Who parts from whom: a row for each author who parts, a column for each one he parts from, in each cell the number of controversies</caption>
      <thead><tr><td class="pm-corner"></td>${cols.map((c,j)=>`<th scope="col" data-j="${j}" title="${esc(tip(c))}"><span class="pm-ch"><span class="pm-short" aria-hidden="true">${esc(short.get(c))}</span><span class="sr">${esc(c)}</span></span></th>`).join('')}</tr></thead>
      <tbody>${rows.map((r,i)=>{const d=pmDates(r,nodes[r]);return `<tr><th scope="row" data-i="${i}" title="${esc(tip(r))}"><span class="pm-full">${esc(r)}</span><span class="pm-short">${esc(short.get(r))}</span>${d?`<small>${esc(d)}</small>`:''}</th>${cols.map((c,j)=>td(i,j)).join('')}</tr>`;}).join('')}</tbody></table></div>
    <div class="pm-sel" id="pmsel" hidden></div></div></details>`;
}
/* a cell chosen (again, it closes): its row and column named, its controversies listed, read from their works as they come */
function pmPick(b){
  const P=DEB.pm;if(!P)return;
  const [i,j]=b.dataset.pm.split('|').map(Number),same=P.sel&&P.sel[0]===i&&P.sel[1]===j;
  P.sel=same?null:[i,j];
  document.querySelectorAll('#dnet button[data-pm]').forEach(x=>{x.setAttribute('aria-pressed',String(!same&&x===b));x.tabIndex=x===b?0:-1;});
  pmList();if(!same)flash($('#pmsel'),'pm-in');
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
/* the arrows move among the grid's numbers: the next one along the row or down the column, over the empty cells; Home and End go to
   the row's first and last; one number at a time is in the tab order */
function pmKey(e){
  const b=e.target.closest('button[data-pm]'),P=DEB&&DEB.pm,k=e.key,d={ArrowRight:[0,1],ArrowLeft:[0,-1],ArrowDown:[1,0],ArrowUp:[-1,0],Home:[0,-1],End:[0,1]}[k];
  if(!b||!d||!P)return false;
  e.preventDefault();
  const [y0,x0]=b.dataset.pm.split('|').map(Number),at=(y,x)=>document.querySelector(`#dnet button[data-pm="${y}|${x}"]`);
  let t=null;
  if(k==='Home'||k==='End'){for(let x=k==='Home'?0:P.cols.length-1;x>=0&&x<P.cols.length&&!t;x+=k==='Home'?1:-1)t=at(y0,x);}
  else for(let y=y0+d[0],x=x0+d[1];y>=0&&x>=0&&y<P.rows.length&&x<P.cols.length;y+=d[0],x+=d[1]){t=at(y,x);if(t)break;}
  if(t&&t!==b){document.querySelectorAll('#dnet button[data-pm][tabindex="0"]').forEach(z=>{z.tabIndex=-1;});t.tabIndex=0;t.focus();}
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
/* RECEPTION (2026-10-22, owner: "the side pane carries reception … never a repeat of the card"). Beside the cards from 80rem, a fold
   over them below that (open on a wide screen; folded on a narrower one until the reader opens it). For a debate's question, or one
   controversy in its work's view: who holds what in these controversies, by school (by party in the covenant, by shelf where the schools
   do not organize the debate) and by century; the classic question across the tradition, its positions on the map with the men placed at
   each and their pages; the atlas's answers to it; the Reformed and Lutheran metaphysicians on its paths; and where else it is argued (the
   other debates, its terms in the lexicon). Each part is drawn when its file comes; a part with nothing to show is not drawn. */
const ATQ=new Map();
const atlasQ=id=>{if(!ATQ.has(id))ATQ.set(id,J(`${BASE}/v1/atlas/q/${encodeURIComponent(id)}.json`));return ATQ.get(id);};
let RCN=0,RCOPEN=null,RCR=0;
const wideNow=()=>matchMedia('(min-width:80rem)').matches;
const cap1=t=>{const x=String(t||'');return x.charAt(0).toUpperCase()+x.slice(1);};
function paneFor(host,ctx){
  if(!host)return;host._ctx=ctx;host._here=null;
  const n=++RCN,open=wideNow()||RCOPEN===true,paths=PATHS.has(ctx.deb)&&!!ctx.atlas;
  const parts=['who holds it, by school and century'];if(ctx.atlas)parts.push('the map','the atlas');if(paths)parts.push('the Reformed and Lutherans');parts.push('where else it is argued');
  host.innerHTML=`<details class="rc"${open?' open':''}><summary><h3 class="rc-h" id="rc-h${n}">Reception</h3><span class="rc-k">${esc(cap1(parts.join(', ')))}</span></summary><div class="rc-b tg">
    <section class="rc-who"></section>${ctx.atlas?'<section class="rc-map"></section><section class="rc-atl"></section>':''}${paths?'<section class="rc-pth"></section>':''}<section class="rc-else"></section></div></details>`;
  rcWho(host);rcMap(host);rcAtlas(host);rcPaths(host);rcElse(host);
}
/* every man these controversies set on a side or name as an opinion's holder, with his school and his party */
function holdersOf(d,c){
  const deb=debOf(d,c),N=netNodesOf(deb),out=[];
  const party=n=>{const nd=N&&N[n];return nd?partyOf(nd.school):'';};
  const add=(name,given,pt)=>{if(!name||isGroup(name))return;out.push({name,school:schoolFor(name,deb,given||''),party:partyOf(pt)||party(name)});};
  const a=authorOf(d,c,'a');if(a&&!COMMENTED[d.pair])add(a,sideSchool(d,'a'));
  if(hasOps(c)){for(const o of opsOf(c,d))if(o.man)add(o.man,o.school,o.party);}
  else{const b=authorOf(d,c,'b');if(b)add(b,'');}
  return out;
}
const ordc=n=>`${n}${n%100>=11&&n%100<=13?'th':({1:'st',2:'nd',3:'rd'})[n%10]||'th'}`;
function rcWho(host){
  const box=host&&host.querySelector('.rc-who');if(!box)return;const ctx=host._ctx,T=window.FRTraditionGraphics,N=netNodesOf(ctx.deb)||{};
  const groups=new Map(),seen=new Set();let read=0;
  for(const {pair,id} of ctx.items){const d=LOADED.get(pair),c=d&&cOf(d,id);if(!c)continue;read++;
    const sch=schooledIn(d,ctx.deb);
    for(const h of holdersOf(d,c)){const k=pkey(h.name);if(seen.has(k))continue;seen.add(k);
      /* by party where the debate has parties; by school where the schools organize it (the ring for a man of none); else by the shelf of
         his room, then his school, then Others */
      const r=roomOf(h.name),g=h.party?`p:${h.party}`:sch?(h.school?`s:${h.school}`:'n:'):r&&r.sh?`t:${r.sh}`:h.school?`s:${h.school}`:'o:';
      if(!groups.has(g))groups.set(g,[]);groups.get(g).push(h);}}
  if(!read){box.innerHTML='<h4>Who holds what here</h4><p class="rc-note">Reading the controversies…</p>';return;}
  host._here=seen;
  if(!seen.size){box.innerHTML='';return;}
  const SO=Object.keys(SCHOOLS),TO=T?T.TRADITIONS.map(t=>t[0]):[];
  const rank=g=>{const t=g[0],v=g.slice(2);return t==='s'?(SO.includes(v)?SO.indexOf(v):SO.length):t==='p'?100+PARTY_ORDER.indexOf(v):t==='t'?200+TO.indexOf(v):t==='n'?300:400;};
  const head=g=>{const t=g[0],v=g.slice(2);return t==='s'?`${dot(v)}${esc(v)}`:t==='p'?(v==='other'?'Others':`<i class="dot pt-${v}" aria-hidden="true"></i>${esc(PARTY[v])}`):t==='t'&&T?`<i class="sw" style="--c:var(--tg-${v})" aria-hidden="true"></i>${esc(T.label(v))}`:t==='n'?'<i class="dot sc-none" aria-hidden="true"></i>Of no school named':'Others';};
  const row=g=>{const hs=groups.get(g),cy=new Map();
    for(const h of hs){const y=pmYear(h.name,N[h.name]),c=y?Math.floor((y-1)/100)+1:0;if(!cy.has(c))cy.set(c,[]);cy.get(c).push({h,y});}
    const cs=[...cy.keys()].sort((a,b)=>((a?0:1)-(b?0:1))||a-b);
    return `<li><p class="rc-s">${head(g)}<span class="ct">${fmt(hs.length)}</span></p><dl class="rc-cy">${cs.map(c=>`<div><dt>${c?`${ordc(c)} c.`:'Undated'}</dt><dd>${cy.get(c).sort((a,b)=>(a.y-b.y)||a.h.name.localeCompare(b.h.name)).map(({h})=>who(h.name)).join(', ')}</dd></div>`).join('')}</dl></li>`;};
  const ks=[...groups.keys()].sort((a,b)=>(rank(a)-rank(b))||a.localeCompare(b));
  box.innerHTML=`<h4>Who holds what here<span class="ct">${fmt(seen.size)}</span></h4><ul class="rc-sch">${ks.map(row).join('')}</ul>${read<ctx.items.length?`<p class="rc-note">From ${fmt(read)} of the ${fmt(ctx.items.length)} controversies; the rest are being read.</p>`:''}`;
}
/* across the tradition: the classic question on the map, each position's share of the men it places, the men by school (or shelf) with
   their pages; those the controversies here quote in bold */
function rcMap(host){
  const box=host&&host.querySelector('.rc-map');if(!box)return;const ctx=host._ctx,id=ctx.atlas;
  box.innerHTML='<h4>Across the tradition</h4><p class="rc-note">Loading the map…</p>';
  mapQ(id).then(m=>{
    if(!box.isConnected||host._ctx!==ctx)return;
    const P=(m&&m.positions)||[];
    if(!P.length){box.innerHTML=ctx.q?`<h4>Across the tradition</h4><p class="rc-q">${esc(ctx.q)}</p>`:'';return;}
    const pos=P.map(p=>[p.label,(p.holders||[]).length]),tot=pos.reduce((n,p)=>n+p[1],0)||1;
    box.innerHTML=`<h4>Across the tradition<span class="ct">${fmt(tot)} placed</span></h4><p class="rc-q"><a href="${MAPS}#${esc(id)}">${esc(m.q||ctx.q||'The map of this question')}</a>${m.locus?`<span class="muted"> · ${esc(m.locus)}</span>`:''}</p><ol class="across-pos" data-q="${esc(id)}">${pos.map(([l,n])=>`<li data-pos="${esc(l)}"><span class="ap-l">${esc(l)}</span><span class="ap-bar" aria-hidden="true"><i style="width:${Math.max(2,Math.round(n/tot*100))}%"></i></span><span class="ap-n">${n}</span></li>`).join('')}</ol>`;
    fillHolders(box,schooledDeb(ctx.deb)||ctx.items.some(i=>{const d=LOADED.get(i.pair);return !!d&&intraSchool(d);}),host._here);
  });
}
/* the atlas's answers: how many affirm, deny, distinguish or only report, as one divided bar in the reception's hues, each named */
const ANS={affirms:'Affirms',denies:'Denies',distinguishes:'Distinguishes','reports only':'Reports only',unclear:'Unclear'};
const ANS_CLS={affirms:'affirms',denies:'denies',distinguishes:'other','reports only':'reports',unclear:'unclear'};
function rcAtlas(host){
  const box=host&&host.querySelector('.rc-atl');if(!box)return;const ctx=host._ctx,id=ctx.atlas;
  atlasQ(id).then(a=>{
    if(!box.isConnected||host._ctx!==ctx)return;
    const ans=(a&&a.answers)||[];if(!ans.length){box.innerHTML='';return;}
    const cnt=new Map();for(const x of ans){const k=ANS[x.answer]?x.answer:'unclear';cnt.set(k,(cnt.get(k)||0)+1);}
    const ks=Object.keys(ANS).filter(k=>cnt.has(k)),tot=ans.length;
    box.innerHTML=`<h4>In the atlas<span class="ct">${fmt(tot)} ${tot===1?'answer':'answers'}</span></h4><div class="rc-ans" aria-hidden="true">${ks.map(k=>`<i class="an-${ANS_CLS[k]}" style="flex:${cnt.get(k)} 1 0"></i>`).join('')}</div><p class="rc-ak">${ks.map(k=>`<span><i class="sw an-${ANS_CLS[k]}" aria-hidden="true"></i>${ANS[k]} ${fmt(cnt.get(k))}</span>`).join('')}</p><p class="rc-note"><a href="${ATLAS}#${esc(id)}">Every answer, each with the page it rests on</a></p>`;
  });
}
function rcPaths(host){
  const box=host&&host.querySelector('.rc-pth');if(!box)return;const ctx=host._ctx;
  pathsFile(ctx.deb).then(f=>{if(!f||!box.isConnected||host._ctx!==ctx)return;box.innerHTML=pathsHTML(ctx.atlas,f);});
}
/* where else: the other debates that file the same question (read when asked: they are large), and its terms in the lexicon */
function rcElse(host){
  const box=host&&host.querySelector('.rc-else');if(!box)return;
  box.innerHTML=`<h4>Where else</h4><div class="rc-terms" hidden></div><p class="rc-oth"><button type="button" class="rc-more" data-rc-other>Look for this question in the other debates</button></p>`;
  rcTerms(host);
}
async function rcOther(btn){
  const host=btn.closest('.rcp'),ctx=host&&host._ctx;if(!ctx)return;
  const p=btn.closest('.rc-oth');p.innerHTML='<span class="rc-note" role="status">Reading the other debates…</span>';
  const ids=Object.keys((IX&&IX.debates)||{}).filter(id=>id!==ctx.deb&&debId(id)!==ctx.deb);
  const fs=await Promise.all(ids.map(id=>debFile(id).then(f=>[id,f])));
  if(!host.isConnected||host._ctx!==ctx)return;
  let qf=fold(ctx.q||'');
  if(!ctx.atlas&&ctx.one){const x=(DEBI.get(ctx.deb)||new Map()).get((ctx.items[0]||{}).id);if(x)qf=fold(x.q);}
  const hits=[];for(const [id,f] of fs){if(!f)continue;for(const x of f.questions)if((ctx.atlas&&x.atlas===ctx.atlas)||(qf&&fold(x.q)===qf))hits.push({id,x});}
  p.outerHTML=hits.length?`<ul class="rc-links">${hits.map(({id,x})=>`<li><a href="#debate/${esc(id)}/${esc(x.id)}">${esc(shortTitle(debTitle(id)))}</a> <small>${fmt(x.n)} ${x.n===1?'controversy':'controversies'}${x.works.length>1?`, ${fmt(x.works.length)} works`:''}</small></li>`).join('')}</ul>`:'<p class="rc-note" tabindex="-1">No other debate files this question.</p>';
  const f=host.querySelector('.rc-else .rc-links a,.rc-else .rc-note[tabindex]');if(f)f.focus();
}
/* the lexicon's entries for the question's keywords, once its controversies are read: each keyword looked up in the lexicon's form
   index (v1/lexicon/forms/<first two letters>.json), the commonest first, eight at most */
const LEXF=new Map();
const lexFold=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu,' ').replace(/\s+/g,' ').trim();
const lexShard=f=>{const k=f.slice(0,2).replace(/ς/g,'σ').replace(/[^\p{L}\p{N}]/gu,'_');if(!LEXF.has(k))LEXF.set(k,J(`${BASE}/v1/lexicon/forms/${encodeURIComponent(k)}.json`).then(d=>d||{}));return LEXF.get(k);};
async function rcTerms(host){
  const box=host&&host.querySelector('.rc-terms');if(!box||box.dataset.done)return;const ctx=host._ctx;
  if(ctx.items.some(i=>DOCS.has(i.pair)&&!LOADED.has(i.pair)))return;
  const cnt=new Map();
  for(const {pair,id} of ctx.items){const d=LOADED.get(pair),c=d&&cOf(d,id);if(!c)continue;for(const k of c.keywords||[]){const f=lexFold(k);if(f.length<3)continue;if(!cnt.has(f))cnt.set(f,{f,w:k,n:0});cnt.get(f).n++;}}
  if(!cnt.size)return;
  box.dataset.done='1';
  const found=[];
  for(const x of [...cnt.values()].sort((a,b)=>b.n-a.n).slice(0,16)){const sh=await lexShard(x.f),tid=sh&&sh[x.f];if(tid&&!found.some(y=>y.id===tid))found.push({w:x.w,id:tid});if(found.length>=8)break;}
  if(!box.isConnected||host._ctx!==ctx||!found.length)return;
  box.innerHTML=`<p class="rc-terms-l">Its terms in the lexicon: ${found.map(x=>`<a href="${LEX}#${encodeURIComponent(x.id)}">${esc(x.w)}</a>`).join(', ')}</p>`;box.hidden=false;
}
/* the pane drawn again as more of its works are read */
function rcSoon(){if(RCR)return;RCR=requestAnimationFrame(()=>{RCR=0;for(const h of [$('#drcp'),$('#crcp')])if(h&&h._ctx&&h.isConnected&&h.getClientRects().length){rcWho(h);rcTerms(h);}});}
/* THE LATIN AT A PASSAGE'S PLACE (2026-10-22, as the courses page sets it): a passage the data gives in English has the Latin of the same
   place a toggle away. The reader's page files carry each page's English and Latin cut into the same paragraphs, so the passage's
   paragraph is found by its English words and its place in that paragraph carried over in proportion; a sentence either side is shown,
   the estimated span marked, and it is named as the Latin at that place, not as the passage. Beside the English where the column is wide,
   under it where not. A work in English alone loses the toggle once its meta says so. */
const WMETA=new Map(),WSHARD=new Map(),NOLA=new Set();
const SRCL={la:'Latin',grc:'Greek',fr:'French',de:'German',nl:'Dutch'};
const wmeta=slug=>{if(!WMETA.has(slug))WMETA.set(slug,J(`${BASE}/v1/works/${encodeURIComponent(slug)}/meta.json`));return WMETA.get(slug);};
const pnum=v=>Number(String(v).replace(/^0+(?=\d)/,''));
async function wpage(slug,n){
  const m=await wmeta(slug);if(!m)return {m:null,p:null};
  let file=null;
  if(Array.isArray(m.shards)&&m.shards.length){const x=m.shards.find(y=>n>=Number(y.from)&&n<=Number(y.to));file=x?x.file:null;}
  else if(m.single)file=m.single;
  if(!file)return {m,p:null};
  const k=`${slug}/${file}`;if(!WSHARD.has(k))WSHARD.set(k,J(`${BASE}/v1/works/${encodeURIComponent(slug)}/${file}`));
  const d=await WSHARD.get(k);return {m,p:((d&&d.pages)||[]).find(x=>pnum(x.n)===n)||null};
}
const wfold=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
function qnorm(t){const f=[],ix=[];let last=' ';for(let i=0;i<t.length;i++){const ch=t[i].toLowerCase().normalize('NFD')[0]||' ',o=/[a-z0-9]/.test(ch)?ch:' ';if(o===' '&&last===' ')continue;f.push(o);ix.push(i);last=o;}return [f.join(''),ix];}
function qlocate(text,q){
  const [f,ix]=qnorm(text),w=wfold(q).split(' ').filter(Boolean),all=w.join(' ');
  for(const k of [8,6,5])for(const st of [0,Math.floor(w.length/2),Math.max(0,w.length-k)]){
    const head=w.slice(st,st+k).join(' ');if(head.length<12)continue;
    const at=f.indexOf(head);if(at<0)continue;
    const pre=st?w.slice(0,st).join(' ').length+1:0,a=Math.max(0,at-pre),b=Math.min(f.length-1,a+all.length-1);
    return [ix[a],ix[b]+1];
  }
  return null;
}
function qwin(E,L,r){
  const k=L.length/Math.max(1,E.length),cuts=[],re=/[.?!][”’"')\]]*\s+/g;
  let s=Math.floor(r[0]*k),e=Math.ceil(r[1]*k),m;
  while((m=re.exec(L)))cuts.push(m.index+m[0].length);
  const starts=[0,...cuts],ends=[...cuts,L.length];
  let si=0,ei=ends.length-1;
  starts.forEach((x,i)=>{if(x<=s)si=i;});
  for(let i=ends.length-1;i>=0;i--)if(ends[i]>=e)ei=i;
  const wide=ends[Math.min(ends.length-1,ei+1)]-starts[Math.max(0,si-1)]>(e-s)*4+400,a=starts[wide?si:Math.max(0,si-1)],b=ends[wide?ei:Math.min(ends.length-1,ei+1)];
  while(s>a&&/\S/.test(L[s-1]))s--;
  while(e<b&&/\S/.test(L[e]))e++;
  s=Math.max(a,s);e=Math.min(b,e);
  return `${a>0?'… ':''}${esc(L.slice(a,s))}<mark>${esc(L.slice(s,e))}</mark>${esc(L.slice(e,b))}${b<L.length?' …':''}`;
}
function qalign(en,la,q){
  const ep=en.split(/\n{2,}/),lp=la.split(/\n{2,}/);
  if(ep.length===lp.length&&ep.length>1)for(let i=0;i<ep.length;i++){const r=qlocate(ep[i],q);if(r)return qwin(ep[i],lp[i],r);}
  const r=qlocate(en,q);
  return r?qwin(en,la,r):null;
}
async function qlFill(fig,b,box){
  box.dataset.done='1';
  const [w,p]=b.dataset.ql.split('|'),n=pnum(p),bq=fig.querySelector('blockquote[lang="en"]'),q=String(bq?bq.textContent:'');
  box.innerHTML='<p class="ql-h" role="status">Finding the place in the Latin…</p>';
  const {m,p:pp}=await wpage(w,n),lang=(m&&SRCL[m.src_lang])||'Latin',note=t=>{box.innerHTML=`<p class="ql-h">${t}</p>`;};
  if(m&&SRCL[m.src_lang])b.textContent=lang;
  if(!m){note(`The ${lang} of p. ${esc(p)} could not be loaded.`);return;}
  if(m.en_only){NOLA.add(w);note('This work is in English only.');return;}
  const la=String((pp&&pp.la)||''),en=String((pp&&pp.en)||'');
  if(!la.trim()){note(`The ${lang} of p. ${esc(p)} is not in the library's page files; Preview shows the page.`);return;}
  const hit=en.trim()?qalign(en,la,q):null;
  if(!hit){note(`This passage could not be placed in the ${lang} of p. ${esc(p)}; Preview shows the page in both languages.`);return;}
  box.setAttribute('lang',m.src_lang||'la');
  box.innerHTML=`<p class="ql-h">The ${lang} at this place on p. ${esc(p)}, the matching span marked</p><p class="ql-t">${hit}</p>`;
}
let QLN=0;
function qlToggle(b,open){
  const fig=b.closest('figure.own'),box=fig&&fig.querySelector('div.own-la');if(!box)return;
  if(!box.id)box.id=`ql-${++QLN}`;
  b.setAttribute('aria-controls',box.id);b.setAttribute('aria-expanded',String(open));box.hidden=!open;fig.classList.toggle('duo',open);
  if(open){flash(box,'ql-in');if(!box.dataset.done)qlFill(fig,b,box);}
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
$('#cfilt').addEventListener('click',e=>{const a=e.target.closest('button[data-among]');if(a){AMONG=!AMONG;a.setAttribute('aria-pressed',String(AMONG));list();flash($('#books'),'ls-in');}});
$('#chips').addEventListener('click',e=>{
  const b=e.target.closest('button[data-kind]');if(!b)return;const k=b.dataset.kind;if(KINDS.has(k))KINDS.delete(k);else KINDS.add(k);b.setAttribute('aria-pressed',String(KINDS.has(k)));list();
});
$('#deb').addEventListener('click',e=>{
  if(!DEB)return;
  /* the grid: a number chosen, the list closed, a controversy of the list opened in its question (a modified click keeps the link's way) */
  const pm=e.target.closest('#dnet button[data-pm]');if(pm){pmPick(pm);return;}
  if(e.target.closest('[data-pm-close]')){const s=DEB.pm&&DEB.pm.sel,b=s&&document.querySelector(`#dnet button[data-pm="${s[0]}|${s[1]}"]`);if(b)pmPick(b);if(b)b.focus();return;}
  const go=e.target.closest('a[data-pmgo]');
  if(go){if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button!==0)return;e.preventDefault();pmGo(go.dataset.pmgo);return;}
  const cp=e.target.closest('#dcompact');if(cp){setCompact(!COMPACT);cp.setAttribute('aria-pressed',String(COMPACT));if(DEB.sel&&DEB.tab==='q')showQuestion(DEB.sel,false,DEB.item);return;}
  if(e.target.closest('#damong')){DEB.among=!DEB.among;$('#damong').setAttribute('aria-pressed',String(DEB.among));listQ();flash($('#dlist'),'ls-in');if(DEB.sel&&DEB.tab==='q'){const x=DEB.vis.includes(DEB.sel)?DEB.sel:DEB.vis[0];if(x)showQuestion(x,true);}return;}
  const q=e.target.closest('button[data-q]');
  if(q){const x=DEB.byQ.get(q.dataset.q);if(x){showQuestion(x,true);if(q.closest('.next'))$('#dq').scrollIntoView({block:'start'});}return;}
  const t=e.target.closest('[role="tab"]');
  if(t){setTab(t.id==='tab-w'?'w':'q',true);return;}
  if(e.target.closest('#dshared')){DEB.shared=!DEB.shared;$('#dshared').setAttribute('aria-pressed',String(DEB.shared));listQ();}
});
$('#deb').addEventListener('input',e=>{if(DEB&&e.target.id==='dfind')listQ();});
$('#deb').addEventListener('change',e=>{if(DEB&&(e.target.id==='dloc'||e.target.id==='dtopic')){listQ();flash($('#dlist'),'ls-in');}});
/* a fold opened: the authors' lineup reads every work; a controversy reads its own */
$('#deb').addEventListener('toggle',e=>{const t=e.target;if(!DEB)return;if(t.id==='lufold')LUOPEN=t.open;if(t.id==='pmfold')PMOPEN=t.open;if(t.matches('details.rc')&&!wideNow())RCOPEN=t.open;if(!t.open)return;if(t.id==='lufold'){loadAll();debateFill();}else if(t.matches('details.qi')){fillItem(t);if(t.dataset.touched)flash(t,'qi-in');}},true);
$('#pv').addEventListener('toggle',e=>{if(e.target.matches('details.rc')&&!wideNow())RCOPEN=e.target.open;},true);
/* a card the reader opens settles in (the cards drawn open do not move); the Latin of a passage; the question in the other debates */
document.addEventListener('click',e=>{const s=e.target.closest&&e.target.closest('details.qi>summary');if(s)s.parentElement.dataset.touched='1';},true);
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('button.ql');if(b){qlToggle(b,b.getAttribute('aria-expanded')!=='true');return;}
  const o=e.target.closest&&e.target.closest('button[data-rc-other]');if(o)rcOther(o);
});
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
const datesReady=()=>{const T=window.FRTraditionGraphics;return T&&T.dates?Promise.race([T.dates.ready,new Promise(r=>setTimeout(r,1500))]):null;};
Promise.all([J(`${BASE}/v1/enrich/controversies/index.json`),ROOMS_P,netFile(),datesReady()]).then(([ix,,net])=>{
  if(net)NET=net;
  LIVE=((ix&&ix.pairs)||[]).filter(p=>p.n>0);
  if(!LIVE.length){viewIs('pair');$('#books').innerHTML='';$('#c').innerHTML='<p class="muted">The controversies could not be loaded. Reload the page to try again.</p>';return;}
  IX=ix;DS=debates();
  {const h=want(),p=pairFor(h);LAND=matchMedia('(max-width:760px)').matches&&(/^debate\/[^/]+\/(?!works$)./.test(h)||!!(p&&h!==p.pair));}
  route();
});
})();
