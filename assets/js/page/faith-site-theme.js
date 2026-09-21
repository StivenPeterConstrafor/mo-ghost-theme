/* Research tools use the Ghost publication theme. Reading preferences stay in the reader. */
(function () {
  const path = location.pathname;
  if (!path.startsWith('/the-faith-received/')) return;
  if (/^\/the-faith-received\/(?:read|reader|readen|review)(?:\/|$)/.test(path)) return;
  document.documentElement.classList.add('fr-ghost-site');
})();
