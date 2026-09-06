#!/usr/bin/env bash
# Applies the grayscale/film effect (sigmoidal contrast, level stretch,
# radial vignette, film grain) to every image in DIR, replacing each
# original with a BG-<original name> file.
set -euo pipefail

DIR="${1:?Usage: BGify.sh <directory>}"

command -v magick >/dev/null 2>&1 || { echo "magick (ImageMagick) not found in PATH" >&2; exit 1; }
command -v identify >/dev/null 2>&1 || { echo "identify (ImageMagick) not found in PATH" >&2; exit 1; }

cd "$DIR"

shopt -s nullglob nocaseglob
for f in *.jpg *.jpeg *.png; do
  [ -e "$f" ] || continue

  case "$f" in
    BG-*) continue ;;
  esac

  out="BG-${f}"

  w=$(identify -format "%w" "$f")
  h=$(identify -format "%h" "$f")

  mask="$(mktemp --suffix=.png)"
  magick -size "${w}x${h}" radial-gradient:white-black +level 78%,100% "$mask"

  magick "$f" \
    -colorspace Gray \
    -sigmoidal-contrast 2x50% \
    -level 1%,99% \
    "$mask" -compose multiply -composite \
    -attenuate 0.25 +noise Gaussian \
    -quality 92 \
    "$out"

  rm -f "$mask"
  rm -f "$f"
  echo "processed $f -> $out"
done
