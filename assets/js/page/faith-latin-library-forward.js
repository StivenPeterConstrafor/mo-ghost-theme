/*
 * /the-faith-received/latin-library/ is now six shelves.
 *
 * The Latin Library was one room holding six traditions at once
 * (Medieval, Roman Catholic, Continental Reformed, Lutheran, Humanism
 * and Law, and 770 Latin works by English writers), named after the
 * language its books happen to be printed in. Every tradition inside it
 * was also offered as a shelf on the home page and on /browse/, and
 * each of those shelves was really this same room with a ?tradition=
 * filter on it. The data owner, 2026-09-22: the Latin Library "has been
 * departed, because everything else has been shifted to other shelfs".
 *
 * So the shelves became rooms of their own, and this page forwards to
 * them RATHER THAN 301ING TO ONE OF THEM. A single redirect target
 * would be wrong for five of the six: the old links that exist in the
 * wild, on /browse/ and in bookmarks, all carry the tradition in the
 * query string, and that is exactly the shelf the reader wanted.
 *
 *   ?tradition=Medieval                          -> /medieval/
 *   ?tradition=Roman%20Catholic                  -> /roman-catholic/
 *   ?tradition=Protestant&denomination=Reformed  -> /continental-reformed/
 *   ?tradition=Protestant&denomination=Lutheran  -> /lutheran/
 *   ?tradition=Humanism%20and%20Law              -> /humanism-and-law/
 *   ?tradition=English%20Divines                 -> /early-english-books/
 *
 * Everything else on the query string (?q=, ?letter=, ?century=, ?page=)
 * is carried across, because the new rooms read the same parameters from
 * the same faith-room.js. A reader who bookmarked page 4 of a search
 * inside the Roman Catholic filter lands on page 4 of that search.
 *
 * A bare /latin-library/ with no tradition has no single right answer,
 * so it goes to /browse/, where all six shelves are named.
 *
 * IN THE HEAD, before the room paints: a forward that fires after render
 * is a whole screen of the wrong page (the same lesson as /bible/).
 */
(function () {
  var SHELF = {
    "medieval": "/the-faith-received/medieval/",
    "roman catholic": "/the-faith-received/roman-catholic/",
    "continental reformed": "/the-faith-received/continental-reformed/",
    "lutheran": "/the-faith-received/lutheran/",
    "humanism and law": "/the-faith-received/humanism-and-law/",
    "english divines": "/the-faith-received/early-english-books/",
  };
  // What the room itself reads. Anything else is ours to drop.
  var CARRY = ["q", "letter", "century", "page", "party", "sort", "view"];

  try {
    var qs = new URLSearchParams(window.location.search);
    var tradition = (qs.get("tradition") || "").trim().toLowerCase();
    var denomination = (qs.get("denomination") || "").trim().toLowerCase();

    // /browse/ has shipped ?tradition=Protestant&denomination=Reformed
    // since the shelf cards were written; the church is the shelf there,
    // not the parent.
    var key = (tradition === "protestant" && denomination) ? denomination : tradition;
    if (key === "reformed") key = "continental reformed";

    var target = SHELF[key] || "/the-faith-received/browse/";

    var keep = new URLSearchParams();
    CARRY.forEach(function (k) {
      var v = qs.get(k);
      if (v) keep.set(k, v);
    });
    var search = keep.toString();

    window.location.replace(target + (search ? "?" + search : "") + window.location.hash);
  } catch (e) {
    window.location.replace("/the-faith-received/browse/");
  }
})();
