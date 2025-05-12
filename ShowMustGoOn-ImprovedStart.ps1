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

# Use cmd.exe to run npm commands with persistent execution
function Start-NpmProcess {
    param(
        [string]$Command,
        [string]$WorkingDirectory = $PSScriptRoot,
        [switch]$UseNodemon = $false
    )
    
    Write-Info "Running npm $Command in $WorkingDirectory"
    
    # Special handling for React app startup vs server startup
    $isReactApp = $WorkingDirectory.EndsWith("react-app")
    
    # For server start, use node with -r option to prevent immediate exit
    if ($Command -eq "start" -and -not $UseNodemon -and -not $isReactApp) {
        try {
            # Try using a batch file approach for more stability
            $batchFile = Join-Path $env:TEMP "ArtBastardDMX_StartServer.bat"
            $batchContent = @"
@echo off
cd /d "$WorkingDirectory"
echo Starting ArtBastard DMX server...
node ./dist/main.js
pause
"@
            $batchContent | Out-File -FilePath $batchFile -Encoding ascii -Force
            Write-Info "Created batch launcher: $batchFile"
            
            $process = Start-Process -FilePath $batchFile -NoNewWindow -PassThru
            return $process
        } catch {
            Write-Warning "Batch file approach failed: $($_.Exception.Message)"
            # Fall through to standard approach
        }
    }
    
    # Handle React app specially to make sure we use npm start directly
    if ($isReactApp -and $Command -eq "start") {
        $processArgs = "/k cd `"$WorkingDirectory`" && npm start"
        try {
            $process = Start-Process -FilePath "cmd.exe" -ArgumentList $processArgs -NoNewWindow -PassThru
            return $process
        } catch {
            Write-Error "Failed to start React app: $($_.Exception.Message)"
            return $null
        }
    }
    
    # Standard npm command execution for other cases
    $processArgs = "/c cd `"$WorkingDirectory`" && npm $Command"
    
    try {
        $process = Start-Process -FilePath "cmd.exe" -ArgumentList $processArgs -NoNewWindow -PassThru
        return $process
    } catch {
        Write-Error "Failed to start npm process: $($_.Exception.Message)"
        return $null
    }
}

# Start the server using persistent approach
$serverProcess = $null

# Try multiple approaches to start the server
$serverStarted = $false

# Approach 1: Try direct node execution
if (-not $serverStarted) {
    Write-Info "Starting server with direct node execution..."
    try {
        $mainJsPath = Join-Path $PSScriptRoot "dist\main.js"
        if (Test-Path $mainJsPath) {
            $cmdArgs = "/k cd /d `"$PSScriptRoot`" && node `"$mainJsPath`""
            $serverProcess = Start-Process -FilePath "cmd.exe" -ArgumentList $cmdArgs -NoNewWindow -PassThru
            
            # Give it a moment to start
            Start-Sleep -Seconds 2
            
            if ($null -ne $serverProcess -and -not $serverProcess.HasExited) {
                $serverStarted = $true
                Write-Success "Server started successfully with direct node execution"
            } else {
                Write-Warning "Direct node execution started but process exited immediately"
            }
        } else {
            Write-Warning "Could not find main.js at $mainJsPath"
        }
    } catch {
        Write-Warning "Error starting with direct node execution: $($_.Exception.Message)"
    }
}

# Approach 2: Use npm start
if (-not $serverStarted) {
    Write-Info "Trying npm start..."
    try {
        $cmdArgs = "/k cd /d `"$PSScriptRoot`" && npm start"
        $serverProcess = Start-Process -FilePath "cmd.exe" -ArgumentList $cmdArgs -NoNewWindow -PassThru
        
        # Give it a moment to start
        Start-Sleep -Seconds 2
        
        if ($null -ne $serverProcess -and -not $serverProcess.HasExited) {
            $serverStarted = $true
            Write-Success "Server started successfully with npm start"
        } else {
            Write-Warning "npm start process exited immediately"
        }
    } catch {
        Write-Warning "Error starting with npm start: $($_.Exception.Message)"
    }
}

# Approach 3: Create a temporary batch file that will keep running
if (-not $serverStarted) {
    Write-Info "Using batch file approach for server start..."
    try {
        $batchFile = Join-Path $env:TEMP "ArtBastardDMX_StartServer.bat"
        $batchContent = @"
@echo off
echo ArtBastard DMX Server
cd /d "$PSScriptRoot"
echo Starting server...
node ./dist/main.js
echo Server process ended, press any key to close this window.
pause > nul
"@
        $batchContent | Out-File -FilePath $batchFile -Encoding ascii -Force
        Write-Info "Created batch launcher: $batchFile"
        
        $serverProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/k `"$batchFile`"" -NoNewWindow -PassThru
        
        # Give it a moment to start
        Start-Sleep -Seconds 2
        
        if ($null -ne $serverProcess -and -not $serverProcess.HasExited) {
            $serverStarted = $true
            Write-Success "Server started successfully with batch file approach"
        } else {
            Write-Warning "Batch file approach failed - process exited immediately"
        }
    } catch {
        Write-Warning "Error using batch file approach: $($_.Exception.Message)"
    }
}

if (-not $serverStarted) {
    Write-Error "All server start methods failed. Please try starting the server manually."
    exit 1
}

# Start React app if needed
if (-not $NoReactApp) {
    Write-Info "Starting React app..."
    $reactAppDir = Join-Path $PSScriptRoot "react-app"
    
    # Start React app using cmd.exe wrapper (use standard npm start for React)
    $reactProcess = Start-NpmProcess -Command "start" -WorkingDirectory $reactAppDir
    
    if ($null -eq $reactProcess) {
        Write-Warning "Failed to start React app. You may need to start it manually:"
        Write-Warning "cd '$reactAppDir' && npm start"
    } else {
        Write-Success "React app starting on port $ReactAppPort"
    }
}

# Wait for server to be ready
Write-Info "Waiting for server to start (timeout: ${StartTimeout}s)..."
$startTime = Get-Date
$serverReady = $false

# If the server process is already running and confirmed, consider it ready
if ($serverStarted) {
    # Give the server a bit more time to fully initialize
    Start-Sleep -Seconds 3
    $serverReady = $true
    Write-Info "Server process is running, considering it ready"
} 

while (-not $serverReady -and ((Get-Date) - $startTime).TotalSeconds -lt $StartTimeout) {
    # Check if the server process has exited prematurely
    if ($serverProcess.HasExited) {
        $exitCode = $serverProcess.ExitCode
        Write-Error "Server process exited prematurely with code $exitCode"
        
        # If exit code is 0, try launching with a different approach
        if ($exitCode -eq 0) {
            Write-Info "Server exited normally. Trying to launch in a different way..."
            
            # Try running with npm directly
            Write-Info "Attempting direct 'node app' approach..."
            try {
                # Look for the main server file
                $distDir = Join-Path $PSScriptRoot "dist"
                $mainJsPath = Join-Path $distDir "main.js"
                
                if (Test-Path $mainJsPath) {
                    Write-Info "Starting server with: node $mainJsPath"
                    $serverProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd `"$PSScriptRoot`" && node `"$mainJsPath`"" -NoNewWindow -PassThru
                    # Reset timeout
                    $startTime = Get-Date
                } else {
                    Write-Warning "Could not find main.js in the dist directory"
                    Write-Error "Cannot restart server - main script not found"
                    exit 1
                }
            } catch {
                Write-Error "Failed to restart server: $($_.Exception.Message)"
                exit 1
            }
        } else {
            # For non-zero exit codes, try to fix boxen error
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
                $serverProcess = Start-NpmProcess -Command "start"
                
                # Reset the timeout
                $startTime = Get-Date
            } else {
                Write-Error "Unable to fix and restart automatically. Please check the error manually."
                exit 1
            }
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
                $reactProcess = Start-NpmProcess -Command "start" -WorkingDirectory (Join-Path $PSScriptRoot "react-app")
            }
            
            if ($serverProcess -and $serverProcess.HasExited) {
                Write-Error "Server process has exited unexpectedly with code $($serverProcess.ExitCode)"
                
                # Attempt to restart server
                Write-Info "Attempting to restart server..."
                $serverProcess = Start-NpmProcess -Command "start"
                
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
