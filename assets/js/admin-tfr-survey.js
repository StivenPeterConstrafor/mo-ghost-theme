/*
 * TFR Survey Results — /admin/tfr-survey/.
 *
 * Reads GET /tfr-survey/results on mo-admin, which counts one windowed
 * SELECT and hands back a tally per question. Auth is
 * window.MOAuth.fetch, the Ghost member JWT the rest of the board uses;
 * the route is claimed by the "tfr-survey" grant.
 *
 * Every number on this page is a count over a group. The table behind
 * it has no name, address or member id in it, which is why the open
 * answers can be printed here as written.
 *
 * Page-template script: runs BEFORE site.min.js. window.MOAuth comes
 * from boot.min.js, which is in the head, so it is there.
 */
(function () {
  const root = document.querySelector("[data-tfr-survey]");
  if (!root) return;

  const adminUrl = (root.getAttribute("data-admin-url") || "").replace(/\/$/, "");
  const rangeEl = root.querySelector("[data-survey-range]");
  const statusEl = root.querySelector("[data-survey-status]");
  const totalsEl = root.querySelector("[data-survey-totals]");

  const PANELS = {
    liking: root.querySelector("[data-survey-liking]"),
    usefulness: root.querySelector("[data-survey-usefulness]"),
    uses: root.querySelector("[data-survey-uses]"),
    tradition: root.querySelector("[data-survey-tradition]"),
    denomination: root.querySelector("[data-survey-denomination]"),
    role: root.querySelector("[data-survey-role]"),
    age: root.querySelector("[data-survey-age]"),
    gender: root.querySelector("[data-survey-gender]"),
    comments: root.querySelector("[data-survey-comments]"),
    memberStatus: root.querySelector("[data-survey-status-breakdown]"),
    pages: root.querySelector("[data-survey-pages]"),
  };

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function num(n) {
    return Number(n || 0).toLocaleString();
  }

  function when(iso) {
    if (!iso) return "";
    // SQLite's datetime('now') has no zone marker; it is UTC.
    const d = new Date(/[Zz+]|\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`);
    if (isNaN(d)) return String(iso);
    return d.toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  }

  function empty(target, text) {
    target.textContent = "";
    target.appendChild(el("p", "admin-tfr-section-note", text));
  }

  /*
   * A tally as bars. Widths are drawn against the largest row so the
   * shape of the answer is readable; the number beside each bar is the
   * count and the share of everyone who answered THAT question, not of
   * everyone who took the survey. A multi-select whose parts were
   * divided by the response count would read as though half the people
   * had not answered it.
   */
  function bars(target, rows, base) {
    target.textContent = "";
    if (!rows || !rows.length) { empty(target, "No answers yet."); return; }
    const max = rows.reduce((m, r) => Math.max(m, Number(r.n) || 0), 0);
    const list = el("ol", "admin-tfr-bars");
    rows.forEach((r) => {
      const v = Number(r.n) || 0;
      const li = el("li", "admin-tfr-bar-row");
      const label = el("span", "admin-tfr-bar-label", r.value);
      label.title = label.textContent;
      const bar = el("span", "admin-tfr-bar");
      const fill = el("span", "admin-tfr-bar-fill");
      fill.style.width = `${max > 0 ? Math.round((v / max) * 100) : 0}%`;
      bar.appendChild(fill);
      const pct = base > 0 ? ` (${Math.round((v / base) * 100)}%)` : "";
      const value = el("span", "admin-tfr-bar-value", `${num(v)}${pct}`);
      li.appendChild(label);
      li.appendChild(bar);
      li.appendChild(value);
      list.appendChild(li);
    });
    target.appendChild(list);
  }

  /* A 1-5 scale: the average, then the five counts as bars. */
  function scale(target, data) {
    target.textContent = "";
    if (!data || !data.n) { empty(target, "No answers yet."); return; }
    const head = el("div", "admin-tfr-totals");
    const card = el("div", "admin-tfr-total");
    card.appendChild(el("span", "admin-tfr-total-value", data.avg == null ? "—" : data.avg.toFixed(2)));
    card.appendChild(el("span", "admin-tfr-total-label", `Average of ${num(data.n)} answers`));
    head.appendChild(card);
    target.appendChild(head);

    const rows = [1, 2, 3, 4, 5].map((k) => ({ value: String(k), n: (data.counts && data.counts[k]) || 0 }));
    const box = el("div");
    bars(box, rows, data.n);
    target.appendChild(box);
  }

  function comments(target, rows, cap) {
    target.textContent = "";
    if (!rows || !rows.length) { empty(target, "Nobody has written anything yet."); return; }
    const list = el("ol", "admin-tfr-bars");
    rows.forEach((r) => {
      const li = el("li", "admin-tfr-bar-row");
      // textContent, never innerHTML: this is 2000 characters a stranger
      // typed into a public form.
      const text = el("p", null, r.likes);
      text.style.margin = "0";
      text.style.whiteSpace = "pre-wrap";
      const stamp = el("span", "admin-tfr-bar-value", when(r.created_at));
      li.style.alignItems = "flex-start";
      li.appendChild(text);
      li.appendChild(stamp);
      list.appendChild(li);
    });
    target.appendChild(list);
    if (rows.length >= cap) {
      target.appendChild(el(
        "p", "admin-tfr-section-note",
        `Showing the most recent ${num(cap)}. Narrow the window to see older ones.`,
      ));
    }
  }

  function draw(d) {
    totalsEl.textContent = "";
    [
      ["Responses", num(d.total)],
      ["Liked it", d.liking.avg == null ? "—" : `${d.liking.avg.toFixed(2)} / 5`],
      ["Will be useful", d.usefulness.avg == null ? "—" : `${d.usefulness.avg.toFixed(2)} / 5`],
      ["Wrote something", num((d.comments || []).length)],
    ].forEach((pair) => {
      const card = el("div", "admin-tfr-total");
      card.appendChild(el("span", "admin-tfr-total-value", pair[1]));
      card.appendChild(el("span", "admin-tfr-total-label", pair[0]));
      totalsEl.appendChild(card);
    });
    totalsEl.hidden = false;

    scale(PANELS.liking, d.liking);
    scale(PANELS.usefulness, d.usefulness);
    bars(PANELS.uses, d.uses, d.total);
    bars(PANELS.tradition, d.tradition, d.total);
    // Base is the Protestant count, not the response count: this
    // question was only put to them. Dividing by everyone would read as
    // though most Protestants had skipped it.
    bars(PANELS.denomination, d.denomination, d.protestants || 0);
    const dnote = root.querySelector("[data-survey-denomination-note]");
    if (dnote) {
      dnote.textContent = `Asked only of readers who said Protestant${
        d.protestants ? ` — ${num(d.protestants)} of ${num(d.total)} responses` : ""
      }. Percentages are of that group. Same nine options as the welcome survey at /welcome/.`;
    }
    bars(PANELS.role, d.churchRole, d.total);
    bars(PANELS.age, d.ageRange, d.total);
    bars(PANELS.gender, d.gender, d.total);
    comments(PANELS.comments, d.comments, d.commentCap);
    bars(PANELS.memberStatus, d.memberStatus, d.total);
    bars(PANELS.pages, d.pages, d.total);

    // A dashboard has to say how old it is. A quiet week and a
    // collector that stopped writing look the same otherwise.
    let line = d.total
      ? `${num(d.total)} responses. Most recent ${when(d.latest)}.`
      : "No responses in this window.";
    if (d.truncated) {
      line += ` Capped at ${num(d.rowCap)} rows — narrow the window for an exact count.`;
    }
    setStatus(line);
  }

  function load() {
    const days = rangeEl ? rangeEl.value : "0";
    setStatus("Loading…");
    const url = `${adminUrl}/tfr-survey/results?days=${encodeURIComponent(days)}`;
    const go = window.MOAuth && window.MOAuth.fetch ? window.MOAuth.fetch(url) : fetch(url);
    go
      .then((r) => r.json().catch(() => ({ ok: false })))
      .then((d) => {
        if (!d || !d.ok) {
          setStatus((d && d.error) || "Could not load the survey results.");
          return;
        }
        draw(d);
      })
      .catch(() => setStatus("Could not load the survey results."));
  }

  if (rangeEl) rangeEl.addEventListener("change", load);
  load();
}());
