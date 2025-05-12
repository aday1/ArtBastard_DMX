#!/bin/bash
#
# ShowMustGoOn-ImprovedStart.sh
# Improved startup script for ArtBastard_DMX512FTW with built-in error handling and recovery
#

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

print_heading() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                 ArtBastard DMX512FTW Launcher                 ║${NC}"
    echo -e "${GREEN}║                Improved Stability & Error Handling            ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_heading

# Make sure we're in the right directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
cd "$SCRIPT_DIR" || { echo -e "${RED}Failed to change to script directory${NC}"; exit 1; }

# Kill existing processes
echo "🔄 Checking for existing ArtBastard processes..."
PIDS=$(pgrep -f "node.*artbastard|node.*start-server")
if [ -n "$PIDS" ]; then
    echo "$PIDS" | while read -r pid; do
        echo "   ❌ Killing existing process with PID: $pid"
        kill -9 "$pid" 2>/dev/null
    done
else
    echo "   ✅ No existing processes found."
fi

# Check if required ports are available
echo "🔄 Checking if required ports are available..."
REQ_PORTS=(3000 3001 5173)
NEED_TO_KILL=false

for port in "${REQ_PORTS[@]}"; do
    if command -v ss &>/dev/null; then
        PORT_IN_USE=$(ss -tunl | grep ":$port " || true)
    elif command -v netstat &>/dev/null; then
        PORT_IN_USE=$(netstat -tunl | grep ":$port " || true)
    else
        PORT_IN_USE=$(lsof -i ":$port" 2>/dev/null || true)
    fi
    
    if [ -n "$PORT_IN_USE" ]; then
        NEED_TO_KILL=true
        if command -v lsof &>/dev/null; then
            PID=$(lsof -i ":$port" -t 2>/dev/null || true)
            if [ -n "$PID" ]; then
                PROC_NAME=$(ps -p "$PID" -o comm= 2>/dev/null || echo "unknown")
                echo "   ❌ Port $port is in use by $PROC_NAME (PID: $PID). Attempting to kill..."
                kill -9 "$PID" 2>/dev/null
                echo "     ✅ Process killed successfully."
            else
                echo -e "   ${YELLOW}⚠️ Port $port is in use but couldn't identify the process.${NC}"
            fi
        else
            echo -e "   ${YELLOW}⚠️ Port $port is in use but lsof command not available to identify process.${NC}"
        fi
    else
        echo "   ✅ Port $port is available."
    fi
done

if [ "$NEED_TO_KILL" = true ]; then
    echo "   🕒 Waiting a few seconds for ports to free up..."
    sleep 3
fi

# Clean up environment
echo "🔄 Cleaning up environment..."

# Handling logs
if [ -d "logs" ]; then
    # Keep backup of original logs
    mkdir -p logs_backup
    cp -f logs/* logs_backup/ 2>/dev/null || true
    
    rm -rf logs/* 2>/dev/null
    echo "   ✅ Cleared logs directory."
else
    mkdir -p logs
    echo "   ✅ Created logs directory."
fi

# Clean build artifacts
echo "🔄 Cleaning build artifacts..."
BUILD_DIRS=(
    "./node_modules/.vite"
    "./react-app/node_modules/.vite"
    "./react-app/dist"
)

for dir in "${BUILD_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        rm -rf "$dir" 2>/dev/null && echo "   ✅ Removed build directory: $dir" || echo -e "   ${YELLOW}⚠️ Failed to remove $dir${NC}"
    fi
done

# Install backend dependencies
echo "🔄 Installing dependencies for backend..."
npm install --no-audit --loglevel=error

if [ $? -ne 0 ]; then
    echo -e "   ${YELLOW}⚠️ Backend dependency installation failed. Trying with --force flag...${NC}"
    npm install --no-audit --force --loglevel=error
    
    if [ $? -ne 0 ]; then
        echo -e "   ${RED}❌ Failed to force-install backend dependencies${NC}"
        echo -e "   ${RED}😞 Exiting due to critical installation failure.${NC}"
        exit 1
    else
        echo "   ✅ Backend dependencies force-installed."
    fi
else
    echo "   ✅ Backend dependencies installed."
fi

# Install frontend dependencies
echo "🔄 Installing dependencies for frontend..."
cd react-app || { echo -e "${RED}Failed to change to react-app directory${NC}"; exit 1; }
npm install --no-audit --loglevel=error

if [ $? -ne 0 ]; then
    echo -e "   ${YELLOW}⚠️ Frontend dependency installation failed. Trying with --force flag...${NC}"
    npm install --no-audit --force --loglevel=error
    
    if [ $? -ne 0 ]; then
        echo -e "   ${RED}❌ Failed to force-install frontend dependencies${NC}"
        echo -e "   ${RED}😞 Exiting due to critical installation failure.${NC}"
        exit 1
    else
        echo "   ✅ Frontend dependencies force-installed."
    fi
else
    echo "   ✅ Frontend dependencies installed."
fi
cd ..

# Build backend
echo "🔄 Building backend..."
npm run build

if [ $? -ne 0 ]; then
    echo -e "   ${YELLOW}⚠️ Backend build failed. Trying build without typechecking...${NC}"
    node build-without-typechecking.js
    
    if [ $? -ne 0 ]; then
        echo -e "   ${RED}❌ All backend build attempts failed${NC}"
        echo -e "   ${RED}😞 Exiting due to critical build failure.${NC}"
        exit 1
    else
        echo "   ✅ Backend built without typechecking."
    fi
else
    echo "   ✅ Backend built successfully."
fi

# Build frontend
echo "🔄 Building frontend..."
cd react-app || { echo -e "${RED}Failed to change to react-app directory${NC}"; exit 1; }
npm run build

if [ $? -ne 0 ]; then
    echo -e "   ${YELLOW}⚠️ Frontend build failed. Trying build without typechecking...${NC}"
    node build-without-ts-checks.js
    
    if [ $? -ne 0 ]; then
        echo -e "   ${RED}❌ All frontend build attempts failed${NC}"
        echo -e "   ${RED}😞 Exiting due to critical build failure.${NC}"
        exit 1
    else
        echo "   ✅ Frontend built without typechecking."
    fi
else
    echo "   ✅ Frontend built successfully."
fi
cd ..

# Start server with watchdog
echo "🔄 Starting server with watchdog..."

# Start the watchdog in the background
node watchdog.js &
WATCHDOG_PID=$!

if [ $? -ne 0 ]; then
    echo -e "   ${RED}❌ Failed to start watchdog${NC}"
    exit 1
else
    echo "   ✅ Watchdog started with PID: $WATCHDOG_PID"

    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  Application Started!                         ║${NC}"
    echo -e "${GREEN}║                                                               ║${NC}"
    echo -e "${GREEN}║  ▶ Server will be available at: http://localhost:3001         ║${NC}" 
    echo -e "${GREEN}║  ▶ Watchdog is monitoring the application                     ║${NC}"
    echo -e "${GREEN}║  ▶ It will automatically restart if it crashes                ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Open browser if we have a command for it
    if command -v xdg-open &>/dev/null; then
        xdg-open http://localhost:3001
    elif command -v open &>/dev/null; then
        open http://localhost:3001
    else
        echo -e "${YELLOW}⚠️ Could not open browser automatically. Please navigate to http://localhost:3001${NC}"
    fi
    
    echo "Press Ctrl+C to terminate the application and exit..."
    
    # Wait for Ctrl+C
    trap "echo '🔄 Shutting down application...'; kill -9 $WATCHDOG_PID 2>/dev/null; pkill -f 'node.*artbastard|node.*start-server' 2>/dev/null; echo '✅ Shutdown complete.'; exit 0" SIGINT SIGTERM
    
    # Keep the script running
    while true; do
        sleep 1
    done
fi
