/* Find in this work — the keyboard door, and nothing else.
 *
 * WHAT THIS FILE USED TO BE, AND WHY IT IS GONE. It was a second find
 * implementation. The reasoning at the time was that the port shipped
 * #findbar's styling and no behaviour, and that reader-core's Search
 * button called a window.__frOpenSearch defined nowhere. Both halves of
 * that were wrong, and grepping the loaded scripts rather than the
 * stylesheet would have shown it:
 *
 *   assets/js/port/read-tools.js defines findOpen(), _findBar(),
 *   findSet(), findStep(), findClear() and findWholeWork(), builds the
 *   very same #findbar with an input of its own (#findInput), and
 *   assigns window.__frOpenSearch = findOpen and window._frSearch =
 *   findOpen at the end of __initSearch().
 *
 * __initSearch runs late — reader-core calls it through _lateInit — so
 * it ran AFTER this file's top-level assignment and silently took
 * window.__frOpenSearch back. Everything reachable by a reader (the ⌕
 * button in the toolbar, the thumb bar's Find on a phone, ⌘K, "/")
 * therefore opened the port's find and never this one. This file's only
 * live effect was its hotkey.
 *
 * AND THAT HOTKEY BROKE FIND. Both implementations build an element with
 * id "findbar". The port's _findBar() begins `let b=$("#findbar"); if(!b)
 * {…}` — so after Ctrl/⌘+Shift+F had put OUR bar on the page, the port
 * found it, skipped building its own, and then read $("#findInput"),
 * which only exists inside its own markup. findOpen() threw on
 * `input.focus()` and _findBar() threw on `input.value=…`
 * ("Cannot set properties of null (setting 'value')", reproduced on the
 * live reader 2026-09-18). From that press onward the Search button did
 * nothing at all, for the rest of the session.
 *
 * So the duplicate is withdrawn. The port's find is also the better one:
 * it lifts content-visibility off folios that have not been painted, so
 * it reaches text this one could not (11,447 hits for "God" in Charnock
 * against a partial count here).
 *
 * WHAT IS KEPT is the one thing the port does not bind: Ctrl/⌘+Shift+F.
 * Plain ⌘F stays the browser's, which is deliberate — taking it from a
 * reader who wants the browser's own find would be rude.
 */
(function () {
  "use strict";

  // The port's opener, whichever name it is wearing when the key is
  // pressed. Resolved at press time, never cached: __initSearch is a
  // late init and may not have run when this file does.
  function portFind() {
    const fn = window._frSearch || window.__frOpenSearch;
    return typeof fn === "function" ? fn : null;
  }

  document.addEventListener("keydown", (e) => {
    if (!(e.metaKey || e.ctrlKey) || !e.shiftKey) return;
    if (e.key !== "f" && e.key !== "F") return;
    const open = portFind();
    // Nothing to open yet: leave the key to the browser rather than
    // swallowing it.
    if (!open) return;
    e.preventDefault();
    open("");
  });
})();
