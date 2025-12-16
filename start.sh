#!/bin/bash
set -m # Enable job control

echo "Changing to script directory..."
cd "$(dirname "$0")"

# Function to clean up background processes
cleanup() {
    echo -e "\nStopping services..."
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
        echo "Backend service (PID $BACKEND_PID) stopped."
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
        echo "Frontend service (PID $FRONTEND_PID) stopped."
    fi
    exit 0
}

# Trap Ctrl+C (SIGINT), SIGTERM, and EXIT to run cleanup function
trap cleanup SIGINT SIGTERM EXIT

echo "===================================="
echo "--- Starting Backend Service ---"
echo "===================================="
# Start backend in a subshell, redirect logs to backend.log, and run in background
(cd backend && source .venv/bin/activate && uvicorn app.main:app --reload &> ../backend.log &) &
BACKEND_PID=$!
echo "Backend service started with PID $BACKEND_PID. Logs can be found in backend.log in the project root."
echo "Access backend at http://127.0.0.1:8000 (default)"

echo "===================================="
echo "--- Starting Frontend Service ---"
echo "===================================="
# Start frontend in a subshell, redirect logs to frontend.log, and run in background
(cd frontend && npm run dev &> ../frontend.log &) &
FRONTEND_PID=$!
echo "Frontend service started with PID $FRONTEND_PID. Logs can be found in frontend.log in the project root."
echo "Access frontend at http://localhost:3000 (default)"

echo "===================================="
echo "Both backend and frontend services are running in the background."
echo "You can check backend.log and frontend.log for output."
echo "Press Ctrl+C to stop both services."
echo "===================================="

# Keep the script running to allow trap to catch signals
wait "$BACKEND_PID" "$FRONTEND_PID"
