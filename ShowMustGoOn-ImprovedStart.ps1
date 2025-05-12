# ShowMustGoOn-ImprovedStart.ps1
#
# Improved startup script for ArtBastard_DMX512FTW with built-in error handling and recovery
#

# Enable verbose output
$VerbosePreference = "Continue"

# Set error action preference
$ErrorActionPreference = "Continue"

# Function to write colored text
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-ArtHeading {
    Write-Host ""
    Write-ColorOutput Green "╔═══════════════════════════════════════════════════════════════╗"
    Write-ColorOutput Green "║                 ArtBastard DMX512FTW Launcher                 ║"
    Write-ColorOutput Green "║                Improved Stability & Error Handling            ║"
    Write-ColorOutput Green "╚═══════════════════════════════════════════════════════════════╝"
    Write-Host ""
}

Write-ArtHeading

# Check if we're running from the correct directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Kill existing node processes that might be from previous crashed instances
Write-Host "🔄 Checking for existing ArtBastard processes..."
try {
    $nodePids = Get-Process -Name "node" -ErrorAction SilentlyContinue | 
                Where-Object { $_.MainWindowTitle -match "ArtBastard" -or $_.CommandLine -match "ArtBastard" } | 
                Select-Object -ExpandProperty Id
    
    if ($nodePids) {
        foreach ($pid in $nodePids) {
            Write-Host "   ❌ Killing existing process with PID: $pid"
            Stop-Process -Id $pid -Force
        }
    } else {
        Write-Host "   ✅ No existing processes found."
    }
} catch {
    Write-ColorOutput Yellow "   ⚠️ Couldn't check for existing processes: $_"
}

# Check if required ports are available
Write-Host "🔄 Checking if required ports are available..."
$reqPorts = @(3000, 3001, 5173)
$needToKillProcess = $false

foreach ($port in $reqPorts) {
    $portInUse = $null
    try {
        $portInUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    } catch {
        Write-Host "   ✅ Port $port is available."
        continue
    }
    
    if ($portInUse) {
        $needToKillProcess = $true
        $process = Get-Process -Id $portInUse.OwningProcess -ErrorAction SilentlyContinue
        
        if ($process) {
            Write-Host "   ❌ Port $port is in use by $($process.ProcessName) (PID: $($process.Id)). Attempting to kill..."
            try {
                Stop-Process -Id $process.Id -Force
                Write-Host "     ✅ Process killed successfully."
            } catch {
                Write-ColorOutput Yellow "     ⚠️ Failed to kill process: $_"
            }
        } else {
            Write-ColorOutput Yellow "   ⚠️ Port $port is in use but couldn't identify the process."
        }
    } else {
        Write-Host "   ✅ Port $port is available."
    }
}

if ($needToKillProcess) {
    Write-Host "   🕒 Waiting a few seconds for ports to free up..."
    Start-Sleep -Seconds 3
}

# Clean up environment
Write-Host "🔄 Cleaning up environment..."

# Removing logs
if (Test-Path "logs") {
    # Keep backup of original logs
    if (!(Test-Path "logs_backup")) {
        New-Item -ItemType Directory -Path "logs_backup" | Out-Null
    }
    
    Copy-Item -Path "logs\*" -Destination "logs_backup\" -Force -ErrorAction SilentlyContinue
    
    try {
        Remove-Item -Path "logs\*" -Force -ErrorAction SilentlyContinue
        Write-Host "   ✅ Cleared logs directory."
    } catch {
        Write-ColorOutput Yellow "   ⚠️ Failed to clear logs: $_"
    }
} else {
    New-Item -ItemType Directory -Path "logs" | Out-Null
    Write-Host "   ✅ Created logs directory."
}

# Clean build artifacts
Write-Host "🔄 Cleaning build artifacts..."
$buildDirs = @(
    ".\node_modules\.vite",
    ".\react-app\node_modules\.vite", 
    ".\react-app\dist"
)

foreach ($dir in $buildDirs) {
    if (Test-Path $dir) {
        try {
            Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "   ✅ Removed build directory: $dir"
        } catch {
            Write-ColorOutput Yellow "   ⚠️ Failed to remove $dir : $_"
        }
    }
}

# Main installation process
Write-Host "🔄 Installing dependencies for backend..."
try {
    npm install --no-audit --loglevel=error
    if ($LASTEXITCODE -ne 0) { throw "NPM install failed for backend" }
    Write-Host "   ✅ Backend dependencies installed."
} catch {
    Write-ColorOutput Red "   ❌ Failed to install backend dependencies: $_"
    Write-ColorOutput Yellow "   🔄 Trying with --force flag..."
    try {
        npm install --no-audit --force --loglevel=error
        if ($LASTEXITCODE -ne 0) { throw "NPM install --force failed for backend" }
        Write-Host "   ✅ Backend dependencies force-installed."
    } catch {
        Write-ColorOutput Red "   ❌ Failed to force-install backend dependencies: $_"
        Write-ColorOutput Red "   😞 Exiting due to critical installation failure."
        exit 1
    }
}

# Install frontend dependencies
Write-Host "🔄 Installing dependencies for frontend..."
try {
    Set-Location "react-app"
    npm install --no-audit --loglevel=error
    if ($LASTEXITCODE -ne 0) { throw "NPM install failed for frontend" }
    Write-Host "   ✅ Frontend dependencies installed."
} catch {
    Write-ColorOutput Red "   ❌ Failed to install frontend dependencies: $_"
    Write-ColorOutput Yellow "   🔄 Trying with --force flag..."
    try {
        npm install --no-audit --force --loglevel=error
        if ($LASTEXITCODE -ne 0) { throw "NPM install --force failed for frontend" }
        Write-Host "   ✅ Frontend dependencies force-installed."
    } catch {
        Write-ColorOutput Red "   ❌ Failed to force-install frontend dependencies: $_"
        Write-ColorOutput Red "   😞 Exiting due to critical installation failure."
        exit 1
    }
    Set-Location ".."
}
Set-Location ".."

# Build backend
Write-Host "🔄 Building backend..."
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Backend build failed" }
    Write-Host "   ✅ Backend built successfully."
} catch {
    Write-ColorOutput Yellow "   ⚠️ Backend build failed: $_"
    Write-ColorOutput Yellow "   🔄 Trying build without typechecking..."
    try {
        node build-without-typechecking.js
        Write-Host "   ✅ Backend built without typechecking."
    } catch {
        Write-ColorOutput Red "   ❌ All backend build attempts failed: $_"
        Write-ColorOutput Red "   😞 Exiting due to critical build failure."
        exit 1
    }
}

# Build frontend
Write-Host "🔄 Building frontend..."
try {
    Set-Location "react-app"
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
    Write-Host "   ✅ Frontend built successfully."
} catch {
    Write-ColorOutput Yellow "   ⚠️ Frontend build failed: $_"
    Write-ColorOutput Yellow "   🔄 Trying build without typechecking..."
    try {
        node build-without-ts-checks.js
        Write-Host "   ✅ Frontend built without typechecking."
    } catch {
        Write-ColorOutput Red "   ❌ All frontend build attempts failed: $_"
        Write-ColorOutput Red "   😞 Exiting due to critical build failure."
        exit 1
    }
}
Set-Location ".."

# Start server with watchdog
Write-Host "🔄 Starting server with watchdog..."
try {
    # Start the watchdog process
    Start-Process -FilePath "node" -ArgumentList "watchdog.js" -NoNewWindow
    Write-Host "   ✅ Watchdog started."
    
    Write-Host ""
    Write-ColorOutput Green "╔═══════════════════════════════════════════════════════════════╗"
    Write-ColorOutput Green "║                  Application Started!                         ║"
    Write-ColorOutput Green "║                                                               ║"
    Write-ColorOutput Green "║  ▶ Server will be available at: http://localhost:3001         ║" 
    Write-ColorOutput Green "║  ▶ Watchdog is monitoring the application                     ║"
    Write-ColorOutput Green "║  ▶ It will automatically restart if it crashes                ║"
    Write-ColorOutput Green "╚═══════════════════════════════════════════════════════════════╝"
    Write-Host ""
    
    # Open browser
    Start-Process "http://localhost:3001"
    
    Write-Host "Press any key to terminate the application and exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    
    # Clean up when exiting
    Write-Host "🔄 Shutting down application..."
    Get-Process -Name "node" | Where-Object { $_.MainWindowTitle -match "ArtBastard" -or $_.CommandLine -match "watchdog" } | Stop-Process -Force
    Write-Host "✅ Shutdown complete."
} catch {
    Write-ColorOutput Red "   ❌ Failed to start application: $_"
    exit 1
}
