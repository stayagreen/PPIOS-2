@echo off
cd /d "%~dp0"
start "PPISO-DevServer" /min cmd /c "npm run dev"
timeout /t 3 /nobreak >nul
echo Server started: http://localhost:6001
pause
