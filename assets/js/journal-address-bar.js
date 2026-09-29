/*
 * "Confirm Address For Journal" — a slim terracotta bar across the foot
 * of every main-site page for signed-in paid members, with one tab on
 * it that links to /manage/, where the mailing address is edited.
 *
 * The same bar as the TFR reader survey (faith-survey.js), minus the
 * panel: the tab is a plain link and nothing opens. It never appears
 * under /the-faith-received/, which has its own bar in the same place.
 *
 * Paid means Ghost status "paid" or "comped"; comped members receive
 * the print journal too. Free members and signed-out readers get
 * nothing. The member attributes come from <body> in default.hbs.
 */
(function () {
  const path = String(window.location.pathname || "/").toLowerCase();
  if (path.indexOf("/the-faith-received/") === 0) return;
  // The page the tab points at does not need to point at itself.
  if (path.replace(/\/+$/, "") === "/manage") return;

  const { body } = document;
  if (!body || !body.getAttribute("data-member-email")) return;
  const status = body.getAttribute("data-member-status") || "";
  if (status !== "paid" && status !== "comped") return;

  const root = document.createElement("div");
  root.className = "journal-address";
  root.innerHTML =
    `<div class="journal-address-bar">` +
      `<a class="journal-address-tab" href="/manage/">Confirm Address For Journal</a>` +
    `</div>`;
  body.appendChild(root);
  body.classList.add("has-journal-address");
})();
