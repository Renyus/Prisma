#!/bin/bash
set -e

echo "Changing to script directory..."
cd "$(dirname "$0")"

echo "Checking for Python 3..."
if ! command -v python3 &> /dev/null
then
    echo "Python 3 not found. Please install Python 3.10+."
    exit 1
fi
python3 --version
echo "Python 3 found."

echo "Checking for Node.js and npm..."
if ! command -v npm &> /dev/null
then
    echo "npm not found. Please install Node.js (which includes npm)."
    exit 1
fi
npm --version
echo "npm found."

echo "===================================="
echo "--- Starting Backend Setup ---"
echo "===================================="
cd backend

if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
else
    echo "Python virtual environment already exists."
fi

echo "Activating virtual environment..."
source .venv/bin/activate

echo "Installing/Upgrading pip..."
pip install --upgrade pip

echo "Installing Python dependencies..."
pip install -r requirements.txt
echo "Backend setup complete."

cd ..

echo "===================================="
echo "--- Starting Frontend Setup ---"
echo "===================================="
cd frontend

echo "Installing Node.js dependencies..."
npm install
echo "Frontend setup complete."

cd ..

echo "===================================="
echo "All setup steps completed successfully!"
echo "You can now run './start.sh' to launch the application."
echo "===================================="
