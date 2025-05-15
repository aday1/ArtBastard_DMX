# Minimal version of Show Must Go On script
param(
    [switch]$SkipBuild
)

# Add assemblies
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Log file setup 
$DMXLogPath = Join-Path $PSScriptRoot "dmx-channel-traffic.log"
$MIDILogPath = Join-Path $PSScriptRoot "midi-traffic.log"
$ArtNetLogPath = Join-Path $PSScriptRoot "artnet-status.log"  
$WebServerLogPath = Join-Path $PSScriptRoot "webserver-issues.log"

# Initialize log files
foreach ($path in @($DMXLogPath, $MIDILogPath, $ArtNetLogPath, $WebServerLogPath)) {
    if (Test-Path $path) { 
        Remove-Item $path -Force
    }
    "" | Out-File -FilePath $path -Force
}

# Add demo data for logs
function Add-DemoLogData {
    $date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    # DMX log
    "$date - DMX: Channel 1 set to 255 (100 pct)" | Out-File -FilePath $DMXLogPath -Append
    "$date - DMX: Channel 2 set to 127 (50 pct)" | Out-File -FilePath $DMXLogPath -Append
    "$date - DMX: Universe 1, Channels 10-20 set for scene 'BlueWash'" | Out-File -FilePath $DMXLogPath -Append
    
    # MIDI log
    "$date - MIDI: Note On C4 (velocity 100)" | Out-File -FilePath $MIDILogPath -Append
    "$date - MIDI: CC 7 (Volume) set to 120" | Out-File -FilePath $MIDILogPath -Append
    "$date - MIDI: Program Change to #5" | Out-File -FilePath $MIDILogPath -Append
    
    # ArtNet log
    "$date - ArtNet: Node 192.168.1.100 connected" | Out-File -FilePath $ArtNetLogPath -Append
    "$date - ArtNet: Network configured with 2 universes" | Out-File -FilePath $ArtNetLogPath -Append
    "$date - ArtNet: Polling detected 3 nodes" | Out-File -FilePath $ArtNetLogPath -Append
    
    # WebServer log
    "$date - Web Server: Started on port 3030" | Out-File -FilePath $WebServerLogPath -Append
    "$date - Web Server: Client connected from 192.168.1.50" | Out-File -FilePath $WebServerLogPath -Append
    "$date - Web Server: Scene editor loaded" | Out-File -FilePath $WebServerLogPath -Append
}

# Set up global server state
$global:ServerRunning = $false
$global:ReactRunning = $false
$global:ServerPort = 3030
$global:ReactAppPort = 3000
$global:ServerProcess = $null
$global:ReactProcess = $null

# Function to check if port is in use
function Test-PortInUse {
    param(
        [int]$Port
    )
    
    $tcpConnections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | 
                      Where-Object { $_.LocalPort -eq $Port }
                      
    return $null -ne $tcpConnections
}

# Create minimal UI
function Show-MultiPanelUI {
    # Check if ports are in use before starting the UI
    $serverPortInUse = Test-PortInUse -Port $global:ServerPort
    $reactPortInUse = Test-PortInUse -Port $global:ReactAppPort
    
    if ($serverPortInUse) {
        Write-Host "Warning: Port $($global:ServerPort) is already in use. The server may not start correctly." -ForegroundColor Yellow
    }
    
    if ($reactPortInUse) {
        Write-Host "Warning: Port $($global:ReactAppPort) is already in use. The React UI may not start correctly." -ForegroundColor Yellow
    }
    
    # Create the main form
    $form = New-Object System.Windows.Forms.Form
    $form.Text = "ArtBastard DMX Control Panel" 
    $form.Size = New-Object System.Drawing.Size(1200, 800)
    $form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
    $form.BackColor = [System.Drawing.Color]::FromArgb(255, 30, 30, 30)
    $form.ForeColor = [System.Drawing.Color]::White

    # Create top button panel
    $buttonPanel = New-Object System.Windows.Forms.Panel
    $buttonPanel.Dock = [System.Windows.Forms.DockStyle]::Top
    $buttonPanel.Height = 60
    $buttonPanel.BackColor = [System.Drawing.Color]::FromArgb(255, 45, 45, 45)
    $form.Controls.Add($buttonPanel)
    
    # Create button: START
    $startButton = New-Object System.Windows.Forms.Button
    $startButton.Text = "START"
    $startButton.BackColor = [System.Drawing.Color]::FromArgb(255, 50, 168, 82)
    $startButton.ForeColor = [System.Drawing.Color]::White
    $startButton.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $startButton.Size = New-Object System.Drawing.Size(150, 40)
    $startButton.Location = New-Object System.Drawing.Point(20, 10)
    $startButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $buttonPanel.Controls.Add($startButton)
    
    # Create button: STOP
    $stopButton = New-Object System.Windows.Forms.Button
    $stopButton.Text = "STOP"
    $stopButton.BackColor = [System.Drawing.Color]::FromArgb(255, 220, 53, 69)
    $stopButton.ForeColor = [System.Drawing.Color]::White
    $stopButton.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $stopButton.Size = New-Object System.Drawing.Size(150, 40)
    $stopButton.Location = New-Object System.Drawing.Point(190, 10)
    $stopButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $stopButton.Enabled = $false
    $buttonPanel.Controls.Add($stopButton)
    
    # Create button: CLEAR
    $clearButton = New-Object System.Windows.Forms.Button
    $clearButton.Text = "CLEAR LOGS"
    $clearButton.BackColor = [System.Drawing.Color]::FromArgb(255, 108, 117, 125)
    $clearButton.ForeColor = [System.Drawing.Color]::White
    $clearButton.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $clearButton.Size = New-Object System.Drawing.Size(150, 40)
    $clearButton.Location = New-Object System.Drawing.Point(360, 10)
    $clearButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $buttonPanel.Controls.Add($clearButton)
      # Create status label
    $statusLabel = New-Object System.Windows.Forms.Label
    $statusLabel.Text = "IDLE"
    $statusLabel.ForeColor = [System.Drawing.Color]::Gray
    $statusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $statusLabel.AutoSize = $true
    $statusLabel.Location = New-Object System.Drawing.Point(530, 18)
    $buttonPanel.Controls.Add($statusLabel)
    
    # Create web server port info
    $serverPortLabel = New-Object System.Windows.Forms.Label
    $serverPortLabel.Text = "Server: http://localhost:$($global:ServerPort)"
    $serverPortLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 0, 188, 212)
    $serverPortLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $serverPortLabel.AutoSize = $true
    $serverPortLabel.Location = New-Object System.Drawing.Point(700, 10)
    $buttonPanel.Controls.Add($serverPortLabel)
    
    # Create react app port info
    $reactPortLabel = New-Object System.Windows.Forms.Label
    $reactPortLabel.Text = "UI: http://localhost:$($global:ReactAppPort)"
    $reactPortLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 0, 188, 212)
    $reactPortLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $reactPortLabel.AutoSize = $true
    $reactPortLabel.Location = New-Object System.Drawing.Point(700, 32)
    $buttonPanel.Controls.Add($reactPortLabel)
    
    # Create panel layout
    $tablePanel = New-Object System.Windows.Forms.TableLayoutPanel
    $tablePanel.Dock = [System.Windows.Forms.DockStyle]::Fill
    $tablePanel.ColumnCount = 2
    $tablePanel.RowCount = 2
    $tablePanel.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Percent, 50)))
    $tablePanel.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Percent, 50)))
    $tablePanel.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Percent, 50)))
    $tablePanel.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Percent, 50)))
    $form.Controls.Add($tablePanel)
    
    # Create DMX Panel (top left)
    $dmxPanel = New-Object System.Windows.Forms.GroupBox
    $dmxPanel.Text = "DMX Channel Traffic"
    $dmxPanel.Dock = [System.Windows.Forms.DockStyle]::Fill
    $dmxPanel.ForeColor = [System.Drawing.Color]::FromArgb(255, 40, 167, 69)
    $dmxPanel.BackColor = [System.Drawing.Color]::FromArgb(255, 35, 35, 35)
    $dmxPanel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    
    $dmxTextBox = New-Object System.Windows.Forms.TextBox
    $dmxTextBox.Multiline = $true
    $dmxTextBox.ReadOnly = $true
    $dmxTextBox.Dock = [System.Windows.Forms.DockStyle]::Fill
    $dmxTextBox.BackColor = [System.Drawing.Color]::FromArgb(255, 25, 25, 25)
    $dmxTextBox.ForeColor = [System.Drawing.Color]::LightGray
    $dmxTextBox.Font = New-Object System.Drawing.Font("Consolas", 9)
    $dmxTextBox.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
    $dmxPanel.Controls.Add($dmxTextBox)
    
    # Create MIDI Panel (top right)
    $midiPanel = New-Object System.Windows.Forms.GroupBox
    $midiPanel.Text = "MIDI Traffic"
    $midiPanel.Dock = [System.Windows.Forms.DockStyle]::Fill
    $midiPanel.ForeColor = [System.Drawing.Color]::FromArgb(255, 0, 123, 255)
    $midiPanel.BackColor = [System.Drawing.Color]::FromArgb(255, 35, 35, 35)
    $midiPanel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    
    $midiTextBox = New-Object System.Windows.Forms.TextBox
    $midiTextBox.Multiline = $true
    $midiTextBox.ReadOnly = $true
    $midiTextBox.Dock = [System.Windows.Forms.DockStyle]::Fill
    $midiTextBox.BackColor = [System.Drawing.Color]::FromArgb(255, 25, 25, 25)
    $midiTextBox.ForeColor = [System.Drawing.Color]::LightGray
    $midiTextBox.Font = New-Object System.Drawing.Font("Consolas", 9)
    $midiTextBox.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
    $midiPanel.Controls.Add($midiTextBox)
    
    # Create ArtNet Panel (bottom left)
    $artnetPanel = New-Object System.Windows.Forms.GroupBox
    $artnetPanel.Text = "ArtNet Status"
    $artnetPanel.Dock = [System.Windows.Forms.DockStyle]::Fill
    $artnetPanel.ForeColor = [System.Drawing.Color]::FromArgb(255, 255, 193, 7)
    $artnetPanel.BackColor = [System.Drawing.Color]::FromArgb(255, 35, 35, 35)
    $artnetPanel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    
    $artnetTextBox = New-Object System.Windows.Forms.TextBox
    $artnetTextBox.Multiline = $true
    $artnetTextBox.ReadOnly = $true
    $artnetTextBox.Dock = [System.Windows.Forms.DockStyle]::Fill
    $artnetTextBox.BackColor = [System.Drawing.Color]::FromArgb(255, 25, 25, 25)
    $artnetTextBox.ForeColor = [System.Drawing.Color]::LightGray
    $artnetTextBox.Font = New-Object System.Drawing.Font("Consolas", 9)
    $artnetTextBox.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
    $artnetPanel.Controls.Add($artnetTextBox)
    
    # Create WebServer Panel (bottom right)
    $webPanel = New-Object System.Windows.Forms.GroupBox
    $webPanel.Text = "WebServer Issues"
    $webPanel.Dock = [System.Windows.Forms.DockStyle]::Fill
    $webPanel.ForeColor = [System.Drawing.Color]::FromArgb(255, 220, 53, 69)
    $webPanel.BackColor = [System.Drawing.Color]::FromArgb(255, 35, 35, 35)
    $webPanel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    
    $webTextBox = New-Object System.Windows.Forms.TextBox
    $webTextBox.Multiline = $true
    $webTextBox.ReadOnly = $true
    $webTextBox.Dock = [System.Windows.Forms.DockStyle]::Fill
    $webTextBox.BackColor = [System.Drawing.Color]::FromArgb(255, 25, 25, 25)
    $webTextBox.ForeColor = [System.Drawing.Color]::LightGray
    $webTextBox.Font = New-Object System.Drawing.Font("Consolas", 9)
    $webTextBox.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
    $webPanel.Controls.Add($webTextBox)
    
    # Add panels to table
    $tablePanel.Controls.Add($dmxPanel, 0, 0)
    $tablePanel.Controls.Add($midiPanel, 1, 0)
    $tablePanel.Controls.Add($artnetPanel, 0, 1)
    $tablePanel.Controls.Add($webPanel, 1, 1)
    
    # Load log content
    if (Test-Path $DMXLogPath) {
        $dmxTextBox.Text = Get-Content -Path $DMXLogPath -Raw
    }
    if (Test-Path $MIDILogPath) {
        $midiTextBox.Text = Get-Content -Path $MIDILogPath -Raw
    }
    if (Test-Path $ArtNetLogPath) {
        $artnetTextBox.Text = Get-Content -Path $ArtNetLogPath -Raw
    }
    if (Test-Path $WebServerLogPath) {
        $webTextBox.Text = Get-Content -Path $WebServerLogPath -Raw
    }
      # Button actions
    $startButton.Add_Click({
        # Start the server
        try {
            $global:ServerRunning = $true
            $mainJsPath = Join-Path $PSScriptRoot "dist\main.js"
            
            if (Test-Path $mainJsPath) {
                $cmdArgs = "/k cd /d `"$PSScriptRoot`" && node `"$mainJsPath`""
                $global:ServerProcess = Start-Process -FilePath "cmd.exe" -ArgumentList $cmdArgs -NoNewWindow -PassThru
                
                # Start React app
                $reactAppDir = Join-Path $PSScriptRoot "react-app"
                if (Test-Path $reactAppDir) {
                    $reactCmdArgs = "/k cd /d `"$reactAppDir`" && npm start"
                    $global:ReactProcess = Start-Process -FilePath "cmd.exe" -ArgumentList $reactCmdArgs -NoNewWindow -PassThru
                    $global:ReactRunning = $true
                }
                
                # Update UI
                $startButton.Enabled = $false
                $stopButton.Enabled = $true
                $statusLabel.Text = "RUNNING"
                $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 40, 167, 69)
                $serverPortLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 50, 168, 82)
                $reactPortLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 50, 168, 82)
                
                $date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                $logMsg = "$date - Server started on port $($global:ServerPort)"
                $webTextBox.AppendText("$logMsg`r`n")
                $logMsg = "$date - React UI started on port $($global:ReactAppPort)"
                $webTextBox.AppendText("$logMsg`r`n")
            } else {
                $date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                $logMsg = "$date - ERROR: Could not find main.js at $mainJsPath"
                $webTextBox.AppendText("$logMsg`r`n")
            }
        } catch {
            $date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            $logMsg = "$date - ERROR: Failed to start services: $_"
            $webTextBox.AppendText("$logMsg`r`n")
        }
    })
      $stopButton.Add_Click({
        try {
            # Stop the server process if running
            if ($global:ServerProcess -and -not $global:ServerProcess.HasExited) {
                $global:ServerProcess | Stop-Process -Force
                $date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                $logMsg = "$date - Server stopped on port $($global:ServerPort)"
                $webTextBox.AppendText("$logMsg`r`n")
            }
            
            # Stop React app if running
            if ($global:ReactProcess -and -not $global:ReactProcess.HasExited) {
                $global:ReactProcess | Stop-Process -Force
                $date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                $logMsg = "$date - React UI stopped on port $($global:ReactAppPort)"
                $webTextBox.AppendText("$logMsg`r`n")
            }
            
            # Kill any remaining node processes related to our app
            Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
                $_.CommandLine -match "ArtBastard_DMX"
            } | ForEach-Object {
                Stop-Process -Id $_.Id -Force
            }
            
            # Update UI state
            $global:ServerRunning = $false
            $global:ReactRunning = $false
            $startButton.Enabled = $true
            $stopButton.Enabled = $false
            $statusLabel.Text = "STOPPED"
            $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 220, 53, 69)
            $serverPortLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 120, 120, 120)
            $reactPortLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 120, 120, 120)
        }
        catch {
            $date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            $logMsg = "$date - ERROR: Failed to stop services: $_"
            $webTextBox.AppendText("$logMsg`r`n")
        }
    })
      $clearButton.Add_Click({
        $dmxTextBox.Clear()
        $midiTextBox.Clear()
        $artnetTextBox.Clear()
        $webTextBox.Clear()
        
        # Clear log files
        foreach ($path in @($DMXLogPath, $MIDILogPath, $ArtNetLogPath, $WebServerLogPath)) {
            "" | Out-File -FilePath $path -Force
        }
        
        [System.Windows.Forms.MessageBox]::Show("Logs cleared successfully!", "Success", 
            [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
    })
    
    # Handle form closing to ensure processes are stopped
    $form.Add_FormClosing({
        param($sender, $e)
        
        if ($global:ServerRunning -or $global:ReactRunning) {
            $result = [System.Windows.Forms.MessageBox]::Show(
                "The server and/or React UI are still running. Do you want to stop them before closing?", 
                "Processes Running", 
                [System.Windows.Forms.MessageBoxButtons]::YesNo, 
                [System.Windows.Forms.MessageBoxIcon]::Warning)
            
            if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
                # Stop all running processes
                if ($global:ServerProcess -and -not $global:ServerProcess.HasExited) {
                    $global:ServerProcess | Stop-Process -Force
                }
                
                if ($global:ReactProcess -and -not $global:ReactProcess.HasExited) {
                    $global:ReactProcess | Stop-Process -Force
                }
                
                # Kill any remaining node processes related to our app
                Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
                    $_.CommandLine -match "ArtBastard_DMX"
                } | ForEach-Object {
                    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
                }
                
                $global:ServerRunning = $false
                $global:ReactRunning = $false
            }
        }
    })
    
    # Show the form directly
    $form.ShowDialog() | Out-Null
}

# Banner
Write-Host "======================================" -ForegroundColor Magenta
Write-Host "  ArtBastard DMX - Show Must Go On!   " -ForegroundColor White
Write-Host "======================================" -ForegroundColor Magenta

# Skip build if requested
if (-not $SkipBuild) {
    Write-Host "Building server..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
    Write-Host "Build completed successfully" -ForegroundColor Green
}
else {
    Write-Host "Build step skipped" -ForegroundColor Yellow
}

# Add demo log data
Add-DemoLogData

# Call the function to show the UI (it will handle showing the dialog internally)
Show-MultiPanelUI

# Exit
Write-Host "ArtBastard DMX application closed" -ForegroundColor Cyan
exit 0
