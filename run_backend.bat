@echo off
title EcoFruit Backend Server (Port 8000)
echo ========================================================
echo   KHOI DONG BACKEND DJANGO REST API - ECOFRUIT
echo ========================================================
cd /d "%~dp0"

if exist ".venv\Scripts\python.exe" (
    echo [OK] Su dung Python trong moi truong ao .venv...
    .venv\Scripts\python.exe backend\manage.py runserver 0.0.0.0:8000
) else (
    echo [!] Khong tim thay .venv, thu chay voi python he thong...
    python backend\manage.py runserver 0.0.0.0:8000
)
pause
