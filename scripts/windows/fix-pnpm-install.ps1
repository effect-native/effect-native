<#
  Fix Windows install for this repo.

  - Verifies Node 23.x and pnpm 10.4.0
  - Ensures pnpm is available (installs via npm if needed)
  - Runs `pnpm -w install` and logs output
  - If install fails with better-sqlite3/ABI hints, rebuilds it and retries

  Usage (run from repo root):
    powershell -ExecutionPolicy Bypass -File .\scripts\windows\fix-pnpm-install.ps1

  Logs:
    ./install-windows.log
    ./rebuild-better-sqlite3.log (only if rebuild attempted)
#>

param()

$ErrorActionPreference = 'Stop'

function Write-Section($title) {
  Write-Host "`n=== $title ===" -ForegroundColor Cyan
}

function Require-RepoRoot() {
  if (-not (Test-Path -LiteralPath './package.json')) {
    throw "Run this script from the workspace root (folder containing package.json)."
  }
}

function Get-NodeSemver() {
  try {
    $v = & node -v
  } catch {
    return $null
  }
  if (-not $v) { return $null }
  $m = [regex]::Match($v, '^v(?<maj>\d+)\.(?<min>\d+)\.(?<pat>\d+)')
  if (-not $m.Success) { return $null }
  return [pscustomobject]@{
    Raw = $v
    Major = [int]$m.Groups['maj'].Value
    Minor = [int]$m.Groups['min'].Value
    Patch = [int]$m.Groups['pat'].Value
  }
}

function Ensure-Node23() {
  Write-Section 'Checking Node.js'
  $node = Get-NodeSemver
  if (-not $node) {
    Write-Error "Node.js is not found on PATH. Install Node 23.x (e.g., 23.7.0)."
    Write-Host "Get it from https://nodejs.org/en/download or via nvm-windows." -ForegroundColor Yellow
    exit 1
  }
  Write-Host ("Node version: {0}" -f $node.Raw)
  if ($node.Major -ne 23) {
    Write-Error ("Detected Node {0}. Install Node 23.x (CI uses 23.7.0)." -f $node.Raw)
    exit 1
  }
}

function Resolve-Pnpm() {
  $cmd = $null
  try { $cmd = (Get-Command pnpm -ErrorAction Stop).Source } catch {}
  if (-not $cmd) {
    $candidate = Join-Path $env:APPDATA 'npm/pnpm.cmd'
    if (Test-Path -LiteralPath $candidate) { $cmd = $candidate }
  }
  return $cmd
}

function Get-PnpmVersion($pnpmCmd) {
  if (-not $pnpmCmd) { return $null }
  try { return & $pnpmCmd -v } catch { return $null }
}

function Ensure-Pnpm($pinnedVersion) {
  Write-Section 'Checking pnpm'
  $pnpmCmd = Resolve-Pnpm
  $pnpmVer = Get-PnpmVersion $pnpmCmd
  if (-not $pnpmVer) {
    Write-Host "pnpm not found. Installing pnpm@$pinnedVersion globally via npm..." -ForegroundColor Yellow
    try {
      & npm i -g ("pnpm@{0}" -f $pinnedVersion)
    } catch {
      Write-Error "Failed to install pnpm globally. Ensure npm is available and retry: npm i -g pnpm@$pinnedVersion"
      exit 1
    }
    $pnpmCmd = Resolve-Pnpm
    $pnpmVer = Get-PnpmVersion $pnpmCmd
  }
  if (-not $pnpmVer) {
    Write-Error "pnpm not available on PATH even after install. Ensure %APPDATA%\\npm is on PATH."
    exit 1
  }
  Write-Host ("pnpm path: {0}" -f $pnpmCmd)
  Write-Host ("pnpm version: {0}" -f $pnpmVer)
  if ($pnpmVer -ne $pinnedVersion) {
    Write-Host ("Installing pinned pnpm@{0} (current: {1})..." -f $pinnedVersion, $pnpmVer) -ForegroundColor Yellow
    & npm i -g ("pnpm@{0}" -f $pinnedVersion)
    $pnpmCmd = Resolve-Pnpm
    $pnpmVer = Get-PnpmVersion $pnpmCmd
    if ($pnpmVer -ne $pinnedVersion) {
      Write-Error ("Failed to set pnpm version to {0}. Current: {1}" -f $pinnedVersion, $pnpmVer)
      exit 1
    }
  }
  return $pnpmCmd
}

function Run-Pnpm($pnpmCmd, [string[]]$pnpmArgs, $logPath) {
  $argLine = ($pnpmArgs -join ' ')
  Write-Host ("Running: {0} {1}" -f $pnpmCmd, $argLine) -ForegroundColor DarkGray
  if ($logPath) { Write-Host ("Logging to: {0}" -f $logPath) -ForegroundColor DarkGray }
  if ($logPath) { Remove-Item -LiteralPath $logPath -Force -ErrorAction Ignore }
  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = $pnpmCmd
  $startInfo.Arguments = $argLine
  $startInfo.UseShellExecute = $false
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $proc = New-Object System.Diagnostics.Process
  $proc.StartInfo = $startInfo
  $null = $proc.Start()
  $stdOut = $proc.StandardOutput.ReadToEnd()
  $stdErr = $proc.StandardError.ReadToEnd()
  $proc.WaitForExit()
  if ($logPath) {
    $stdOut | Out-File -FilePath $logPath -Encoding utf8
    if ($stdErr) { $stdErr | Out-File -FilePath $logPath -Encoding utf8 -Append }
  }
  if ($stdOut) { Write-Host $stdOut }
  if ($stdErr) { Write-Host $stdErr }
  return $proc.ExitCode
}

function Analyze-InstallFailure($logText) {
  $result = [pscustomobject]@{
    IsBetterSqliteIssue = $false
    IsGypVsIssue = $false
    Summary = @()
  }
  if ($logText -match 'better-sqlite3' -or $logText -match 'NODE_MODULE_VERSION' -or $logText -match 'compiled against a different Node\.js version') {
    $result.IsBetterSqliteIssue = $true
    $result.Summary += 'Detected better-sqlite3 / ABI mismatch hints.'
  }
  if ($logText -match 'gyp ERR!' -and ($logText -match 'find VS' -or $logText -match 'msbuild' -or $logText -match 'C\+\+')) {
    $result.IsGypVsIssue = $true
    $result.Summary += 'Detected node-gyp / Visual Studio Build Tools issue.'
  }
  return $result
}

# --- Main ---

Require-RepoRoot
Ensure-Node23
$pinnedPnpm = '10.4.0'
$pnpmCmd = Ensure-Pnpm -pinnedVersion $pinnedPnpm

Write-Section 'Installing workspace dependencies'
$installLog = Join-Path (Get-Location) 'install-windows.log'
$code = Run-Pnpm -pnpmCmd $pnpmCmd -pnpmArgs @('-w','install') -logPath $installLog

if ($code -eq 0) {
  Write-Host "Install completed successfully." -ForegroundColor Green
  exit 0
}

Write-Host "Install failed. Analyzing log..." -ForegroundColor Yellow
$logText = Get-Content -LiteralPath $installLog -Raw
$analysis = Analyze-InstallFailure -logText $logText
if ($analysis.Summary.Count -gt 0) {
  $analysis.Summary | ForEach-Object { Write-Host "- $_" -ForegroundColor Yellow }
}

$retry = $false
if ($analysis.IsBetterSqliteIssue) {
  Write-Section 'Rebuilding better-sqlite3'
  $rebuildLog = Join-Path (Get-Location) 'rebuild-better-sqlite3.log'
  $rebuildCode = Run-Pnpm -pnpmCmd $pnpmCmd -pnpmArgs @('-w','rebuild','better-sqlite3') -logPath $rebuildLog
  if ($rebuildCode -eq 0) {
    $retry = $true
  } else {
    Write-Host "Rebuild failed. Check rebuild-better-sqlite3.log" -ForegroundColor Red
  }
}

if ($retry) {
  Write-Section 'Retrying install'
  $code = Run-Pnpm -pnpmCmd $pnpmCmd -pnpmArgs @('-w','install') -logPath $installLog
  if ($code -eq 0) {
    Write-Host "Install succeeded after rebuild." -ForegroundColor Green
    exit 0
  }
}

if ($analysis.IsGypVsIssue) {
  Write-Host "Detected Visual Studio Build Tools issue." -ForegroundColor Yellow
  Write-Host "Install 'Desktop development with C++' workload (VS Build Tools 2022) and retry." -ForegroundColor Yellow
  Write-Host "Link: https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor Yellow
}

Write-Host "Install still failing. Please share the first 200 lines of install-windows.log." -ForegroundColor Red
exit 1
