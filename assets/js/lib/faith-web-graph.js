/* Adapt the canonical Web graph to Ian's constellation layouts. */
(function (global) {
  global.MOFaithWebGraphAdapter = function (nodes, edges, shelves) {
    const codes = Object.keys(shelves);
    return {
      cats: codes.map(k => ({k, l: shelves[k]})),
      nodes: nodes.map(n => ({a: n.a, fk: n.s, n: n.win || 0,
        pos: n.win || 0, ref: n.nin || 0, src: n.din || 0, e: codes.indexOf(n.sh)})),
      edges: edges.map(e => [e[0], e[1], e[2], e[3] || 0])
    };
  };
})(window);
