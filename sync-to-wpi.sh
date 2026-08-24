#!/bin/bash
# Pull the latest site content from GitHub and copy it onto the live
# WPI public_html folder. Run this from a Mac that has public_html
# mounted (Finder -> Go -> Connect to Server -> smb://users.wpi.edu/personalweb/public_html).
#
# Usage: ./sync-to-wpi.sh

set -e
cd "$(dirname "$0")"

PUBLIC_HTML="/Volumes/public_html"

echo "==> Checking public_html is mounted..."
if [ ! -d "$PUBLIC_HTML" ]; then
  echo "public_html isn't mounted at $PUBLIC_HTML."
  echo "In Finder: Go > Connect to Server > smb://users.wpi.edu/personalweb/public_html, then re-run this script."
  exit 1
fi

echo "==> Checking this is the right repo..."
if [ ! -f "style.css" ] || [ ! -d "data" ]; then
  echo "This doesn't look like the WPI_PersonalSite repo folder. Run this script from inside it."
  exit 1
fi

echo "==> Pulling latest from GitHub..."
BEFORE=$(git rev-parse HEAD)
git pull --ff-only origin main
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" = "$AFTER" ]; then
  echo "==> No new commits on GitHub. Checking anyway in case the live site is behind..."
else
  echo "==> Pulled new changes: $BEFORE -> $AFTER"
fi

BUILD_ID=$(git rev-parse --short HEAD)
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "==> Comparing local files to what's currently live (build $BUILD_ID)..."
CHANGED=0

# HTML pages reference style.css and assets/render.js with a "?v=__BUILD__"
# cache-busting query string. Stamp it with the current commit hash before
# comparing/copying, so every deploy forces browsers to fetch the new CSS/JS
# instead of silently keeping a stale cached copy (this is what caused a
# saved publication to render as "undefined" until the browser was hard-
# refreshed — the page loaded fine, but its cached render.js was outdated).
HTML_FILES=(index.html res.html talk.html proj.html fund.html team.html teach.html serve.html REU.html cv.html news.html)
for f in "${HTML_FILES[@]}"; do
  if [ -f "$f" ]; then
    sed "s/__BUILD__/$BUILD_ID/g" "$f" > "$TMPDIR/$f"
    if ! cmp -s "$TMPDIR/$f" "$PUBLIC_HTML/$f" 2>/dev/null; then
      echo "  changed: $f"
      cp -X "$TMPDIR/$f" "$PUBLIC_HTML/$f"
      CHANGED=$((CHANGED + 1))
    fi
  fi
done

for f in style.css assets/*.js data/*.json img/* papers/*; do
  if [ -f "$f" ]; then
    if ! cmp -s "$f" "$PUBLIC_HTML/$f" 2>/dev/null; then
      echo "  changed: $f"
      mkdir -p "$PUBLIC_HTML/$(dirname "$f")"
      cp -X "$f" "$PUBLIC_HTML/$f"
      CHANGED=$((CHANGED + 1))
    fi
  fi
done

if [ "$CHANGED" -eq 0 ]; then
  echo "==> Nothing to sync. The live site already matches GitHub."
else
  echo "==> Synced $CHANGED file(s) to https://users.wpi.edu/~yli15/"
fi
