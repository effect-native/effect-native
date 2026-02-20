#!/usr/bin/env bun
/**
 * ssh-keep: SSH+tmux resilient entrypoint with session picker
 *
 * Usage:
 *   ssh-keep [host]              # Connect to host, show session picker
 *   ssh-keep [host] -s <name>    # Connect to host, attach-or-create session <name>
 *   ssh-keep --help              # Show help
 *
 * See SPEC.md for the full behavioral specification.
 */

const args = process.argv.slice(2)

if (args.includes("--help") || args.includes("-h")) {
  console.log(`ssh-keep: SSH+tmux resilient entrypoint with session picker

Usage:
  ssh-keep <host>              Connect to host, show session picker
  ssh-keep <host> -s <name>    Connect to host, attach-or-create session <name>
  ssh-keep --help              Show this help

The entrypoint:
  1. SSHes into the server with TTY allocation
  2. Bootstraps the server-side helper if needed
  3. Shows an interactive session picker (or attaches to named session)
  4. Survives disconnections - your work keeps running in tmux

See SPEC.md for full specification.`)
  process.exit(0)
}

// Parse arguments
const sessionFlagIndex = args.findIndex((a) => a === "-s" || a === "--session")
let sessionName: string | undefined
if (sessionFlagIndex !== -1) {
  sessionName = args[sessionFlagIndex + 1]
  args.splice(sessionFlagIndex, 2)
}

const host = args[0]

if (!host) {
  console.error("Error: host required")
  console.error("Usage: ssh-keep <host> [-s <session>]")
  process.exit(1)
}

// The server-side helper script (embedded for bootstrap)
// Uses tmux choose-tree as fallback picker (always available)
const HELPER_SCRIPT = `#!/bin/sh
# ssh-keep server-side helper
# Installed to ~/.local/bin/ssh-keep

set -e

SESSION_NAME=""

while [ $# -gt 0 ]; do
  case "$1" in
    -s|--session) SESSION_NAME="$2"; shift 2 ;;
    --list) tmux list-sessions -F '#{session_name}' 2>/dev/null || true; exit 0 ;;
    *) shift ;;
  esac
done

# Check tmux is available
if ! command -v tmux >/dev/null 2>&1; then
  echo "Error: tmux not found on server" >&2
  exit 2
fi

# Check we have a TTY
if [ ! -t 0 ]; then
  echo "Error: no TTY (run with ssh -t)" >&2
  exit 3
fi

if [ -n "$SESSION_NAME" ]; then
  # Attach-or-create named session
  if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    exec tmux attach-session -t "$SESSION_NAME"
  else
    exec tmux new-session -s "$SESSION_NAME"
  fi
else
  # Picker mode: use tmux choose-tree if sessions exist, else create 'main'
  if tmux list-sessions >/dev/null 2>&1; then
    # Has sessions - show picker
    # First attach to any session, then show choose-tree
    exec tmux attach-session \\; choose-tree -s
  else
    # No sessions - create 'main'
    exec tmux new-session -s main
  fi
fi
`

// The remote command: bootstrap helper if needed, then run it
const sessionArg = sessionName ? `-s ${sessionName}` : ""
const remoteCommand = `
mkdir -p ~/.local/bin ~/.config/ssh-keep ~/.local/state/ssh-keep
if [ ! -x ~/.local/bin/ssh-keep ]; then
  cat > ~/.local/bin/ssh-keep << 'HELPER_EOF'
${HELPER_SCRIPT}
HELPER_EOF
  chmod +x ~/.local/bin/ssh-keep
fi
~/.local/bin/ssh-keep ${sessionArg}
`.trim()

// Execute SSH with TTY allocation
const proc = Bun.spawn(["ssh", "-t", host, remoteCommand], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit"
})

const exitCode = await proc.exited
process.exit(exitCode)
