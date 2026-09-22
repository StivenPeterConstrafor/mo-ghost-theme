/* Shared Scripture bibliography ordering. No requests, provider URLs or inferred identities. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FRScriptureSources=api;})(typeof window==='undefined'?globalThis:window,()=>{
  'use strict';
  const text=value=>value==null?'':String(value);
  const collator=new Intl.Collator('en',{numeric:true,sensitivity:'base'});
  const compare=(a,b)=>collator.compare(text(a),text(b));
  const century=row=>{const value=Number(row.birthCentury??row.cen);return Number.isFinite(value)&&value!==0?value:Infinity;};
  const typeOrder={exegesis:0,quotation:1,explicit:2,citation:2,allusion:3};
  function orderRecords(rows){return rows.map((row,i)=>({row,i})).sort((a,b)=>{
    const left=a.row.p==null||a.row.p==='',right=b.row.p==null||b.row.p==='';
    return Number(left)-Number(right)||compare(a.row.p,b.row.p)||(typeOrder[a.row.how]??4)-(typeOrder[b.row.how]??4)||a.i-b.i;
  }).map(x=>x.row);}
  function group(rows,{by='author',order='name'}={}){
    const groups=new Map();
    for(const row of rows||[]){
      const author=text(row.a)||'Attribution not recorded',work=text(row.w),key=by==='work'?`work:${work}`:`author:${author}`;
      if(!groups.has(key))groups.set(key,{key,label:by==='work'?(row.t||work||'Work not identified'):author,author,rows:[],works:new Map(),century:Infinity});
      const entry=groups.get(key);entry.rows.push(row);entry.century=Math.min(entry.century,century(row));
      if(!entry.works.has(work))entry.works.set(work,{key:`work:${work}`,work,title:row.t||work||'Work not identified',authors:new Set(),rows:[]});
      const source=entry.works.get(work);source.rows.push(row);source.authors.add(author);
    }
    const result=[...groups.values()].map(g=>({...g,rows:orderRecords(g.rows),works:[...g.works.values()].map(w=>({...w,authors:[...w.authors].sort(compare),rows:orderRecords(w.rows)})).sort((a,b)=>compare(a.title,b.title)||compare(a.work,b.work))}));
    return result.sort((a,b)=>{
      if(order==='count'&&a.rows.length!==b.rows.length)return b.rows.length-a.rows.length;
      if(order==='century'&&a.century!==b.century)return a.century<b.century?-1:1;
      return compare(a.label,b.label)||compare(a.key,b.key);
    });
  }
  return {group,orderRecords,compare};
});
