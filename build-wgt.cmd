@echo off
setlocal
cd /d "%~dp0"
node scripts\build-tv.mjs
if errorlevel 1 exit /b 1
if "%~1"=="" (
  echo UNSIGNED packages are in dist\unsigned.
  echo To sign, add Tizen CLI to PATH and run: build-wgt.cmd PROFILE_NAME
  exit /b 0
)
where tizen >nul 2>nul
if errorlevel 1 (
  echo Add Tizen Studio tools\ide\bin to PATH.
  exit /b 1
)
for %%G in (game-a game-b game-c) do (
  call tizen package -t wgt -s "%~1" -- "build\tv\%%G"
  if errorlevel 1 exit /b 1
)
echo Signed WGTs are in each build\tv\game-* folder. dist\unsigned is unchanged.
