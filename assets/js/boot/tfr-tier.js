/*
 * The Faith Received's research tier, declared once for the browser.
 *
 * true  = the research tools need an ACCOUNT (the beta).
 * false = they need a paid or comped MEMBERSHIP.
 *
 * WHY THIS IS ITS OWN FILE, IN BOOT. The same decision is read by
 * assets/js/feature-gate.js, which ships in site.min.js at the foot of
 * the page, and by assets/js/lib/faith-work-bookmarks.js, which pages
 * load themselves and which therefore runs BEFORE that bundle. A
 * constant living in the bundle cannot be read by the files that run
 * first, and a constant copied into both is a constant that drifts. So
 * it lives in boot.min.js, which is in <head> and has already run by
 * the time anything else asks.
 *
 * THE OTHER PLACES THIS DECISION IS ENFORCED, all of which must agree:
 *   website/workers/tfr-library/worker.js         requireLibraryMember()
 *   website/workers/tfr-library/ask-dev/worker.js requireMember()
 * and the page markup that decides who is served the tools at all,
 * which no script can check. website/workers/scripts/check-tfr-tier.mjs
 * fails the build when the machine-checkable ones disagree.
 *
 * TO END THE BETA: set this to false, set it false in both workers, and
 * deploy all three. Then walk the {{#if @member}} list in the handoff.
 */
window.MO_TFR_BETA_OPEN_TO_ALL_MEMBERS = true;
