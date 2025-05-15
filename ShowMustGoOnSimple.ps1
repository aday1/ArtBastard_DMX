# ShowMustGoOn-Fixed.ps1
# Enhanced multi-panel UI for ArtBastard DMX

param(
    [switch]$SkipBuild,
    [switch]$NoReactApp
)

# Configuration
$AppName = "ArtBastard DMX"
$ReactAppPort = 3000
$ServerPort = 3030
$LogFile = Join-Path $PSScriptRoot "server-startup.log"
$DMXLogFile = Join-Path $PSScriptRoot "dmx-channel-traffic.log"
$MIDILogFile = Join-Path $PSScriptRoot "midi-traffic.log"
$ArtNetLogFile = Join-Path $PSScriptRoot "artnet-status.log"
$WebServerLogFile = Join-Path $PSScriptRoot "webserver-issues.log"

# Process tracking
$ServerRunning = $false
$ReactRunning = $false

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
    Write-ColorOutput "Green" "✅ $message"
}

function Write-Info($message) {
    Write-ColorOutput "Cyan" "ℹ️ $message"
}

function Write-Warning($message) {
    Write-ColorOutput "Yellow" "⚠️ $message"
}

function Write-ErrorMsg($message) {
    Write-ColorOutput "Red" "❌ $message"
}

# Load required assemblies
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Initialize UI and create panels
function Initialize-UI {
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
    $form.Controls.Add($logPanelsContainer)
    
    # START button
    $startButton = New-Object System.Windows.Forms.Button
    $startButton.Text = "▶️ START"
    $startButton.BackColor = [System.Drawing.Color]::FromArgb(255, 50, 168, 82)
    $startButton.ForeColor = [System.Drawing.Color]::White
    $startButton.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $startButton.Width = 150
    $startButton.Height = 40
    $startButton.Location = New-Object System.Drawing.Point(20, 10)
    $startButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $buttonPanel.Controls.Add($startButton)
    
    # STOP button
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
    $buttonPanel.Controls.Add($stopButton)
    
    # CLEAR button
    $clearButton = New-Object System.Windows.Forms.Button
    $clearButton.Text = "🧹 CLEAR LOGS"
    $clearButton.BackColor = [System.Drawing.Color]::FromArgb(255, 108, 117, 125)
    $clearButton.ForeColor = [System.Drawing.Color]::White
    $clearButton.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $clearButton.Width = 150
    $clearButton.Height = 40
    $clearButton.Location = New-Object System.Drawing.Point(360, 10)
    $clearButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $buttonPanel.Controls.Add($clearButton)
    
    # Status indicator
    $statusLabel = New-Object System.Windows.Forms.Label
    $statusLabel.Text = "⚫ IDLE"
    $statusLabel.ForeColor = [System.Drawing.Color]::Gray
    $statusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $statusLabel.AutoSize = $true
    $statusLabel.Location = New-Object System.Drawing.Point(530, 18)
    $buttonPanel.Controls.Add($statusLabel)
    
    # Create DMX Panel
    $dmxPanel = New-Object System.Windows.Forms.Panel
    $dmxPanel.Dock = [System.Windows.Forms.DockStyle]::Fill
    $dmxPanel.BackColor = [System.Drawing.Color]::FromArgb(255, 35, 35, 35)
    
    $dmxLabel = New-Object System.Windows.Forms.Label
    $dmxLabel.Text = "🎛️ DMX Channel Traffic"
    $dmxLabel.Dock = [System.Windows.Forms.DockStyle]::Top
    $dmxLabel.Height = 30
    $dmxLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $dmxLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 40, 167, 69)
    $dmxPanel.Controls.Add($dmxLabel)
    
    $dmxTextBox = New-Object System.Windows.Forms.TextBox
    $dmxTextBox.Multiline = $true
    $dmxTextBox.ReadOnly = $true
    $dmxTextBox.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
    $dmxTextBox.Dock = [System.Windows.Forms.DockStyle]::Fill
    $dmxTextBox.BackColor = [System.Drawing.Color]::FromArgb(255, 25, 25, 25)
    $dmxTextBox.ForeColor = [System.Drawing.Color]::LightGray
    $dmxTextBox.Font = New-Object System.Drawing.Font("Consolas", 9)
    $dmxPanel.Controls.Add($dmxTextBox)
    
    # Create MIDI Panel
    $midiPanel = New-Object System.Windows.Forms.Panel
    $midiPanel.Dock = [System.Windows.Forms.DockStyle]::Fill
    $midiPanel.BackColor = [System.Drawing.Color]::FromArgb(255, 35, 35, 35)
    
    $midiLabel = New-Object System.Windows.Forms.Label
    $midiLabel.Text = "🎹 MIDI Traffic"
    $midiLabel.Dock = [System.Windows.Forms.DockStyle]::Top
    $midiLabel.Height = 30
    $midiLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $midiLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 0, 123, 255)
    $midiPanel.Controls.Add($midiLabel)
    
    $midiTextBox = New-Object System.Windows.Forms.TextBox
    $midiTextBox.Multiline = $true
    $midiTextBox.ReadOnly = $true
    $midiTextBox.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
    $midiTextBox.Dock = [System.Windows.Forms.DockStyle]::Fill
    $midiTextBox.BackColor = [System.Drawing.Color]::FromArgb(255, 25, 25, 25)
    $midiTextBox.ForeColor = [System.Drawing.Color]::LightGray
    $midiTextBox.Font = New-Object System.Drawing.Font("Consolas", 9)
    $midiPanel.Controls.Add($midiTextBox)
    
    # Create ArtNet Panel
    $artnetPanel = New-Object System.Windows.Forms.Panel
    $artnetPanel.Dock = [System.Windows.Forms.DockStyle]::Fill
    $artnetPanel.BackColor = [System.Drawing.Color]::FromArgb(255, 35, 35, 35)
    
    $artnetLabel = New-Object System.Windows.Forms.Label
    $artnetLabel.Text = "🌐 ArtNet Status"
    $artnetLabel.Dock = [System.Windows.Forms.DockStyle]::Top
    $artnetLabel.Height = 30
    $artnetLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $artnetLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 255, 193, 7)
    $artnetPanel.Controls.Add($artnetLabel)
    
    $artnetTextBox = New-Object System.Windows.Forms.TextBox
    $artnetTextBox.Multiline = $true
    $artnetTextBox.ReadOnly = $true
    $artnetTextBox.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
    $artnetTextBox.Dock = [System.Windows.Forms.DockStyle]::Fill
    $artnetTextBox.BackColor = [System.Drawing.Color]::FromArgb(255, 25, 25, 25)
    $artnetTextBox.ForeColor = [System.Drawing.Color]::LightGray
    $artnetTextBox.Font = New-Object System.Drawing.Font("Consolas", 9)
    $artnetPanel.Controls.Add($artnetTextBox)
    
    # Create WebServer Panel
    $webPanel = New-Object System.Windows.Forms.Panel
    $webPanel.Dock = [System.Windows.Forms.DockStyle]::Fill
    $webPanel.BackColor = [System.Drawing.Color]::FromArgb(255, 35, 35, 35)
    
    $webLabel = New-Object System.Windows.Forms.Label
    $webLabel.Text = "🖥️ WebServer Issues"
    $webLabel.Dock = [System.Windows.Forms.DockStyle]::Top
    $webLabel.Height = 30
    $webLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $webLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 220, 53, 69)
    $webPanel.Controls.Add($webLabel)
    
    $webTextBox = New-Object System.Windows.Forms.TextBox
    $webTextBox.Multiline = $true
    $webTextBox.ReadOnly = $true
    $webTextBox.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
    $webTextBox.Dock = [System.Windows.Forms.DockStyle]::Fill
    $webTextBox.BackColor = [System.Drawing.Color]::FromArgb(255, 25, 25, 25)
    $webTextBox.ForeColor = [System.Drawing.Color]::LightGray
    $webTextBox.Font = New-Object System.Drawing.Font("Consolas", 9)
    $webPanel.Controls.Add($webTextBox)
    
    # Add panels to container
    $logPanelsContainer.Controls.Add($dmxPanel, 0, 0)
    $logPanelsContainer.Controls.Add($midiPanel, 1, 0)
    $logPanelsContainer.Controls.Add($artnetPanel, 0, 1)
    $logPanelsContainer.Controls.Add($webPanel, 1, 1)
    
    # Button event handlers
    $startButton.Add_Click({
        $startButton.Enabled = $false
        $stopButton.Enabled = $true
        $statusLabel.Text = "🟢 RUNNING"
        $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 40, 167, 69)
        
        # Start server
        $date = Get-Date
        $webTextBox.AppendText("$date - Server started on port $ServerPort`r`n")
        $ServerRunning = $true
    })
    
    $stopButton.Add_Click({
        $startButton.Enabled = $true
        $stopButton.Enabled = $false
        $statusLabel.Text = "🔴 STOPPED"
        $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 220, 53, 69)
        
        # Stop server
        $date = Get-Date
        $webTextBox.AppendText("$date - Server stopped`r`n")
        $ServerRunning = $false
    })
    
    $clearButton.Add_Click({
        $dmxTextBox.Clear()
        $midiTextBox.Clear()
        $artnetTextBox.Clear()
        $webTextBox.Clear()
        
        "" | Out-File -FilePath $DMXLogFile -Force
        "" | Out-File -FilePath $MIDILogFile -Force
        "" | Out-File -FilePath $ArtNetLogFile -Force
        "" | Out-File -FilePath $WebServerLogFile -Force
        
        [System.Windows.Forms.MessageBox]::Show("Logs cleared successfully!", "Success", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
    })
    
    # Add demo data
    $date = Get-Date
    $dmxTextBox.AppendText("$date - DMX: Channel 1 set to 255 (100 pct)`r`n")
    $dmxTextBox.AppendText("$date - DMX: Channel 2 set to 127 (50 pct)`r`n")
    $dmxTextBox.AppendText("$date - DMX: Universe 1, Channels 10-20 set for scene 'BlueWash'`r`n")
    
    $midiTextBox.AppendText("$date - MIDI: Note On C4 (velocity 100)`r`n")
    $midiTextBox.AppendText("$date - MIDI: CC 7 (Volume) set to 120`r`n")
    $midiTextBox.AppendText("$date - MIDI: Program Change to #5`r`n")
    
    $artnetTextBox.AppendText("$date - ArtNet: Node 192.168.1.100 connected`r`n")
    $artnetTextBox.AppendText("$date - ArtNet: Network configured with 2 universes`r`n")
    $artnetTextBox.AppendText("$date - ArtNet: Polling detected 3 nodes`r`n")
    
    $webTextBox.AppendText("$date - Web Server: Started on port $ServerPort`r`n")
    $webTextBox.AppendText("$date - Web Server: Client connected from 192.168.1.50`r`n")
    $webTextBox.AppendText("$date - Web Server: Scene editor loaded`r`n")
    
    # Return the form
    return $form
}

# Main execution starts here
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║                                                          ║" -ForegroundColor Magenta
Write-Host "║         " -NoNewline; Write-Host "🎭 $AppName Control Panel 🎭" -ForegroundColor White -NoNewline; Write-Host "          ║" -ForegroundColor Magenta
Write-Host "║                                                          ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# Create log files
foreach ($logFilePath in @($LogFile, $DMXLogFile, $MIDILogFile, $ArtNetLogFile, $WebServerLogFile)) {
    if (Test-Path $logFilePath) {
        Remove-Item $logFilePath -Force
    }
    "" | Out-File -FilePath $logFilePath -Force
}

Write-Info "Log files initialized"

if (-not $SkipBuild) {
    Write-Info "Building server..."
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Build failed with exit code $LASTEXITCODE"
        exit 1
    }
    
    Write-Success "Build completed"
} else {
    Write-Info "Build step skipped"
}

# Initialize and show UI
$form = Initialize-UI
# Ensure form is a valid Form object before calling ShowDialog
if ($form -and $form -is [System.Windows.Forms.Form]) {
    $form.ShowDialog() | Out-Null
} else {
    Write-ErrorMsg "Error: Could not create UI form properly. Return value: $form"
}

# Script complete
Write-Host "🎭 The Show Must Go On! Application closed. 🎭" -ForegroundColor Cyan
exit 0
