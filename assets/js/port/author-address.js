/*
 * author-address.js — this site's author address, resolved for the ported room.
 *
 * Links arrive here in every shape the site and the port write:
 *   ?a=richardbaxter             (folded, Ian's rooms and shelves)
 *   ?a=augustine-of-hippo        (the room's slug)
 *   ?a=Robinson, John, 1575?-1625  (the reader's own author link: the
 *                                 catalogue name, inverted, with dates)
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
 *      order, the birth year (y) choosing between namesakes;
 * and an author with no room is sent to the whole library searched for
 * that name, never to an error page.
 * An external file because the site's CSP forbids inline scripts.
 */
(function () {
  try {
    var q = new URLSearchParams(location.search);
    var a = q.get("a");
    if (!a || location.hash) return;
    var fold = function (s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, ""); };
    var DATE_PART = /^(?:b\.|d\.|ca?\.|fl\.|active|born|died)?\s*\d{3,4}\??(?:\s*[-–]\s*(?:ca?\.\s*)?\d{0,4}\??)?\.?$/i;
    var years = (String(a).match(/\d{3,4}/g) || []).map(Number);
    // The name as a reader would say it: dates and qualifiers out, an
    // inverted catalogue name put back in order.
    var plain = (function (raw) {
      var s = String(raw).replace(/\[|\]/g, "").replace(/\([^)]*\)/g, " ").trim();
      if (s.indexOf(",") < 0) return s.replace(/\b(?:b\.|d\.|ca?\.|fl\.)?\s*\d{3,4}\??(?:\s*[-–]\s*\d{0,4}\??)?/g, " ").replace(/\s+/g, " ").trim();
      var parts = s.split(",").map(function (p) { return p.trim(); }).filter(function (p) { return p && !DATE_PART.test(p); });
      if (parts.length >= 2 && /^\p{Lu}/u.test(parts[1]) && parts[1].split(/\s+/).length <= 3) return parts[1] + " " + parts[0];
      return parts.join(" ");
    })(a);
    var words = function (s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z]+/).filter(function (w) { return w.length > 1; }).sort().join(" "); };
    var wantFolds = [fold(a), fold(plain)];
    var wantWords = words(plain);
    var B = "https://mo-tfr-library.mo-podcast-feed.workers.dev";
    var NS = ["pl", "gf", "po", "ed", "md", "rc", "lu", "rf", "hl"];
    Promise.all(NS.map(function (ns) {
      return fetch(B + "/v1/bible/" + ns + "/rooms/index.json").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    })).then(function (all) {
      var loaded = false;
      var byWords = [];
      for (var i = 0; i < all.length; i++) {
        var d = all[i];
        if (!d || !d.authors) continue;
        loaded = true;
        for (var j = 0; j < d.authors.length; j++) {
          var e = d.authors[j];
          if (wantFolds.indexOf(fold(e.s)) >= 0 || wantFolds.indexOf(fold(e.a)) >= 0) { location.hash = e.s; return; }
          if (wantWords && words(e.a) === wantWords) byWords.push(e);
        }
      }
      if (byWords.length) {
        // Namesakes: the one born nearest a year the link carries.
        var best = byWords[0];
        if (byWords.length > 1 && years.length) {
          var gap = function (e) { return e.y ? Math.min.apply(null, years.map(function (y) { return Math.abs(y - e.y); })) : 9999; };
          byWords.forEach(function (e) { if (gap(e) < gap(best)) best = e; });
        }
        location.hash = best.s;
        return;
      }
      // No room for this author. If the rosters loaded, the library has
      // their works but no room: search the whole library for the name.
      // If they did not load, keep the old behaviour so Retry can work.
      if (loaded && plain) {
        location.replace("/the-faith-received/all-works/?collection=all&q=" + encodeURIComponent(plain));
        return;
      }
      location.hash = a;
    });
  } catch (e) { /* the shell's own router still runs */ }
})();
