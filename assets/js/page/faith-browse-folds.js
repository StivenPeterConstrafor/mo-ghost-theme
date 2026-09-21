/*
 * Browse: the folds are shut on a phone and open on a desktop.
 *
 * Ian, 2026-09-21: "that only should be on mobile. You made it on
 * desktop too. Desktop shouldn't do this. Or desktop should AT LEAST
 * start expanded."
 *
 * Folding exists because Browse is five long sections and a phone
 * cannot show two of them at once; on a desktop the same fold hides
 * shelves that had room to be seen, and asks for a click to show
 * something that was never in the way.
 *
 * THE MARKUP SHIPS OPEN AND THIS SHUTS IT. The other order would be
 * worse: `open` is an HTML attribute, not a style, so a page that ships
 * closed and waits for script to open it shows everyone a stack of
 * headings first, and shows a reader with no JS a permanently collapsed
 * page. Shipping open means the failure mode is a long page rather than
 * a page with its contents missing, which is the right direction to
 * fail in.
 *
 * ONCE, AT LOAD, AND NEVER AGAIN. No resize listener: re-shutting the
 * folds because someone turned their phone, or because a desktop window
 * was dragged narrow, would throw away what they had opened. The width
 * at load decides the starting position and the reader owns it after
 * that.
 *
 * Page-template script: runs BEFORE site.min.js, so it uses no bundle
 * globals. It needs none.
 */
(function () {
  const folds = document.querySelectorAll("details.bfold");
  if (!folds.length) return;

  // Matched to the 640px breakpoint the rest of Browse is written
  // against, so the folds shut at exactly the width the layout goes
  // single-column.
  let narrow = false;
  try {
    narrow = window.matchMedia("(max-width: 640px)").matches;
  } catch (_) {
    // No matchMedia is not a reason to collapse anything.
    return;
  }
  if (!narrow) return;

  folds.forEach((d) => { d.open = false; });
}());
