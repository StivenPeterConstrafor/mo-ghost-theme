/* No third-party account sync from a Mere Orthodoxy page.
 *
 * WHAT IT REMOVES. assets/js/port/read.in01.js — vendored, and a
 * concatenated bundle we do not hand-edit — ends by setting
 *
 *     window.__FR_FB__ = {apiKey:"AIza…", authDomain:"aquinas-studies.firebaseapp.com",
 *                         projectId:"aquinas-studies", …}
 *
 * which is the corpus site's own Firebase project, not ours. read-tools.js
 * reads it in initSync() and, when an apiKey is present, dynamically
 * imports three modules from www.gstatic.com to sign the reader in and
 * mirror their notebook — highlights, notes, saved passages, reading
 * places, conversations — into that project's Firestore.
 *
 * WHY IT HAS TO GO RATHER THAN BE LEFT ALONE. Two reasons, and the second
 * is the one that matters.
 *
 *   1. It does not work here and says so out loud. Our CSP has no
 *      www.gstatic.com in script-src, so all three imports are refused and
 *      every single load of the reader logs three Content Security Policy
 *      errors and three failed requests. The catch arm then writes "sync
 *      unavailable" into #frSyncNote, which is the wrong sentence: nothing
 *      is unavailable, the notebook is saved on this device exactly as
 *      intended. Removing the config takes initSync's first branch
 *      instead — "not configured → localStorage-only" — which hides the
 *      Sign in button and leaves the note reading "saved on this device".
 *
 *   2. The only thing standing between our members' reading notes and a
 *      third party's database is a CSP line. That is one relaxed
 *      directive away from being a data export nobody asked for. The
 *      config should not be on the page at all.
 *
 * WHERE IT SITS. Immediately after read.in01.js in <head>. That file sets
 * the global synchronously, and read-tools.js is injected later by
 * reader-core.js, so the window between the two is ours and is not a race.
 */
(function () {
  "use strict";
  try {
    delete window.__FR_FB__;
  } catch (_) {
    window.__FR_FB__ = null;
  }
})();
