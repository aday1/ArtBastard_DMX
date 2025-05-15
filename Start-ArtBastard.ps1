# Start-ArtBastard.ps1
# A script to start the ArtBastard DMX application on Windows

# Show a status message with color
function Write-Status {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$false)]
        [ValidateSet("Info", "Success", "Warning", "Error")]
        [string]$Type = "Info"
    )
    
    $color = switch ($Type) {
        "Info"    { "Cyan" }
        "Success" { "Green" }
        "Warning" { "Yellow" }
        "Error"   { "Red" }
        default   { "White" }
    }
    
    $prefix = switch ($Type) {
        "Info"    { "ℹ️" }
        "Success" { "✅" }
        "Warning" { "⚠️" }
        "Error"   { "❌" }
        default   { ">" }
    }
    
    Write-Host "$prefix $Message" -ForegroundColor $color
}

# Startup banner
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║                                                          ║" -ForegroundColor Magenta
Write-Host "║         🎛️  ArtBastard DMX Start Script  🎛️          ║" -ForegroundColor Magenta
Write-Host "║                                                          ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Status "Node.js $nodeVersion detected" -Type Success
} catch {
    Write-Status "Node.js is not installed or not in PATH. Please install Node.js." -Type Error
    exit 1
}

# Set paths
$scriptDir = $PSScriptRoot
$logDir = Join-Path $scriptDir "logs"
$backendLogFile = Join-Path $logDir "backend-server.log"
$frontendLogFile = Join-Path $logDir "frontend-server.log"

# Create logs directory if needed
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
    Write-Status "Created logs directory" -Type Info
}

# Build the backend server
Write-Status "Building backend server..." -Type Info
try {
    Set-Location $scriptDir
    $env:NODE_OPTIONS = "--max-old-space-size=1024" # Increase memory for build
    npm run build-backend
    Write-Status "Backend build successful" -Type Success
} catch {
    Write-Status "Backend build failed: $_" -Type Error
    exit 1
}

# Start the backend server
Write-Status "Starting backend server on port 3030..." -Type Info
Start-Process -FilePath "node" -ArgumentList "dist/main.js" -RedirectStandardOutput $backendLogFile -RedirectStandardError $backendLogFile -NoNewWindow
Start-Sleep -Seconds 2 # Give the server time to start

# Build React frontend
Write-Status "Building React frontend..." -Type Info
try {
    Set-Location (Join-Path $scriptDir "react-app")
    $env:NODE_OPTIONS = "--max-old-space-size=1024" # Increase memory for build
    npx tsc
    npx vite build
    Write-Status "React frontend build successful" -Type Success
} catch {
    Write-Status "React frontend build warning: $_" -Type Warning
    Write-Status "Continuing with development server..." -Type Info
}

# Start Vite development server
Write-Status "Starting Vite development server on port 3001..." -Type Info
Set-Location (Join-Path $scriptDir "react-app")
Start-Process -FilePath "npx" -ArgumentList "vite" -RedirectStandardOutput $frontendLogFile -RedirectStandardError $frontendLogFile -NoNewWindow

# Wait a moment for the servers to initialize
Start-Sleep -Seconds 5

# Provide access instructions
Write-Status "Application startup complete!" -Type Success
Write-Status "Backend server running on http://localhost:3030" -Type Info
Write-Status "Frontend available at http://localhost:3001" -Type Info
Write-Status "Log files:" -Type Info
Write-Status "  - Backend: $backendLogFile" -Type Info
Write-Status "  - Frontend: $frontendLogFile" -Type Info
Write-Status "Press Ctrl+C in respective terminal windows to stop the servers" -Type Info

# Open the application in the default browser
Write-Status "Opening application in browser..." -Type Info
Start-Process "http://localhost:3001"
