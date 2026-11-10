@echo off
setlocal
cd /d "%~dp0"
title RUSHLINE - Import Animated Runner
if "%~1"=="" (
  echo.
  echo Drag your downloaded animated .glb character file onto IMPORT-RUNNER.bat.
  echo Download original CC0 model from:
  echo https://github.com/rana-jatin/avatar-stage/blob/main/demo/public/models/demo-avatar.glb
  echo Click Download raw file on GitHub, save the .glb, then drag it here.
  echo.
  pause
  exit /b 1
)
echo Importing animated character from: %~1
call npm run assets:import -- --character "%~1"
if errorlevel 1 goto fail
call npm run assets:scan
if errorlevel 1 goto fail
echo.
echo Character installed. Double-click START-RUSHLINE.bat to play.
pause
exit /b 0
:fail
echo.
echo Import failed. Your file must be a complete GLB with a Run animation.
pause
exit /b 1
