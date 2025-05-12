#!/bin/bash

# Configuration
APP_NAME="ArtBastard DMX"
REACT_APP_PORT=3000
SERVER_PORT=3030
LOG_FILE="server-startup.log"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Helper Functions for Colored Output ---
Color_Off='\033[0m'       # Text Reset
BRed='\033[1;31m'         # Red
BGreen='\033[1;32m'       # Green
BYellow='\033[1;33m'      # Yellow
BBlue='\033[1;34m'        # Blue
BPurple='\033[1;35m'      # Purple
BCyan='\033[1;36m'        # Cyan

write_success() {
    echo -e "${BGreen}✅ $1${Color_Off}"
}

write_info() {
    echo -e "${BCyan}ℹ️ $1${Color_Off}"
}

write_warning() {
    echo -e "${BYellow}⚠️ $1${Color_Off}"
}

write_error() {
    echo -e "${BRed}❌ $1${Color_Off}"
}

# --- Check if Port is in Use ---
test_port_in_use() {
    if netstat -tuln | grep -q ":$1\s"; then
        return 0 # Port is in use
    else
        return 1 # Port is not in use
    fi
}

# --- Welcome Banner ---
echo -e "${BPurple}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║         🎛️  $APP_NAME Start Script  🎛️          ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝${Color_Off}"
echo ""

# --- Clean Project & Install Dependencies ---
write_info "Cleaning root node_modules and package-lock.json..."
rm -rf node_modules package-lock.json
write_success "Root cleaning complete."

write_info "Cleaning react-app node_modules and package-lock.json..."
rm -rf "$SCRIPT_DIR/react-app/node_modules" "$SCRIPT_DIR/react-app/package-lock.json"
write_success "React-app cleaning complete."

write_info "Reinstalling all dependencies..."
if npm run install-all; then
    write_success "All dependencies installed successfully."
else
    write_error "Dependency installation failed. Please check output above."
    exit 1
fi
echo ""

# --- Kill Existing Processes (Optional) ---
for port in $SERVER_PORT $REACT_APP_PORT; do
    if test_port_in_use $port; then
        write_warning "Port $port is already in use!"
        read -p "Do you want to try to kill the process on port $port? (y/n) " -n 1 -r
        echo # Move to a new line
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            PID_TO_KILL=$(netstat -tulnp | grep ":$port\s" | awk '{print $7}' | cut -d'/' -f1)
            if [ -n "$PID_TO_KILL" ]; then # Check if PID_TO_KILL is not empty
                kill -9 "$PID_TO_KILL" > /dev/null 2>&1
                if [ $? -eq 0 ]; then
                    write_success "Killed process on port $port (PID: $PID_TO_KILL)"
                    sleep 1 # Give time for port to be released
                else
                    write_error "Failed to kill process on port $port (PID: $PID_TO_KILL). It might require sudo or be a zombie process."
                fi
            else
                 write_warning "Could not find PID for process on port $port."
            fi 
        else
            write_info "Skipping termination for port $port. Startup might fail if the port is still blocked."
        fi
    fi
done

# --- Clean Old Log Files ---
if [ -f "$LOG_FILE" ]; then
    rm -f "$LOG_FILE"
    write_info "Removed old log file: $LOG_FILE"
fi

# --- Build Backend ---
write_info "Building server..."
if npm run build-backend; then
    write_success "Server build successful."
else
    write_error "Server build failed. Please check the output above."
    exit 1
fi

# --- Build Frontend (React App) ---
write_info "Building React app..."
cd "$SCRIPT_DIR/react-app" || exit
if npx --node-options="--max-old-space-size=1024" tsc && npx --node-options="--max-old-space-size=1024" vite build; then # Added memory limit
    write_success "React app build successful."
else
    write_error "React app build failed. Please check the output above."
    # Optionally, decide if you want to exit or continue without the frontend
    # exit 1
fi
cd "$SCRIPT_DIR" || exit # Go back to the root directory

# --- Start Backend Server ---
write_info "Starting backend server in the background..."
# Using start-server.js as it seems to be the intended entry point
node start-server.js > "$SCRIPT_DIR/$LOG_FILE" 2>&1 &
SERVER_PID=$!
sleep 2 # Give server a moment to start

if ps -p $SERVER_PID > /dev/null; then
    write_success "Backend server started (PID: $SERVER_PID). Output logged to $LOG_FILE"
else
    write_error "Backend server failed to start. Check $LOG_FILE for details."
    # exit 1 # Uncomment if server failing to start should stop the script
fi

# --- Start React App (Development Server) ---
write_info "Starting React app development server in the background..."
cd "$SCRIPT_DIR/react-app" || exit
npx --node-options="--max-old-space-size=1024" vite > "$SCRIPT_DIR/react-app-dev-server.log" 2>&1 & # Added memory limit
REACT_APP_PID=$!
sleep 5 # Give React app dev server time to start

if ps -p $REACT_APP_PID > /dev/null; then
    write_success "React app development server started (PID: $REACT_APP_PID)."
    write_info "Frontend should be available at http://localhost:$REACT_APP_PORT"
else
    write_error "React app development server failed to start. Check react-app-dev-server.log for details."
fi

cd "$SCRIPT_DIR" || exit

write_info "All processes launched. Monitor logs for details."
write_info "To stop the servers, you might need to manually kill the processes (PIDs: $SERVER_PID, $REACT_APP_PID) or use 'killall node' if appropriate."
