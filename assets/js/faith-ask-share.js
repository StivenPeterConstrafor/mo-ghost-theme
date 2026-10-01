/*
 * The Faith Received — a shared Ask answer, at /the-faith-received/ask/?share=<id>.
 *
 * Ian, 2026-10-01: Share in Ask failed with "The string did not match the
 * expected pattern". The workspace posted to the corpus owner's Vercel route,
 * which our domain does not have. Shares now live on the Ask worker
 * (mo-tfr-ask-dev POST /v1/share, GET /v1/share/<id>) and are read here, by
 * anyone: a link someone chose to send is public by intent, so it shows to
 * signed-out readers too, in place of the sign-up band.
 *
 * Rendered as text. The answer is Markdown that left a member's browser, so
 * nothing in it reaches the page as HTML: paragraphs, headings, lists, quotes,
 * bold and italic are rebuilt from escaped text, citations ([slug/p12]) link
 * into our reader, and an ordinary link is kept only when it points into
 * mereorthodoxy.com; any other becomes plain words.
 */
(function () {
  const id = new URLSearchParams(location.search).get("share");
  if (!id) return;
  const main = document.querySelector("main.faith-ask-page");
  if (!main) return;
  const API = "https://mo-tfr-ask-dev.mo-podcast-feed.workers.dev/v1/share/";
  document.documentElement.classList.add("faith-ask-shared");

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
  const readHref = (slug, page) => `/the-faith-received/read/?w=${encodeURIComponent(slug)}${page ? `&p=${encodeURIComponent(page)}` : ""}`;
  function ownLink(href) {
    try {
      const u = new URL(href, location.origin);
      return u.origin === location.origin || u.hostname === "mereorthodoxy.com" ? u.pathname + u.search + u.hash : "";
    } catch (_) { return ""; }
  }

  function inline(text, sources) {
    const held = [];
    const hold = (html) => `\uE000${held.push(html) - 1}\uE001`;
    let out = String(text)
      .replace(/\[([^\]\n]+)\]\(([^\s)]+)\)/g, (_, label, href) => {
        const u = ownLink(href);
        return u ? hold(`<a href="${esc(u)}">${esc(label)}</a>`) : hold(esc(label));
      })
      .replace(/\[([a-zA-Z0-9_.-]+)\/p([^\]\s]+)\]/g, (_, slug, page) => {
        const s = sources.find((x) => x.slug === slug && String(x.page) === String(page));
        const label = s && s.cit ? s.cit : `p. ${page}`;
        return hold(`<a class="fra-cite" href="${esc(readHref(slug, page))}">${esc(label)}</a>`);
      });
    out = esc(out)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return out.replace(/\uE000(\d+)\uE001/g, (_, n) => held[Number(n)]);
  }

  function markdown(text, sources) {
    const lines = String(text || "").split("\n");
    const out = [];
    let list = "";
    let para = [];
    const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(" "), sources)}</p>`); para = []; } };
    const close = () => { if (list) { out.push(`</${list}>`); list = ""; } };
    for (const l of lines) {
      const h = /^(#{1,6})\s+(.+)$/.exec(l);
      const li = /^\s*([-*]|\d+[.)])\s+(.+)$/.exec(l);
      const q = /^ {0,3}>\s?(.*)$/.exec(l);
      if (h) { flush(); close(); out.push(`<h3>${inline(h[2], sources)}</h3>`); }
      else if (li) {
        flush();
        const kind = /\d/.test(li[1]) ? "ol" : "ul";
        if (list !== kind) { close(); list = kind; out.push(`<${kind}>`); }
        out.push(`<li>${inline(li[2], sources)}</li>`);
      }
      else if (q) { flush(); close(); out.push(`<blockquote><p>${inline(q[1], sources)}</p></blockquote>`); }
      else if (!l.trim() || /^\s*[-*_]{3,}\s*$/.test(l)) { flush(); close(); }
      else { close(); para.push(l); }
    }
    flush(); close();
    return out.join("");
  }

  function sourceList(src) {
    const seen = new Set();
    const rows = (src || []).filter((s) => {
      const k = `${s.slug}|${s.page}`;
      if (!s.slug || seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 40);
    if (!rows.length) return "";
    return `<section class="faith-share-sources"><h2>Sources</h2><ol>${rows.map((s) =>
      `<li><a href="${esc(readHref(s.slug, s.page))}"><span class="faith-share-src-title">${esc(s.title || s.slug)}</span>`
      + `${s.author ? `<span class="faith-share-src-author">${esc(s.author)}</span>` : ""}`
      + `${s.cit ? `<span class="faith-share-src-cit">${esc(s.cit)}</span>` : ""}</a></li>`).join("")}</ol></section>`;
  }

  const box = document.createElement("article");
  box.className = "faith-share container";
  box.innerHTML = '<p class="faith-share-loading">Loading the shared answer&hellip;</p>';
  main.prepend(box);

  fetch(`${API}${encodeURIComponent(id)}`)
    .then((r) => r.json().catch(() => ({ ok: false })))
    .then((d) => {
      if (!d || !d.ok) throw new Error((d && d.error) || "This shared answer could not be found.");
      const when = d.created_at
        ? new Date(`${String(d.created_at).replace(" ", "T")}Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : "";
      document.title = `${d.q} · Ask the Library · The Faith Received`;
      box.innerHTML = `<p class="faith-share-kicker">Shared from Ask the Library${when ? ` · ${esc(when)}` : ""}</p>`
        + `<h1 class="faith-share-q">${esc(d.q)}</h1>`
        + `<div class="fra-answer faith-share-a">${markdown(d.a, d.src || [])}</div>${sourceList(d.src)}`
        + '<p class="faith-share-note">Written by Ask the Library from the works in The Faith Received. '
        + "Read the sources before relying on it.</p>"
        + '<p class="faith-share-actions"><a class="fr-btn" href="/the-faith-received/ask/">Ask your own question</a>'
        + '<a class="fr-btn" href="/the-faith-received/curated/">Browse the library</a></p>';
    })
    .catch((e) => {
      box.innerHTML = `<h1 class="faith-share-q">Shared answer</h1><p>${esc(e.message)}</p>`
        + '<p class="faith-share-actions"><a class="fr-btn" href="/the-faith-received/ask/">Ask the Library</a></p>';
    });
}());
