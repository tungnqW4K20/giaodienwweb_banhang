@echo off
title EcoFruit Fullstack Runner
echo ========================================================
echo   KHOI DONG TOAN BO HE THONG ECOFRUIT (BACKEND + FRONTEND)
echo ========================================================
cd /d "%~dp0"

start "EcoFruit Backend (Port 8000)" run_backend.bat
start "EcoFruit Frontend (Port 3000)" run_frontend.bat

echo.
echo [THANH CONG] Ca 2 server da duoc khoi dong trong cac cua so rieng biet!
echo - Frontend Website: http://localhost:3000/index.html
echo - Backend API:      http://127.0.0.1:8000/api/v1/
echo - Admin Dashboard:  http://127.0.0.1:8000/admin/
echo.
timeout /t 3
start http://localhost:3000/index.html
