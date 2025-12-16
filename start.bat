@echo off
REM --- Configuration ---
SET BACKEND_PORT=8000
SET FRONTEND_PORT=3000
SET "PROJECT_ROOT=%~dp0"

REM --- Utility Functions ---
SET "LOG_INFO=echo [INFO]"
SET "LOG_WARN=echo [WARN]"
SET "LOG_ERROR=echo [ERROR]"

CALL :check_command python
IF ERRORLEVEL 1 (
    CALL :LOG_ERROR "Python is not installed or not in PATH. Please install it to proceed."
    GOTO :eof
)
CALL :check_command pip
IF ERRORLEVEL 1 (
    CALL :LOG_ERROR "pip is not installed or not in PATH. Please install it to proceed."
    GOTO :eof
)
CALL :check_command node
IF ERRORLEVEL 1 (
    CALL :LOG_ERROR "Node.js is not installed or not in PATH. Please install it to proceed."
    GOTO :eof
)
CALL :check_command npm
IF ERRORLEVEL 1 (
    CALL :LOG_ERROR "npm is not installed or not in PATH. Please install it to proceed."
    GOTO :eof
)

GOTO :main

:check_command
    where %1 >nul 2>nul
    IF %ERRORLEVEL% NEQ 0 (
        (CALL :LOG_ERROR "%1 is not installed. Please install it to proceed.")
        EXIT /B 1
    )
    EXIT /B 0

:cleanup
    %LOG_INFO% "Stopping all background processes..."
    REM Terminate the parent process and its children.
    taskkill /im uvicorn.exe /f >nul 2>nul
    taskkill /im python.exe /f >nul 2>nul
    taskkill /im node.exe /f >nul 2>nul
    taskkill /im npm.cmd /f >nul 2>nul
    taskkill /im cmd.exe /f /fi "WINDOWTITLE eq Prisma Startup" >nul 2>nul
    %LOG_INFO% "Cleanup complete."
    EXIT /B 0

:main
    TITLE Prisma Startup
    %LOG_INFO% "Checking prerequisites..."
    %LOG_INFO% "Prerequisites check complete."

    REM --- Backend Setup and Start (Python/FastAPI) ---
    %LOG_INFO% "Setting up and starting backend..."
    CD "%PROJECT_ROOT%backend" || (CALL :LOG_ERROR "Failed to enter backend directory." && GOTO :eof)

    REM Create and activate virtual environment
    IF NOT EXIST ".venv" (
        %LOG_INFO% "Creating Python virtual environment..."
        python -m venv .venv || (CALL :LOG_ERROR "Failed to create virtual environment." && GOTO :eof)
    )
    CALL ".venv\Scripts\activate.bat" || (CALL :LOG_ERROR "Failed to activate virtual environment." && GOTO :eof)
    %LOG_INFO% "Python virtual environment activated."

    REM Install dependencies
    IF EXIST "requirements.txt" (
        %LOG_INFO% "Installing backend dependencies..."
        pip install -r requirements.txt || (CALL :LOG_ERROR "Failed to install backend dependencies." && GOTO :eof)
    ) ELSE (
        %LOG_WARN% "requirements.txt not found in backend directory. Skipping dependency installation."
    )

    %LOG_INFO% "Starting FastAPI backend on http://localhost:%BACKEND_PORT% ..."
    REM Start backend in a new console window, detached.
    START "Prisma Backend" cmd /c "CD /D "%PROJECT_ROOT%backend" && CALL ".venv\Scripts\activate.bat" && uvicorn app.main:app --host 0.0.0.0 --port %BACKEND_PORT% --reload"
    %LOG_INFO% "Backend process started."
    CD "%PROJECT_ROOT%"

    REM --- Frontend Setup and Start (Next.js) ---
    %LOG_INFO% "Setting up and starting frontend..."
    CD "%PROJECT_ROOT%frontend" || (CALL :LOG_ERROR "Failed to enter frontend directory." && GOTO :eof)

    REM Install dependencies
    %LOG_INFO% "Installing frontend dependencies..."
    npm install || (CALL :LOG_ERROR "Failed to install frontend dependencies." && GOTO :eof)

    %LOG_INFO% "Starting Next.js frontend on http://localhost:%FRONTEND_PORT% ..."
    REM Start frontend in a new console window, detached.
    START "Prisma Frontend" cmd /c "CD /D "%PROJECT_ROOT%frontend" && npm run dev"
    %LOG_INFO% "Frontend process started."
    CD "%PROJECT_ROOT%"

    %LOG_INFO% "Both backend and frontend services are starting. Please wait for them to be fully operational."
    %LOG_INFO% "Backend: http://localhost:%BACKEND_PORT%"
    %LOG_INFO% "Frontend: http://localhost:%FRONTEND_PORT%"
    %LOG_INFO% "To stop both services, manually close the 'Prisma Backend' and 'Prisma Frontend' windows."
    %LOG_INFO% "Alternatively, for a cleaner shutdown, you can try closing this main script window and hoping Windows cleans up child processes."
    %LOG_INFO% "Or, use task manager to kill 'uvicorn.exe' and 'node.exe' processes."
    
    REM Keep the main window open until user closes it
    PAUSE

GOTO :eof