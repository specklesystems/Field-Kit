#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
PROJECTS="$ROOT/projects"
mkdir -p "$PROJECTS"

normalise_url() {
  printf '%s' "$1" | sed -e 's#/*$##' -e 's#\.git$##'
}

clone_if_missing() {
  name=$1
  url=$2
  directory=$3
  target="$PROJECTS/$directory"

  if [ -L "$target" ]; then
    echo "ERROR: $target is a symbolic link; nothing was changed." >&2
    return 1
  fi

  if [ -e "$target" ]; then
    if [ ! -d "$target/.git" ]; then
      echo "ERROR: $target exists but is not a standalone Git checkout; nothing was changed." >&2
      return 1
    fi
    actual=$(git -C "$target" remote get-url origin 2>/dev/null || true)
    if [ "$(normalise_url "$actual")" != "$(normalise_url "$url")" ]; then
      echo "ERROR: $target has a different or missing origin: ${actual:-none}; nothing was changed." >&2
      return 1
    fi
    echo "OK: $name is already present. It was not pulled or modified."
    return 0
  fi

  echo "CLONE: $name -> projects/$directory"
  git clone --origin origin "$url" "$target"
}

clone_if_missing "Bundle specification" "https://github.com/specklesystems/speckle-bundle-spec.git" "speckle-bundle-spec"
clone_if_missing "Python SDK" "https://github.com/specklesystems/specklepy.git" "specklepy"
clone_if_missing "Speckle documentation" "https://github.com/specklesystems/speckle-docs-NEW.git" "speckle-docs-NEW"

echo "FieldKit foundations are ready. Open this folder in your coding agent: $ROOT"
