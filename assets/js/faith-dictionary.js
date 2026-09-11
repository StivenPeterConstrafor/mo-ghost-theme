/*
 * The Faith Received — Dictionary (DTC), the OWNER'S VIEW (2026-09-11).
 *
 * This replaces the earlier letter-scoped R2-list + translate-on-open
 * design (owner: "i prefer my view on how dtc works"). It is a faithful
 * port of the Vercel site's /dtc app (fr_deploy/dtc.html):
 *
 *   - ONE prebuilt index, v1/dtc/index.json (mo-tfr bucket): 1,900+
 *     articles as [id, frTitle, LETTER, chars, enReady, enTitle] rows plus
 *     a see-also map. Search is instant across ALL letters, French and
 *     English headwords alike, with match highlighting.
 *   - Static per-article JSON, v1/dtc/a/<id>.json: {t, te, fr[], en[],
 *     renvoi?, q?}. French and English lanes are PRE-ALIGNED paragraph by
 *     paragraph — no translation call, no gating, nothing spends.
 *   - Reader: ∥Both / English / Français lanes, section heads detected
 *     from the French numbering (I. / 1° …), a Contents outline, ⟦id|label⟧
 *     internal cross-references, renvoi banners, see-also, prev/next
 *     within the current filter, A−/A+ size, #hash deep links.
 *
 * Data host: the mo-tfr worker (R2-serving; in the site CSP connect-src).
 * MereO-Cloudflare-only law holds — no Blob, no Vercel in this path.
 */
(function () {
  "use strict";

  const root = document.querySelector("[data-faith-dictionary]");
  if (!root) return;

  const BASE = "https://mo-tfr.mo-podcast-feed.workers.dev";

  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  /* ── scoped styles (the /dtc look, container-adapted) ── */
  const css = `
.faith-dictionary{--fdbg:#F7F6F3;--fdfg:#1C1C1A;--fdmut:#5A5A56;--fdacc:#1C1C1A;--fdacc2:#3A3A36;
  --fdsoft:#B0B0AA;--fdbord:#D8D8D3;--fdcard:#FFFFFF;--fdhi:#EFEFEA;
  --fdserif:Georgia,'Times New Roman',serif;--fdsans:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
.faith-dictionary .fd-sband{background:var(--fdcard);border:1px solid var(--fdbord);border-radius:12px 12px 0 0;
  padding:.7rem 1rem;display:flex;gap:.7rem;align-items:center;flex-wrap:wrap}
.faith-dictionary .fd-q{flex:1;min-width:220px;font:1.02rem/1.3 var(--fdserif);padding:.55rem .9rem;
  border:1px solid var(--fdbord);border-radius:10px;background:var(--fdbg);color:var(--fdfg);outline:none}
.faith-dictionary .fd-q:focus{border-color:var(--fdacc);box-shadow:0 0 0 3px rgba(28,28,26,.12)}
.faith-dictionary .fd-count{font:.74rem/1 var(--fdsans);color:var(--fdmut);white-space:nowrap;font-variant-numeric:tabular-nums}
.faith-dictionary .fd-alpha{display:flex;flex-wrap:wrap;gap:2px;max-width:100%}
.faith-dictionary .fd-alpha button{border:0;background:none;color:var(--fdacc2);font:600 .74rem/1 var(--fdsans);
  padding:.34rem .42rem;border-radius:6px;cursor:pointer}
.faith-dictionary .fd-alpha button:hover{background:var(--fdhi)}
.faith-dictionary .fd-alpha button.on{background:var(--fdacc);color:#fff}
.faith-dictionary .fd-alpha button:disabled{color:var(--fdbord);cursor:default;background:none}
.faith-dictionary .fd-main{position:relative;display:grid;grid-template-columns:300px 1fr;
  height:calc(100vh - 230px);min-height:480px;border:1px solid var(--fdbord);border-top:0;
  border-radius:0 0 12px 12px;overflow:hidden;background:var(--fdbg)}
.faith-dictionary .fd-list{border-right:1px solid var(--fdbord);overflow-y:auto;padding:.4rem 0 2rem;
  overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.faith-dictionary .fd-hw{display:block;width:100%;text-align:left;border:0;background:none;cursor:pointer;
  padding:.5rem 1rem .5rem 1.15rem;min-height:44px;font:600 .85rem/1.35 var(--fdsans);color:var(--fdfg);
  border-left:3px solid transparent;-webkit-tap-highlight-color:transparent;transition:background .12s,border-color .12s}
.faith-dictionary .fd-hw:hover,.faith-dictionary .fd-hw:active{background:var(--fdhi)}
.faith-dictionary .fd-hw.on{border-left-color:var(--fdacc);background:var(--fdcard);color:var(--fdacc2)}
.faith-dictionary .fd-hw small{display:block;font:italic 400 .7rem/1.3 var(--fdserif);color:var(--fdmut)}
.faith-dictionary .fd-hw mark{background:rgba(28,28,26,.18);color:inherit;border-radius:2px;padding:0 .04em}
.faith-dictionary .fd-lether{position:sticky;top:0;background:var(--fdbg);font:400 .98rem/1 var(--fdserif);
  color:var(--fdacc);padding:.5rem 1.15rem .28rem;border-bottom:1px solid var(--fdbord);z-index:2}
.faith-dictionary .fd-empty{padding:1.2rem 1.15rem;color:var(--fdmut);font:italic .9rem/1.5 var(--fdserif)}
.faith-dictionary .fd-art{display:flex;flex-direction:column;min-width:0;overflow:hidden;background:var(--fdbg)}
.faith-dictionary .fd-artbar{display:flex;align-items:center;gap:.6rem;padding:.5rem 1.2rem;min-height:2.5rem;
  border-bottom:1px solid transparent;transition:border-color .2s,box-shadow .2s;position:relative;z-index:6}
.faith-dictionary .fd-art.scrolled .fd-artbar{border-bottom-color:var(--fdbord);box-shadow:0 8px 20px -14px rgba(42,28,14,.35)}
.faith-dictionary .fd-cw{font:400 .95rem/1.2 var(--fdserif);color:var(--fdacc2);white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis;min-width:0;opacity:0;transform:translateY(4px);transition:opacity .22s,transform .22s}
.faith-dictionary .fd-art.scrolled .fd-cw{opacity:1;transform:none}
.faith-dictionary .fd-mb{display:none}
.faith-dictionary .fd-artscroll{flex:1;overflow-y:auto;min-height:0;padding:1.1rem clamp(1.1rem,3vw,2.6rem) 3.5rem;
  overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.faith-dictionary .fd-art h1{font:400 1.6rem/1.25 var(--fdserif);color:var(--fdacc2);margin:.2rem 0 .25rem}
.faith-dictionary .fd-frlemma{font:italic .98rem/1.3 var(--fdserif);color:var(--fdmut);margin:-.1rem 0 .4rem}
.faith-dictionary .fd-meta{font:.74rem/1.5 var(--fdsans);color:var(--fdmut);margin:0 0 1rem;display:flex;gap:.7rem;
  align-items:center;flex-wrap:wrap}
.faith-dictionary .fd-lanes{display:inline-flex;border:1px solid var(--fdbord);border-radius:999px;overflow:hidden}
.faith-dictionary .fd-lanes button{border:0;background:none;color:var(--fdmut);font:600 .72rem/1 var(--fdsans);
  padding:.48rem .72rem;cursor:pointer;-webkit-tap-highlight-color:transparent}
.faith-dictionary .fd-lanes button.on{background:var(--fdacc);color:#fff}
.faith-dictionary .fd-lanes button:disabled{opacity:.4;cursor:default}
.faith-dictionary .fd-pend{font:600 .66rem/1 var(--fdsans);color:var(--fdacc);border:1px solid var(--fdsoft);
  border-radius:999px;padding:.24rem .55rem;letter-spacing:.04em}
.faith-dictionary .fd-body{font-size:var(--fdsz,1.02rem);line-height:1.62;font-family:var(--fdserif)}
.faith-dictionary .fd-body p{margin:0 0 .85rem;text-align:justify;hyphens:auto}
.faith-dictionary .fd-pp{display:grid;grid-template-columns:1.12fr 1fr;gap:0 1.5rem;margin:0 0 1rem}
.faith-dictionary .fd-pp .fd-pen{margin:0}
.faith-dictionary .fd-pp .fd-pfr{margin:0;color:rgba(28,28,26,.72);font-size:.9em;border-left:2px solid var(--fdsoft);padding-left:.8rem}
.faith-dictionary .fd-hpair{margin:1.8rem 0 .9rem}
.faith-dictionary .fd-hpair h3{font:400 1.18rem/1.3 var(--fdserif);color:var(--fdacc2);margin:0}
.faith-dictionary .fd-hpair .fd-hsub{font:.66rem/1.5 var(--fdsans);letter-spacing:.09em;text-transform:uppercase;color:var(--fdmut);margin-top:.1rem}
.faith-dictionary .fd-body p.fd-shead{font:400 1.18rem/1.3 var(--fdserif);color:var(--fdacc2);text-align:left;margin:1.8rem 0 .9rem}
.faith-dictionary a.fd-xref{color:var(--fdacc2);text-decoration:none;border-bottom:1px dotted var(--fdsoft)}
.faith-dictionary a.fd-xref:hover{border-bottom-style:solid}
.faith-dictionary .fd-outline{position:relative}
.faith-dictionary .fd-outline>button{border:1px solid var(--fdbord);background:var(--fdcard);color:var(--fdacc2);
  font:600 .72rem/1 var(--fdsans);border-radius:8px;padding:.38rem .62rem;cursor:pointer}
.faith-dictionary .fd-olpop{position:absolute;top:calc(100% + 6px);left:0;z-index:30;background:var(--fdcard);
  border:1px solid var(--fdbord);border-radius:10px;box-shadow:0 18px 50px -18px rgba(42,28,14,.4);
  min-width:260px;max-width:420px;max-height:55vh;overflow:auto;padding:.4rem;display:none}
.faith-dictionary .fd-olpop.on{display:block}
.faith-dictionary .fd-olpop a{display:block;padding:.4rem .6rem;border-radius:6px;font:600 .76rem/1.4 var(--fdsans);
  color:var(--fdfg);text-decoration:none}
.faith-dictionary .fd-olpop a:hover{background:var(--fdhi);color:var(--fdacc2)}
.faith-dictionary .fd-szc button,.faith-dictionary .fd-pnav button{border:1px solid var(--fdbord);background:var(--fdcard);
  color:var(--fdacc2);font:600 .76rem/1 var(--fdsans);border-radius:8px;padding:.34rem .55rem;cursor:pointer}
.faith-dictionary .fd-pnav button:disabled{opacity:.35;cursor:default}
.faith-dictionary .fd-seealso{margin-top:1.8rem;border-top:1px solid var(--fdbord);padding-top:.8rem}
.faith-dictionary .fd-seealso b{font:600 .7rem/1 var(--fdsans);letter-spacing:.07em;text-transform:uppercase;color:var(--fdmut)}
.faith-dictionary .fd-seealso span{display:inline-block;margin:.25rem .5rem .1rem 0;font:600 .78rem/1.4 var(--fdsans);color:var(--fdacc2)}
.faith-dictionary .fd-welcome{color:var(--fdmut);font:italic .98rem/1.7 var(--fdserif);max-width:34rem}
.faith-dictionary .fd-welcome b{color:var(--fdfg);font-style:normal}
.faith-dictionary .fd-srcnote{margin-top:2rem;font:.7rem/1.6 var(--fdsans);color:var(--fdmut);
  border-top:1px solid var(--fdbord);padding-top:.7rem}
@media(max-width:820px){
  .faith-dictionary .fd-main{grid-template-columns:1fr;height:calc(100vh - 190px)}
  .faith-dictionary .fd-list{position:absolute;inset:0;border-right:0}
  .faith-dictionary .fd-art{position:absolute;inset:0;transform:translateX(102%);
    transition:transform .32s cubic-bezier(.25,.1,.25,1);z-index:4;box-shadow:-18px 0 40px -20px rgba(42,28,14,.35)}
  .faith-dictionary.fd-reading .fd-art{transform:translateX(0)}
  .faith-dictionary.fd-reading .fd-list{pointer-events:none}
  .faith-dictionary .fd-mb{display:inline-block;border:0;background:none;color:var(--fdacc2);
    font:600 .92rem/1 var(--fdsans);cursor:pointer;padding:.45rem .5rem .45rem 0;white-space:nowrap}
  .faith-dictionary .fd-cw{opacity:1;transform:none}
  .faith-dictionary .fd-pp{grid-template-columns:1fr}
  .faith-dictionary .fd-pp .fd-pfr{margin-top:.3rem;font-size:.86em}
  .faith-dictionary .fd-q{font-size:16px}
}`;
  const st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  root.innerHTML = `
  <div class="fd-sband">
    <input class="fd-q" id="fdQ" placeholder="Search the dictionary — headword or phrase…" autocomplete="off" spellcheck="false">
    <span class="fd-count" id="fdCount"></span>
    <nav class="fd-alpha" id="fdAlpha" aria-label="Alphabet"></nav>
  </div>
  <div class="fd-main" id="fdMain">
    <div class="fd-list" id="fdList" role="listbox" aria-label="Articles"></div>
    <div class="fd-art" id="fdArt"><div class="fd-artscroll"><div class="fd-inner">
      <div class="fd-welcome">The <b>Dictionnaire de théologie catholique</b> (Vacant, Mangenot, Amann; Paris, 1899–1950)
      is the largest reference work of Catholic theology ever completed — some 1,900 signed articles on every doctrine,
      controversy, council, and theologian, each with its literature. Search a headword in English or French,
      or browse by letter.</div>
    </div></div></div>
  </div>`;

  const $ = (s) => root.querySelector(s);
  let IDX = [], LETTER = null, QY = "", CUR = null, SEEALSO = {}, LANEPREF = null, LISTPOS = 0;
  let SZ = 1.02;
  try { SZ = parseFloat(localStorage.getItem("dtc_sz")) || 1.02; } catch (e) {}
  root.style.setProperty("--fdsz", SZ + "rem");

  function paintAlpha() {
    const has = {}; IDX.forEach((a) => (has[a[2]] = 1));
    $("#fdAlpha").innerHTML = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((L) =>
      `<button data-l="${L}" ${has[L] ? "" : "disabled"} class="${LETTER === L ? "on" : ""}">${L}</button>`).join("");
  }
  function matches() {
    const f = fold(QY.trim());
    let rows = IDX;
    if (LETTER) rows = rows.filter((a) => a[2] === LETTER);
    if (f) rows = rows.filter((a) => fold(a[1]).includes(f) || fold(a[5] || "").includes(f));
    return rows;
  }
  function paintList() {
    const rows = matches();
    $("#fdCount").textContent = `${rows.length} of ${IDX.length} articles`;
    const f = fold(QY.trim());
    let html = "", lastL = "";
    if (!rows.length) { $("#fdList").innerHTML = '<div class="fd-empty">No headword matches. Full-text search of the articles arrives with the English translation.</div>'; return; }
    for (const a of rows.slice(0, 600)) {
      if (!QY && a[2] !== lastL) { lastL = a[2]; html += `<div class="fd-lether">${esc(lastL)}</div>`; }
      const en = a[5] || a[1];
      let t = esc(en);
      if (f) { const i = fold(en).indexOf(f);
        if (i >= 0) t = esc(en.slice(0, i)) + "<mark>" + esc(en.slice(i, i + QY.trim().length)) + "</mark>" + esc(en.slice(i + QY.trim().length)); }
      const frDiff = fold(a[1]) !== fold(en) ? esc(a[1]) + " · " : "";
      html += `<button class="fd-hw${CUR === a[0] ? " on" : ""}" data-id="${esc(a[0])}">${t}<small>${frDiff}${(a[3] / 1000).toFixed(0)}k${a[4] ? " · English ready" : ""}</small></button>`;
    }
    if (rows.length > 600) html += `<div class="fd-empty">…and ${rows.length - 600} more — narrow the search.</div>`;
    $("#fdList").innerHTML = html;
  }

  /* ⟦id|label⟧ → internal links; literal <em>/<i> pairs re-admitted as italics */
  function tok(p) {
    return esc(p).replace(/⟦([a-z0-9-]+)\|([^⟧]+)⟧/g, (m, id, lab) => `<a class="fd-xref" data-id="${id}" href="#${id}">${lab}</a>`)
      .replace(/&lt;(\/?)(?:em|i)&gt;/g, "<$1i>");
  }
  function detok(p) { return String(p ?? "").replace(/<\/?(?:em|i)>/g, ""); }
  function cell(p) { const t = String(p ?? "").trim(); return t ? tok(t) : '<span style="color:var(--fdbord)">—</span>'; }
  const isHead = (p) => { const t = p.replace(/⟦[^⟧]+⟧/g, "").trim();
    return t.length < 170 && /^([IVXLC]+|\d+°?)[.)—°]?\s+\S/.test(t) && t.length < 150; };

  function renderArt(d) {
    const FR = Array.isArray(d.fr) ? d.fr : String(d.fr || "").split(/\n\n+/);
    const EN = Array.isArray(d.en) ? d.en : null;
    const hasEn = EN && EN.length === FR.length;
    const lane = hasEn ? "both" : "fr";
    const frLen = FR.join(" ").length;
    const heads = FR.map((f, i) => (isHead(f) ? i : -1)).filter((i) => i >= 0);
    const paint = (l) => {
      let body = "";
      if (l === "both" && hasEn) {
        body = FR.map((f, i) => isHead(f)
          ? `<div class="fd-hpair" id="fdSec${i}"><h3>${tok(EN[i])}</h3><div class="fd-hsub">${tok(f)}</div></div>`
          : `<div class="fd-pp" id="fdSec${i}"><p class="fd-pen">${cell(EN[i])}</p><p class="fd-pfr">${cell(f)}</p></div>`).join("");
      } else if (l === "en" && hasEn) {
        body = EN.map((p, i) => `<p id="fdSec${i}"${isHead(FR[i]) ? ' class="fd-shead"' : ""}>${tok(p)}</p>`).join("");
      } else {
        body = FR.map((p, i) => `<p id="fdSec${i}"${isHead(p) ? ' class="fd-shead"' : ""}>${tok(p)}</p>`).join("");
      }
      const rows = matches(); const ci = rows.findIndex((a) => a[0] === d.id);
      const prev = ci > 0 ? rows[ci - 1] : null, next = ci >= 0 && ci < rows.length - 1 ? rows[ci + 1] : null;
      const olHtml = heads.length >= 3 ? `<span class="fd-outline" id="fdOlWrap"><button id="fdOlBtn" aria-haspopup="true">Contents ▾</button>
        <div class="fd-olpop" id="fdOlPop">${heads.map((i) => `<a href="#" data-sec="${i}">${esc(detok((hasEn ? EN[i] : FR[i]).replace(/⟦[^|]+\|([^⟧]+)⟧/g, "$1")).slice(0, 90))}</a>`).join("")}</div></span>` : "";
      $("#fdArt").innerHTML = `<div class="fd-artbar"><button class="fd-mb" id="fdBack">‹ Dictionary</button><span class="fd-cw">${esc(d.te && d.te !== d.t ? d.te : d.t)}</span></div>
      <div class="fd-artscroll"><div class="fd-inner">
        <h1>${esc(d.te && d.te !== d.t ? d.te : d.t)}</h1>
        ${d.te && d.te !== d.t ? `<div class="fd-frlemma">${esc(d.t)}</div>` : ""}
        <div class="fd-meta">
          <span class="fd-pnav"><button id="fdPrev" title="Previous article" ${prev ? "" : "disabled"}>‹</button><button id="fdNext" title="Next article" ${next ? "" : "disabled"}>›</button></span>
          <span class="fd-lanes">
            <button data-l="both" class="${l === "both" ? "on" : ""}" ${hasEn ? "" : "disabled"}>∥ Both</button>
            <button data-l="en" class="${l === "en" ? "on" : ""}" ${hasEn ? "" : "disabled"}>English</button>
            <button data-l="fr" class="${l === "fr" ? "on" : ""}">Français</button>
          </span>
          ${olHtml}
          <span class="fd-szc"><button id="fdSzDn" title="Smaller text">A−</button><button id="fdSzUp" title="Larger text">A+</button></span>
          ${hasEn ? "" : '<span class="fd-pend">ENGLISH TRANSLATION IN PROGRESS</span>'}
          ${d.q === "ocr" ? '<span class="fd-pend" title="Wikisource transcription not yet proofread">RAW OCR TEXT</span>' : ""}
          <span>${(frLen / 1000).toFixed(0)}k chars</span>
        </div>
        ${d.renvoi ? `<div class="fd-welcome">A cross-reference entry — it points to <a class="fd-xref" data-id="${esc(d.renvoi)}" href="#${esc(d.renvoi)}"><b>the main article</b></a>.</div>` : ""}
        <div class="fd-body">${body}</div>
        ${(SEEALSO[d.id] || []).length ? `<div class="fd-seealso"><b>Referenced as</b><br>${SEEALSO[d.id].map((x) => `<span>${esc(x)}</span>`).join(" ")}</div>` : ""}
        <div class="fd-srcnote">Text: fr.wikisource.org, <i>Dictionnaire de théologie catholique</i> (public domain). Part of the Roman Catholic shelf of The Faith Received.</div>
      </div></div>`;
      $("#fdArt").querySelectorAll(".fd-lanes button").forEach((b) => (b.onclick = () => { if (!b.disabled) { LANEPREF = b.dataset.l; paint(b.dataset.l); } }));
      $("#fdArt").querySelectorAll("a.fd-xref").forEach((a) => (a.onclick = (e) => { e.preventDefault(); openArt(a.dataset.id); }));
      const pv = $("#fdPrev"), nx = $("#fdNext");
      if (pv && prev) pv.onclick = () => openArt(prev[0]);
      if (nx && next) nx.onclick = () => openArt(next[0]);
      const ob = $("#fdOlBtn");
      if (ob) { ob.onclick = (e) => { e.stopPropagation(); $("#fdOlPop").classList.toggle("on"); };
        $("#fdOlPop").querySelectorAll("a").forEach((a) => (a.onclick = (e) => { e.preventDefault();
          const t = root.querySelector("#fdSec" + a.dataset.sec); if (t) t.scrollIntoView({ block: "start", behavior: "smooth" });
          $("#fdOlPop").classList.remove("on"); })); }
      const setSz = (v) => { SZ = Math.max(0.86, Math.min(1.3, v)); try { localStorage.setItem("dtc_sz", SZ); } catch (e) {}
        root.style.setProperty("--fdsz", SZ + "rem"); };
      $("#fdSzDn").onclick = () => setSz(SZ - 0.06); $("#fdSzUp").onclick = () => setSz(SZ + 0.06);
      const back = $("#fdBack"); if (back) back.onclick = closeArt;
      const asc = $("#fdArt .fd-artscroll");
      asc.onscroll = () => { $("#fdArt").classList.toggle("scrolled", asc.scrollTop > 10); };
      $("#fdArt").classList.remove("scrolled");
      asc.scrollTop = 0;
    };
    paint(LANEPREF && (LANEPREF === "fr" || hasEn) ? LANEPREF : lane);
  }

  function openArt(id, push) {
    CUR = id; paintList();
    root.classList.add("fd-reading");
    $("#fdArt").innerHTML = '<div class="fd-artscroll"><div class="fd-inner"><div class="fd-welcome">Loading…</div></div></div>';
    fetch(BASE + "/v1/dtc/a/" + encodeURIComponent(id) + ".json").then((r) => r.json()).then((d) => {
      d.id = id; renderArt(d);
      document.title = d.t + " — Dictionnaire de Théologie Catholique";
      if (push !== false) history.replaceState(null, "", "#" + encodeURIComponent(id));
    }).catch(() => { $("#fdArt").innerHTML = '<div class="fd-artscroll"><div class="fd-inner"><div class="fd-welcome">Could not load this article.</div></div></div>'; });
  }
  function closeArt() {
    root.classList.remove("fd-reading"); CUR = null;
    history.replaceState(null, "", location.pathname);
    document.title = "Dictionary — The Faith Received — Mere Orthodoxy";
    requestAnimationFrame(() => { $("#fdList").scrollTop = LISTPOS; paintList(); });
  }

  $("#fdList").addEventListener("click", (e) => { const b = e.target.closest(".fd-hw");
    if (b) { LISTPOS = $("#fdList").scrollTop; openArt(b.dataset.id); } });
  $("#fdAlpha").addEventListener("click", (e) => { const b = e.target.closest("button[data-l]"); if (!b || b.disabled) return;
    LETTER = (LETTER === b.dataset.l ? null : b.dataset.l); paintAlpha(); paintList(); });
  $("#fdQ").addEventListener("input", () => { QY = $("#fdQ").value; paintList(); });
  document.addEventListener("click", (e) => { const pp = root.querySelector("#fdOlPop");
    if (pp && pp.classList.contains("on") && !e.target.closest(".fd-outline")) pp.classList.remove("on"); });
  document.addEventListener("keydown", (e) => {
    const inInput = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
    if ((e.key === "/" && !inInput) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) { e.preventDefault(); $("#fdQ").focus(); $("#fdQ").select(); return; }
    if (inInput) { if (e.key === "Enter") { const f = root.querySelector(".fd-hw"); if (f) { f.click(); $("#fdQ").blur(); } }
      if (e.key === "Escape") $("#fdQ").blur(); return; }
    if (e.key === "[") { const b = $("#fdPrev"); if (b) b.click(); }
    if (e.key === "]") { const b = $("#fdNext"); if (b) b.click(); }
  });

  fetch(BASE + "/v1/dtc/index.json").then((r) => r.json()).then((d) => {
    IDX = d.articles || []; SEEALSO = d.seealso || {};
    paintAlpha(); paintList();
    const h = decodeURIComponent(location.hash.slice(1));
    if (h) openArt(h, false);
    // legacy deep links from the previous design used ?e=<id>
    const legacy = new URLSearchParams(location.search).get("e");
    if (!h && legacy) openArt(legacy, false);
  }).catch(() => { $("#fdList").innerHTML = '<div class="fd-empty">The dictionary index could not load.</div>'; });
})();
