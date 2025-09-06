# Post-start script for Windows DevContainer
# This script runs every time the container starts

Write-Host "🔄 Running post-start setup for effect-native Windows development container..." -ForegroundColor Green

function Write-Info {
    param($Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn {
    param($Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

# Ensure Git safe directory
git config --global --add safe.directory C:/workspace

# Update dependencies if needed
Set-Location C:/workspace
if (Test-Path "package.json") {
    # Check if node_modules exists and is not empty
    $nodeModulesPath = "node_modules"
    if (!(Test-Path $nodeModulesPath) -or (Get-ChildItem $nodeModulesPath -Force | Measure-Object).Count -eq 0) {
        Write-Info "Installing dependencies..."
        try {
            pnpm install
        } catch {
            Write-Warn "Failed to install dependencies: $_"
        }
    } else {
        Write-Info "Dependencies already installed"
    }
}

# Check for updates (non-blocking)
Write-Info "Checking for dependency updates..."
Start-Job -ScriptBlock {
    try {
        npm outdated 2>$null
    } catch {
        # Ignore errors
    }
} | Out-Null

# Warm up TypeScript cache
if (Test-Path "tsconfig.json") {
    Write-Info "Warming up TypeScript cache..."
    Start-Job -ScriptBlock {
        try {
            tsc --noEmit --incremental 2>$null
        } catch {
            # Ignore errors
        }
    } | Out-Null
}

# Display status
Write-Host ""
Write-Host "🚀 Container is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Quick status:" -ForegroundColor Yellow
Write-Host "=============" -ForegroundColor Yellow
Write-Host "Working directory: $(Get-Location)"
Write-Host "Node.js: $(node --version)"
Write-Host "pnpm: $(pnpm --version)"
$currentBranch = try { git branch --show-current 2>$null } catch { 'Not in git repo' }
Write-Host "Branch: $currentBranch"
Write-Host ""
Write-Host "Run 'pnpm test' to run tests" -ForegroundColor Cyan
Write-Host "Run 'pnpm ok' to run all checks" -ForegroundColor Cyan
Write-Host ""