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

echo "==> Comparing local files to what's currently live..."
CHANGED=0
FILES_TO_CHECK=(index.html res.html talk.html proj.html fund.html team.html teach.html serve.html REU.html cv.html news.html style.css)
for f in "${FILES_TO_CHECK[@]}" assets/*.js data/*.json img/*; do
  if [ -f "$f" ]; then
    if ! cmp -s "$f" "$PUBLIC_HTML/$f" 2>/dev/null; then
      echo "  changed: $f"
      mkdir -p "$PUBLIC_HTML/$(dirname "$f")"
      cp "$f" "$PUBLIC_HTML/$f"
      CHANGED=$((CHANGED + 1))
    fi
  fi
done

if [ "$CHANGED" -eq 0 ]; then
  echo "==> Nothing to sync. The live site already matches GitHub."
else
  echo "==> Synced $CHANGED file(s) to https://users.wpi.edu/~yli15/"
fi
