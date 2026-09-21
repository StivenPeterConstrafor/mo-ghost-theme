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

  /* `hidden` is display:none, which cancels a transition, so it is only
     used before the first interaction. After that the drawer is opened
     and closed by width alone and stays in the layout at zero. */
  function close(toggle) {
    const d = drawerFor(toggle.dataset.tfrDrawer);
    if (!d) return;
    toggle.setAttribute("aria-expanded", "false");
    // From its current measured width, so the closing curve describes
    // the same distance the opening one did.
    d.style.width = `${d.scrollWidth}px`;
    window.requestAnimationFrame(() => {
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
    // A frame between removing `hidden` and animating, or the element
    // goes from display:none straight to its open width and the slide
    // never runs.
    window.requestAnimationFrame(() => {
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

  /* Mark where we are, so the rail says which part of the library the
     reader is standing in. Prefix match, because a surface may carry a
     query or a hash. The brand is exempt: every page is under it, and
     marking it on all of them would say nothing. */
  const here = `${window.location.pathname.replace(/\/+$/, "")}/`;
  Array.prototype.slice.call(rail.querySelectorAll("a[href]")).forEach((a) => {
    const href = a.getAttribute("href").split("#")[0].split("?")[0];
    if (!href || href === "/the-faith-received/") return;
    const path = `${href.replace(/\/+$/, "")}/`;
    if (here === path) {
      a.setAttribute("aria-current", "page");
      const group = a.closest(".tfr-rail-group");
      const toggle = group && group.querySelector("[data-tfr-drawer]");
      if (toggle) toggle.classList.add("is-current");
    }
  });
})();
