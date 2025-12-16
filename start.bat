@echo off
setlocal

echo Changing to script directory...
cd /d "%~dp0"

echo ====================================
echo --- Starting Backend Service ---
echo ====================================
start "Backend Service" cmd /k "cd backend && call .venv\Scripts\activate && uvicorn app.main:app --reload"

echo ====================================
echo --- Starting Frontend Service ---
echo ====================================
start "Frontend Service" cmd /k "cd frontend && npm run dev"

echo ====================================
echo Both backend and frontend services are starting in new windows.
echo Please check those windows for status and access the application in your browser.
echo ====================================
endlocal
exit