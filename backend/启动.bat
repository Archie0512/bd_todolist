@echo off
chcp 65001 >nul 2>nul
cd /d "%~dp0"

:: Check if already running
netstat -ano | findstr ":8080" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo Server is already running.
    start http://localhost:8080
    exit /b
)

:: Launch via VBS (completely hidden, no window)
wscript "run-hidden.vbs"
echo Server started (hidden, no window).
echo Access: http://localhost:8080