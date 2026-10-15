@echo off
title Stickman Fight Launcher
echo ======================================================
echo    Starting Stickman Fight on localhost...
echo ======================================================
cd /d "%~dp0"

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Launching with Python...
    python server.py
    goto end
)

where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Launching with Node.js...
    node server.js
    goto end
)

echo Neither Python nor Node.js found in PATH.
echo Opening index.html directly in your default browser...
start "" "%~dp0index.html"

:end
pause
