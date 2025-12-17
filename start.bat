@echo off
setlocal

echo Changing to script directory...
cd /d "%~dp0"
echo Checking and cleaning up ports...
:: 检查并关闭占用 8000 端口 (后端) 的进程
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo Killing process %%a on port 8000...
    taskkill /f /pid %%a >nul 2>&1
)
:: 检查并关闭占用 3000 端口 (前端) 的进程
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo Killing process %%a on port 3000...
    taskkill /f /pid %%a >nul 2>&1
)
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