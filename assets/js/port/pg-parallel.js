/* Reviewed PG paragraphs and printed-column provenance. No length-based matching. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FRPgParallel=api;})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
const text=v=>String(v??'');
const sourceCache=new WeakMap();
function sourceColumns(doc){
 if(sourceCache.has(doc))return sourceCache.get(doc);
 const out={},images=new Map(),alt=new Set(['translation','secondary','diplomatic','witness','edition']);
 const body=doc.querySelector('body')||doc.documentElement;
 function primaryImages(node){for(const ch of node.children||[]){if(ch.localName==='div'&&alt.has(ch.getAttribute('type')))continue;if(ch.localName==='pb'&&ch.getAttribute('facs')){if(!images.has(ch.getAttribute('facs')))images.set(ch.getAttribute('facs'),ch.getAttribute('n'));}else if(ch.localName==='div')primaryImages(ch);}}primaryImages(body);
 function walk(node,role='reading',state={opening:'',column:'',pending:[]}){for(const ch of node.children||[]){const tag=ch.localName,type=ch.getAttribute('type');
  if(tag==='div'){if(ch.getAttribute('subtype')==='historical-source-snapshot')continue;if(ch.getAttribute('subtype')==='migne-reading'){walk(ch,'verified',{opening:'',column:'',pending:[]});continue;}if(type==='translation')continue;if(type==='secondary')walk(ch,'secondary',{opening:'',column:'',pending:[]});else if(alt.has(type))walk(ch,'supplement',{opening:'',column:'',pending:[]});else walk(ch,role,state);continue;}
  if(role==='supplement'&&ch.getAttribute('resp')!=='#pageview-zone')continue;
  if(tag==='pb'){const n=ch.getAttribute('n')||'',facs=ch.getAttribute('facs');state.opening=(facs&&images.get(facs))||n;state.column=n;if(facs&&!images.has(facs))images.set(facs,state.opening);}
  else if(tag==='milestone'&&ch.getAttribute('unit')==='column')state.column=ch.getAttribute('n')||'';
  else if(tag==='head'&&!state.opening){state.pending.push(ch.textContent||'');}
  else if((tag==='p'||tag==='head')&&state.opening&&state.column){const opening=out[state.opening]||(out[state.opening]={columns:{}}),col=opening.columns[state.column]||(opening.columns[state.column]={});
   if(role==='verified')opening.verified=true;
   const rich=col[role+'Rich']||(col[role+'Rich']=[]);
   const head=t=>/^[Α-ΩA-B]\s*[—–-]\s/.test(t)?t:'\u0002'+t+'\u0003';
   rich.push(...(state.pending||[]).map(head));state.pending=[];
   if(tag==='p'){(col[role]||(col[role]=[])).push(ch.textContent||'');rich.push(ch.textContent||'');}
   else rich.push(head(ch.textContent||''));
  }
 }}walk(body);
 const printed={};
 for(const [key,opening]of Object.entries(out)){opening.grc=[];opening.la=[];opening.grcRich=[];opening.laRich=[];for(const [column,candidates]of Object.entries(opening.columns)){
  for(const role of ['verified','reading','secondary','supplement']){const t=(candidates[role]||[]).join(' ').replace(/\s+/g,' ').trim(),g=(t.match(/\p{Script=Greek}/gu)||[]).length,l=(t.match(/\p{Script=Latin}/gu)||[]).length,letters=(t.match(/\p{L}/gu)||[]).length;if(g+l<(role==='verified'?1:100))continue;const lang=g/Math.max(letters,1)>=.85?'grc':l/Math.max(letters,1)>=.85?'la':null;if(!lang||role==='secondary'&&lang!=='la')continue;opening[lang].push(t);opening[lang+'Rich'].push((candidates[role+'Rich']||candidates[role]).join(' ').replace(/\s+/g,' ').trim());if(!printed[key])printed[key]={};(printed[key][lang]||(printed[key][lang]=[])).push(column);break;}
 }opening.grc=opening.grc.join(' ');opening.la=opening.la.join(' ');opening.grcRich=opening.grcRich.join(' ');opening.laRich=opening.laRich.join(' ');
  // Paragraph lists (owner 2026-09-15 'rich labelled inner text like the patrologia site'): the printed paragraphs of each lane in column
  // order, a heading folded into the paragraph it introduces. alignOpening pairs lanes by these when their counts agree.
  opening.grcParas=[];opening.laParas=[];
  for(const [column,candidates]of Object.entries(opening.columns)){for(const role of ['verified','reading','secondary','supplement']){const rich=candidates[role+'Rich'];if(!rich||!rich.length)continue;
   const t=(candidates[role]||[]).join(' '),g=(t.match(/\p{Script=Greek}/gu)||[]).length,l=(t.match(/\p{Script=Latin}/gu)||[]).length,letters=(t.match(/\p{L}/gu)||[]).length;if(g+l<100)continue;
   const lang=g/Math.max(letters,1)>=.85?'grc':l/Math.max(letters,1)>=.85?'la':null;if(!lang||role==='secondary'&&lang!=='la')continue;
   const list=opening[lang+'Paras'];let pending='';
   for(const e of rich){const v=String(e||'').replace(/\s+/g,' ').trim();if(!v)continue;if(/^\u0002[^\u0003]*\u0003$/.test(v)){pending+=v+' ';continue;}list.push((pending+v).trim());pending='';}
   if(pending.trim()){if(list.length)list[list.length-1]+=' '+pending.trim();else list.push(pending.trim());}break;}}}
 const result={openings:out,printed};sourceCache.set(doc,result);return result;
}
function printedColumns(doc){return sourceColumns(doc).printed;}
function canonicalOpenings(doc){return sourceColumns(doc).openings;}
function sectionStarts(value){
 const s=text(value),hits=new Map(),rx=/(?:^|[.!?·»”"']\s+)(\d{1,3})\.\s+(?=[«“"'Α-ΩA-ZἈ-Ὧ])/gu;let m;
 while((m=rx.exec(s))){const key=m[1],index=m.index+m[0].indexOf(key);if(hits.has(key))hits.set(key,null);else hits.set(key,index);}return hits;
}
// A printed label that the lanes carry as its own paragraph — a marked <head>, a short all-caps run (running title, 'S. BASILII MAGNI.'),
// or a short division label ('Caput I.', 'Κεφάλ. Β.', 'ΟΡΟΣ ΙΗ΄', 'Homilia III.') — rides with the paragraph it introduces.
const LABEL=/^(?:Caput|Cap\.|Κεφ(?:αλ|άλ)?\.?|Κεφάλαιον|ΚΕΦΑΛΑΙΟΝ|Regula|ΟΡΟΣ|Ὅρος|Homilia|Sermo|Oratio|Epistola|Liber|Pars|Quaestio|Articulus|Titulus|Λόγος|ΛΟΓΟΣ|Ὁμιλία|ΟΜΙΛΙΑ|Ἐπιστολή|ΕΠΙΣΤΟΛΗ|Chapter|Rule|Homily|Sermon|Letter|Book|Part|Question|Article|Oration|Discourse|Title|Preface|Prologue)\b/u;
function isLabel(v){if(/^\u0002[^\u0003]*\u0003$/.test(v))return true;if(v.length>48)return false;const letters=v.replace(/[^\p{L}]/gu,'');if(letters.length>=4&&letters===letters.toUpperCase())return true;return LABEL.test(v)&&v.length<=40;}
function foldHeads(list){const out=[];let pending='';for(const e of list||[]){const v=text(e).replace(/\s+/g,' ').trim();if(!v)continue;if(isLabel(v)){pending+=v+' ';continue;}out.push((pending+v).trim());pending='';}if(pending.trim()){if(out.length)out[out.length-1]+=' '+pending.trim();else out.push(pending.trim());}return out;}
function alignOpening(grc,la,en,paras){
 // Paragraph basis (owner 2026-09-15): when the source and the English carry the same number of printed paragraphs, pair them by
 // position — the patrologia site's rows. Headings ride with the paragraph they introduce. Any count mismatch falls through unchanged.
 if(paras&&Array.isArray(paras.en)){const g=foldHeads(paras.grc||[]),e=foldHeads(paras.en),l=foldHeads(paras.la||[]);
  const src=g.length>=2?g:(l.length>=2?l:null);   // Greek pages pair on the Greek; Latin-only pages on the Latin
  if(src&&src.length===e.length&&!sectionStarts(text(grc)).size&&!sectionStarts(text(la)).size){
   const rows=src.map((t,i)=>({grc:src===g?t:'',la:src===l?t:(l.length===g.length?l[i]:(i===0?text(la):'')),en:e[i]}));return {basis:'paragraphs',rows};}}
 const source=[text(grc),text(la),text(en)],marks=source.map(sectionStarts);const shared=[...marks[0]].filter(([k,v])=>v!==null&&marks.every(m=>m.get(k)!=null)).map(([key])=>({key,at:marks.map(m=>m.get(key))}));
 // Crossing or repeated markers do not license guessed paragraph pairs.
 const crossing=shared.some((marker,index)=>index>0&&marker.at.some((n,i)=>n<=shared[index-1].at[i]));const anchors=crossing?[]:shared;
 const leading=source.map(s=>/^\s*\u0002[^\u0003]+\u0003\s*/.exec(s));
 const header=leading.every(Boolean)?leading.map(m=>m[0].length):null;
 const cuts=[[0,0,0],...(header?[header]:[]),...anchors.filter(m=>!header||m.at.every((n,i)=>n>=header[i])).map(m=>m.at),source.map(s=>s.length)],rows=[];
 for(let i=1;i<cuts.length;i++){const row=source.map((s,j)=>s.slice(cuts[i-1][j],cuts[i][j]));if(row.some(s=>s.trim()))rows.push({grc:row[0],la:row[1],en:row[2]});}
 return {basis:anchors.length?'shared-section-markers':'printed-opening',rows};
}
function nextWorkReference(works,currentId,page,lastColumn){
 const n=Number(page),last=Number(lastColumn);if(!Number.isFinite(n)||!Number.isFinite(last)||n<=last)return null;
 const index=works.findIndex(w=>String(w.id)===String(currentId)),next=index>=0?works[index+1]:null;
 return next&&Array.isArray(next.c)&&n>=Number(next.c[0])&&n<=Number(next.c[1])?String(next.id):null;
}
// Migne's gutter letters A–D (the quarters of an opening) reached the per-column English as words ("…desirable promise, D by
// adding these words", 2026-09-14). B, C, D are never English words; "A" is the article, so it is a gutter letter only where an
// article cannot stand — before a pronoun, verb, article, preposition, conjunction or negation — or at the end of a paragraph.
const NOT_AFTER_ARTICLE=new Set('you he she it we they i me him her us them your his its our their this that these those the a an and but or nor for yet so in on at by to of from with without into onto over under upon after before against between among through during within is are was were be been being am has have had do does did not no never also then thus therefore whether if when where while as than because since although though unless until'.split(' '));
function dropGutterLetters(value){
 return String(value).replace(/(^|[^\p{L}\p{N}])([ABCD])(?:[ \u00a0]+(?=([\p{L}“"‘(\[]))|[ \u00a0]*$)/gu,(m,pre,letter,next,offset,whole)=>{
  if(letter==='A'&&next){const word=(whole.slice(offset+m.length).match(/^[\p{L}]+/u)||[''])[0].toLowerCase();if(!NOT_AFTER_ARTICLE.has(word))return m;}
  return pre;
 }).replace(/[ \u00a0]{2,}/g,' ').trim();
}
function cleanEnglish(value){
 return dropGutterLetters(text(value).replace(/\s*Continue:\s*Ask about[\s\S]*?search the corpus[\s\S]*?Topics[\s\S]*?The Tradition[\s\S]*?next work\s*→\s*$/,'').trim());
}
function location(data,opening){
 const map=data?.pg_columns?.[text(opening)];if(!map)return null;const mode=data.pg_source||'grc',cols=[...new Set((mode==='grcla'?[...(map.grc||[]),...(map.la||[])]:map[mode]||[]).map(text))];if(!cols.length)return null;
 cols.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));return cols.length===1?'col. '+cols[0]:'cols. '+cols.join('–');
}
return {canonicalOpenings,alignOpening,printedColumns,location,cleanEnglish,dropGutterLetters,nextWorkReference};
});
