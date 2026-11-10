@echo off
setlocal
cd /d "%~dp0"
title RUSHLINE - Phase Two
where node >nul 2>nul
if errorlevel 1 (
 echo [ERROR] Node.js is missing. Install Node.js 22 LTS from https://nodejs.org/
 pause
 exit /b 1
)
echo.
echo =======================================
echo       R U S H L I N E  -  P H A S E  0 2
echo =======================================
echo.
echo [1/4] Installing 3D engine and build dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 goto fail
echo [2/4] Installing free CC0 3D models and textures...
call npm run assets:download
if errorlevel 1 goto assetsfail
echo [3/4] Checking models and character animations...
call npm run assets:scan
if errorlevel 1 goto fail
echo [4/4] Starting local game server...
echo Open http://localhost:5173 in your browser.
call npm run dev
exit /b %errorlevel%
:assetsfail
echo.
echo Character download routes failed. Your other models remain saved.
echo Get the CC0 character here:
echo https://github.com/rana-jatin/avatar-stage/blob/main/demo/public/models/demo-avatar.glb
echo Click Download raw file and drag the resulting .glb onto IMPORT-RUNNER.bat.
echo Then run START-RUSHLINE.bat again.
echo.
goto fail
:fail
echo.
echo SETUP STOPPED: See README.md for troubleshooting or manual asset downloads.
pause
exit /b 1
