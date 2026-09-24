/*
 * Hide editorial notes (Ian, 2026-09-24: "In Tools, make a Hide Editorial
 * Notes button that, well, does exactly that for every work").
 *
 * The editors' own apparatus, not the author's words: Migne's editorial
 * note sections on the Latin Fathers (section.pld-editorial, one per
 * column), the untranslated Latin editorial notes on the Greek Fathers
 * (.laonly), and apparatus rows and banks elsewhere (.row.rapp,
 * .appbank). Footnotes are the author's and stay.
 *
 * Display only: the notes stay in the page, so search, Find and passage
 * links still see them. Remembered per browser. The button is built here
 * and joins the Tools drawer's View group (faith-port-read-drawer.js
 * moves it; the phone's drawer has a cell that presses it). It shows
 * only on a work that has editorial notes. Loaded before the drawer.
 */
(function () {
  "use strict";

  const ph = document.querySelector("#app .ph.fr-reader-head");
  const ctr = ph && ph.querySelector(".ctr");
  const scroll = document.getElementById("scroll");
  if (!ctr || !scroll) return;

  const KEY = "fr_hide_editorial";
  const SEL = "#reading :is(section.pld-editorial, .laonly, .row.rapp, .appbank)";
  const root = document.documentElement;
  let on = false;
  try { on = window.localStorage.getItem(KEY) === "1"; } catch (e) { on = false; }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "fr-tb-ednotes";
  btn.hidden = true;
  ctr.appendChild(btn);

  function paint() {
    root.classList.toggle("fr-hide-editorial", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.textContent = on ? "Show editorial notes" : "Hide editorial notes";
    btn.title = on ? "Show the editors' notes again" : "Hide the editors' notes and apparatus; the author's text and footnotes stay";
  }

  // Offered only where there is something to hide.
  let queued = 0;
  function check() {
    queued = 0;
    const has = Boolean(document.querySelector(SEL));
    if (btn.hidden === has) {
      btn.hidden = !has;
      document.dispatchEvent(new CustomEvent("fr-ednotes-change"));
    }
  }
  if (window.MutationObserver) {
    new MutationObserver(() => { if (!queued) queued = window.setTimeout(check, 400); })
      .observe(scroll, { childList: true, subtree: true });
  }

  btn.addEventListener("click", () => {
    on = !on;
    try { window.localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) { /* not remembered */ }
    paint();
    document.dispatchEvent(new CustomEvent("fr-ednotes-change"));
  });

  paint();
  check();
}());
