#!/bin/bash

# Vendor repo management script (clones repos locally for IDE/agent reference)
# Usage: ./scripts/update-vendor-repos.sh [effect|svelte|kit|all]
# Note: Repos are gitignored, not committed to git

set -e

EFFECT_REPO="https://github.com/Effect-TS/effect"
SVELTE_REPO="https://github.com/sveltejs/svelte"
KIT_REPO="https://github.com/sveltejs/kit"

EFFECT_PREFIX="vendor/effect"
SVELTE_PREFIX="vendor/svelte"
KIT_PREFIX="vendor/kit"

BRANCH="main"

# Update or clone a repo
update_repo() {
  local name=$1
  local repo=$2
  local prefix=$3
  
  echo "Processing $name..."
  
  if [ -d "$prefix/.git" ]; then
    echo "  Updating existing repo..."
    cd "$prefix"
    git fetch origin
    git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "origin/$BRANCH"
    git pull origin "$BRANCH"
    cd - > /dev/null
  else
    echo "  Cloning repo..."
    mkdir -p "$(dirname "$prefix")"
    git clone --depth 1 --branch "$BRANCH" "$repo" "$prefix"
  fi
  
  echo "  ✓ $name done"
  echo ""
}

# Main logic
case "${1:-all}" in
  effect)
    update_repo "effect" "$EFFECT_REPO" "$EFFECT_PREFIX"
    ;;
  svelte)
    update_repo "svelte" "$SVELTE_REPO" "$SVELTE_PREFIX"
    ;;
  kit)
    update_repo "kit" "$KIT_REPO" "$KIT_PREFIX"
    ;;
  all)
    update_repo "effect" "$EFFECT_REPO" "$EFFECT_PREFIX"
    update_repo "svelte" "$SVELTE_REPO" "$SVELTE_PREFIX"
    update_repo "kit" "$KIT_REPO" "$KIT_PREFIX"
    echo "All repos updated!"
    ;;
  *)
    echo "Usage: $0 [effect|svelte|kit|all]"
    exit 1
    ;;
esac
