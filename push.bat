@echo off
title Push Stickman Fight to GitHub
echo ======================================================
echo  Pushing to https://github.com/rehanraza0063-sudo/STICKMAN-GAME01
echo ======================================================
cd /d "%~dp0"
git push -u origin main
echo.
if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Game pushed to GitHub successfully!
) else (
    echo [NOTE] If prompted, please sign in via browser or enter your GitHub Personal Access Token.
)
echo.
pause
