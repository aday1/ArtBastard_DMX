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

# Log panel configuration
$global:DMXLogFile = Join-Path $PSScriptRoot "dmx-channel-traffic.log"
$global:MIDILogFile = Join-Path $PSScriptRoot "midi-traffic.log"
$global:ArtNetLogFile = Join-Path $PSScriptRoot "artnet-status.log"
$global:WebServerLogFile = Join-Path $PSScriptRoot "webserver-issues.log"

# Process tracking
$global:ServerRunning = $false
$global:ReactRunning = $false
$global:ServerProcess = $null
$global:ReactProcess = $null

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

function Write-ErrorLog($message) {
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

# Function to add demo log entries - uses safe string formatting
function Add-DemoLogEntries {
    # DMX Channel Log entries    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "$timestamp - DMX: Channel 1 set to 255 (100 percent)"
    $logEntry | Out-File -FilePath $global:DMXLogFile -Append
    
    $logEntry = "$timestamp - DMX: Channel 2 set to 127 (50 percent)"
    $logEntry | Out-File -FilePath $global:DMXLogFile -Append
    
    $logEntry = "$(Get-Date) - DMX: Universe 1, Channels 10-20 set for scene 'BlueWash'"
    $logEntry | Out-File -FilePath $global:DMXLogFile -Append
    
    # MIDI Traffic Log entries
    $logEntry = "$(Get-Date) - MIDI: Note On C4 (velocity 100)"
    $logEntry | Out-File -FilePath $global:MIDILogFile -Append
    
    $logEntry = "$(Get-Date) - MIDI: CC 7 (Volume) set to 120"
    $logEntry | Out-File -FilePath $global:MIDILogFile -Append
    
    $logEntry = "$(Get-Date) - MIDI: Program Change to #5"
    $logEntry | Out-File -FilePath $global:MIDILogFile -Append
    
    # ArtNet Status Log entries
    $logEntry = "$(Get-Date) - ArtNet: Node 192.168.1.100 connected"
    $logEntry | Out-File -FilePath $global:ArtNetLogFile -Append
    
    $logEntry = "$(Get-Date) - ArtNet: Network configured with 2 universes"
    $logEntry | Out-File -FilePath $global:ArtNetLogFile -Append
    
    $logEntry = "$(Get-Date) - ArtNet: Polling detected 3 nodes"
    $logEntry | Out-File -FilePath $global:ArtNetLogFile -Append
    
    # WebServer Log entries
    $logEntry = "$(Get-Date) - Web Server: Started on port $ServerPort"
    $logEntry | Out-File -FilePath $global:WebServerLogFile -Append
    
    $logEntry = "$(Get-Date) - Web Server: Client connected from 192.168.1.50"
    $logEntry | Out-File -FilePath $global:WebServerLogFile -Append
    
    $logEntry = "$(Get-Date) - Web Server: Scene editor loaded"
    $logEntry | Out-File -FilePath $global:WebServerLogFile -Append
}

# Function to create our UI panels
function Initialize-UIPanel {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    
    # Create form with art-snob theme
    $form = New-Object System.Windows.Forms.Form
    $form.Text = "🎭 $AppName Control Panel 🎭"
    $form.Size = New-Object System.Drawing.Size(1200, 800)
    $form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
    $form.BackColor = [System.Drawing.Color]::FromArgb(255, 30, 30, 30)
    $form.ForeColor = [System.Drawing.Color]::White
    $form.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    
    # Create panel layout
    $buttonPanel = New-Object System.Windows.Forms.Panel
    $buttonPanel.Dock = [System.Windows.Forms.DockStyle]::Top
    $buttonPanel.Height = 60
    $buttonPanel.BackColor = [System.Drawing.Color]::FromArgb(255, 45, 45, 45)
    $buttonPanel.Padding = New-Object System.Windows.Forms.Padding(10)
    $form.Controls.Add($buttonPanel)
    
    # Create log panels container
    $logPanelsContainer = New-Object System.Windows.Forms.TableLayoutPanel
    $logPanelsContainer.Dock = [System.Windows.Forms.DockStyle]::Fill
    $logPanelsContainer.ColumnCount = 2
    $logPanelsContainer.RowCount = 2
    $logPanelsContainer.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Percent, 50)))
    $logPanelsContainer.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Percent, 50)))
    $logPanelsContainer.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Percent, 50)))
    $logPanelsContainer.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Percent, 50)))
    $logPanelsContainer.Padding = New-Object System.Windows.Forms.Padding(5)
    $form.Controls.Add($logPanelsContainer)
    
    # Create buttons with art-snob styling
    $startButton = New-Object System.Windows.Forms.Button
    $startButton.Text = "▶️ START"
    $startButton.BackColor = [System.Drawing.Color]::FromArgb(255, 50, 168, 82)
    $startButton.ForeColor = [System.Drawing.Color]::White
    $startButton.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $startButton.Width = 150
    $startButton.Height = 40
    $startButton.Location = New-Object System.Drawing.Point(20, 10)
    $startButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $startButton.Tag = "Start"
    $buttonPanel.Controls.Add($startButton)
    
    $stopButton = New-Object System.Windows.Forms.Button
    $stopButton.Text = "⏹️ STOP"
    $stopButton.BackColor = [System.Drawing.Color]::FromArgb(255, 220, 53, 69)
    $stopButton.ForeColor = [System.Drawing.Color]::White
    $stopButton.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $stopButton.Width = 150
    $stopButton.Height = 40
    $stopButton.Location = New-Object System.Drawing.Point(190, 10)
    $stopButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $stopButton.Enabled = $false
    $stopButton.Tag = "Stop"
    $buttonPanel.Controls.Add($stopButton)
    
    $clearButton = New-Object System.Windows.Forms.Button
    $clearButton.Text = "🧹 CLEAR LOGS"
    $clearButton.BackColor = [System.Drawing.Color]::FromArgb(255, 108, 117, 125)
    $clearButton.ForeColor = [System.Drawing.Color]::White
    $clearButton.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $clearButton.Width = 150
    $clearButton.Height = 40
    $clearButton.Location = New-Object System.Drawing.Point(360, 10)
    $clearButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $clearButton.Tag = "Clear"
    $buttonPanel.Controls.Add($clearButton)
    
    # Status indicator
    $statusLabel = New-Object System.Windows.Forms.Label
    $statusLabel.Text = "⚫ IDLE"
    $statusLabel.ForeColor = [System.Drawing.Color]::Gray
    $statusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $statusLabel.AutoSize = $true
    $statusLabel.Location = New-Object System.Drawing.Point(530, 18)
    $buttonPanel.Controls.Add($statusLabel)
    
    # Create log panels
    $dmxPanel = New-Object System.Windows.Forms.Panel
    $dmxPanel.Dock = [System.Windows.Forms.DockStyle]::Fill
    $dmxPanel.Padding = New-Object System.Windows.Forms.Padding(10)
    $dmxPanel.BackColor = [System.Drawing.Color]::FromArgb(255, 35, 35, 35)
    
    $dmxTitleLabel = New-Object System.Windows.Forms.Label
    $dmxTitleLabel.Text = "🎛️ DMX Channel Traffic"
    $dmxTitleLabel.Dock = [System.Windows.Forms.DockStyle]::Top
    $dmxTitleLabel.Height = 30
    $dmxTitleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $dmxTitleLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 40, 167, 69)
    $dmxPanel.Controls.Add($dmxTitleLabel)
    
    $global:DmxLogTextBox = New-Object System.Windows.Forms.TextBox
    $global:DmxLogTextBox.Multiline = $true
    $global:DmxLogTextBox.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
    $global:DmxLogTextBox.Dock = [System.Windows.Forms.DockStyle]::Fill
    $global:DmxLogTextBox.BackColor = [System.Drawing.Color]::FromArgb(255, 25, 25, 25)
    $global:DmxLogTextBox.ForeColor = [System.Drawing.Color]::LightGray
    $global:DmxLogTextBox.Font = New-Object System.Drawing.Font("Consolas", 9)
    $global:DmxLogTextBox.ReadOnly = $true
    $dmxPanel.Controls.Add($global:DmxLogTextBox)
    
    # MIDI Panel
    $midiPanel = New-Object System.Windows.Forms.Panel
    $midiPanel.Dock = [System.Windows.Forms.DockStyle]::Fill
    $midiPanel.Padding = New-Object System.Windows.Forms.Padding(10)
    $midiPanel.BackColor = [System.Drawing.Color]::FromArgb(255, 35, 35, 35)
    
    $midiTitleLabel = New-Object System.Windows.Forms.Label
    $midiTitleLabel.Text = "🎹 MIDI Traffic"
    $midiTitleLabel.Dock = [System.Windows.Forms.DockStyle]::Top
    $midiTitleLabel.Height = 30
    $midiTitleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $midiTitleLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 0, 123, 255)
    $midiPanel.Controls.Add($midiTitleLabel)
    
    $global:MidiLogTextBox = New-Object System.Windows.Forms.TextBox
    $global:MidiLogTextBox.Multiline = $true
    $global:MidiLogTextBox.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
    $global:MidiLogTextBox.Dock = [System.Windows.Forms.DockStyle]::Fill
    $global:MidiLogTextBox.BackColor = [System.Drawing.Color]::FromArgb(255, 25, 25, 25)
    $global:MidiLogTextBox.ForeColor = [System.Drawing.Color]::LightGray
    $global:MidiLogTextBox.Font = New-Object System.Drawing.Font("Consolas", 9)
    $global:MidiLogTextBox.ReadOnly = $true
    $midiPanel.Controls.Add($global:MidiLogTextBox)
    
    # ArtNet Panel
    $artnetPanel = New-Object System.Windows.Forms.Panel
    $artnetPanel.Dock = [System.Windows.Forms.DockStyle]::Fill
    $artnetPanel.Padding = New-Object System.Windows.Forms.Padding(10)
    $artnetPanel.BackColor = [System.Drawing.Color]::FromArgb(255, 35, 35, 35)
    
    $artnetTitleLabel = New-Object System.Windows.Forms.Label
    $artnetTitleLabel.Text = "🌐 ArtNet Status"
    $artnetTitleLabel.Dock = [System.Windows.Forms.DockStyle]::Top
    $artnetTitleLabel.Height = 30
    $artnetTitleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $artnetTitleLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 255, 193, 7)
    $artnetPanel.Controls.Add($artnetTitleLabel)
    
    $global:ArtNetLogTextBox = New-Object System.Windows.Forms.TextBox
    $global:ArtNetLogTextBox.Multiline = $true
    $global:ArtNetLogTextBox.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
    $global:ArtNetLogTextBox.Dock = [System.Windows.Forms.DockStyle]::Fill
    $global:ArtNetLogTextBox.BackColor = [System.Drawing.Color]::FromArgb(255, 25, 25, 25)
    $global:ArtNetLogTextBox.ForeColor = [System.Drawing.Color]::LightGray
    $global:ArtNetLogTextBox.Font = New-Object System.Drawing.Font("Consolas", 9)
    $global:ArtNetLogTextBox.ReadOnly = $true
    $artnetPanel.Controls.Add($global:ArtNetLogTextBox)
    
    # WebServer Panel
    $webPanel = New-Object System.Windows.Forms.Panel
    $webPanel.Dock = [System.Windows.Forms.DockStyle]::Fill
    $webPanel.Padding = New-Object System.Windows.Forms.Padding(10)
    $webPanel.BackColor = [System.Drawing.Color]::FromArgb(255, 35, 35, 35)
    
    $webTitleLabel = New-Object System.Windows.Forms.Label
    $webTitleLabel.Text = "🖥️ WebServer Issues"
    $webTitleLabel.Dock = [System.Windows.Forms.DockStyle]::Top
    $webTitleLabel.Height = 30
    $webTitleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $webTitleLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 220, 53, 69)
    $webPanel.Controls.Add($webTitleLabel)
    
    $global:WebServerLogTextBox = New-Object System.Windows.Forms.TextBox
    $global:WebServerLogTextBox.Multiline = $true
    $global:WebServerLogTextBox.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
    $global:WebServerLogTextBox.Dock = [System.Windows.Forms.DockStyle]::Fill
    $global:WebServerLogTextBox.BackColor = [System.Drawing.Color]::FromArgb(255, 25, 25, 25)
    $global:WebServerLogTextBox.ForeColor = [System.Drawing.Color]::LightGray
    $global:WebServerLogTextBox.Font = New-Object System.Drawing.Font("Consolas", 9)
    $global:WebServerLogTextBox.ReadOnly = $true
    $webPanel.Controls.Add($global:WebServerLogTextBox)
    
    # Add log panels to container
    $logPanelsContainer.Controls.Add($dmxPanel, 0, 0)
    $logPanelsContainer.Controls.Add($midiPanel, 1, 0)
    $logPanelsContainer.Controls.Add($artnetPanel, 0, 1)
    $logPanelsContainer.Controls.Add($webPanel, 1, 1)
    
    # Button event handlers
    $startButton.Add_Click({
        Start-Services
        $startButton.Enabled = $false
        $stopButton.Enabled = $true
        $statusLabel.Text = "🟢 RUNNING"
        $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 40, 167, 69)
    })
    
    $stopButton.Add_Click({
        Stop-Services
        $startButton.Enabled = $true
        $stopButton.Enabled = $false
        $statusLabel.Text = "🔴 STOPPED"
        $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 220, 53, 69)
    })
    
    $clearButton.Add_Click({
        Clear-Logs
        [System.Windows.Forms.MessageBox]::Show("Logs cleared successfully!", "Success", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
    })
    
    # Handle form closing
    $form.Add_FormClosing({
        param($sender, $e)
        
        if ($global:ServerRunning -or $global:ReactRunning) {
            $result = [System.Windows.Forms.MessageBox]::Show("Services are still running. Do you want to stop them before closing?", "Warning", [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Warning)
            
            if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
                Stop-Services
            }
        }
    })
    
    # Load existing log content into text boxes
    if (Test-Path $global:DMXLogFile) {
        $content = Get-Content -Path $global:DMXLogFile -Raw -ErrorAction SilentlyContinue
        if ($content) {
            $global:DmxLogTextBox.AppendText($content)
        }
    }
    
    if (Test-Path $global:MIDILogFile) {
        $content = Get-Content -Path $global:MIDILogFile -Raw -ErrorAction SilentlyContinue
        if ($content) {
            $global:MidiLogTextBox.AppendText($content)
        }
    }
    
    if (Test-Path $global:ArtNetLogFile) {
        $content = Get-Content -Path $global:ArtNetLogFile -Raw -ErrorAction SilentlyContinue
        if ($content) {
            $global:ArtNetLogTextBox.AppendText($content)
        }
    }
    
    if (Test-Path $global:WebServerLogFile) {
        $content = Get-Content -Path $global:WebServerLogFile -Raw -ErrorAction SilentlyContinue
        if ($content) {
            $global:WebServerLogTextBox.AppendText($content)
        }
    }
    
    # Start log monitoring
    Start-LogMonitoring
    
    return $form
}

# Function to start server and react app
function Start-Services {
    # Start Server
    try {
        Write-Info "Starting DMX server..."
        # Server start logic from the existing script
        $mainJsPath = Join-Path $PSScriptRoot "dist\main.js"
        if (Test-Path $mainJsPath) {
            $cmdArgs = "/k cd /d `"$PSScriptRoot`" && node `"$mainJsPath`""
            $global:ServerProcess = Start-Process -FilePath "cmd.exe" -ArgumentList $cmdArgs -NoNewWindow -PassThru
            $global:ServerRunning = $true
            Write-Success "Server started successfully"
            
            # Log to WebServer panel
            Update-LogPanel $global:WebServerLogTextBox "$(Get-Date) - Server started on port $ServerPort"
        } else {
            Write-Error "Could not find main.js at $mainJsPath"
            Update-LogPanel $global:WebServerLogTextBox "$(Get-Date) - ERROR: Could not find main.js at $mainJsPath"
        }
        
        # Start React app if not running
        if (-not $NoReactApp) {
            Write-Info "Starting React app..."
            $reactAppDir = Join-Path $PSScriptRoot "react-app"
            
            # Start React app using cmd.exe wrapper
            $cmdArgs = "/k cd /d `"$reactAppDir`" && npm start"
            $global:ReactProcess = Start-Process -FilePath "cmd.exe" -ArgumentList $cmdArgs -NoNewWindow -PassThru
            $global:ReactRunning = $true
            
            Write-Success "React app starting on port $ReactAppPort"
            Update-LogPanel $global:WebServerLogTextBox "$(Get-Date) - React app started on port $ReactAppPort"
        }
    }
    catch {
        Write-Error "Failed to start services: $_"
        Update-LogPanel $global:WebServerLogTextBox "$(Get-Date) - ERROR: Failed to start services: $_"
    }
}

# Function to stop services
function Stop-Services {
    try {
        # Stop the server process if running
        if ($global:ServerProcess -and -not $global:ServerProcess.HasExited) {
            Write-Info "Stopping DMX server..."
            $global:ServerProcess | Stop-Process -Force
            Write-Success "Server stopped"
            Update-LogPanel $global:WebServerLogTextBox "$(Get-Date) - Server stopped"
        }
        
        # Stop React app if running
        if ($global:ReactProcess -and -not $global:ReactProcess.HasExited) {
            Write-Info "Stopping React app..."
            $global:ReactProcess | Stop-Process -Force
            Write-Success "React app stopped"
            Update-LogPanel $global:WebServerLogTextBox "$(Get-Date) - React app stopped"
        }
        
        # Kill any remaining node processes related to our app
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
            $_.CommandLine -match "ArtBastard_DMX"
        } | ForEach-Object {
            Stop-Process -Id $_.Id -Force
        }
        
        $global:ServerRunning = $false
        $global:ReactRunning = $false
    }
    catch {
        Write-ErrorLog "Error stopping services: $_"
        Update-LogPanel $global:WebServerLogTextBox "$(Get-Date) - ERROR: Failed to stop services: $_"
    }
}

# Function to clear logs
function Clear-Logs {
    $global:DmxLogTextBox.Clear()
    $global:MidiLogTextBox.Clear()
    $global:ArtNetLogTextBox.Clear()
    $global:WebServerLogTextBox.Clear()
    
    # Clear log files
    "" | Out-File -FilePath $global:DMXLogFile -Force
    "" | Out-File -FilePath $global:MIDILogFile -Force
    "" | Out-File -FilePath $global:ArtNetLogFile -Force
    "" | Out-File -FilePath $global:WebServerLogFile -Force
    
    Write-Info "All logs cleared"
}

# Function to update log panel with new content
function Update-LogPanel {
    param(
        [System.Windows.Forms.TextBox]$textBox,
        [string]$message
    )
    
    if ($textBox.InvokeRequired) {
        $textBox.Invoke([System.Windows.Forms.MethodInvoker]{
            $textBox.AppendText("$message`r`n")
            $textBox.SelectionStart = $textBox.Text.Length
            $textBox.ScrollToCaret()
        })
    } else {
        $textBox.AppendText("$message`r`n")
        $textBox.SelectionStart = $textBox.Text.Length
        $textBox.ScrollToCaret()
    }
}

# Function to start log monitoring
function Start-LogMonitoring {
    # Create log files if they don't exist
    foreach ($logFile in @($global:DMXLogFile, $global:MIDILogFile, $global:ArtNetLogFile, $global:WebServerLogFile)) {
        if (-not (Test-Path $logFile)) {
            "" | Out-File -FilePath $logFile -Force
        }
    }
    
    # Create event handlers for log files
    $watcher1 = Register-FileSystemWatcher -FilePath $global:DMXLogFile -TextBox $global:DmxLogTextBox
    $watcher2 = Register-FileSystemWatcher -FilePath $global:MIDILogFile -TextBox $global:MidiLogTextBox
    $watcher3 = Register-FileSystemWatcher -FilePath $global:ArtNetLogFile -TextBox $global:ArtNetLogTextBox
    $watcher4 = Register-FileSystemWatcher -FilePath $global:WebServerLogFile -TextBox $global:WebServerLogTextBox
}

# Function to watch a log file for changes with simpler event registration
function Register-FileSystemWatcher {
    param(
        [string]$FilePath,
        [System.Windows.Forms.TextBox]$TextBox
    )
    
    # Create a FileSystemWatcher to monitor the log file
    $watcher = New-Object System.IO.FileSystemWatcher
    $watcher.Path = [System.IO.Path]::GetDirectoryName($FilePath)
    $watcher.Filter = [System.IO.Path]::GetFileName($FilePath)
    $watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite
    $watcher.EnableRaisingEvents = $true
    
    # Create a script block for the event
    $action = {
        $path = $Event.SourceEventArgs.FullPath
        $textBoxRef = $Event.MessageData.TextBox
        
        try {
            $newLine = Get-Content -Path $path -Tail 1 -ErrorAction SilentlyContinue
            
            if ($newLine) {
                # This is safer as we're capturing the textbox as an argument
                if ($textBoxRef.InvokeRequired) {
                    $textBoxRef.Invoke([System.Windows.Forms.MethodInvoker]{
                        $textBoxRef.AppendText("$newLine`r`n")
                        $textBoxRef.SelectionStart = $textBoxRef.Text.Length
                        $textBoxRef.ScrollToCaret()
                    })
                }
                else {
                    $textBoxRef.AppendText("$newLine`r`n")
                    $textBoxRef.SelectionStart = $textBoxRef.Text.Length
                    $textBoxRef.ScrollToCaret()
                }
            }
        }
        catch {
            # Simply ignore errors
        }
    }
    
    # Pass the TextBox as MessageData to the event
    $messageData = New-Object PSObject -Property @{
        TextBox = $TextBox
    }
    
    # Register the event with the message data
    Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $action -MessageData $messageData | Out-Null
    
    return $watcher
}

# Function to check dependencies
function Check-Dependencies {
    # Navigate to the project directory
    $ProjectDir = $PSScriptRoot
    Set-Location $ProjectDir

    # Navigate to the React app directory
    $ReactAppDir = Join-Path $ProjectDir "react-app"
    
    # Check if node_modules exists and has key packages
    $nodeModulesPath = Join-Path $ReactAppDir "node_modules"
    $reactPackagePath = Join-Path $nodeModulesPath "react"
    $needsInstall = $false

    if (-not (Test-Path $nodeModulesPath)) {
        Write-Info "node_modules directory not found. Installing dependencies..."
        $needsInstall = $true
    }
    elseif (-not (Test-Path $reactPackagePath)) {
        Write-Info "React package not found in node_modules. Reinstalling dependencies..."
        $needsInstall = $true
    }

    # Check if package.json exists
    $packageJsonPath = Join-Path $ReactAppDir "package.json"
    if (-not (Test-Path $packageJsonPath)) {
        Write-Error "package.json not found! Please ensure you're in the correct directory."
        exit 1
    }

    # Install dependencies if needed
    if ($needsInstall) {
        Write-Info "Installing dependencies..."
        
        # Clean install to avoid dependency conflicts
        Remove-Item -Path $nodeModulesPath -Recurse -Force -ErrorAction SilentlyContinue
        npm cache clean --force
        
        # Install dependencies
        Set-Location $ReactAppDir
        npm install
        
        # Verify React was installed
        if (-not (Test-Path $reactPackagePath)) {
            Write-Error "Failed to install React! Check your package.json and try again."
            exit 1
        }
        
        Write-Success "Dependencies successfully installed!"
    }

    # Check if TypeScript is installed globally, install if needed
    $typescriptInstalled = npm list -g typescript
    if ($typescriptInstalled -like "*ERR*") {
        Write-Info "Installing TypeScript globally..."
        npm install -g typescript
    }
    
    # Return to the project directory
    Set-Location $ProjectDir
}

# Main application function
function Start-Application {
    # Check for dependencies first
    Check-Dependencies

    # Create UI
    $form = Initialize-UIPanel
    
    # Show form dialog properly - first check if it's a valid form object
    if ($form -and $form -is [System.Windows.Forms.Form]) {
        $form.ShowDialog() | Out-Null
    } else {
        Write-ErrorLog "Error: Could not create UI form properly. Return value: $form"
        return
    }
    
    # When form closes, ensure all processes are stopped
    if ($global:ServerRunning -or $global:ReactRunning) {
        Stop-Services
    }
    
    Write-Host "🎭 The Show Must Go On! Application closed. 🎭" -ForegroundColor Cyan
}

# Show welcome banner
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║                                                          ║" -ForegroundColor Magenta
Write-Host "║         " -ForegroundColor Magenta -NoNewline; Write-Host "🎛️  $AppName Control Panel  🎛️" -ForegroundColor White -NoNewline; Write-Host "         ║" -ForegroundColor Magenta
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

# Initialize log files
foreach ($logFilePath in @($LogFile, $global:DMXLogFile, $global:MIDILogFile, $global:ArtNetLogFile, $global:WebServerLogFile)) {
    if (Test-Path $logFilePath) {
        Remove-Item $logFilePath -Force
    }
    # Create empty log files
    "" | Out-File -FilePath $logFilePath -Force
}

Write-Info "Log files initialized"

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

# Build the project if not skipped - always build first before launching the UI
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

# Add some demo log entries for immediate display
Add-DemoLogEntries

# Run the application
Start-Application

exit 0
