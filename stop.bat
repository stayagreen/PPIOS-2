@echo off
taskkill /f /im node.exe /fi "WINDOWTITLE eq PPISO-DevServer*" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq PPISO-DevServer*" >nul 2>&1
echo Server stopped
pause
