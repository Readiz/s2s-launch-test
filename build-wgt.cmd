@echo off
setlocal
cd /d "%~dp0"
node scripts\build-tv.mjs
if errorlevel 1 exit /b 1
if "%~1"=="" (
  echo UNSIGNED package: dist\unsigned\gaming-hub.wgt
  echo To sign: build-wgt.cmd PROFILE_NAME
  exit /b 0
)
where tizen >nul 2>nul
if errorlevel 1 (
  echo Add Tizen Studio tools\ide\bin to PATH.
  exit /b 1
)
call tizen package -t wgt -s "%~1" -- "build\tv\gaming-hub"
if errorlevel 1 exit /b 1
echo Signed package: build\tv\gaming-hub. dist\unsigned is unchanged.
