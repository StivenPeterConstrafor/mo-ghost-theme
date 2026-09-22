/*
 * The Faith Received rail: opening and closing the drawers.
 *
 * Everything the rail links to is in the markup already, so this file
 * only decides what is shown. If it never loads, the rail is still six
 * items and the drawers are simply closed, which is why the toggles are
 * <button hidden>-controlled rather than the markup being empty.
 *
 * A FILE, NOT AN INLINE SCRIPT: the theme's CSP is script-src 'self'
 * with no 'unsafe-inline', so an inline handler is refused by the
 * browser and silently never runs.
 *
 * The drawer opens ALONG the rail rather than dropping over the page.
 * A dropdown would cover the first line of whatever the reader came to
 * look at; a drawer pushes the rail open and leaves the page alone.
 */
(function () {
  "use strict";

  const rail = document.querySelector(".tfr-rail");
  if (!rail) return;

  const toggles = Array.prototype.slice.call(rail.querySelectorAll("[data-tfr-drawer]"));
  if (!toggles.length) return;

  const drawerFor = (name) => rail.querySelector(`[data-tfr-drawer-for="${name}"]`);

  /* ON A PHONE THE DRAWER DROPS, so there is no width to animate.
     Measured at 390px: the brand alone is 203px and the six items need
     381, so nothing can slide along a line that has no room left. The
     CSS at <=640px positions the drawer as a panel under the rail; this
     keeps the script from writing inline widths that would fight it.
     Read per call rather than cached, because a phone rotating from
     portrait to landscape crosses this boundary without reloading. */
  const dropped = () => window.matchMedia("(max-width: 640px)").matches;

  /* ON A PHONE THE OPEN PANEL LIVES OUTSIDE THE SCROLLING ROW.
     Ian, 2026-09-22: "Nothing happens when I tap Read on iPhone Brave."
     In the markup each drawer sits inside .tfr-rail-inner, which on a
     phone is the sideways scroller (overflow-x: auto). The CSS relied on
     the panel escaping it: it is positioned against .tfr-rail, and by
     the spec an overflow box outside an abspos element's containing-
     block chain does not clip it. Chrome honours that, which is why
     every desktop and emulated check passed. iOS WebKit, which is every
     browser on an iPhone including Brave, clips it to the touch-scrolling
     row anyway: the tap lands, the caret turns, and the panel opens
     inside a 40px strip where nothing of it shows.

     So on a phone the open drawer is moved to be a direct child of
     .tfr-rail, where no scroller surrounds it in any engine, and put
     back in its group when it closes or the width crosses to desktop,
     where it has to sit inline to slide along the line. Every lookup
     here is rail-scoped, so the move changes nothing else. */
  const homes = new Map();
  function lift(d) {
    if (d.parentNode === rail) return;
    homes.set(d, d.parentNode);
    rail.appendChild(d);
  }
  function restore(d) {
    const home = homes.get(d);
    if (home && d.parentNode !== home) home.appendChild(d);
    homes.delete(d);
  }

  /* `hidden` is display:none, which cancels a transition, so it is only
     used before the first interaction. After that the drawer is opened
     and closed by width alone and stays in the layout at zero. */
  function close(toggle) {
    const d = drawerFor(toggle.dataset.tfrDrawer);
    if (!d) return;
    toggle.setAttribute("aria-expanded", "false");
    if (dropped()) {
      d.classList.remove("is-open");
      d.style.width = "";
      restore(d);
      rail.classList.remove("tfr-rail--open");
      return;
    }
    restore(d);
    // From its current measured width, so the closing curve describes
    // the same distance the opening one did.
    d.style.width = `${d.scrollWidth}px`;
    window.requestAnimationFrame(() => {
      if (toggle.getAttribute("aria-expanded") === "true") return; // reopened since
      d.classList.remove("is-open");
      d.style.width = "0px";
    });
    rail.classList.remove("tfr-rail--open");
  }

  function closeAll(except) {
    toggles.forEach((t) => { if (t !== except) close(t); });
  }

  function open(toggle) {
    const d = drawerFor(toggle.dataset.tfrDrawer);
    if (!d) return;
    closeAll(toggle);
    toggle.setAttribute("aria-expanded", "true");
    d.hidden = false;
    /* ON A PHONE, AT ONCE -- not in the next animation frame.
       Ian, 2026-09-21: "The navrail subcategories aren't working on
       mobile." The dropped panel has `transition: none` and is-open is
       what switches it from display:none to flex, so the frame bought no
       animation at all. What it did buy was two failures, both measured
       on the live Connections page at 375px:

       - DELAY. On the port surfaces (Connections, Compare, Search) the
         first seconds after load are heavy start-up work, frames arrive
         late, and a tap that set aria-expanded left the panel shut for
         well over 450ms. A reader sees nothing happen.

       - A RACE, which the delay turns into the common case. close() is
         synchronous here, so a second tap -- the natural response to a
         first one that did nothing -- closed a drawer that had not opened
         yet, and then the late frame opened it anyway. Tap, tap: toggle
         reads closed, panel is showing, and every tap after that is out
         of step. Reproduced with open-then-close: expanded=false,
         drawer open.

       Adding the class in the same task removes both. */
    if (dropped()) {
      d.style.width = "";
      lift(d);
      d.classList.add("is-open");
      rail.classList.add("tfr-rail--open");
      return;
    }
    restore(d);
    // A frame between removing `hidden` and animating, or the element
    // goes from display:none straight to its open width and the slide
    // never runs.
    window.requestAnimationFrame(() => {
      // The slide does need its frame on a desktop, but a drawer closed
      // before that frame arrives must stay closed: the same race as the
      // phone, just rarer, since a desktop frame is rarely late.
      if (toggle.getAttribute("aria-expanded") !== "true") return;
      d.classList.add("is-open");
      d.style.width = `${d.scrollWidth}px`;
      // Once it has arrived, hand the width back to the content, so a
      // resize or a font swap does not leave it clipped at an old number.
      window.setTimeout(() => {
        if (d.classList.contains("is-open")) d.style.width = "auto";
      }, 320);
    });
    rail.classList.add("tfr-rail--open");
    /* NO scrollIntoView. It was the jump: measured on the live rail, the
       width settled at 120ms and then scrollLeft went 0 to 177 in a
       single frame at 300ms. The rail scrolls under the pinned brand if
       the reader wants it to; nothing yanks it. */
  }

  toggles.forEach((t) => {
    t.addEventListener("click", (e) => {
      e.preventDefault();
      if (t.getAttribute("aria-expanded") === "true") { close(t); return; }
      open(t);
    });
  });

  // Escape closes, and returns the focus to the control that opened it,
  // or the reader is left with the caret somewhere they cannot see.
  rail.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const openToggle = toggles.filter((t) => t.getAttribute("aria-expanded") === "true")[0];
    if (!openToggle) return;
    close(openToggle);
    openToggle.focus();
  });

  // Rotating a phone across 640px changes which way a drawer opens and
  // where it has to live, so an open one closes and goes home first.
  const phoneQuery = window.matchMedia("(max-width: 640px)");
  const onCross = () => {
    closeAll(null);
    homes.forEach((home, d) => restore(d));
  };
  if (phoneQuery.addEventListener) phoneQuery.addEventListener("change", onCross);
  else if (phoneQuery.addListener) phoneQuery.addListener(onCross);

  // A click anywhere else is a decision not to use the drawer.
  document.addEventListener("click", (e) => {
    if (rail.contains(e.target)) return;
    closeAll(null);
  });

  /* THE SCROLL CUE. The rail is one line that can run past the viewport
     once a drawer opens, and nothing said so; the row just ended. This
     is a hairline whose thumb is as wide a fraction of the rail as the
     view is of the whole line, shown only when there is somewhere to
     scroll. Built here rather than in the markup because it is a fact
     about the layout, not about the navigation. */
  const scroller = rail.querySelector(".tfr-rail-inner");
  if (scroller) {
    const cue = document.createElement("div");
    cue.className = "tfr-rail-scroll";
    cue.setAttribute("aria-hidden", "true");
    const thumb = document.createElement("span");
    cue.appendChild(thumb);
    rail.appendChild(cue);

    let queued = false;
    function paint() {
      queued = false;
      const openDrawer = rail.querySelector(".tfr-rail-drawer.is-open");
      const total = scroller.scrollWidth;
      const view = scroller.clientWidth;
      // Only while a drawer is open: the bar describes that drawer, so
      // with none open there is nothing for it to be the length of.
      if (!openDrawer || total - view < 4) { cue.classList.remove("is-live"); return; }

      // Span the drawer, clipped to what of it is actually on screen.
      const railBox = rail.getBoundingClientRect();
      const box = openDrawer.getBoundingClientRect();
      const left = Math.max(0, box.left - railBox.left);
      const right = Math.min(railBox.width, box.right - railBox.left);
      const width = Math.max(24, right - left);
      cue.style.left = `${left}px`;
      cue.style.width = `${width}px`;

      cue.classList.add("is-live");
      const ratio = view / total;
      const travel = (total - view) ? scroller.scrollLeft / (total - view) : 0;
      // Against the track's own width, which is now the drawer's.
      thumb.style.transform =
        `translateX(${travel * width * (1 - ratio)}px) scaleX(${ratio})`;
    }
    function schedule() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(paint);
    }
    scroller.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    if (window.ResizeObserver) new ResizeObserver(schedule).observe(scroller);
    // A drawer changes the line's length and the bar's span, so repaint
    // as it opens and again once it has arrived.
    toggles.forEach((t) => t.addEventListener("click", () => {
      window.setTimeout(schedule, 60);
      window.setTimeout(schedule, 180);
      window.setTimeout(schedule, 340);
    }));
    schedule();
  }

  /* ASK OPENS HERE WHEN IT CAN.
   *
   * The Scripture tool, the author room and the compare desk all load
   * ask-workspace.js, which puts Ask on the page as an overlay: it knows
   * what work or passage you are looking at, and closing it puts you back
   * where you were. Those three used to reach it through a button in the
   * ported navigation bar, which the rail has now replaced.
   *
   * Following the link instead would leave the page to ask a question
   * about it, which is the wrong trade. So where the overlay exists, the
   * Research drawer's Ask opens it; everywhere else the href stands and
   * the reader goes to the Ask workspace, which is why this is an
   * enhancement on a real link rather than a button.
   */
  rail.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href^="/the-faith-received/ask/"]');
    if (!a || !rail.contains(a)) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; // open-in-new-tab still works
    const ask = window.FRAsk;
    if (!ask || typeof ask.open !== "function") return; // no overlay here: follow the link
    e.preventDefault();
    closeAll(null);
    ask.open();
  });

  /* Mark where we are, so the rail says which part of the library the
     reader is standing in. Prefix match, because a surface may carry a
     query or a hash. The brand is exempt: every page is under it, and
     marking it on all of them would say nothing. */
  const here = `${window.location.pathname.replace(/\/+$/, "")}/`;
  /* Two rail items can now share a path and differ only by hash:
     Bookmarks is /research/#bookmarks and Notebook is
     /research/#notebook, both panels of the Research desk. The matcher
     compared paths alone, so standing on /research/ lit BOTH of them
     and drew one underline across the pair.

     A link that names a panel is current only when that panel is the
     one open. The Research page's hash is `#<mode>` with the panel's
     own state after the first "&" (the grammar is at the top of
     assets/js/page/faith-research.js), so the mode is everything before
     it. A link with no hash keeps the old rule. */
  const mode = window.location.hash.replace(/^#/, "").split("&")[0];
  Array.prototype.slice.call(rail.querySelectorAll("a[href]")).forEach((a) => {
    const raw = a.getAttribute("href");
    const href = raw.split("#")[0].split("?")[0];
    const wants = raw.indexOf("#") >= 0 ? raw.split("#")[1].split("&")[0] : "";
    if (!href || href === "/the-faith-received/") return;
    const path = `${href.replace(/\/+$/, "")}/`;
    if (here !== path) return;
    if (wants && wants !== mode) return;
    a.setAttribute("aria-current", "page");
    const group = a.closest(".tfr-rail-group");
    const toggle = group && group.querySelector("[data-tfr-drawer]");
    if (toggle) toggle.classList.add("is-current");
  });

  /* The hash changes without a page load on the Research desk, so the
     mark has to follow it. Re-running the same pass is cheaper than
     tracking which link was marked last. */
  window.addEventListener("hashchange", () => {
    const now = window.location.hash.replace(/^#/, "").split("&")[0];
    Array.prototype.slice.call(rail.querySelectorAll("a[href]")).forEach((a) => {
      const raw = a.getAttribute("href");
      if (raw.indexOf("#") < 0) return;
      const href = raw.split("#")[0].split("?")[0];
      if (`${href.replace(/\/+$/, "")}/` !== here) return;
      const wants = raw.split("#")[1].split("&")[0];
      if (wants === now) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  });
})();
