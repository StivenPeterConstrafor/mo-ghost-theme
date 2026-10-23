#!/usr/bin/env node
/**
 * guard-pii.mjs — refuse to publish reader or member personal data.
 *
 * WHY THIS EXISTS, AND WHY IT IS A PRE-PUSH GUARD AND NOT A PRE-COMMIT ONE.
 *
 * On 2026-08-20 the daily security review found FIX-comped-cannot-pay.md and
 * FIX-liturgy-reader-discoverability.md being served, unauthenticated, from
 * https://raw.githubusercontent.com/cvs4bz49sb-oss/mo-ghost-theme/... on the
 * branch icloud-wip-2026-08-07. Fifteen readers' email addresses. One of them
 * named in full, joined to his membership status and a verbatim quote from a
 * private message he sent the publication. Thirteen more listed under a
 * heading identifying them as the publication's most generous donors.
 *
 * The commit that did it, a27f271, was made on 2026-08-07 with the message
 * "Preserve in-progress iCloud working-copy changes" — a housekeeping commit,
 * made in a hurry, that swept two working notes in with the code.
 *
 * There was already a PII guard written for exactly this class of mistake. It
 * did not fire, for two reasons worth separating:
 *
 *   1. It was queued against `workers`, and never installed anywhere.
 *   2. It is a PRE-COMMIT hook, and this repository has a PUBLIC remote.
 *
 * The second reason is the interesting one. A commit is local and reversible;
 * it discloses nothing. The push is the disclosure. A pre-commit hook placed
 * in front of a public remote is guarding the wrong doorway — it stops
 * careless authoring, and what happened here was careless PUBLISHING. So this
 * guard runs on push, where the irreversible thing happens, and it inspects
 * exactly the commits that are about to become public.
 *
 * Run standalone:
 *   node scripts/guard-pii.mjs --range <base>..<tip>
 *   node scripts/guard-pii.mjs --files a.md b.md
 *   node scripts/guard-pii.mjs --staged
 *   node scripts/guard-pii.mjs --unpushed          (default in the hook)
 *
 * Exit 0 = nothing found. Exit 1 = found, push refused. Exit 2 = could not run,
 * which is NOT a pass — see FAILURE MODE below.
 *
 * FAILURE MODE. This guard fails CLOSED. If it cannot determine what is being
 * pushed, it refuses the push and says so. A guard that waves things through
 * when it is confused is worse than no guard, because it produces the belief
 * that something was checked. Override with MO_PII_GUARD=0 for the one push
 * where you have read the diff yourself and are sure.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const ADDR = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/**
 * Allowlist. Two kinds of entry, and the distinction matters.
 *
 * DOMAINS that cannot belong to a real reader: documentation placeholders,
 * reserved TLDs, local hostnames that appear in git commit identities, and the
 * handful of third-party hosts that show up in code and copy.
 *
 * EXACT ADDRESSES that are ours and are deliberately published. These are
 * listed one by one rather than by domain, so that adding one is a decision
 * somebody makes and can be seen making in a diff.
 *
 * ONE DELIBERATE GAP, STATED RATHER THAN HIDDEN: @mereorthodoxy.com is
 * allowlisted as a domain below. Staff are people and their addresses are
 * personal data, and yet the theme links to them on purpose in a dozen
 * templates. Blocking the publication's own contact addresses would make this
 * guard unrunnable within a day, and an unrunnable guard is the one that was
 * never installed. The scope of this tool is READER and MEMBER data. If a
 * staff member's private address needs protecting, that is a separate
 * decision and this is not the tool that will catch it.
 */
const ALLOW_DOMAINS = [
  /^example\.(com|net|org|edu)$/i,
  /^(school|university)\.edu$/i,
  /\.(invalid|test|localhost|local|lan|home|internal)$/i,
  /^mereorthodoxy\.com$/i,
  /^users\.noreply\.github\.com$/i,
  /^github\.com$/i,
  /^anthropic\.com$/i,
  /^checkout\.stripe\.com$/i,
  /^(x|evil)\.(com|tld)$/i,
];

const ALLOW_EXACT = new Set([
  // package.json "author" — the repository's own author field.
  "iharber93@gmail.com",
]);

const EXTRA_ALLOW = ".pii-allow"; // one address or /regex/ per line, # comments

function loadExtraAllow() {
  const out = { exact: new Set(), rx: [] };
  if (!existsSync(EXTRA_ALLOW)) return out;
  for (const raw of readFileSync(EXTRA_ALLOW, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("/") && line.lastIndexOf("/") > 0) {
      const body = line.slice(1, line.lastIndexOf("/"));
      try { out.rx.push(new RegExp(body, "i")); } catch { /* ignore */ }
    } else {
      out.exact.add(line.toLowerCase());
    }
  }
  return out;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });
}

function allowed(addr, extra) {
  const lower = addr.toLowerCase();
  if (ALLOW_EXACT.has(lower) || extra.exact.has(lower)) return true;
  const domain = lower.slice(lower.indexOf("@") + 1);
  if (ALLOW_DOMAINS.some((r) => r.test(domain))) return true;
  if (extra.rx.some((r) => r.test(lower))) return true;
  return false;
}

/** Mask before printing. This tool must never be the thing that copies the
 *  addresses somewhere new — including into a terminal scrollback, a CI log,
 *  or a screenshot of either. */
function mask(addr) {
  const at = addr.indexOf("@");
  return addr[0] + "***" + addr.slice(at);
}

function scanText(text) {
  return text.match(ADDR) || [];
}

/**
 * Only ADDED lines are inspected. A diff that REMOVES an address is the fix,
 * not the offence, and flagging it would mean this guard blocks its own
 * remediation — which is how guards get switched off.
 */
function addedLines(diff) {
  return diff
    .split("\n")
    .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
    // STRIP the leading '+'. Keeping it looks harmless and is not: '+' is a
    // legal local-part character, so an address at column 0 of an added line
    // matches as "+name@host" instead of "name@host". That breaks the
    // allowlist — an exempt address would be compared as "+addr" and fail —
    // which turns this guard into a false-positive generator that blocks
    // legitimate pushes. A guard that cries wolf is a guard that gets
    // uninstalled, so this is a correctness bug about the guard's survival,
    // not just about its output. Caught by running it against the real
    // offending commit, where sixteen hits printed as "+***@gmail.com".
    .map((l) => l.slice(1))
    .join("\n");
}

function main() {
  if (process.env.MO_PII_GUARD === "0") {
    console.error("guard-pii: DISABLED via MO_PII_GUARD=0 — you own this push.");
    return 0;
  }

  const argv = process.argv.slice(2);
  const mode = argv[0] || "--unpushed";
  const extra = loadExtraAllow();

  let haystack = "";
  let what = "";

  try {
    if (mode === "--files") {
      const files = argv.slice(1);
      if (files.length === 0) return 0;
      what = `${files.length} file(s)`;
      haystack = files
        .filter((f) => existsSync(f))
        .map((f) => readFileSync(f, "utf8"))
        .join("\n");
    } else if (mode === "--staged") {
      what = "staged changes";
      haystack = addedLines(git(["diff", "--cached", "--no-color", "-U0"]));
    } else if (mode === "--range") {
      const range = argv[1];
      if (!range) throw new Error("--range needs an argument");
      what = range;
      haystack = addedLines(git(["diff", "--no-color", "-U0", range]));
    } else if (mode === "--unpushed") {
      // Everything reachable from HEAD that no origin ref already has. This is
      // precisely "what would become public", and it is the right question for
      // a brand-new branch, where there is no remote tip to diff against.
      what = "commits not yet on origin";
      const revs = git(["rev-list", "HEAD", "--not", "--remotes=origin"])
        .split("\n")
        .filter(Boolean);
      if (revs.length === 0) return 0;
      haystack = revs
        .map((r) =>
          addedLines(
            git(["show", "--no-color", "-U0", "--format=", r]),
          ),
        )
        .join("\n");
    } else {
      console.error(`guard-pii: unknown mode ${mode}`);
      return 2;
    }
  } catch (e) {
    console.error("guard-pii: COULD NOT INSPECT THE PUSH — refusing.");
    console.error("  " + String(e.message || e).split("\n")[0]);
    console.error("  This is a refusal, not a pass. Re-run, or set");
    console.error("  MO_PII_GUARD=0 if you have read the diff yourself.");
    return 2;
  }

  const hits = [...new Set(scanText(haystack))].filter((a) => !allowed(a, extra));

  if (hits.length === 0) return 0;

  console.error("");
  console.error("  PUSH REFUSED — guard-pii found personal data in " + what);
  console.error("");
  for (const h of hits.slice(0, 20)) console.error("    " + mask(h));
  if (hits.length > 20) console.error(`    … and ${hits.length - 20} more`);
  console.error("");
  console.error("  This repository has a PUBLIC remote. Pushing this makes the");
  console.error("  addresses above readable by anyone, permanently — deleting the");
  console.error("  branch afterwards does not retract them.");
  console.error("");
  console.error("  If these are readers or members: remove or redact them, and");
  console.error("  move working notes to ~/mo-private/ rather than committing.");
  console.error("  If they are legitimately ours: add them to .pii-allow, one");
  console.error("  per line, so the exemption is visible in the diff.");
  console.error("");
  return 1;
}

process.exit(main());
