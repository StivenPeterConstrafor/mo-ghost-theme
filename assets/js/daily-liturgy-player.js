/*
 * The /daily-liturgy/ landing page's podcast player.
 *
 * Same component as the reader's (/daily-liturgy/read/): the .dlr-podcast
 * glass card, its markup and its styles, so the two pages show one
 * player. The reader's copy in daily-liturgy-reader.js follows the day on
 * screen; this one has no day to follow, so it loads the newest RELEASED
 * episode. Buzzsprout keeps scheduled episodes in the feed with a future
 * pubDate, and those are skipped the same way the reader skips them.
 */
(function () {
  const $podcast = document.querySelector("[data-dl-latest]");
  if (!$podcast) return;
  const q = (sel) => $podcast.querySelector(sel);
  const $audio = q("[data-dlr-audio]");
  const $playBtn = q("[data-dlr-play]");
  const $backBtn = q("[data-dlr-back]");
  const $fwdBtn = q("[data-dlr-forward]");
  const $playIcon = q(".dlr-play-icon");
  const $pauseIcon = q(".dlr-pause-icon");
  const $title = q("[data-dlr-player-title]");
  const $progress = q("[data-dlr-progress]");
  const $bar = q("[data-dlr-bar]");
  const $elapsed = q("[data-dlr-elapsed]");
  const $time = q("[data-dlr-time]");
  if (!$audio || !$playBtn) return;

  const FEED_URL = "https://mo-podcast-feed.mo-podcast-feed.workers.dev";
  const ARTWORK_URL = "https://storage.ghost.io/c/7b/0b/7b0bd699-d78f-4472-8d29-233bd333f048/content/images/2026/07/Mere-Orthodoxy-Podcast-Covers--2-.jpg";
  const SKIP_SECONDS = 15;
  let episode = null;
  let scrubbing = false;

  function fmt(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  }

  // `hidden` is an HTMLElement property; on an SVG it is only an expando,
  // so the icons are toggled through the attribute.
  function show(node, visible) {
    if (!node) return;
    if (visible) node.removeAttribute("hidden"); else node.setAttribute("hidden", "");
  }

  function pickEpisodes(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.episodes)) return data.episodes;
    const s = data["daily-liturgy"];
    return s && Array.isArray(s.episodes) ? s.episodes : [];
  }

  function latestReleased(episodes) {
    let best = null, bestRank = -Infinity;
    episodes.forEach((ep) => {
      if (!ep || !ep.audioUrl) return;
      const ts = Date.parse(ep.pubDate || "");
      if (!Number.isNaN(ts) && ts > Date.now()) return; // scheduled
      const rank = Number.isNaN(ts) ? -Infinity : ts;
      if (!best || rank > bestRank) { best = ep; bestRank = rank; }
    });
    return best;
  }

  fetch(`${FEED_URL}?show=daily-liturgy&limit=10`, { credentials: "omit" })
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then((data) => {
      episode = latestReleased(pickEpisodes(data));
      if (!episode) return;
      $audio.src = episode.audioUrl;
      $title.textContent = episode.title || "Today's episode";
      if (episode.duration) $time.textContent = fmt(episode.duration);
      $podcast.hidden = false;
    })
    .catch(() => { /* no player is the quiet failure */ });

  // ─── Media Session (lock screen / Bluetooth controls) ────────────
  function safeSessionHandler(action, fn) {
    try { navigator.mediaSession.setActionHandler(action, fn); } catch (_) { /* unsupported */ }
  }
  function wireMediaSession() {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: (episode && episode.title) || "The Daily Liturgy",
        artist: "The Daily Liturgy Podcast",
        album: "Mere Orthodoxy",
        artwork: [{ src: ARTWORK_URL, sizes: "512x512", type: "image/jpeg" }],
      });
    } catch (_) { /* older browsers */ }
    safeSessionHandler("play", () => { play(); });
    safeSessionHandler("pause", () => { $audio.pause(); });
    safeSessionHandler("seekbackward", (e) => { nudge(-((e && e.seekOffset) || SKIP_SECONDS)); });
    safeSessionHandler("seekforward", (e) => { nudge((e && e.seekOffset) || SKIP_SECONDS); });
    safeSessionHandler("seekto", (e) => {
      if (!e) return;
      if (e.fastSeek && "fastSeek" in $audio) $audio.fastSeek(e.seekTime);
      else $audio.currentTime = e.seekTime;
      paint();
    });
  }
  function updatePositionState() {
    if (!("mediaSession" in navigator) || !navigator.mediaSession.setPositionState) return;
    if (!$audio.duration || !isFinite($audio.duration)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: $audio.duration,
        playbackRate: $audio.playbackRate,
        position: Math.min($audio.currentTime, $audio.duration),
      });
    } catch (_) { /* ignore */ }
  }
  function setPlaybackState(state) {
    if (!("mediaSession" in navigator)) return;
    try { navigator.mediaSession.playbackState = state; } catch (_) { /* ignore */ }
  }

  // ─── Transport ───────────────────────────────────────────────────
  function play() {
    wireMediaSession();
    const p = $audio.play();
    if (p && p.catch) p.catch(() => {});
  }
  function nudge(delta) {
    const dur = $audio.duration;
    if (!dur || !isFinite(dur)) return;
    $audio.currentTime = Math.min(dur, Math.max(0, $audio.currentTime + delta));
    paint();
  }
  function paint() {
    const dur = $audio.duration;
    const known = dur && isFinite(dur);
    const pct = known ? ($audio.currentTime / dur) * 100 : 0;
    $bar.style.width = `${pct}%`;
    $elapsed.textContent = fmt($audio.currentTime || 0);
    if (known) $time.textContent = fmt(dur);
    $progress.setAttribute("aria-valuenow", String(Math.round(pct)));
    $progress.setAttribute("aria-valuetext",
      `${fmt($audio.currentTime || 0)}${known ? ` of ${fmt(dur)}` : ""}`);
  }

  $playBtn.addEventListener("click", () => { if ($audio.paused) play(); else $audio.pause(); });
  $backBtn.addEventListener("click", () => { nudge(-SKIP_SECONDS); });
  $fwdBtn.addEventListener("click", () => { nudge(SKIP_SECONDS); });

  $audio.addEventListener("play", () => {
    show($playIcon, false); show($pauseIcon, true);
    $playBtn.setAttribute("aria-label", "Pause episode");
    $podcast.classList.add("is-playing");
    setPlaybackState("playing");
  });
  $audio.addEventListener("pause", () => {
    show($playIcon, true); show($pauseIcon, false);
    $playBtn.setAttribute("aria-label", "Play episode");
    $podcast.classList.remove("is-playing");
    setPlaybackState("paused");
  });
  $audio.addEventListener("loadedmetadata", () => { paint(); updatePositionState(); });
  $audio.addEventListener("timeupdate", () => {
    if (scrubbing) return;
    paint();
    updatePositionState();
  });

  // ─── Scrubbing: drag, click, keys ────────────────────────────────
  function seekToEvent(clientX) {
    const dur = $audio.duration;
    if (!dur || !isFinite(dur)) return;
    const rect = $progress.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    $audio.currentTime = pct * dur;
    paint();
  }
  $progress.addEventListener("pointerdown", (e) => {
    if (!$audio.duration || !isFinite($audio.duration)) return;
    scrubbing = true;
    $progress.classList.add("is-scrubbing");
    $progress.setPointerCapture(e.pointerId);
    seekToEvent(e.clientX);
  });
  $progress.addEventListener("pointermove", (e) => { if (scrubbing) seekToEvent(e.clientX); });
  ["pointerup", "pointercancel"].forEach((evt) => {
    $progress.addEventListener(evt, () => {
      if (!scrubbing) return;
      scrubbing = false;
      $progress.classList.remove("is-scrubbing");
      updatePositionState();
    });
  });
  $progress.addEventListener("keydown", (e) => {
    const dur = $audio.duration;
    if (!dur || !isFinite(dur)) return;
    const keys = { ArrowLeft: -5, ArrowRight: 5, ArrowDown: -5, ArrowUp: 5, PageDown: -30, PageUp: 30 };
    if (e.key in keys) nudge(keys[e.key]);
    else if (e.key === "Home") { $audio.currentTime = 0; paint(); }
    else if (e.key === "End") { $audio.currentTime = dur; paint(); }
    else return;
    e.preventDefault();
  });
})();
