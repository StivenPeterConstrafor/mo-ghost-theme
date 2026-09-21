/* Protected research files need the member bearer just like research itself.
 * A normal cross-origin download link cannot carry it; use MOAuth, then save
 * the returned file locally. Never put credentials in a URL or exported text.
 */
(function () {
  'use strict';
  if (window.__faithDownloadsBound) return;
  window.__faithDownloadsBound = true;
  document.addEventListener('click', async event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    let url;
    try { url = new URL(link.href); } catch (_) { return; }
    if (url.origin !== 'https://mo-tfr-ask-dev.mo-podcast-feed.workers.dev' || !/^\/v1\/investigations(?:\/|$)/.test(url.pathname)) return;
    const format = url.searchParams.get('format');
    if (!['md','json'].includes(format) && !url.searchParams.has('artifact') && !url.pathname.includes('/artifacts/')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (link.dataset.downloading === '1') return;
    const label = link.textContent;
    link.dataset.downloading = '1';
    link.textContent = 'Downloading…';
    try {
      if (!window.MOAuth?.fetch) throw Error('Sign in to download this research.');
      const response = await window.MOAuth.fetch(url.href);
      if (!response.ok) throw Error(response.status === 401 ? 'Sign in to download this research.' : 'This download is unavailable. Try again.');
      const blob = await response.blob(), objectURL = URL.createObjectURL(blob);
      const save = document.createElement('a');
      save.href = objectURL;
      const artifactName = (url.searchParams.get('artifact') || decodeURIComponent(url.pathname.split('/').pop() || '')).split('/').pop().replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0,150);
      save.download = format === 'json' ? 'research-evidence.json' : format === 'md' ? 'research-report.md' : artifactName || 'research-artifact';
      document.body.appendChild(save); save.click(); save.remove();
      setTimeout(() => URL.revokeObjectURL(objectURL), 60000);
      link.textContent = label;
    } catch (error) { link.textContent = error.message; }
    finally { delete link.dataset.downloading; }
  }, true);
})();
