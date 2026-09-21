(function(){
 function redirect(){if(location.hash.split('&')[0]!=="#constellations")return;
 const q=new URLSearchParams(location.search),s=q.get('shelf')||'citations',v=q.get('view')||(s==='citations'?'cited':'authors');
 const tail=new URLSearchParams();if(q.get('arrange'))tail.set('arrange',q.get('arrange'));
 location.replace(`/the-faith-received/constellations/#shelves=${encodeURIComponent(s)}/${encodeURIComponent(v)}${tail.size?`?${tail}`:''}`);}
 redirect();addEventListener('hashchange',redirect);
})();
