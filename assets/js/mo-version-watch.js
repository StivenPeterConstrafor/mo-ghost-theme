/*
 * "A newer version of this page is available" banner.
 *
 * Root cause this exists for: a page's own HTML carries the theme's
 * current asset-version hash (<meta name="mo-asset-version">, read by
 * assets/js/boot/mo-asset-version.js into window.MO_ASSET_V) at the
 * moment it loads. A tab left open across a deploy keeps running on
 * that stale hash forever — no server-side cache purge reaches an
 * already-loaded page, because the JS holding the old value is already
 * in the browser's memory, not being refetched. See
 * [[project_ghost-page-html-cached-with-stale-asset-hashes]]: this bit
 * the Daily Liturgy reader (prayers not matching the podcast narrator)
 * and cost real reader confusion before anyone suspected caching.
 *
 * Fix: periodically refetch the current page and pull the hash back
 * out of its meta tag the same way boot's own script does, and compare.
 * A mismatch means a newer theme has shipped since this tab loaded —
 * show a dismissible bar with a refresh button. Never auto-reloads: a
 * background refresh could land mid-read.
 *
 * Scoped to the Daily Liturgy pages only (/daily-liturgy/ and
 * /daily-liturgy/read/, routes.yaml), per Ian: this is the one place
 * the bug actually bit readers, not a general site-wide watcher.
 *
 * The fetch URL carries its own cache-busting param (mo_cb=<ms>) for
 * the same reason moAssetUrl busts asset URLs: per
 * [[project_ghost-page-html-cached-with-stale-asset-hashes]] (five
 * deploys burned on this before anyone realized), Ghost's CDN can cache
 * the PAGE'S OWN HTML independent of the browser — {cache:"no-store"}
 * only bypasses the browser's local cache, not that upstream layer. A
 * bare re-fetch of this same URL would just keep re-reading the same
 * stale cached copy the watcher exists to detect.
 */
(function () {
  const path = String(window.location.pathname || "/").toLowerCase();
  if (path.indexOf("/daily-liturgy/") !== 0) return;

  const v = window.MO_ASSET_V;
  if (!v) return; // fails open, same as moAssetUrl itself

  const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
  const FIRST_CHECK_DELAY_MS = 60 * 1000; // a brand-new load is fresh by definition
  const DISMISS_COOLDOWN_MS = 45 * 60 * 1000; // re-arm well after a dismiss, not never
  let timer = null;
  let shown = false;

  function extractVersion(html) {
    const meta = html.match(/<meta[^>]+name=["']mo-asset-version["'][^>]*>/i);
    if (!meta) return null;
    const content = meta[0].match(/content=["']([^"']+)["']/i);
    if (!content) return null;
    const m = content[1].match(/[?&]v=([a-z0-9]+)/i);
    return m ? m[1] : null;
  }

  function showBanner() {
    if (shown || document.querySelector(".mo-version-banner")) return;
    shown = true;
    stop();

    const root = document.createElement("div");
    root.className = "mo-version-banner";
    root.setAttribute("role", "status");
    root.innerHTML =
      `<span class="mo-version-banner-text">There's a newer version of this page.</span>` +
      `<button type="button" class="mo-version-banner-refresh">Refresh</button>` +
      `<button type="button" class="mo-version-banner-dismiss" aria-label="Dismiss">&times;</button>`;
    document.body.appendChild(root);

    root.querySelector(".mo-version-banner-refresh").addEventListener("click", () => {
      window.location.reload();
    });
    root.querySelector(".mo-version-banner-dismiss").addEventListener("click", () => {
      root.remove();
      // A one-shot suppression would mean someone who dismisses this on
      // page load and then reads for hours never hears about a second,
      // later deploy. Re-arm after a cooldown instead of never again.
      setTimeout(() => {
        shown = false;
        start();
      }, DISMISS_COOLDOWN_MS);
    });
  }

  function check() {
    if (shown || document.visibilityState !== "visible") return;
    const sep = window.location.search ? "&" : "?";
    const url = `${window.location.pathname}${window.location.search}${sep}mo_cb=${Date.now()}`;
    fetch(url, { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : null))
      .then((html) => {
        if (!html) return;
        const latest = extractVersion(html);
        if (latest && latest !== v) showBanner();
      })
      .catch(() => {}); // fails open — a failed check is not evidence of staleness
  }

  function start() {
    if (timer || shown) return;
    timer = setInterval(check, CHECK_INTERVAL_MS);
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  setTimeout(() => {
    check();
    start();
  }, FIRST_CHECK_DELAY_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
})();
