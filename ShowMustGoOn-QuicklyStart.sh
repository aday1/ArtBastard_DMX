#!/usr/bin/env bash

# ShowMustGoOn-QuicklyStart.sh
# Quick startup script for ArtBastard_DMX512FTW
# Handles cleanup, build and launching of the app

# Set error handling
set -e

# Function to print colorful messages
print_message() {
  local color=$1
  local message=$2
  case $color in
    green) echo -e "\e[32m$message\e[0m" ;;
    blue) echo -e "\e[34m$message\e[0m" ;;
    red) echo -e "\e[31m$message\e[0m" ;;
    yellow) echo -e "\e[33m$message\e[0m" ;;
    *) echo "$message" ;;
  esac
}

print_message blue "🎭 THE SHOW MUST GO ON! 🎭"
print_message blue "Starting ArtBastard DMX512FTW Quick Setup..."

# Check if we're running on Windows using PowerShell
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  print_message yellow "Running in Windows PowerShell mode"
  POWERSHELL=true
else
  POWERSHELL=false
fi

# Step 1: Kill any existing Node.js processes for this app
print_message green "Terminating any existing ArtBastard processes..."
if [ "$POWERSHELL" = true ]; then
  powershell -Command "Get-Process -Name '*node*' | Where-Object { \$_.CommandLine -like '*ArtBastard*' -or \$_.CommandLine -like '*artbastard*' } | Stop-Process -Force" 2>/dev/null || true
else
  pkill -f "node.*[aA]rt[bB]astard" 2>/dev/null || true
fi

# Step 2: Check if ports are in use and free them if needed (3000 for backend, 5173 for dev frontend)
print_message green "Checking if required ports are free..."

check_and_free_port() {
  local port=$1
  if [ "$POWERSHELL" = true ]; then
    pid=$(powershell -Command "Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess" 2>/dev/null)
    if [ ! -z "$pid" ]; then
      print_message yellow "Port $port is in use. Freeing it up..."
      powershell -Command "Stop-Process -Id $pid -Force" 2>/dev/null
    fi
  else
    pid=$(lsof -i:$port -t 2>/dev/null)
    if [ ! -z "$pid" ]; then
      print_message yellow "Port $port is in use. Freeing it up..."
      kill -9 $pid 2>/dev/null || true
    fi
  fi
}

check_and_free_port 3000
check_and_free_port 5173

# Step 3: Clean up the environment
print_message green "Cleaning up environment..."

# Remove log files
print_message yellow "Clearing log files..."
rm -rf "$(pwd)/logs"/*.log 2>/dev/null || true
mkdir -p "$(pwd)/logs"

# Clean build artifacts
print_message yellow "Cleaning build artifacts..."
rm -rf "$(pwd)/dist" 2>/dev/null || true
rm -rf "$(pwd)/react-app/dist" 2>/dev/null || true
rm -rf "$(pwd)/react-app/node_modules/.vite" 2>/dev/null || true

# Step 4: Install and build backend and frontend
print_message green "Installing dependencies and building application..."

# Install backend dependencies
print_message yellow "Installing backend dependencies..."
npm install

# Install frontend dependencies
print_message yellow "Installing frontend dependencies..."
cd react-app && npm install
cd ..

# Build backend
print_message yellow "Building backend..."
node build-without-typechecking.js

# Build frontend
print_message yellow "Building frontend..."
cd react-app && node build-without-ts-checks.js
cd ..

# Step 5: Start the server and open browser
print_message green "Starting ArtBastard DMX512FTW server..."

# Start server
if [ "$POWERSHELL" = true ]; then
  # Use PowerShell to start server and open browser
  powershell -Command "Start-Process -NoNewWindow node -ArgumentList 'dist/main.js'"
  sleep 3  # Give server time to start
  powershell -Command "Start-Process 'http://localhost:3000'"
else
  # Start server and open browser on Linux/Mac
  node dist/main.js & 
  sleep 3  # Give server time to start
  
  # Open browser - try different commands based on OS
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:3000"
  elif command -v open >/dev/null 2>&1; then
    open "http://localhost:3000"
  fi
fi

print_message blue "🎛️  ArtBastard DMX512FTW has been started!"
print_message blue "🌟 Visit http://localhost:3000 in your browser if it doesn't open automatically"
print_message blue "🎭 THE SHOW IS ON! 🎭"
