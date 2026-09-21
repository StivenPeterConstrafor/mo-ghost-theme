/* Research tools use the Ghost publication theme. Reading preferences stay in the reader. */
(function () {
  const path = location.pathname;
  if (!path.startsWith('/the-faith-received/')) return;
  if (/^\/the-faith-received\/(?:read|reader|readen|review)(?:\/|$)/.test(path)) return;
  document.documentElement.classList.add('fr-ghost-site');
  // Source canvases and SVG palettes also read this attribute. Keep it aligned
  // with the publication surface without changing the stored reading preference.
  const html = document.documentElement;
  const siteTheme = () => { if (html.dataset.theme !== 'light') html.dataset.theme = 'light'; };
  siteTheme();
  new MutationObserver(siteTheme).observe(html, {attributes:true, attributeFilter:['data-theme']});
  function navigation() {
    const nav = document.getElementById('topnav');
    if (!nav) return;
    function sync() {
      const active = nav.querySelector('a.on');
      nav.querySelectorAll('a').forEach(link => {
        if (link === active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
      if (!active || nav.scrollWidth <= nav.clientWidth) return;
      const box = nav.getBoundingClientRect(), item = active.getBoundingClientRect();
      if (item.left < box.left || item.right > box.right) {
        nav.scrollLeft += item.left - box.left - (box.width - item.width) / 2;
      }
    }
    new MutationObserver(sync).observe(nav, {subtree:true, attributes:true, attributeFilter:['class']});
    window.addEventListener('resize', sync);
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', navigation, {once:true});
  else navigation();
})();
