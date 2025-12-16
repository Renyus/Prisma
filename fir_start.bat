@echo off
setlocal

echo Checking for Python...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo Python not found. Please install Python 3.10+ and add it to your PATH.
    echo Exiting...
    pause
    exit /b 1
)
python --version
echo Python found.

echo Checking for Node.js and npm...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo npm not found. Please install Node.js (which includes npm).
    echo Exiting...
    pause
    exit /b 1
)
npm --version
echo npm found.

echo ====================================
echo --- Starting Backend Setup ---
echo ====================================
cd backend

if not exist .venv (
    echo Creating Python virtual environment...
    python -m venv .venv
) else (
    echo Python virtual environment already exists.
)

echo Activating virtual environment...
call .venv\Scripts\activate

echo Installing/Upgrading pip...
pip install --upgrade pip

echo Installing Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo Failed to install Python dependencies.
    pause
    exit /b 1
)
echo Backend setup complete.

cd ..

echo ====================================
echo --- Starting Frontend Setup ---
echo ====================================
cd frontend

echo Installing Node.js dependencies...
npm install
if %errorlevel% neq 0 (
    echo Failed to install Node.js dependencies.
    pause
    exit /b 1
)
echo Frontend setup complete.

cd ..

echo ====================================
echo All setup steps completed successfully!
echo You can now run 'start.bat' to launch the application.
echo ====================================
pause
endlocal