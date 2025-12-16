#!/bin/bash

# --- Configuration ---
BACKEND_PORT=${BACKEND_PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
PROJECT_ROOT=$(pwd)

# --- Utility Functions ---

log_info() {
    echo -e "\033[0;32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[0;33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
    exit 1
}

check_command() {
    command -v "$1" >/dev/null 2>&1 || log_error "$1 is not installed. Please install it to proceed."
}

# --- Cleanup on exit ---
cleanup() {
    log_info "Stopping all background processes..."
    # Kill processes started by this script in the background
    kill $(jobs -p) 2>/dev/null
    log_info "Cleanup complete."
    exit 0
}
trap cleanup SIGINT SIGTERM

# --- Prerequisites Check ---
log_info "Checking prerequisites..."
check_command python3
check_command pip3
check_command node
check_command npm
log_info "Prerequisites check complete."

# --- Backend Setup and Start (Python/FastAPI) ---
log_info "Setting up and starting backend..."
cd "$PROJECT_ROOT/backend" || log_error "Failed to enter backend directory."

# Create and activate virtual environment
if [ ! -d ".venv" ]; then
    log_info "Creating Python virtual environment..."
    python3 -m venv .venv || log_error "Failed to create virtual environment."
fi
source .venv/bin/activate || log_error "Failed to activate virtual environment."
log_info "Python virtual environment activated."

# Install dependencies
if [ -f "requirements.txt" ]; then
    log_info "Installing backend dependencies..."
    pip install -r requirements.txt || log_error "Failed to install backend dependencies."
else
    log_warn "requirements.txt not found in backend directory. Skipping dependency installation."
fi

log_info "Starting FastAPI backend on http://localhost:$BACKEND_PORT ..."
# Start backend in the background
uvicorn app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload &
BACKEND_PID=$!
log_info "Backend process started with PID: $BACKEND_PID"
cd "$PROJECT_ROOT"

# --- Frontend Setup and Start (Next.js) ---
log_info "Setting up and starting frontend..."
cd "$PROJECT_ROOT/frontend" || log_error "Failed to enter frontend directory."

# Install dependencies
log_info "Installing frontend dependencies..."
npm install || log_error "Failed to install frontend dependencies."

log_info "Starting Next.js frontend on http://localhost:$FRONTEND_PORT ..."
# Start frontend in the background
npm run dev &
FRONTEND_PID=$!
log_info "Frontend process started with PID: $FRONTEND_PID"
cd "$PROJECT_ROOT"

log_info "Both backend and frontend services are starting. Please wait for them to be fully operational."
log_info "Backend: http://localhost:$BACKEND_PORT"
log_info "Frontend: http://localhost:$FRONTEND_PORT"
log_info "Press Ctrl+C to stop both services."

wait # Wait for all background jobs to finish (or for Ctrl+C)
