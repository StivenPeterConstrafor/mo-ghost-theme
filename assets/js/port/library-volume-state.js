(function(root){
  'use strict';
  const key='fr_library_volumes_v1',shelves=['Latin Fathers','Greek Fathers','Eastern Fathers'];
  const offset=value=>Number.isFinite(Number(value))?Math.min(1e7,Math.max(0,Number(value))):0;
  const clean=value=>({by:value?.by==='volume'?'volume':'author',vol:typeof value?.vol==='string'?value.vol.slice(0,40):null,
    q:typeof value?.q==='string'?value.q.slice(0,200):'',gridTop:offset(value?.gridTop),
    panelTop:offset(value?.panelTop),pageY:offset(value?.pageY)});
  let cached={};try{const stored=JSON.parse(root.localStorage?.getItem(key)||'{}');for(const shelf of shelves)cached[shelf]=clean(stored[shelf]);}catch(_){}
  const address=url=>['shelf','by','vol'].map(k=>url.searchParams.get(k)||'').join('|');
  function state(shelf){
    if(!shelves.includes(shelf))return null;
    const cur=cached[shelf]||(cached[shelf]=clean()),url=new URL(root.location.href),a=address(url);
    if(cur._address!==a){
      cur._restore=true;
      if(url.searchParams.get('shelf')===shelf){
        const entry=root.history.state?.frVolumeBrowse,volume=url.searchParams.get('vol');
        if(entry?.shelf===shelf&&entry.vol===volume)Object.assign(cur,clean(entry));
        if(['author','volume'].includes(url.searchParams.get('by')))cur.by=url.searchParams.get('by');
        if(volume&&volume!==cur.vol){cur.vol=volume.slice(0,40);cur.panelTop=0;}
      }
      cur._address=a;
    }
    return cur;
  }
  function save(shelf,cur,{navigate=false,push=false}={}){
    if(!shelves.includes(shelf))return;
    cached[shelf]=cur;const data=clean(cur),url=new URL(root.location.href);
    if(navigate){url.searchParams.set('shelf',shelf);url.searchParams.set('by',data.by);
      if(data.by==='volume'&&data.vol)url.searchParams.set('vol',data.vol);else url.searchParams.delete('vol');}
    cur._address=address(url);
    try{root.localStorage.setItem(key,JSON.stringify(Object.fromEntries(shelves.map(s=>[s,clean(cached[s])]))));}catch(_){}
    try{root.history[push?'pushState':'replaceState']({...root.history.state,frVolumeBrowse:{shelf,...data}},'',url.href);}catch(_){}
  }
  function volumeNumber(query,series){const m=/^(?:(PL|PG|PO)(?:\s+Tome)?\s*)?(\d{1,3})$/i.exec(String(query||'').trim());return m&&(!m[1]||m[1].toUpperCase()===series)?String(Number(m[2])):null;}
  const api={state,save,volumeNumber};root.FRLibraryVolumes=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
