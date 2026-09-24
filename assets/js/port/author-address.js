/*
 * author-address.js — this site's author address, resolved for the ported room.
 *
 * Links arrive here in every shape the site and the port write:
 *   ?a=richardbaxter             (folded, Ian's rooms and shelves)
 *   ?a=augustine-of-hippo        (the room's slug)
 *   ?a=Robinson, John, 1575?-1625  (the reader's own author link: the
 *                                 catalogue name, inverted, with dates)
 *   ?a=thomas-a-kempis           (the key of an author with no room)
 * The corpus site's research shell deep-links by slug hash (#richard-baxter)
 * and resolves the shelf itself, so this finds the room and sets the hash.
 *
 * Ian, 2026-09-24: an author link at the top of a work opened "This author
 * could not load", because only an exact fold was tried and the reader
 * sends the catalogue's inverted, dated name. Now, against the nine shelf
 * rosters on the library worker:
 *   1. an exact fold of the name, the room slug or the room name;
 *   2. the same name with dates and qualifiers dropped and an inverted
 *      "Surname, Forename" put back in order, matched on its words in any
 *      order, the birth year (y) choosing between namesakes.
 *
 * Ian, later the same day: "EVERY author needs a page without exception."
 * Rooms exist only for authors with mined works, so Boethius, Thomas a
 * Kempis, Tyndale and thousands of EEBO writers had none, and this used
 * to send them to All Works searched for the name. No longer:
 *   3. the author directory (assets/data/faith-received/authors/names.json,
 *      built by scripts/build-author-directory.mjs) knows every spelling
 *      any catalogue uses. It names a room, or one of our own author keys,
 *      which faith-author-page.js draws as a page;
 *   4. a name nobody has written is handed to faith-author-page.js too,
 *      which says so and offers the nearest authors. Never a search bounce.
 *
 * The name rules are exported as window.MOAuthorAddress so the build
 * script and the page run the very same functions.
 * An external file because the site's CSP forbids inline scripts.
 */
(function (root) {
  var fold = function (s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, ""); };
  var DATE_PART = /^(?:b\.|d\.|ca?\.|fl\.|active|born|died)?\s*\d{3,4}\??(?:\s*(?:[-–]|or)\s*(?:ca?\.\s*)?\d{0,4}\??)*\.?$/i;
  var years = function (s) { return (String(s || "").match(/\d{3,4}/g) || []).map(Number); };
  // The name as a reader would say it: dates and qualifiers out, an
  // inverted catalogue name put back in order.
  var plain = function (raw) {
    var s = String(raw || "").replace(/\[|\]/g, "").replace(/\([^)]*\)/g, " ").trim();
    if (s.indexOf(",") < 0) return s.replace(/\b(?:b\.|d\.|ca?\.|fl\.)?\s*\d{3,4}\??(?:\s*[-–]\s*\d{0,4}\??)?/g, " ").replace(/\s+/g, " ").trim();
    var parts = s.split(",").map(function (p) { return p.trim(); }).filter(function (p) { return p && !DATE_PART.test(p); });
    // "Raleigh, Sir, Walter": the title goes before the forename.
    if (parts.length >= 3 && /^(?:sir|dame|lady|lord)$/i.test(parts[1]) && /^\p{Lu}/u.test(parts[2])) return parts[1] + " " + parts[2] + " " + parts[0];
    if (parts.length >= 2 && /^\p{Lu}/u.test(parts[1]) && parts[1].split(/\s+/).length <= 3) return parts[1] + " " + parts[0];
    if (parts.length >= 2 && /^(?:à|a|de|van|von|of|le|la|du|des)\b/i.test(parts[1]) && parts[1].split(/\s+/).length <= 3) return parts[0] + " " + parts[1];
    return parts.join(" ");
  };
  var words = function (s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z]+/).filter(function (w) { return w.length > 1; }).sort().join(" "); };
  var slug = function (s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); };
  var DIRECTORY = "/assets/data/faith-received/authors/";
  // The directory's content hash, rewritten by build-author-directory.mjs.
  // Ghost serves /assets/** for a year and the theme's own ?v= does not
  // change when only data does, so the data carries its own version.
  var DATA_V = "c228649dec91";
  var dataUrl = function (f) { return DIRECTORY + f + "?d=" + DATA_V; };
  var api = { fold: fold, plain: plain, words: words, years: years, slug: slug, DATE_PART: DATE_PART, DIRECTORY: DIRECTORY, dataUrl: dataUrl };
  root.MOAuthorAddress = api;
  if (typeof location === "undefined" || typeof document === "undefined") return;

  try {
    var q = new URLSearchParams(location.search);
    var a = q.get("a");
    if (!a || location.hash) return;
    var ys = years(a);
    var pl = plain(a);
    var wantFolds = [fold(a), fold(pl)];
    var wantWords = words(pl);
    // The page script waits on this; it resolves to the directory target
    // ("@key", "@@base") or "" for a name the library does not know.
    var miss = null;
    api.miss = new Promise(function (res) { miss = res; });
    var toDirectory = function () {
      document.documentElement.classList.add("fr-author-own");
      fetch(dataUrl("names.json")).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (d) {
        var names = (d && d.names) || {};
        var t = names[fold(a)] || names[fold(pl)] || names[fold(slug(pl))] || "";
        if (t && t.charAt(0) !== "@") {
          // A catalogue spelling of a roomed author: open the room.
          document.documentElement.classList.remove("fr-author-own");
          location.hash = t.split("/")[1];
          miss("");
          return;
        }
        miss(t || "?");
      });
    };
    var B = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
    var NS = ["pl", "gf", "po", "ed", "md", "rc", "lu", "rf", "hl"];
    Promise.all(NS.map(function (ns) {
      return fetch(B + "/v1/bible/" + ns + "/rooms/index.json").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    })).then(function (all) {
      var byWords = [];
      for (var i = 0; i < all.length; i++) {
        var d = all[i];
        if (!d || !d.authors) continue;
        for (var j = 0; j < d.authors.length; j++) {
          var e = d.authors[j];
          if (wantFolds.indexOf(fold(e.s)) >= 0 || wantFolds.indexOf(fold(e.a)) >= 0) { location.hash = e.s; return; }
          if (wantWords && words(e.a) === wantWords) byWords.push(e);
        }
      }
      if (byWords.length) {
        // Namesakes: the one born nearest a year the link carries.
        var best = byWords[0];
        if (byWords.length > 1 && ys.length) {
          var gap = function (e) { return e.y ? Math.min.apply(null, ys.map(function (y) { return Math.abs(y - e.y); })) : 9999; };
          byWords.forEach(function (e) { if (gap(e) < gap(best)) best = e; });
        }
        // A dated link to a namesake the rosters do not hold (the two
        // John Owens) must not land in the wrong room: ask the directory.
        if (!(ys.length && best.y && Math.abs(ys[0] - best.y) > 20 && !(ys[0] > best.y && ys[0] - best.y <= 95))) {
          location.hash = best.s;
          return;
        }
      }
      toDirectory();
    });
  } catch (e) { /* the shell's own router still runs */ }
})(typeof window === "undefined" ? globalThis : window);
