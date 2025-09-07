#!/bin/bash
set -e

echo "🔄 Running post-start setup for effect-native development container..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# 1. Ensure Git safe directory
git config --global --add safe.directory /workspace

# 2. Update dependencies if needed
cd /workspace
if [ -f package.json ]; then
    # Check if node_modules exists and is not empty
    if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
        log_info "Installing dependencies..."
        corepack pnpm install --force --frozen-lockfile=false || log_warn "Failed to install dependencies"
    else
        log_info "Dependencies already installed"
    fi
fi

# 3. Check for updates (non-blocking)
log_info "Checking for dependency updates..."
(
    npm outdated 2>/dev/null || true
) &

# 4. Load Nix environment if available
if [ -f /workspace/flake.nix ] && command -v nix &> /dev/null; then
    log_info "Loading Nix environment..."
    # Just validate, don't enter shell
    nix flake check /workspace 2>/dev/null || log_warn "Nix flake check failed"
fi

# 5. Warm up TypeScript cache
if [ -f tsconfig.json ]; then
    log_info "Warming up TypeScript cache..."
    (tsc --noEmit --incremental 2>/dev/null || true) &
fi

# 6. Display status
echo ""
echo "🚀 Container is ready!"
echo ""
echo "Quick status:"
echo "============="
echo "Working directory: $(pwd)"
echo "Node.js: $(node --version)"
echo "pnpm: $(corepack pnpm --version)"
echo "Branch: $(git branch --show-current 2>/dev/null || echo 'Not in git repo')"
echo ""
echo "Run 'pnpm test' to run tests"
echo "Run 'pnpm ok' to run all checks"
echo ""
