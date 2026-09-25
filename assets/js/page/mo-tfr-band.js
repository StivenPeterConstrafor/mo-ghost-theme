/*
 * The homepage's Faith Received band: whether it shows, and the three
 * works in it.
 *
 * WHETHER IT SHOWS. The band is in the page but `hidden` until one of
 * two things is true:
 *   - the theme setting is on. Ghost writes it into the markup as
 *     data-tfr-live, and the server has already decided; this file only
 *     obeys it.
 *   - the URL carries ?tfr=preview. That is how the band is looked at
 *     before the launch without showing it to everyone, and it never
 *     persists: no cookie, no storage, one page load.
 * So the switch that matters is in Ghost, under Design. Flipping it is
 * instant and needs no deploy, in either direction.
 *
 * THE THREE WORKS. assets/data/tfr-spotlight.json holds two pools, built
 * by scripts/build-tfr-spotlight.mjs. Two works come from the band of
 * authors the library cites 10,000 times or more and one from below
 * that. The bands are never named on screen: they are the rule for what
 * to spotlight, not a label for the reader.
 *
 * THE SAME THREE ALL DAY, AND NEW ONES TOMORROW. The index is the day
 * number since an epoch, so every reader sees the same three works on
 * the same day, with no storage and no server. The second pick walks
 * the pool at a different stride, so the two middle slots never land on
 * the same work and do not march in step.
 *
 * If the file cannot be read the band keeps its headline and its button
 * and simply shows no works. A spotlight that fails should cost a
 * reader nothing.
 */
(() => {
  "use strict";

  const band = document.querySelector("[data-tfr-band]");
  if (!band) return;

  const live = band.hasAttribute("data-tfr-live");
  const preview = /[?&]tfr=preview\b/.test(window.location.search);
  if (!live && !preview) return; // stays hidden, and fetches nothing

  band.hidden = false;
  if (preview && !live) band.setAttribute("data-tfr-previewing", "");

  const list = band.querySelector("[data-tfr-works]");
  const src = band.getAttribute("data-tfr-src");
  if (!list || !src) return;

  /* Days since 2026-01-01 UTC. UTC so the day turns over at one moment
     for everybody rather than at each reader's own midnight. */
  const dayNumber = () => Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 86400000);

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));

  // 7 and 13 share no factor with 400, so slot 0 and slot 1 cannot meet.
  const pick = (pool, day, slot) => {
    if (!pool || !pool.length) return null;
    const stride = slot === 1 ? 13 : 1;
    return pool[((day * stride) + (slot * 7)) % pool.length];
  };

  const card = (work) => {
    if (!work || !work.slug) return "";
    const url = `/the-faith-received/read/?w=${encodeURIComponent(work.slug)}`;
    return `<a class="mo-tfr-work" href="${esc(url)}" data-hm-goal="tfr-spotlight">`
      + `<span class="brow-t">${esc(work.title)}</span>`
      + `<span class="brow-m">${esc(work.author)}</span>`
      + "</a>";
  };

  fetch(src, { credentials: "omit" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d || !d.pools) return;
      const day = dayNumber();
      const html = [
        card(pick(d.pools.middle, day, 0)),
        card(pick(d.pools.middle, day, 1)),
        card(pick(d.pools.near, day, 0)),
      ].join("");
      if (!html) return;
      list.innerHTML = html;
      list.hidden = false;
      const label = band.querySelector("[data-tfr-works-label]");
      if (label) label.hidden = false;
    })
    .catch(() => { /* the headline and the button stand on their own */ });
})();
