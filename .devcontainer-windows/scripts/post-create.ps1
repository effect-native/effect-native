# Post-create setup script for Windows DevContainer
# This script runs once after the container is created

Write-Host "🚀 Running post-create setup for effect-native Windows development container..." -ForegroundColor Green

function Write-Info {
    param($Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn {
    param($Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Set execution policy
Write-Info "Setting PowerShell execution policy..."
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force

# Configure Git
Write-Info "Configuring Git..."
git config --global core.autocrlf false
git config --global core.eol lf
git config --global init.defaultBranch main
git config --global --add safe.directory C:/workspace

# Check if Git user is configured
$gitUserName = git config --global user.name
$gitUserEmail = git config --global user.email

if ([string]::IsNullOrWhiteSpace($gitUserName)) {
    git config --global user.name "Developer"
}
if ([string]::IsNullOrWhiteSpace($gitUserEmail)) {
    git config --global user.email "developer@localhost"
}

# Configure pnpm
Write-Info "Configuring pnpm..."
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    pnpm config set store-dir "C:/Users/ContainerUser/AppData/Local/pnpm"
    pnpm config set auto-install-peers true
    pnpm config set strict-peer-dependencies false
} else {
    Write-Warn "pnpm not found, installing via npm..."
    npm install -g pnpm
}

# Install global npm packages
Write-Info "Installing global npm packages..."
try {
    npm install -g --force `
        node-gyp `
        npm-check-updates `
        depcheck `
        concurrently `
        cross-env `
        serve `
        http-server `
        nodemon `
        ts-node `
        tsx `
        typescript `
        @changesets/cli
    Write-Info "Global packages installed successfully"
} catch {
    Write-Warn "Some global packages failed to install: $_"
}

# Create workspace directories
Write-Info "Creating workspace directories..."
$directories = @(
    "C:/workspace/.vscode",
    "C:/workspace/tmp",
    "C:/workspace/logs"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# Set up VS Code workspace settings
$vscodeSettingsPath = "C:/workspace/.vscode/settings.json"
if (!(Test-Path $vscodeSettingsPath)) {
    Write-Info "Creating VS Code workspace settings..."
    $settings = @{
        "typescript.tsdk" = "node_modules/typescript/lib"
        "editor.formatOnSave" = $true
        "editor.codeActionsOnSave" = @{
            "source.fixAll.eslint" = "explicit"
        }
        "files.eol" = "`n"
        "npm.packageManager" = "pnpm"
        "git.core.autocrlf" = $false
        "git.core.eol" = "lf"
    } | ConvertTo-Json -Depth 10
    
    $settings | Out-File -FilePath $vscodeSettingsPath -Encoding utf8
}

# Install project dependencies
Write-Info "Installing project dependencies..."
Set-Location C:/workspace

if (Test-Path "package.json") {
    try {
        Write-Info "Running pnpm install..."
        pnpm install --frozen-lockfile
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Frozen lockfile install failed, trying regular install..."
            pnpm install
        }
    } catch {
        Write-Error "Failed to install dependencies: $_"
    }
} else {
    Write-Warn "No package.json found in workspace"
}

# Build the project if build script exists
if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    if ($packageJson.scripts.build) {
        Write-Info "Building the project..."
        try {
            pnpm build
        } catch {
            Write-Warn "Build failed: $_"
        }
    }
}

# Create PowerShell profile with useful aliases
Write-Info "Setting up PowerShell profile..."
$profileDir = Split-Path $PROFILE -Parent
if (!(Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
}

$profileContent = @'
# Effect Native PowerShell Profile

# Set location to workspace
Set-Location C:/workspace

# Display welcome message
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                              ║" -ForegroundColor Cyan
Write-Host "║     Welcome to Effect Native Windows DevContainer! 🚀       ║" -ForegroundColor Cyan
Write-Host "║                                                              ║" -ForegroundColor Cyan
Write-Host "║  Quick Commands:                                             ║" -ForegroundColor Cyan
Write-Host "║  - pnpm install    : Install dependencies                   ║" -ForegroundColor Cyan
Write-Host "║  - pnpm test       : Run tests                              ║" -ForegroundColor Cyan
Write-Host "║  - pnpm build      : Build the project                      ║" -ForegroundColor Cyan
Write-Host "║  - pnpm ok         : Run all checks                         ║" -ForegroundColor Cyan
Write-Host "║                                                              ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Show environment info
Write-Host "Environment:" -ForegroundColor Yellow
Write-Host "- Node.js: $(node --version 2>$null)" -ForegroundColor White
Write-Host "- npm: $(npm --version 2>$null)" -ForegroundColor White
Write-Host "- pnpm: $(pnpm --version 2>$null)" -ForegroundColor White
Write-Host "- Git: $(git --version 2>$null)" -ForegroundColor White
Write-Host ""

# Useful aliases
Set-Alias -Name ll -Value Get-ChildItem
Set-Alias -Name la -Value Get-ChildItem
function .. { Set-Location .. }
function ... { Set-Location ../.. }

# Git aliases
function gs { git status }
function ga { git add $args }
function gc { git commit $args }
function gp { git push $args }
function gl { git log --oneline --graph --decorate }
function gd { git diff $args }

# pnpm aliases
function pi { pnpm install }
function pt { pnpm test }
function pb { pnpm build }
function pd { pnpm dev }
function po { pnpm ok }

# Development aliases
function dev { pnpm dev }
function test { pnpm test }
function build { pnpm build }
function lint { pnpm lint }

'@

$profileContent | Out-File -FilePath $PROFILE -Encoding utf8 -Force

# Verify setup
Write-Info "Verifying setup..."
Write-Host ""
Write-Host "Environment Check:" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow
Write-Host "Node.js: $(if (Get-Command node -ErrorAction SilentlyContinue) { node --version } else { 'Not found' })"
Write-Host "npm: $(if (Get-Command npm -ErrorAction SilentlyContinue) { npm --version } else { 'Not found' })"
Write-Host "pnpm: $(if (Get-Command pnpm -ErrorAction SilentlyContinue) { pnpm --version } else { 'Not found' })"
Write-Host "Git: $(if (Get-Command git -ErrorAction SilentlyContinue) { git --version } else { 'Not found' })"
Write-Host "TypeScript: $(if (Get-Command tsc -ErrorAction SilentlyContinue) { tsc --version } else { 'Not found' })"
Write-Host ""

Write-Info "Post-create setup completed successfully! 🎉"
Write-Host ""
Write-Host "To get started, run: pnpm install && pnpm test" -ForegroundColor Cyan