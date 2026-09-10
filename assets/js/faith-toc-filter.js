/*
 * The Faith Received — filter the contents rail.
 *
 * Ported from the corpus owner's English Divines reading edition
 * (his readen.in03.js, wireTocSearch): a box above the contents that
 * narrows the list as you type, keeping the parents of anything that
 * matches so a hit two levels down still shows what it belongs to.
 *
 * It is here rather than folded into faith-reader.js on purpose. The
 * reader is four thousand lines shared by seven collections, and this
 * needs none of it: the rail is already rendered, every entry is an
 * <a> with a .faith-toc-label, and depth is carried as indentation
 * (buildTocLinks in faith-reader.js sets paddingLeft). So this reads
 * the finished rail and leaves the reader alone.
 *
 * Why it earns its place. Early English Books is where it was written
 * for: a 1651 folio ships a contents tree of a hundred and forty
 * sections whose labels are the printer's own running heads, and
 * finding "Of the Lords Supper" in that by eye is the thing the
 * reading edition was supposed to fix. But nothing in it is EEBO
 * specific, and a Patrologia Latina volume has the same problem, so it
 * runs on every work whose rail is long enough to need it.
 *
 * Below the threshold it does not mount at all. A filter box over
 * eleven chapters is furniture.
 */
(function () {
  "use strict";

  const nav = document.querySelector("[data-fr-toc]");
  if (!nav) return;

  // Under this many entries, scanning the list is faster than typing.
  const WORTH_FILTERING = 12;
  const WAIT_MS = 20000;

  function fold(s) {
    return String(s == null ? "" : s)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  }

  // Depth is indentation: buildTocLinks writes paddingLeft in steps of
  // 14px and nothing else records the tree. Reading it back is what
  // lets a match keep its parents.
  function depthOf(li) {
    const px = parseInt(li.style.paddingLeft, 10);
    return Number.isFinite(px) ? Math.round(px / 14) : 0;
  }

  function mount(list) {
    const items = Array.prototype.slice.call(list.querySelectorAll(".faith-toc-item"));
    if (items.length < WORTH_FILTERING) return;
    if (nav.querySelector("[data-fr-toc-filter]")) return;

    const rows = items.map((li) => {
      const label = li.querySelector(".faith-toc-label");
      return {
        li,
        depth: depthOf(li),
        text: label ? label.textContent || "" : "",
        folded: fold(label ? label.textContent : ""),
        label,
      };
    });

    const wrap = document.createElement("div");
    wrap.className = "faith-toc-filter-wrap";

    const input = document.createElement("input");
    input.type = "search";
    input.className = "faith-toc-filter";
    input.setAttribute("data-fr-toc-filter", "");
    input.placeholder = "Filter contents";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.setAttribute("aria-label", "Filter the contents of this work");

    const count = document.createElement("p");
    count.className = "faith-toc-filter-count";
    count.setAttribute("role", "status");
    count.setAttribute("aria-live", "polite");

    wrap.appendChild(input);
    wrap.appendChild(count);
    list.parentNode.insertBefore(wrap, list);

    function apply(query) {
      const q = fold(query.trim());
      if (!q) {
        rows.forEach((r) => {
          r.li.hidden = false;
          if (r.label) r.label.classList.remove("is-match");
        });
        count.textContent = "";
        return;
      }

      // Mark the hits, then walk back up from each hit revealing the
      // shallower entries above it until the top. Without that pass a
      // matched sub-section shows with no indication of which part of
      // the book it sits in.
      const keep = new Array(rows.length).fill(false);
      let hits = 0;
      rows.forEach((r, i) => {
        const hit = r.folded.indexOf(q) >= 0;
        if (r.label) r.label.classList.toggle("is-match", hit);
        if (!hit) return;
        hits += 1;
        keep[i] = true;
        let want = r.depth - 1;
        for (let j = i - 1; j >= 0 && want >= 0; j -= 1) {
          if (rows[j].depth <= want) { keep[j] = true; want = rows[j].depth - 1; }
        }
      });

      rows.forEach((r, i) => { r.li.hidden = !keep[i]; });
      count.textContent = hits
        ? `${hits.toLocaleString()} of ${rows.length.toLocaleString()} sections`
        : "No section matches.";
    }

    let timer = null;
    input.addEventListener("input", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => apply(input.value), 110);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      input.value = "";
      apply("");
    });
  }

  const existing = nav.querySelector(".faith-toc-list");
  if (existing) { mount(existing); return; }

  // The rail is filled once the work's structure lands, which is a
  // fetch away. Watch for it rather than polling, and give up quietly
  // if it never arrives: a work that failed to load has a bigger
  // problem than its filter box.
  const observer = new window.MutationObserver(() => {
    const list = nav.querySelector(".faith-toc-list");
    if (!list) return;
    observer.disconnect();
    window.clearTimeout(giveUp);
    mount(list);
  });
  observer.observe(nav, { childList: true, subtree: true });
  const giveUp = window.setTimeout(() => observer.disconnect(), WAIT_MS);
}());
