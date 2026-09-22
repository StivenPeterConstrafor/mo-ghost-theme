/* Shared Scripture bibliography ordering. No requests, provider URLs or inferred identities. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FRScriptureSources=api;})(typeof window==='undefined'?globalThis:window,()=>{
  'use strict';
  const text=value=>value==null?'':String(value);
  const collator=new Intl.Collator('en',{numeric:true,sensitivity:'base'});
  const compare=(a,b)=>collator.compare(text(a),text(b));
  const roman=value=>{const s=text(value).toUpperCase();if(!/^(?=.)M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(s))return null;const v={I:1,V:5,X:10,L:50,C:100,D:500,M:1000};return [...s].reduce((n,c,i)=>n+(v[c]<(v[s[i+1]]||0)?-v[c]:v[c]),0);};
  const volumeKey=value=>text(value).split(/\b/).map(part=>/^\d+$/.test(part)?Number(part):roman(part)).filter(n=>n!==null&&Number.isFinite(n));
  const titleFamily=value=>text(value).replace(/\b(?:vol(?:ume)?|tomus|tome|liber|book|pars|part|band)\.?\s+(?:\d+|[IVXLCDM]+)\b.*$/i,'').trim();
  function compareWorks(a,b,metadata=()=>({})){
    const x=metadata(a.w||a.work||a.slug)||{},y=metadata(b.w||b.work||b.slug)||{};
    const at=a.t||a.title||'',bt=b.t||b.title||'';
    const familyOrder=compare(x.familyTitle||titleFamily(at),y.familyTitle||titleFamily(bt));
    if(familyOrder)return familyOrder;
    const rank=m=>({'Born-digital text':0,'Digital text':1,Facsimile:2}[m.format]??3);
    const edition=rank(x)-rank(y)||compare(x.edition,y.edition);if(edition)return edition;
    const av=x.volume||a.volume||at,bv=y.volume||b.volume||bt,an=volumeKey(av),bn=volumeKey(bv);
    for(let i=0;i<Math.max(an.length,bn.length);i++){const d=(an[i]??0)-(bn[i]??0);if(d)return d;}
    return compare(av,bv)||compare(at,bt)||compare(a.w||a.work||a.slug,b.w||b.work||b.slug);
  }
  function bibliography(works=[],groups={},relations={}){
    const bySlug=new Map(works.map(w=>[w.slug,w])),witnesses=new Map();
    for(const g of relations.duplicates||[]){if(g.kind!=='edition')continue;const keep=Array.isArray(g.keep)?g.keep:[g.keep],other=g.others||[],exact=keep.length===1&&other.length===1;for(const slug of keep)witnesses.set(slug,{family:g.work,familyTitle:titleFamily(bySlug.get(keep[0])?.title||g.work),witness:exact?'Second witness held':'Alternate edition held'});for(const slug of other)witnesses.set(slug,{family:g.work,familyTitle:titleFamily(bySlug.get(keep[0])?.title||g.work),witness:exact?'Second witness':'Alternate edition'});}
    for(const g of relations.complementary_witnesses||[]){for(const [members,others,format,label] of [[g.dig||[],g.fac||[],'Born-digital text','Related facsimile edition'],[g.fac||[],g.dig||[],'Facsimile','Related born-digital edition']])for(const slug of members){const prior=witnesses.get(slug)||{};witnesses.set(slug,{...prior,family:`witness:${g.author}:${g.title}`,familyTitle:g.title,format,witness:prior.witness||(others.length?label:'')});}}
    return slug=>{const w=bySlug.get(slug)||{},g=groups.works?.[slug],r=witnesses.get(slug)||{};return {family:r.family||g?.g||'',familyTitle:r.familyTitle||titleFamily(w.title),volume:g?.display_volume||w.volume||'',edition:groups.groups?.[g?.g]?.editions?.[g?.ed]||w.edition_label||'',format:r.format||(w.has_pages===true?'Facsimile':w.has_pages===false?'Digital text':''),witness:r.witness||''};};
  }
  const century=row=>{const value=Number(row.birthCentury??row.cen);return Number.isFinite(value)&&value!==0?value:Infinity;};
  const typeOrder={exegesis:0,quotation:1,explicit:2,citation:2,allusion:3};
  function orderRecords(rows){return rows.map((row,i)=>({row,i})).sort((a,b)=>{
    const left=a.row.p==null||a.row.p==='',right=b.row.p==null||b.row.p==='';
    return Number(left)-Number(right)||compare(a.row.p,b.row.p)||(typeOrder[a.row.how]??4)-(typeOrder[b.row.how]??4)||a.i-b.i;
  }).map(x=>x.row);}
  function group(rows,{by='author',order='name',metadata=()=>({})}={}){
    const groups=new Map();
    for(const row of rows||[]){
      const author=text(row.a)||'Attribution not recorded',work=text(row.w),key=by==='work'?`work:${work}`:`author:${author}`;
      if(!groups.has(key))groups.set(key,{key,label:by==='work'?(row.t||work||'Work not identified'):author,author,rows:[],works:new Map(),century:Infinity});
      const entry=groups.get(key);entry.rows.push(row);entry.century=Math.min(entry.century,century(row));
      if(!entry.works.has(work))entry.works.set(work,{key:`work:${work}`,work,title:row.t||work||'Work not identified',authors:new Set(),rows:[]});
      const source=entry.works.get(work);source.rows.push(row);source.authors.add(author);
    }
    const result=[...groups.values()].map(g=>({...g,rows:orderRecords(g.rows),works:[...g.works.values()].map(w=>({...w,authors:[...w.authors].sort(compare),rows:orderRecords(w.rows)})).sort((a,b)=>compareWorks(a,b,metadata))}));
    return result.sort((a,b)=>{
      if(order==='count'&&a.rows.length!==b.rows.length)return b.rows.length-a.rows.length;
      if(order==='century'&&a.century!==b.century)return a.century<b.century?-1:1;
      return (by==='work'?compareWorks(a.works[0],b.works[0],metadata):compare(a.label,b.label))||compare(a.key,b.key);
    });
  }
  return {group,orderRecords,compare,compareWorks,bibliography};
});
