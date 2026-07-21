@echo off
chcp 65001 >nul 2>nul
echo Stopping Tasks.md server...

:: Find and kill process on port 8080
set "found=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do (
    taskkill /pid %%a /f >nul 2>&1
    echo Stopped (PID: %%a)
    set "found=1"
)

:: Also kill wscript if running our VBS
taskkill /im wscript.exe /f >nul 2>&1

if "%found%"=="0" (
    echo Server was not running.
) else (
    echo Server stopped.
)
pause >nul