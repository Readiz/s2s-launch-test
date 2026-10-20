@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 or newer, then run this file again.
  pause
  exit /b 1
)
if not exist node_modules\ws\package.json (
  call npm ci --omit=dev
  if errorlevel 1 exit /b 1
)
node src\server.mjs a
pause
