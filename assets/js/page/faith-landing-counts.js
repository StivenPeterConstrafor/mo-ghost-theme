/* Use the same normalized catalogue as All works, without static totals. */
(function(){
 if(!window.MOCorpora||!document.querySelector('.faith-landing'))return;
 const ids=['pg','pld','po','tfr','eebo','confessions','mo'];
 // Counted as the lists show them: Migne's apparatus (indices, notices, admonitions) is not a work (2026-09-25).
 Promise.all(ids.map(id=>window.MOFaithCatalogue.load(id).then(ws=>ws.filter(w=>!w.app)).catch(()=>[]))).then(sets=>{
   sets.forEach((works,i)=>{if(works.length)document.querySelectorAll(`[data-landing-corpus="${ids[i]}"]`).forEach(el=>el.textContent=`${works.length.toLocaleString()} ${ids[i]==='confessions'?'documents':'works'}`);});
   if(sets.some(works=>!works.length))return; // Keep descriptive labels if any catalogue failed.
   const all=sets.filter((_, i)=>ids[i]!=='confessions').flat();
   // THE HEADLINE TOTAL IS SET, NOT COUNTED (Ian, 2026-09-28: "update this to be 19,597"). It is the whole catalogue,
   // v1/works-index.json with Migne's apparatus included (19,596 entries at 2026-09-27, 2,560 of them apparatus); the lists
   // and this file's own count leave the apparatus out, which is why they read ~16,800. The template carries the number.
   // It does not move by itself: when the catalogue grows, change it in custom-the-faith-received.hbs.
   document.querySelectorAll('[data-landing-tradition]').forEach(el=>{
     const tradition=el.dataset.landingTradition;
     const matches=all.filter(w=>{const t=String(w.tradition||'').trim();const parent=window.MOCorpora.traditionParent?.(t,w.corpus);return (parent==='Protestant'&&['Puritan','Anglican'].includes(t)?'English Divines':t)===tradition;});
     if(matches.length)el.textContent=window.MOFaithCatalogue.countLabel(matches);
   });
 });
})();
