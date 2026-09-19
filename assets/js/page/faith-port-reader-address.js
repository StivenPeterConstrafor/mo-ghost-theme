/* Old catalogue bookmarks preserve their work and reading position in the ported reader.
 * MereO-only editions keep their existing reader because they have no source equivalent.
 */
(function () {
  'use strict';
  const before = location.pathname + location.search + location.hash;
  const after = window.FRPortLinks.localURL(before, location.origin);
  if (after !== before) location.replace(after);
})();
