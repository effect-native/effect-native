#!/usr/bin/env bash
# setup.sh — idempotent setup + maintenance for this repo
# Usage: scripts/setup.sh (from repo root)
# Optional: USE_NIX=1 scripts/setup.sh
# Optional: DEV_SHELL=".#ci" USE_NIX=1 scripts/setup.sh

set -euo pipefail

DEV_SHELL="${DEV_SHELL:-.}"
USE_NIX="${USE_NIX:-0}"

install_dependencies() {
  echo "[setup] bun install --frozen-lockfile"
  if bun install --frozen-lockfile; then
    return 0
  fi

  echo "WARN: bun install --frozen-lockfile failed; retrying with bun install."
  echo "[setup] bun install"
  bun install
  echo "WARN: bun.lock may have changed. Commit the lockfile if the update is intentional."
}

run_steps() {
  export CI=1

  install_dependencies

  set +e
  echo "[setup] bun run build"
  bun run build
  build_exit=$?

  echo "[setup] bun run codegen"
  bun run codegen
  codegen_exit=$?
  set -e

  if [ "$build_exit" -ne 0 ]; then
    echo "WARN: bun run build failed (exit $build_exit)"
  fi
  if [ "$codegen_exit" -ne 0 ]; then
    echo "WARN: bun run codegen failed (exit $codegen_exit)"
  fi
}

run_inside_nix() {
  if ! command -v nix >/dev/null 2>&1; then
    echo "[setup] Nix is not installed."
    echo "Install Bun and run scripts/setup.sh, or install Nix and rerun with USE_NIX=1."
    exit 1
  fi

  nix develop -L "$DEV_SHELL" --accept-flake-config \
    --extra-experimental-features "nix-command flakes" \
    -c bash -lc '
      set -euo pipefail
      USE_NIX=0 bash scripts/setup.sh
    '
}

main() {
  if [ "$USE_NIX" = "1" ]; then
    echo "[setup] Running inside Nix dev shell ($DEV_SHELL)"
    run_inside_nix
    exit 0
  fi

  if ! command -v bun >/dev/null 2>&1; then
    echo "[setup] Bun is required for default setup."
    echo "Install Bun and rerun scripts/setup.sh, or use USE_NIX=1 scripts/setup.sh."
    exit 1
  fi

  echo "[setup] Running with host Bun (Nix optional)"
  run_steps
}

main "$@"
