<#
  Bootstrap a portable Node 23.7.0 (no admin), prepend it to PATH,
  then run the Windows install fixer.

  Usage (repo root):
    powershell -ExecutionPolicy Bypass -File .\scripts\windows\bootstrap-node23.ps1
#>

param()

$ErrorActionPreference = 'Stop'

$tools = Join-Path (Get-Location) '.tools'
if (-not (Test-Path -LiteralPath $tools)) { New-Item -ItemType Directory -Path $tools | Out-Null }

$ver = '23.7.0'
$zip = Join-Path $tools ("node-v$ver-win-x64.zip")
$nodeDir = Join-Path $tools ("node-v$ver-win-x64")

if (-not (Test-Path -LiteralPath $nodeDir)) {
  if (-not (Test-Path -LiteralPath $zip)) {
    $url = "https://nodejs.org/download/release/v$ver/node-v$ver-win-x64.zip"
    Write-Host "Downloading Node $ver from $url"
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
  }
  Write-Host "Extracting to $tools"
  Expand-Archive -Path $zip -DestinationPath $tools -Force
}

$env:PATH = "$nodeDir;$env:PATH"
Write-Host "Using Node at: $nodeDir"
node -v

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path (Get-Location) 'scripts/windows/fix-pnpm-install.ps1')
