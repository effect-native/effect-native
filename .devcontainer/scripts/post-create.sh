#!/bin/bash
set -e

echo "🚀 Running post-create setup for effect-native development container..."

# Colors for output
RED='\033[0;31m'
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

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Set up Git configuration
log_info "Configuring Git..."
if [ -f /home/developer/.gitconfig ]; then
    log_info "Git config found from host mount"
else
    git config --global user.name "${GIT_USER_NAME:-Developer}"
    git config --global user.email "${GIT_USER_EMAIL:-developer@example.com}"
fi
git config --global --add safe.directory /workspace
git config --global core.autocrlf false
git config --global core.eol lf
git config --global init.defaultBranch main

# 2. Set up SSH keys (if mounted)
log_info "Setting up SSH..."
if [ -d /home/developer/.ssh ]; then
    log_info "SSH keys found from host mount"
    chmod 700 /home/developer/.ssh
    chmod 600 /home/developer/.ssh/id_* 2>/dev/null || true
else
    log_warn "No SSH keys found. You may need to generate them."
fi

# 3. Create shell history directories
log_info "Setting up shell history..."
mkdir -p /home/developer/.zsh_history_dir
mkdir -p /home/developer/.bash_history_dir
touch /home/developer/.zsh_history_dir/.zsh_history
touch /home/developer/.bash_history_dir/.bash_history
ln -sf /home/developer/.zsh_history_dir/.zsh_history /home/developer/.zsh_history
ln -sf /home/developer/.bash_history_dir/.bash_history /home/developer/.bash_history

# 4. Set up pnpm
log_info "Configuring pnpm..."
pnpm config set store-dir /home/developer/.pnpm-store
pnpm config set virtual-store-dir node_modules/.pnpm
pnpm config set symlink true
pnpm config set auto-install-peers true
pnpm config set strict-peer-dependencies false

# 5. Install global npm packages
log_info "Installing global npm packages..."
npm install -g \
    node-gyp \
    npm-check-updates \
    depcheck \
    concurrently \
    cross-env \
    serve \
    http-server \
    nodemon \
    ts-node \
    tsx \
    typescript \
    @changesets/cli \
    || log_warn "Some global packages failed to install"

# 6. Set up Nix environment
log_info "Setting up Nix environment..."
if [ -f /workspace/flake.nix ]; then
    log_info "Found flake.nix in workspace"
    cd /workspace
    
    # Try to enter Nix development shell
    if command -v nix &> /dev/null; then
        log_info "Entering Nix development shell..."
        nix develop --command echo "Nix shell activated successfully" || log_warn "Failed to enter Nix shell"
    else
        log_warn "Nix not found. Skipping Nix setup."
    fi
fi

# 7. Create useful directories
log_info "Creating workspace directories..."
mkdir -p /workspace/.vscode
mkdir -p /workspace/tmp
mkdir -p /workspace/logs

# 8. Set up VS Code settings (if not exists)
if [ ! -f /workspace/.vscode/settings.json ]; then
    log_info "Creating VS Code workspace settings..."
    cat > /workspace/.vscode/settings.json << 'EOF'
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "files.eol": "\n",
  "npm.packageManager": "pnpm"
}
EOF
fi

# 9. Install project dependencies
log_info "Installing project dependencies..."
cd /workspace
if [ -f package.json ]; then
    pnpm install --frozen-lockfile || pnpm install || log_error "Failed to install dependencies"
else
    log_warn "No package.json found in workspace"
fi

# 10. Build the project (if build script exists)
if [ -f package.json ] && grep -q '"build"' package.json; then
    log_info "Building the project..."
    pnpm build || log_warn "Build failed"
fi

# 11. Set up direnv (if .envrc exists)
if [ -f /workspace/.envrc ]; then
    log_info "Setting up direnv..."
    direnv allow /workspace
fi

# 12. Create welcome message
cat > /home/developer/.welcome << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     Welcome to Effect Native Development Container! 🚀       ║
║                                                              ║
║  Quick Commands:                                             ║
║  - pnpm install    : Install dependencies                   ║
║  - pnpm test       : Run tests                              ║
║  - pnpm build      : Build the project                      ║
║  - pnpm ok         : Run all checks                         ║
║  - nix develop     : Enter Nix shell                        ║
║                                                              ║
║  Services:                                                   ║
║  - Node.js version : $(node --version 2>/dev/null || echo "Not installed")                          ║
║  - pnpm version    : $(pnpm --version 2>/dev/null || echo "Not installed")                            ║
║  - Nix available   : $(command -v nix &> /dev/null && echo "Yes ✓" || echo "No ✗")                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF

# 13. Set up shell aliases
log_info "Setting up shell aliases..."
cat >> /home/developer/.zshrc << 'EOF'

# Effect Native aliases
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'

# Git aliases
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git log --oneline --graph --decorate'
alias gd='git diff'

# pnpm aliases
alias pi='pnpm install'
alias pt='pnpm test'
alias pb='pnpm build'
alias pd='pnpm dev'
alias po='pnpm ok'

# Development aliases
alias dev='pnpm dev'
alias test='pnpm test'
alias build='pnpm build'
alias lint='pnpm lint'
alias format='pnpm format'

# Nix aliases
alias ns='nix develop'
alias nb='nix build'
alias nf='nix flake'

# Display welcome message
cat /home/developer/.welcome
EOF

# 14. Fix permissions
log_info "Fixing permissions..."
sudo chown -R developer:developer /home/developer 2>/dev/null || true
sudo chown -R developer:developer /workspace 2>/dev/null || true

# 15. Verify setup
log_info "Verifying setup..."
echo ""
echo "Environment Check:"
echo "=================="
echo "Node.js: $(node --version 2>/dev/null || echo 'Not found')"
echo "npm: $(npm --version 2>/dev/null || echo 'Not found')"
echo "pnpm: $(pnpm --version 2>/dev/null || echo 'Not found')"
echo "Git: $(git --version 2>/dev/null || echo 'Not found')"
echo "Nix: $(nix --version 2>/dev/null || echo 'Not found')"
echo "TypeScript: $(tsc --version 2>/dev/null || echo 'Not found')"
echo ""

log_info "Post-create setup completed successfully! 🎉"
echo ""
echo "To get started, run: pnpm install && pnpm test"