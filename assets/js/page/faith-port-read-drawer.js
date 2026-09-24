/*
 * The reader's tools live in the Tools button.
 *
 * Ian, 2026-09-23: "I want all of the tools to be hidden 'in' the Tools
 * button. When you click Tools, the button 'opens up' and all of the
 * tools slide out of it with the same animation that we're using in the
 * navrail." And for the phone: "just be three buttons ... contents,
 * search, and tools", with Tools opening the same way, and a
 * Transparency tool that shows the AI disclosure "as a pop-up in the
 * middle of their screen", closed by its × or by Transparency again.
 *
 * DESKTOP. The toolbar keeps the contents toggle, the title, the page
 * controls, Search and Tools. Everything else moves into a drawer that
 * sits just before Tools: the reading lanes; Flow, Collapse all, theme,
 * Aa and Hide bar; the four actions that were Tools' own menu (Copy
 * text, Copy link, Keep, Save to notebook); Report and Top; Research.
 * The elements are MOVED, not copied, so the engine's handlers, ids and
 * pressed states come with them; the old Tools menu is never opened.
 * The drawer opens by width from 0, on the rail's curve and timing
 * (faith-tfr-rail.js), and the page controls fold away while it is open
 * so the tools have the bar.
 *
 * PHONE (html.g-mobile). The thumb bar is Contents, Search and Tools.
 * Its other buttons (Text, English, + Latin, Scan, Research, Ask) move
 * into a drawer in the bar, and the desktop tools that make sense on a
 * phone join them as buttons that press the real control. Contents and
 * Search fold away while the drawer is open. Going back across 880px
 * returns every element to where the engine put it.
 *
 * TRANSPARENCY, phone only. The disclosure panel (faith-work-status.js)
 * is moved into a centred dialog. Moved, one node, for the reason that
 * file gives: the fetch that fills it and the Report hook inside it must
 * not bind to a stale twin.
 *
 * Page script, after faith-port-read-chrome.js (which builds Hide bar,
 * Report, Top and Collapse all). read-tools.js adds Search and Research
 * later, so the drawer is refilled when they arrive.
 */
(function () {
  "use strict";

  const html = document.documentElement;
  const app = document.getElementById("app");
  const ph = document.querySelector("#app .ph.fr-reader-head");
  const ctr = ph && ph.querySelector(".ctr");
  if (!app || !ph || !ctr) return;

  const mobile = () => html.classList.contains("g-mobile");
  const SLIDE_MS = 320;
  const NS = "http://www.w3.org/2000/svg";

  // ── The rail's slide ─────────────────────────────────────────────
  // Width from 0 to the content's own, then handed back to the content
  // so a font swap does not leave it clipped; closing runs the same
  // distance back. `hidden` is used only before the first open.
  function slide(drawer, open) {
    drawer.dataset.want = open ? "open" : "shut";
    if (open) {
      drawer.hidden = false;
      drawer.classList.remove("is-settled");
      window.requestAnimationFrame(() => {
        if (drawer.dataset.want !== "open") return;
        drawer.classList.add("is-open");
        drawer.style.width = `${drawer.scrollWidth}px`;
        window.setTimeout(() => {
          if (drawer.dataset.want !== "open") return;
          drawer.style.width = "auto";
          drawer.classList.add("is-settled");
        }, SLIDE_MS);
      });
      return;
    }
    drawer.classList.remove("is-settled");
    drawer.scrollLeft = 0;
    drawer.style.width = `${drawer.getBoundingClientRect().width}px`;
    window.requestAnimationFrame(() => {
      if (drawer.dataset.want === "open") return;
      drawer.classList.remove("is-open");
      drawer.style.width = "0px";
    });
  }

  function icon(d) {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.7");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    d.forEach((part) => {
      const p = document.createElementNS(NS, part.tag || "path");
      Object.keys(part).forEach((k) => { if (k !== "tag") p.setAttribute(k, part[k]); });
      svg.appendChild(p);
    });
    return svg;
  }
  const ICONS = {
    tools: [{ d: "M4 7h9M17 7h3M4 17h3M11 17h9" }, { tag: "circle", cx: "15", cy: "7", r: "2" }, { tag: "circle", cx: "9", cy: "17", r: "2" }],
    transparency: [{ tag: "circle", cx: "12", cy: "12", r: "9" }, { d: "M12 11v6M12 7.5v.01" }],
    folds: [{ d: "M7 4l5 5 5-5M7 20l5-5 5 5" }],
    copy: [{ tag: "rect", x: "8", y: "8", width: "12", height: "12", rx: "1" }, { d: "M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" }],
    link: [{ d: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" }, { d: "M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" }],
    keep: [{ d: "M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z" }],
    save: [{ d: "M6 3h12v18l-6-4-6 4z" }],
    report: [{ d: "M5 21V4M5 4h11l-2 4 2 4H5" }],
    top: [{ d: "M12 19V5M5 12l7-7 7 7" }],
  };

  // Where the engine put each element we move, so it can go back.
  const homes = new Map();
  function remember(el) {
    if (el && !homes.has(el)) homes.set(el, { parent: el.parentElement, next: el.nextSibling });
  }
  function goHome(el) {
    const h = homes.get(el);
    if (!h || !h.parent || el.parentElement === h.parent) return;
    if (h.next && h.next.parentNode === h.parent) h.parent.insertBefore(el, h.next);
    else h.parent.appendChild(el);
  }

  // The copy feedback line lived in Tools' menu; it is a toast now, on
  // both widths, because the menu is never opened.
  const say = document.getElementById("rdToolsSay");
  if (say) {
    say.classList.add("fr-td-say");
    document.body.appendChild(say);
  }

  // ════════════════════════════════════════════════════════════════
  // DESKTOP
  // ════════════════════════════════════════════════════════════════
  const toolsWrap = ctr.querySelector(".rdtw");
  const toolsBtn = document.getElementById("rdTools");
  const drawer = document.createElement("div");
  drawer.className = "fr-tools-drawer";
  drawer.id = "frToolsDrawer";
  drawer.hidden = true;
  drawer.setAttribute("role", "group");
  drawer.setAttribute("aria-label", "Reader tools");
  const groups = {};
  ["read", "view", "copy", "work", "research"].forEach((name) => {
    const g = document.createElement("div");
    g.className = `fr-td-group fr-td-${name}`;
    drawer.appendChild(g);
    groups[name] = g;
  });
  if (toolsWrap) ctr.insertBefore(drawer, toolsWrap);
  else ctr.appendChild(drawer);

  if (toolsBtn) {
    toolsBtn.textContent = "Tools";
    toolsBtn.classList.add("fr-td-toggle");
    toolsBtn.setAttribute("aria-controls", "frToolsDrawer");
    toolsBtn.setAttribute("aria-expanded", "false");
    toolsBtn.removeAttribute("aria-haspopup");
    toolsBtn.title = "Open the reader's tools";
  }

  // The descriptions under each old menu item become the tooltip.
  ["rdCopyText", "rdCopyLink", "rdKeep", "rdNote"].forEach((id) => {
    const b = document.getElementById(id);
    if (!b) return;
    const spans = b.querySelectorAll(":scope > span:not(.rdt-l)");
    const desc = spans.length ? spans[spans.length - 1].textContent.trim() : "";
    if (desc && !b.title) b.title = desc;
  });

  function members() {
    const q = (s) => ph.querySelector(s) || document.querySelector(s);
    return [
      ["read", q(".seg.lanes")],
      ["read", document.getElementById("m-modern")],
      ["view", document.getElementById("rdFlow")],
      ["view", q(".fr-tb-folds")],
      ["view", document.getElementById("thTop")],
      ["view", q(".aaw:not(.rdtw)")],
      ["view", q(".fr-tb-focus")],
      ["copy", document.getElementById("rdCopyText")],
      ["copy", document.getElementById("rdCopyLink")],
      ["copy", document.getElementById("rdKeep")],
      ["copy", document.getElementById("rdNote")],
      ["work", q(".fr-tb-report")],
      ["work", q(".fr-tb-top")],
      ["research", document.getElementById("frAuth")],
    ];
  }

  function fillDesktop() {
    members().forEach(([g, el]) => {
      if (!el) return;
      remember(el);
      if (el.parentElement !== groups[g]) groups[g].appendChild(el);
    });
  }
  function emptyDesktop() {
    members().forEach(([, el]) => { if (el) goHome(el); });
  }

  function room() {
    // What the bar can give the drawer: its width, less the contents
    // toggle, a sliver of title, Search, Tools and the gaps.
    const w = ph.clientWidth;
    const cs = window.getComputedStyle(ph);
    const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const sbt = document.getElementById("sbT");
    const rs = document.getElementById("rsBtn");
    const used = (sbt ? sbt.offsetWidth : 36) + 24 + 90
      + (rs ? rs.offsetWidth : 36) + 16
      + (toolsWrap ? toolsWrap.offsetWidth : 80) + 16 + 16;
    return Math.max(160, Math.floor(w - pad - used));
  }

  function setDesktop(open) {
    if (!toolsBtn) return;
    if (open) {
      fillDesktop();
      drawer.style.maxWidth = `${room()}px`;
    }
    toolsBtn.setAttribute("aria-expanded", open ? "true" : "false");
    ph.classList.toggle("fr-tools-open", open);
    slide(drawer, open);
  }
  const desktopOpen = () => drawer.dataset.want === "open";

  // Tools opens the drawer and never the old menu: taken at the document
  // in the capture phase, before the engine's own handler can run.
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest("#rdTools");
    if (!t || mobile()) return;
    e.preventDefault();
    e.stopPropagation();
    setDesktop(!desktopOpen());
  }, true);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || mobile() || !desktopOpen()) return;
    if (document.querySelector("#aaPop.on")) return; // Aa's own Escape first
    setDesktop(false);
    if (toolsBtn) toolsBtn.focus({ preventScroll: true });
  });
  window.addEventListener("resize", () => {
    if (desktopOpen() && !mobile()) drawer.style.maxWidth = `${room()}px`;
  });

  // Search and Research arrive with read-tools.js, after this file.
  new MutationObserver(() => {
    if (mobile()) return;
    const auth = document.getElementById("frAuth");
    if (auth && auth.parentElement === ctr) fillDesktop();
  }).observe(ctr, { childList: true });

  // ════════════════════════════════════════════════════════════════
  // PHONE
  // ════════════════════════════════════════════════════════════════
  let bar = null;
  let mDrawer = null;
  let mTools = null;
  let mOpen = false;

  function cell(key, label, iconKey) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.t = key;
    const ic = document.createElement("span");
    ic.className = "ic";
    ic.setAttribute("aria-hidden", "true");
    ic.appendChild(icon(ICONS[iconKey]));
    const lb = document.createElement("span");
    lb.className = "lb";
    lb.textContent = label;
    b.append(ic, lb);
    return b;
  }

  // Desktop controls a phone reaches by pressing the real one.
  function proxy(key, label, iconKey, target) {
    const b = cell(key, label, iconKey);
    b.addEventListener("click", () => {
      const t = typeof target === "function" ? target() : document.querySelector(target);
      if (t && !t.disabled) t.click();
      syncProxies();
    });
    return b;
  }

  let proxies = null;
  function buildProxies() {
    const report = cell("x-report", "Report", "report");
    report.setAttribute("data-report-issue", "");
    report.setAttribute("aria-label", "Report a problem");
    proxies = {
      transparency: cell("x-tt", "Transparency", "transparency"),
      folds: proxy("x-folds", "Collapse", "folds", ".fr-tb-folds"),
      copyText: proxy("x-copy", "Copy text", "copy", "#rdCopyText"),
      copyLink: proxy("x-link", "Copy link", "link", "#rdCopyLink"),
      keep: proxy("x-keep", "Keep", "keep", "#rdKeep"),
      save: proxy("x-save", "Save", "save", "#rdNote"),
      report,
      top: proxy("x-top", "Top", "top", ".fr-tb-top"),
    };
    proxies.transparency.setAttribute("aria-controls", "frTtModal");
    proxies.transparency.addEventListener("click", () => setTt(!ttOpen()));
  }

  function syncProxies() {
    if (!proxies) return;
    const f = window.FRReaderFolds;
    const open = !f || f.anyOpen();
    proxies.folds.querySelector(".lb").textContent = open ? "Collapse" : "Expand";
    const keep = document.getElementById("rdKeep");
    if (keep) {
      proxies.keep.disabled = keep.disabled;
      const kept = keep.getAttribute("aria-pressed") === "true";
      proxies.keep.classList.toggle("on", kept);
      proxies.keep.querySelector(".lb").textContent = kept ? "Kept" : "Keep";
    }
    proxies.transparency.hidden = !ttReady();
    proxies.transparency.classList.toggle("on", ttOpen());
  }
  document.addEventListener("fr-folds-change", syncProxies);

  function mMembers() {
    if (!bar) return [];
    const aa = document.getElementById("aaBtn");
    return [
      aa && aa.classList.contains("frthumb-aa") ? aa : null,
      bar.querySelector('[data-t="en"]'),
      bar.querySelector('[data-t="par"]'),
      bar.querySelector('[data-t="study"]'),
      bar.querySelector('[data-t="nb"]'),
      bar.querySelector('[data-t="ask"]'),
    ].filter(Boolean);
  }

  function buildMobile() {
    const b = document.querySelector("nav.frthumb");
    if (!b) return;
    if (b === bar && bar.contains(mDrawer)) { fillMobile(); return; }
    bar = b;
    bar.classList.add("fr-m3");
    if (!proxies) buildProxies();
    mDrawer = document.createElement("div");
    mDrawer.className = "fr-mtools-drawer";
    mDrawer.id = "frMToolsDrawer";
    mDrawer.hidden = true;
    mDrawer.setAttribute("role", "group");
    mDrawer.setAttribute("aria-label", "Reader tools");
    mTools = cell("tools", "Tools", "tools");
    mTools.setAttribute("aria-controls", "frMToolsDrawer");
    mTools.setAttribute("aria-expanded", "false");
    mTools.addEventListener("click", () => setMobile(!mOpen));
    const toc = bar.querySelector('[data-t="toc"]');
    const find = bar.querySelector('[data-t="find"]');
    bar.append(mDrawer, mTools);
    if (find) bar.insertBefore(find, bar.firstChild);
    if (toc) bar.insertBefore(toc, bar.firstChild);
    fillMobile();
  }

  function fillMobile() {
    if (!bar || !mDrawer) return;
    mMembers().forEach((el) => { if (el.parentElement !== mDrawer) mDrawer.appendChild(el); });
    Object.keys(proxies).forEach((k) => {
      const el = proxies[k];
      if (el.parentElement !== mDrawer) mDrawer.appendChild(el);
    });
    // The docked Text button first, as it was in the dock.
    const aa = document.getElementById("aaBtn");
    if (aa && aa.parentElement === mDrawer && mDrawer.firstChild !== aa) mDrawer.insertBefore(aa, mDrawer.firstChild);
    syncProxies();
  }

  function setMobile(open) {
    if (!bar || !mDrawer) return;
    mOpen = open;
    if (open) {
      fillMobile();
      const pad = 16;
      mDrawer.style.maxWidth = `${Math.max(120, bar.clientWidth - mTools.offsetWidth - pad * 2)}px`;
    }
    mTools.setAttribute("aria-expanded", open ? "true" : "false");
    mTools.classList.toggle("on", open);
    bar.classList.toggle("fr-m3-open", open);
    slide(mDrawer, open);
  }

  // ── Transparency, a dialog in the middle of the screen ───────────
  const status = document.querySelector(".faith-reader-status[data-fr-status]");
  const modal = document.createElement("div");
  modal.className = "fr-tt-modal";
  modal.id = "frTtModal";
  modal.hidden = true;
  const scrim = document.createElement("div");
  scrim.className = "fr-tt-scrim";
  const box = document.createElement("div");
  box.className = "fr-tt-box";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "Transparency");
  const x = document.createElement("button");
  x.type = "button";
  x.className = "fr-tt-x";
  x.setAttribute("aria-label", "Close");
  x.textContent = "×";
  box.appendChild(x);
  modal.append(scrim, box);
  document.body.appendChild(modal);
  if (status) remember(status);

  const ttReady = () => Boolean(status && status.querySelector(".fr-tt"));
  const ttOpen = () => !modal.hidden;
  function setTt(open) {
    if (open && (!mobile() || !ttReady())) return;
    modal.hidden = !open;
    html.classList.toggle("fr-tt-modal-open", open);
    if (open) {
      const d = status.querySelector("details.fr-tt");
      if (d) d.open = true;
      x.focus({ preventScroll: true });
    } else if (proxies && proxies.transparency.isConnected && mOpen) {
      proxies.transparency.focus({ preventScroll: true });
    }
    syncProxies();
  }
  x.addEventListener("click", () => setTt(false));
  scrim.addEventListener("click", () => setTt(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ttOpen()) setTt(false); });
  if (status) new MutationObserver(syncProxies).observe(status, { childList: true });

  function placeStatus() {
    if (!status) return;
    if (mobile()) {
      if (status.parentElement !== box) box.appendChild(status);
    } else {
      setTt(false);
      // faith-work-status.js moves it into the sidebar on a desktop; on
      // the way back from a phone it goes above the text, where it was.
      if (status.parentElement === box) goHome(status);
    }
  }

  // ════════════════════════════════════════════════════════════════
  // WIDTH CHANGES
  // ════════════════════════════════════════════════════════════════
  // Only a change across 880px (html.g-mobile) moves anything; <html>
  // also changes class on every scroll (mh-mini), which is ignored.
  let was = null;
  function apply() {
    const m = mobile();
    if (m) buildMobile();
    if (m === was) return;
    was = m;
    if (m) {
      if (desktopOpen()) setDesktop(false);
      emptyDesktop();
    } else {
      if (mOpen) setMobile(false);
      fillDesktop();
    }
    placeStatus();
  }
  apply();
  new MutationObserver(() => {
    if (mobile() && document.querySelector("nav.frthumb") !== bar) buildMobile();
  }).observe(document.body, { childList: true });
  new MutationObserver(apply).observe(html, { attributes: true, attributeFilter: ["class"] });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
  window.addEventListener("load", apply);
}());
