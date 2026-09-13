@echo off
title WildGotcha Backend Server
cd /d "%~dp0backend"
echo ===================================================
echo   Starting WildGotcha AI Backend (FastAPI)
echo   OpenCV Preprocessor + TensorFlow + MongoDB Atlas
echo ===================================================
call venv\Scripts\activate.bat
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
