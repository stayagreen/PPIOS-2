@echo off
taskkill /f /im node.exe /fi "WINDOWTITLE eq PPISO-DevServer*" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq PPISO-DevServer*" >nul 2>&1
timeout /t 1 /nobreak >nul
cd /d "%~dp0"
start "PPISO-DevServer" /min cmd /c "npm run dev"
timeout /t 3 /nobreak >nul
echo Server restarted: http://localhost:6001
pause
