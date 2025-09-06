@echo off
setlocal
REM Run the PowerShell helper with ExecutionPolicy bypass
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0fix-pnpm-install.ps1" %*
endlocal
