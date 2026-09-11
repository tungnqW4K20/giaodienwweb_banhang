@echo off
title EcoFruit Frontend Web Server (Port 3000)
echo ========================================================
echo   KHOI DONG FRONTEND WEB SERVER - ECOFRUIT
echo ========================================================
echo   Dia chi truy cap: http://localhost:3000/index.html
echo ========================================================
cd /d "%~dp0"

if exist ".venv\Scripts\python.exe" (
    .venv\Scripts\python.exe -m http.server 3000
) else (
    python -m http.server 3000
)
pause
