/* Attach Ghost identity to the imported engines' protected Cloudflare calls.
 * MOAuth validates the destination against the theme's existing trusted hosts.
 * Data reads keep their ordinary unauthenticated path; no token is stored here.
 */
(function () {
  'use strict';
  const previous = window.fetch.bind(window);
  const host = 'mo-tfr-ask-dev.mo-podcast-feed.workers.dev';
  const protectedPath = /^\/v1\/(ask|vsearch|xsearch|related|investigations|research|agent)(?:\/|$)/;
  window.fetch = async function (input, init) {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.hostname !== host || !protectedPath.test(url.pathname)) return previous(input, init);
    const token = await window.MOAuth?.tokenFor(url.href);
    if (!token) return new Response(JSON.stringify({error: 'Sign in to use this research tool.'}), {status: 401, headers: {'Content-Type': 'application/json'}});
    const headers = new Headers(init?.headers || (typeof input !== 'string' ? input.headers : undefined));
    headers.set('Authorization', `Bearer ${token}`);
    return previous(input, {...init, headers});
  };
})();
