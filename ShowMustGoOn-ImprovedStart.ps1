param(
    [switch]$SkipBuild,
    [switch]$NoReactApp,
    [switch]$DevMode,
    [switch]$FixBoxenError
)

# Configuration
$AppName = "ArtBastard DMX"
$StartTimeout = 10 # seconds to wait for server to start
$ReactAppPort = 3000
$ServerPort = 3030
$LogFile = Join-Path $PSScriptRoot "server-startup.log"
$LoggerJsPath = Join-Path $PSScriptRoot "src\logger.js"

# Helper Functions
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

function Write-Success($message) {
    Write-ColorOutput Green "✅ $message"
}

function Write-Info($message) {
    Write-ColorOutput Cyan "ℹ️ $message"
}

function Write-Warning($message) {
    Write-ColorOutput Yellow "⚠️ $message"
}

function Write-Error($message) {
    Write-ColorOutput Red "❌ $message"
}

function Test-PortInUse($port) {
    $connections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | 
                   Where-Object { $_.LocalPort -eq $port }
    return $null -ne $connections
}

function Fix-BoxenError {
    # Check if logger.js exists
    $loggerJsDir = Split-Path -Path $LoggerJsPath -Parent
    
    if (-not (Test-Path $loggerJsDir)) {
        Write-Info "Creating logger directory..."
        New-Item -ItemType Directory -Path $loggerJsDir -Force | Out-Null
    }
    
    Write-Info "Fixing boxen borderColor error in logger.js..."
    
    # Create the fixed logger.js file with string color values instead of functions
    $loggerJsContent = @'
const chalk = require('chalk');
const boxen = require('boxen');

// Define log levels with string color values for boxen
const LOG_LEVELS = {
  INFO: {
    color: 'blue',
    prefix: 'ℹ️',
    borderColor: 'blue'  // String value instead of function
  },
  SUCCESS: {
    color: 'green',
    prefix: '✅',
    borderColor: 'green'  // String value instead of function
  },
  WARNING: {
    color: 'yellow',
    prefix: '⚠️',
    borderColor: 'yellow'  // String value instead of function
  },
  ERROR: {
    color: 'red',
    prefix: '❌',
    borderColor: 'red'  // String value instead of function
  },
  DEBUG: {
    color: 'magenta',
    prefix: '🔍',
    borderColor: 'magenta'  // String value instead of function
  }
};

/**
 * Log a message with optional styling
 * @param {string} message - The message to log
 * @param {string} level - Log level (INFO, SUCCESS, WARNING, ERROR, DEBUG)
 * @param {boolean} box - Whether to display the message in a box
 */
function log(message, level = 'INFO', box = false) {
  const config = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  const colorFunction = chalk[config.color];
  
  let formattedMessage = `${config.prefix} ${message}`;
  
  if (box) {
    console.log(boxen(colorFunction(formattedMessage), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: config.borderColor, // Using string value, not chalk function
      backgroundColor: '#000'
    }));
  } else {
    console.log(colorFunction(formattedMessage));
  }
}

module.exports = {
  log,
  info: (message, box = false) => log(message, 'INFO', box),
  success: (message, box = false) => log(message, 'SUCCESS', box),
  warning: (message, box = false) => log(message, 'WARNING', box),
  error: (message, box = false) => log(message, 'ERROR', box),
  debug: (message, box = false) => log(message, 'DEBUG', box)
};
'@

    # Write the content to the file
    $loggerJsContent | Out-File -FilePath $LoggerJsPath -Encoding utf8 -Force
    
    if (Test-Path $LoggerJsPath) {
        Write-Success "logger.js updated successfully at $LoggerJsPath"
        return $true
    } else {
        Write-Error "Failed to create or update logger.js"
        return $false
    }
}

# Show welcome banner
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║                                                          ║" -ForegroundColor Magenta
Write-Host "║         " -ForegroundColor Magenta -NoNewline; Write-Host "🎛️  $AppName Start Script  🎛️" -ForegroundColor White -NoNewline; Write-Host "          ║" -ForegroundColor Magenta
Write-Host "║                                                          ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# Fix boxen error if requested or always apply the fix
if ($FixBoxenError -or $true) { # Always apply the fix
    $fixResult = Fix-BoxenError
    if (-not $fixResult) {
        Write-Warning "Failed to fix boxen error. The server might still crash."
    }
}

# Check if server port is already in use
if (Test-PortInUse -port $ServerPort) {
    Write-Warning "Port $ServerPort is already in use! The server might already be running."
    $existingProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -match "ArtBastard_DMX"
    }
    
    if ($existingProcess) {
        Write-Info "Found existing node process (PID: $($existingProcess.Id))"
        $shouldTerminate = Read-Host "Do you want to terminate the existing process and continue? (y/n)"
        
        if ($shouldTerminate -eq "y") {
            try {
                Stop-Process -Id $existingProcess.Id -Force
                Write-Success "Terminated existing process"
                # Give some time for the port to be released
                Start-Sleep -Seconds 1
            } catch {
                Write-Error "Failed to terminate process: $_"
                exit 1
            }
        } else {
            Write-Info "Startup aborted by user. The existing server will continue running."
            exit 0
        }
    }
}

# Clean up any old log files
if (Test-Path $LogFile) {
    Remove-Item $LogFile -Force
    Write-Info "Removed old log file"
}

# Build the project if not skipped
if (-not $SkipBuild) {
    Write-Info "Building server..."
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed with exit code $LASTEXITCODE"
        exit 1
    }
    
    Write-Success "Build completed"
} else {
    Write-Info "Build step skipped"
}

# Start the server in the background
Write-Info "Starting server..."
$serverProcess = Start-Process -FilePath "npm" -ArgumentList "start" -NoNewWindow -PassThru

# Start React app if needed
if (-not $NoReactApp) {
    Write-Info "Starting React app..."
    $reactProcess = Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory (Join-Path $PSScriptRoot "react-app") -NoNewWindow -PassThru
    Write-Success "React app starting on port $ReactAppPort"
}

# Wait for server to be ready
Write-Info "Waiting for server to start (timeout: ${StartTimeout}s)..."
$startTime = Get-Date
$serverReady = $false

while (-not $serverReady -and ((Get-Date) - $startTime).TotalSeconds -lt $StartTimeout) {
    # Check if the server process has exited prematurely
    if ($serverProcess.HasExited) {
        Write-Error "Server process exited prematurely with code $($serverProcess.ExitCode)"
        
        Write-Info "Checking for common errors..."
        Write-Warning "Server might have crashed due to the boxen module error. Let's try to fix it..."
        
        $fixResult = Fix-BoxenError
        if ($fixResult) {
            Write-Info "Attempting to rebuild and restart the server..."
            npm run build
            
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Build failed with exit code $LASTEXITCODE"
                exit 1
            }
            
            # Try starting the server again
            $serverProcess = Start-Process -FilePath "npm" -ArgumentList "start" -NoNewWindow -PassThru
            
            # Reset the timeout
            $startTime = Get-Date
        } else {
            Write-Error "Unable to fix and restart automatically. Please check the error manually."
            exit 1
        }
    }

    if (Test-PortInUse -port $ServerPort) {
        $serverReady = $true
    } else {
        Start-Sleep -Milliseconds 500
    }
}

if ($serverReady) {
    Write-Success "Server is up and running on port $ServerPort"
    
    # Open browser if both parts are running
    if (-not $NoReactApp) {
        Write-Info "Opening browser to http://localhost:$ReactAppPort"
        Start-Process "http://localhost:$ReactAppPort"
    }

    # Keep script running to manage the processes
    Write-Info "Press Ctrl+C to shutdown the application..."
    try {
        while ($true) {
            Start-Sleep -Seconds 5
            
            # Check if processes are still running
            if (-not $NoReactApp -and $reactProcess -and $reactProcess.HasExited) {
                Write-Warning "React app process has exited unexpectedly with code $($reactProcess.ExitCode)"
                
                # Attempt to restart React app
                Write-Info "Attempting to restart React app..."
                $reactProcess = Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory (Join-Path $PSScriptRoot "react-app") -NoNewWindow -PassThru
            }
            
            if ($serverProcess -and $serverProcess.HasExited) {
                Write-Error "Server process has exited unexpectedly with code $($serverProcess.ExitCode)"
                
                # Attempt to restart server
                Write-Info "Attempting to restart server..."
                $serverProcess = Start-Process -FilePath "npm" -ArgumentList "start" -NoNewWindow -PassThru
                
                # Give it some time to start
                Start-Sleep -Seconds 3
            }
        }
    } catch [System.Management.Automation.PSInternalException] {
        # This is likely a Ctrl+C
        Write-Info "Received shutdown signal..."
    } finally {
        Write-Info "Shutting down application..."
        
        # Stop the server process if still running
        if ($serverProcess -and -not $serverProcess.HasExited) {
            $serverProcess | Stop-Process -Force
        }
        
        # Stop the React app if still running
        if (-not $NoReactApp -and $reactProcess -and -not $reactProcess.HasExited) {
            $reactProcess | Stop-Process -Force
        }

        # Kill any remaining node processes related to our app
        try {
            Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
                $_.CommandLine -match "ArtBastard_DMX"
            } | ForEach-Object {
                Stop-Process -Id $_.Id -Force
            }
        } catch {
            Write-Warning "Some processes could not be terminated: $_"
        }
        
        Write-Success "Shutdown complete."
    }
} else {
    Write-Error "Server failed to start within timeout period ($StartTimeout seconds)"
    
    # Stop processes
    if ($serverProcess -and -not $serverProcess.HasExited) {
        $serverProcess | Stop-Process -Force
    }
    
    if (-not $NoReactApp -and $reactProcess -and -not $reactProcess.HasExited) {
        $reactProcess | Stop-Process -Force
    }
    
    exit 1
}
