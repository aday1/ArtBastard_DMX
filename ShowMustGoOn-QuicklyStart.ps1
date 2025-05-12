# ShowMustGoOn-QuicklyStart.ps1
# Quick startup script for ArtBastard_DMX512FTW
# Handles cleanup, build and launching of the app

# Function to print colorful messages
function Print-Message {
    param(
        [string]$color,
        [string]$message
    )
    
    switch ($color) {
        "green" { Write-Host $message -ForegroundColor Green }
        "blue" { Write-Host $message -ForegroundColor Blue }
        "red" { Write-Host $message -ForegroundColor Red }
        "yellow" { Write-Host $message -ForegroundColor Yellow }
        default { Write-Host $message }
    }
}

Print-Message "blue" "🎭 THE SHOW MUST GO ON! 🎭"
Print-Message "blue" "Starting ArtBastard DMX512FTW Quick Setup..."

# Step 1: Kill any existing Node.js processes for this app
Print-Message "green" "Terminating any existing ArtBastard processes..."
Get-Process -Name "node" -ErrorAction SilentlyContinue | 
    Where-Object { $_.CommandLine -like "*ArtBastard*" -or $_.CommandLine -like "*artbastard*" } | 
    Stop-Process -Force -ErrorAction SilentlyContinue

# Step 2: Check if ports are in use and free them if needed
Print-Message "green" "Checking if required ports are free..."

function Check-And-Free-Port {
    param([int]$port)
    
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        Print-Message "yellow" "Port $port is in use. Freeing it up..."
        foreach ($conn in $connections) {
            $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($process) {
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                Print-Message "yellow" "Stopped process: $($process.ProcessName)"
            }
        }
    }
}

Check-And-Free-Port -port 3000
Check-And-Free-Port -port 5173

# Step 3: Clean up the environment
Print-Message "green" "Cleaning up environment..."

# Current directory
$currentDir = Get-Location

# Remove log files
Print-Message "yellow" "Clearing log files..."
Remove-Item -Path "$currentDir\logs\*.log" -Force -ErrorAction SilentlyContinue
if (-not (Test-Path "$currentDir\logs")) {
    New-Item -Path "$currentDir\logs" -ItemType Directory -Force | Out-Null
}

# Clean build artifacts
Print-Message "yellow" "Cleaning build artifacts..."
Remove-Item -Path "$currentDir\dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$currentDir\react-app\dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$currentDir\react-app\node_modules\.vite" -Recurse -Force -ErrorAction SilentlyContinue

# Step 4: Install and build backend and frontend
Print-Message "green" "Installing dependencies and building application..."

# Install backend dependencies
Print-Message "yellow" "Installing backend dependencies..."
npm install

# Install frontend dependencies
Print-Message "yellow" "Installing frontend dependencies..."
Set-Location -Path "$currentDir\react-app"
npm install
Set-Location -Path $currentDir

# Build backend
Print-Message "yellow" "Building backend..."
node build-without-typechecking.js

# Build frontend
Print-Message "yellow" "Building frontend..."
Set-Location -Path "$currentDir\react-app"
node build-without-ts-checks.js
Set-Location -Path $currentDir

# Step 5: Start the server and open browser
Print-Message "green" "Starting ArtBastard DMX512FTW server..."

# Start server in background
$serverProcess = Start-Process -FilePath "node" -ArgumentList "dist/main.js" -NoNewWindow -PassThru

# Give server time to start
Print-Message "yellow" "Server starting, please wait..."
Start-Sleep -Seconds 3

# Open browser
Start-Process "http://localhost:3000"

Print-Message "blue" "🎛️  ArtBastard DMX512FTW has been started!"
Print-Message "blue" "🌟 Visit http://localhost:3000 in your browser if it doesn't open automatically"
Print-Message "blue" "🎭 THE SHOW IS ON! 🎭"

# Keep script running until user presses a key
Print-Message "yellow" "Press any key to stop the server and exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Clean up the server process
if ($serverProcess) {
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    Print-Message "yellow" "Server stopped."
}
