/* Use the same normalized catalogue as All works, without static totals. */
(function(){
 if(!window.MOCorpora||!document.querySelector('.faith-landing'))return;
 const ids=['pg','pld','po','tfr','eebo','confessions','mo'];
 Promise.all(ids.map(id=>window.MOFaithCatalogue.load(id).catch(()=>[]))).then(sets=>{
   sets.forEach((works,i)=>{if(works.length)document.querySelectorAll(`[data-landing-corpus="${ids[i]}"]`).forEach(el=>el.textContent=`${works.length.toLocaleString()} ${ids[i]==='confessions'?'documents':'works'}`);});
   if(sets.some(works=>!works.length))return; // Keep descriptive labels if any catalogue failed.
   const all=sets.flat();
   document.querySelectorAll('[data-landing-total]').forEach(el=>el.textContent=all.length.toLocaleString());
   document.querySelectorAll('[data-landing-tradition]').forEach(el=>{
     const tradition=el.dataset.landingTradition;
     const n=all.filter(w=>{const t=String(w.tradition||'').trim();const parent=window.MOCorpora.traditionParent?.(t,w.corpus);return (parent==='Protestant'&&['Puritan','Anglican'].includes(t)?'English Divines':t)===tradition;}).length;
     if(n)el.textContent=`${n.toLocaleString()} works`;
   });
 });
})();
