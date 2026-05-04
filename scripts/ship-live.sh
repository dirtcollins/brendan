#!/usr/bin/env bash
set -euo pipefail

message="${1:-Live app update}"
start_branch="$(git branch --show-current)"
work_branch="${SHIP_WORK_BRANCH:-V2}"
live_branch="${SHIP_LIVE_BRANCH:-main}"
askpass="/Applications/GitHub Desktop.app/Contents/Resources/app/desktop-trampoline/desktop-askpass-trampoline"

if [[ ! -x "$askpass" ]]; then
  echo "GitHub Desktop askpass helper was not found at: $askpass" >&2
  exit 1
fi

export GIT_ASKPASS="$askpass"
export GIT_TERMINAL_PROMPT=0

if [[ "$start_branch" != "$work_branch" ]]; then
  git switch "$work_branch"
fi

git add -A
if ! git diff --cached --quiet; then
  git commit -m "$message"
fi

git fetch origin "$work_branch" "$live_branch"
git push origin "$work_branch"

git switch "$live_branch"
git pull --ff-only origin "$live_branch"
git merge --no-edit "$work_branch"
git push origin "$live_branch"

git switch "$work_branch"
git merge --ff-only "$live_branch" >/dev/null 2>&1 || git merge --no-edit "$live_branch"
git push origin "$work_branch"

if [[ "$start_branch" != "$work_branch" ]]; then
  git switch "$start_branch"
fi

echo "Live update pushed to GitHub Pages branch: $live_branch"
