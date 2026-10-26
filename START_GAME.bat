@echo off
title Echoes of the Enemy - Tactical Survival Launcher
echo ===================================================
echo     ECHOES OF THE ENEMY - 2D SURVIVAL GAME
echo ===================================================
echo Starting game server...

:: Navigate to this script directory
cd /d "%~dp0"

:: Check if port 8080 is already open, if not start python server in background
netstat -ano | findstr :8080 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    start /b python -m http.server 8080
    timeout /t 2 >nul
)

echo Opening game in your default browser...
start http://localhost:8080/

echo Game is running at http://localhost:8080/
echo (Keep this window open while playing. Close it when done.)
echo.
pause
