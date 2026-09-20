/* Adapt the canonical Web graph to Ian's constellation layouts. */
(function (global) {
  global.MOFaithWebShelfURL = document.currentScript.dataset.shelves;
  global.MOFaithWebGraphAdapter = function (nodes, edges, shelves) {
    const codes = Object.keys(shelves);
    const refuters=new Uint32Array(nodes.length);edges.forEach(e=>{if(e[3]>0)refuters[e[1]]++;});
    return {
      cats: codes.map(k => ({k, l: shelves[k]})),
      nodes: nodes.map((n,i) => ({a: n.a, fk: n.s, n: n.win || 0,
        pos: n.win || 0, ref: n.nin || 0, refBy:refuters[i], src: n.din || 0, e: codes.indexOf(n.sh)})),
      edges: edges.map(e => [e[0], e[1], e[2], e[3] || 0])
    };
  };
  global.MOFaithWebFocus = function(graph, slug, limit=8){
    const at=graph.nodes.findIndex(n=>n.fk===slug);
    if(at<0)return graph;
    const incoming=graph.edges.filter(e=>e[1]===at&&e[0]!==at).sort((a,b)=>b[2]-a[2]).slice(0,limit);
    const outgoing=graph.edges.filter(e=>e[0]===at&&e[1]!==at).sort((a,b)=>b[2]-a[2]).slice(0,limit);
    const keep=[...new Set([at,...incoming.map(e=>e[0]),...outgoing.map(e=>e[1])])];
    const remap=new Map(keep.map((i,j)=>[i,j]));
    const chosen=[...new Set([...incoming,...outgoing])];
    return {cats:graph.cats,nodes:keep.map(i=>graph.nodes[i]),edges:chosen.map(e=>[remap.get(e[0]),remap.get(e[1]),e[2],e[3]]),focus:slug};
  };
})(window);
