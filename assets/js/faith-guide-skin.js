/*
 * The shelf guides in our skin (Ian, 2026-10-10: "Run 128 through our
 * design"). custom-faith-guide.hbs opens with The Faith Received's own
 * page band. Each guide's markup (faith-guide.js, Stiven's) arrives with a
 * hero of its own that names the shelf; once it lands, its name and its
 * line move up into our band, and the hero below keeps its art, its lede
 * and its figures. faith-guide-skin.css hides the moved parts only after
 * this has run, so a failure here leaves his hero as it was.
 *
 * Text is copied with textContent; nothing from the guide is parsed as
 * markup here.
 */
(() => {
  const root = document.querySelector("[data-guide-root]");
  const name = document.querySelector("[data-guide-name]");
  const dek = document.querySelector("[data-guide-dek]");
  if (!root || !name) return;

  const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();

  function skin() {
    const hero = root.querySelector(".hero");
    const h1 = hero && hero.querySelector("h1");
    if (!h1) return false;
    const title = clean(h1.textContent);
    if (title) name.textContent = title.charAt(0).toUpperCase() + title.slice(1);
    const by = hero.querySelector(".by");
    if (by && dek) dek.textContent = clean(by.textContent);
    // One h1 on the page: ours. His section is labelled by it instead.
    hero.setAttribute("aria-labelledby", name.id);
    root.classList.add("tfr-guide-skinned");
    // The hero is shorter now. If the scenes have already measured the
    // page, have them measure again so no pinned chapter starts early.
    window.setTimeout(() => { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }, 0);
    return true;
  }

  if (skin()) return;
  const mo = new MutationObserver(() => { if (skin()) mo.disconnect(); });
  mo.observe(root, { childList: true });
  window.setTimeout(() => mo.disconnect(), 30000);
})();
