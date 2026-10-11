#!/bin/bash
# Deslop gate (MOCA website/agents/DESLOP-AGENT.md). Ian, 2026-10-11: "runs
# on every merge and every commit". Claude Code runs this before every Bash
# tool call (PreToolUse). It acts only on:
#   git commit ...          -> the staged diff
#   git merge <ref> ...     -> the merge-base diff HEAD...<ref>
#   gh pr merge <n> ...     -> the PR's diff
# and runs scripts/deslop-check.mjs from the repo the command works in
# (mo-ghost-theme or mo-workers). Errors block the action with the list.
# A command carrying "Deslop: skip <reason>" (commit message, merge body)
# passes. If the checker cannot run, the action passes and says so.

INPUT="$(cat)"
COMMAND="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""')"
CWD="$(printf '%s' "$INPUT" | jq -r '.cwd // ""')"
[ -z "$CWD" ] && CWD="$(pwd)"

MODE=""; ARG=""; PRREPO=""
if printf '%s' "$COMMAND" | grep -Eq '(^|[;&|]|&&)[[:space:]]*git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+commit([[:space:]]|$)'; then
  MODE="staged"
elif printf '%s' "$COMMAND" | grep -Eq '(^|[;&|]|&&)[[:space:]]*git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+merge[[:space:]]'; then
  REF="$(printf '%s' "$COMMAND" | grep -Eo 'git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+merge[[:space:]]+[^;&|]*' | head -1 | sed -E 's/.*merge[[:space:]]+//' | tr ' ' '\n' | grep -v '^-' | grep -v '^$' | head -1)"
  case "$REF" in ""|--abort|--continue|--quit) exit 0 ;; esac
  MODE="range"; ARG="HEAD...$REF"
elif printf '%s' "$COMMAND" | grep -Eq '(^|[;&|]|&&)[[:space:]]*gh[[:space:]]+pr[[:space:]]+merge[[:space:]]'; then
  ARG="$(printf '%s' "$COMMAND" | grep -Eo 'gh[[:space:]]+pr[[:space:]]+merge[[:space:]]+[0-9]+' | head -1 | grep -Eo '[0-9]+$')"
  PRREPO="$(printf '%s' "$COMMAND" | grep -Eo '(-R|--repo)[[:space:]]+[^[:space:]]+' | head -1 | awk '{print $2}')"
  [ -z "$ARG" ] && exit 0
  MODE="pr"
else
  exit 0
fi

# The override passes silently. The gate never answers "allow", which
# would also skip the user's own permission prompt; it only denies.
if printf '%s' "$COMMAND" | grep -q 'Deslop: skip'; then
  exit 0
fi

# Which repo: an explicit `git -C <dir>`, else a leading `cd <dir> &&`, else cwd.
DIR="$(printf '%s' "$COMMAND" | grep -Eo 'git[[:space:]]+-C[[:space:]]+("[^"]+"|[^[:space:]]+)' | head -1 | sed -E 's/git[[:space:]]+-C[[:space:]]+//; s/^"//; s/"$//')"
if [ -z "$DIR" ]; then
  DIR="$(printf '%s' "$COMMAND" | grep -Eo '^[[:space:]]*cd[[:space:]]+("[^"]+"|[^[:space:]&;]+)' | head -1 | sed -E 's/^[[:space:]]*cd[[:space:]]+//; s/^"//; s/"$//')"
fi
[ -z "$DIR" ] && DIR="$CWD"
case "$DIR" in /*) ;; *) DIR="$CWD/$DIR" ;; esac
DIR="${DIR/#\~/$HOME}"

# For a PR merge, the repo named by -R decides which checkout runs it.
MOCA="$(cd "$(dirname "$0")/../.." && pwd)"
if [ "$MODE" = "pr" ] && [ -n "$PRREPO" ]; then
  case "$PRREPO" in
    *mo-ghost-theme) DIR="$MOCA/website/ghost-theme" ;;
    *mo-workers) DIR="$MOCA/website/workers" ;;
  esac
fi

ROOT="$(git -C "$DIR" rev-parse --show-toplevel 2>/dev/null)"
[ -z "$ROOT" ] && exit 0
SCRIPT="$ROOT/scripts/deslop-check.mjs"
# A checkout that predates Deslop (a stale tree or worktree) borrows the
# script from the main checkout of the same repo.
if [ ! -f "$SCRIPT" ]; then
  case "$(git -C "$ROOT" remote get-url origin 2>/dev/null)" in
    *mo-ghost-theme*) SCRIPT="$MOCA/website/ghost-theme/scripts/deslop-check.mjs" ;;
    *mo-workers*) SCRIPT="$MOCA/website/workers/scripts/deslop-check.mjs" ;;
  esac
  [ -f "$SCRIPT" ] || SCRIPT="$MOCA/.claude/hooks/deslop-check.mjs"
fi
[ -f "$SCRIPT" ] || exit 0

case "$MODE" in
  staged) OUT="$(cd "$ROOT" && node "$SCRIPT" 2>&1)"; RC=$? ;;
  range)  OUT="$(cd "$ROOT" && node "$SCRIPT" --range "$ARG" 2>&1)"; RC=$? ;;
  pr)     OUT="$(cd "$ROOT" && node "$SCRIPT" --pr "$ARG" ${PRREPO:+--repo "$PRREPO"} 2>&1)"; RC=$? ;;
esac

if [ "$RC" -eq 1 ]; then
  case "$MODE" in staged) WHAT="commit" ;; range) WHAT="merge" ;; pr) WHAT="PR merge" ;; esac
  REASON="Deslop blocked this $WHAT. Fix the copy (rules: website/agents/DESLOP-AGENT.md), or add a line 'Deslop: skip <reason>' for a title or quotation the checker misreads.

$(printf '%s' "$OUT" | head -60)"
  jq -n --arg r "$REASON" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
fi
# Checker failure, clean, or warnings only: let it through. Warnings are
# for the /deslop-check pass and CI to report.
exit 0
