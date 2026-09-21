/* Old catalogue bookmarks preserve their work and reading position in the
 * ported reader.
 *
 * THIS RUNS IN THE HEAD so the forward happens before anything paints.
 * That mattered on 2026-09-21: the curated 'mo' corpus was excluded from
 * the translation, on the note below that MereO-only editions had no
 * source equivalent and kept the old reader. They do have one now, every
 * curated work opens in the ported reader, so the exclusion was stale and
 * the excluded links took a much worse path instead: the old reader
 * loaded, painted its masthead, its Contents button and the word
 * "Loading...", and only then did its own catalogue miss and forward.
 * Measured live, 120ms to paint and 481ms to leave.
 *
 * Ian: "When I click on a work, it starts to load the old reader before
 * it loads the new one. This happens on desktop too. This is completely
 * unnecessary." Verified before removing the exclusion that all eight
 * sampled curated works render in the ported reader, from the Shepherd
 * of Hermas to the Westminster Shorter Catechism.
 */
(function () {
  'use strict';
  const before = location.pathname + location.search + location.hash;
  const after = window.FRPortLinks.localURL(before, location.origin);
  if (after !== before) location.replace(after);
})();
