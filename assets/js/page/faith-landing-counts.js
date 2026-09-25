/* Use the same normalized catalogue as All works, without static totals. */
(function(){
 if(!window.MOCorpora||!document.querySelector('.faith-landing'))return;
 const ids=['pg','pld','po','tfr','eebo','confessions','mo'];
 // Counted as the lists show them: Migne's apparatus (indices, notices, admonitions) is not a work (2026-09-25).
 Promise.all(ids.map(id=>window.MOFaithCatalogue.load(id).then(ws=>ws.filter(w=>!w.app)).catch(()=>[]))).then(sets=>{
   sets.forEach((works,i)=>{if(works.length)document.querySelectorAll(`[data-landing-corpus="${ids[i]}"]`).forEach(el=>el.textContent=`${works.length.toLocaleString()} ${ids[i]==='confessions'?'documents':'works'}`);});
   if(sets.some(works=>!works.length))return; // Keep descriptive labels if any catalogue failed.
   const all=sets.filter((_, i)=>ids[i]!=='confessions').flat();
   document.querySelectorAll('[data-landing-total]').forEach(el=>el.textContent=all.length.toLocaleString());
   document.querySelectorAll('[data-landing-tradition]').forEach(el=>{
     const tradition=el.dataset.landingTradition;
     const matches=all.filter(w=>{const t=String(w.tradition||'').trim();const parent=window.MOCorpora.traditionParent?.(t,w.corpus);return (parent==='Protestant'&&['Puritan','Anglican'].includes(t)?'English Divines':t)===tradition;});
     if(matches.length)el.textContent=window.MOFaithCatalogue.countLabel(matches);
   });
 });
})();
