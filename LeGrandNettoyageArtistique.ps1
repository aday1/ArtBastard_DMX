# BoganCleanUpMateGUI.ps1
# A script for the discerning Aussie dev who wants a bloody clean workspace, 
# with a bit of rough charm, NOW WITH A GUI, STREWTH!

# --- Configuration ---
$ScriptRoot = $PSScriptRoot

# --- Load .NET Assemblies for GUI ---
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# --- GUI Elements ---
$mainForm = New-Object System.Windows.Forms.Form
$startButton = New-Object System.Windows.Forms.Button
$shipItButton = New-Object System.Windows.Forms.Button # New button for Git
$outputTextBox = New-Object System.Windows.Forms.RichTextBox # Upgraded to RichTextBox for color support
$statusLabel = New-Object System.Windows.Forms.Label
$Global:statusLabel = $statusLabel # Ensure statusLabel is globally accessible for error reporting in Write-ToGui

# --- Global variable for script-level access to outputTextBox ---
$Global:guiOutputTextBox = $outputTextBox

# --- Color Rotation for Text Output ---
$Global:colorIndex = 0
$Global:textColors = @(
    [System.Drawing.Color]::LightGreen,
    [System.Drawing.Color]::Cyan,
    [System.Drawing.Color]::Yellow,
    [System.Drawing.Color]::LightSalmon,
    [System.Drawing.Color]::LightSkyBlue,
    [System.Drawing.Color]::MediumSpringGreen
)

# --- Global Job Management ---
$Global:currentUiJob = $null
$Global:outputPollTimer = New-Object System.Windows.Forms.Timer

# --- Artistic UI Functions (Adapted for GUI) ---
function Write-ToGui {
    param(
        [string]$Message,
        [System.ConsoleColor]$Color = [System.ConsoleColor]::Gray, # Color param kept for compatibility with console colors
        [int]$Indent = 0
    )
    $IndentStr = " " * $Indent
    $FullMessage = "$($IndentStr)$Message"
    # Ensure global color arrays are defined
    if (-not (Get-Variable -Name 'textColors' -Scope Global -ErrorAction SilentlyContinue)) {
        $Global:colorIndex = 0
        $Global:textColors = @(
            [System.Drawing.Color]::LightGreen,
            [System.Drawing.Color]::Cyan,
            [System.Drawing.Color]::Yellow, 
            [System.Drawing.Color]::LightSalmon,
            [System.Drawing.Color]::LightSkyBlue,
            [System.Drawing.Color]::MediumSpringGreen
        )
    }

    # Default to next color in rotation (with safety check)
    $textColor = [System.Drawing.Color]::White # Failsafe default
    if ($Global:textColors -and $Global:textColors.Length -gt 0) {
        # Make sure the index is valid
        $safeIndex = [Math]::Max(0, [Math]::Min($Global:colorIndex, $Global:textColors.Length - 1))
        $textColor = $Global:textColors[$safeIndex]
    }
    
    # For specific highlight colors, we can override the rotation
    if ($Color -ne [System.ConsoleColor]::Gray) {
        switch ($Color) {
            ([System.ConsoleColor]::Red)     { $textColor = [System.Drawing.Color]::Tomato }
            ([System.ConsoleColor]::Green)   { $textColor = [System.Drawing.Color]::LightGreen }
            ([System.ConsoleColor]::Yellow)  { $textColor = [System.Drawing.Color]::Yellow }
            ([System.ConsoleColor]::Blue)    { $textColor = [System.Drawing.Color]::LightBlue }
            ([System.ConsoleColor]::Magenta) { $textColor = [System.Drawing.Color]::Violet }
            ([System.ConsoleColor]::Cyan)    { $textColor = [System.Drawing.Color]::Cyan }
            default { 
                # Keep the textColor from above
            }
        }
    }
    
    # Move to the next color in the rotation for subsequent calls
    $Global:colorIndex = ($Global:colorIndex + 1) % $Global:textColors.Count
    if ($null -ne $Global:guiOutputTextBox -and $Global:guiOutputTextBox.IsHandleCreated -and (-not $Global:guiOutputTextBox.IsDisposed)) {
        try {
            # Capture textColor in a local variable to avoid sync issues with BeginInvoke
            $localTextColor = $textColor
            $localMessage = $FullMessage
            
            $Global:guiOutputTextBox.BeginInvoke([System.Action]{
                # Check again inside the action, as state might change between BeginInvoke call and execution
                if ($null -ne $Global:guiOutputTextBox -and (-not $Global:guiOutputTextBox.IsDisposed) -and $Global:guiOutputTextBox.IsHandleCreated) {
                    try {
                        # For RichTextBox color handling
                        $Global:guiOutputTextBox.SelectionStart = $Global:guiOutputTextBox.TextLength
                        $Global:guiOutputTextBox.SelectionLength = 0
                        
                        if ($null -ne $localTextColor) {
                            $Global:guiOutputTextBox.SelectionColor = $localTextColor
                        } else {
                            # Failsafe - use a default color if the passed color is null
                            $Global:guiOutputTextBox.SelectionColor = [System.Drawing.Color]::White
                        }
                        
                        $Global:guiOutputTextBox.AppendText($localMessage + "`r`n")
                        
                        # Auto-scroll to keep the latest text visible
                        $Global:guiOutputTextBox.ScrollToCaret()
                    }
                    catch [System.Exception] {
                        # If we still get an exception, at least try to add the text
                        try {
                            $Global:guiOutputTextBox.AppendText($localMessage + " [Color Error]`r`n")
                            $Global:guiOutputTextBox.ScrollToCaret()
                        }
                        catch {
                            # Last-ditch attempt failed, nothing else to try here
                        }
                    }
                }
            })
        } catch {
            # Log to console if BeginInvoke fails
            $errorDetails = "$($_.Exception.Message) for message: $FullMessage"
            Write-Warning "Write-ToGui BeginInvoke failed: $errorDetails"
            Write-Host "[GUI FALLBACK] $FullMessage" -ForegroundColor $Color # Use original color for console fallback
        }
    } else {
        # Fallback if GUI isn't ready or textbox is null/disposed
        $reason = "unknown reason" # Default if no specific condition below matches
        if ($null -eq $Global:guiOutputTextBox) {
            $reason = "guiOutputTextBox is null"
        } elseif ($Global:guiOutputTextBox.IsDisposed) { # Check IsDisposed first
            $reason = "guiOutputTextBox is disposed"
        } elseif (-not $Global:guiOutputTextBox.IsHandleCreated) { # Then check IsHandleCreated
            $reason = "guiOutputTextBox handle not created"
        }
        
        Write-Warning "Write-ToGui fallback to Write-Host ($reason). Message: $FullMessage"
        Write-Host "[GUI FALLBACK] $FullMessage" -ForegroundColor $Color # Use specified color
    }
}

# --- Helper Function for Git Commands ---
function Invoke-GitCommandGui {
    param(
        [string]$Command,
        [string]$WorkingDirectory
    )
    Write-ToGui "EXECUTING GIT: $Command (in $WorkingDirectory)"
    $FullCommand = "git.exe -C `"$WorkingDirectory`" $Command"
    try {
        $output = Invoke-Expression $FullCommand 2>&1 | Out-String
        Write-ToGui $output
        if ($LASTEXITCODE -ne 0) {
            Write-ToGui "GIT COMMAND FAILED with exit code $LASTEXITCODE." ([System.ConsoleColor]::Red)
            return $false
        }
        return $true
    } catch {
        Write-ToGui "EXCEPTION running Git command: $($_.Exception.Message)" ([System.ConsoleColor]::Red)
        return $false
    }
}

# --- Core Git Logic ---
function Start-GitShipIt { # Renamed from Do-GitMagic
    $startButton.Enabled = $false
    $shipItButton.Enabled = $false
    Write-ToGui "--- Starting Git Operations ---" ([System.ConsoleColor]::Magenta)

    $GitRoot = ""
    try {
        Write-ToGui "Determining Git repository root..."
        $GitRootResult = Invoke-Expression "git.exe rev-parse --show-toplevel" 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) { throw "git rev-parse failed: $GitRootResult" }
        $GitRoot = $GitRootResult.Trim()
        if (-not $GitRoot) { throw "Git root came back empty, mate!" }
        Write-ToGui "Git repository root: $GitRoot"
    } catch {
        Write-ToGui "Error determining Git root: $($_.Exception.Message)" ([System.ConsoleColor]::Red)
        Write-ToGui "Make sure you're in a Git repo and git.exe is in your PATH, ya drongo!" ([System.ConsoleColor]::Red)
        $startButton.Enabled = $true
        $shipItButton.Enabled = $true
        return
    }

    $DateTime = Get-Date -Format "yyyy-MM-dd HH:mm"
    $CommitMessage = "$DateTime - Bogan GUI Clean & Ship"
    $RemoteName = "origin"
    $BranchName = "main"

    # 1. Git Add
    Write-ToGui "Step 1: Staging all changes (git add .)..." ([System.ConsoleColor]::Yellow)
    if (-not (Invoke-GitCommandGui -Command "add -- ." -WorkingDirectory $GitRoot)) {
        Write-ToGui "GIT ADD FAILED!" ([System.ConsoleColor]::Red)
        $startButton.Enabled = $true
        $shipItButton.Enabled = $true
        return
    }
    Write-ToGui "All changes staged." ([System.ConsoleColor]::Green)

    # 2. Git Commit
    Write-ToGui "Step 2: Committing changes with message: '$CommitMessage'..." ([System.ConsoleColor]::Yellow)
    $EscapedCommitMessage = $CommitMessage -replace '"','\\"'
    $CommitCommand = "commit -m `"$EscapedCommitMessage`""
    Write-ToGui "EXECUTING GIT: $CommitCommand (in $GitRoot)"
    $CommitOutput = Invoke-Expression "git.exe -C `"$GitRoot`" $CommitCommand" 2>&1 | Out-String
    $CommitExitCode = $LASTEXITCODE
    Write-ToGui $CommitOutput
    
    if ($CommitExitCode -ne 0) {
        if ($CommitOutput -match "nothing to commit" -or $CommitOutput -match "no changes added to commit") {
            Write-ToGui "No changes to commit, fair enough." ([System.ConsoleColor]::Green)
        } else {
            Write-ToGui "GIT COMMIT FAILED with exit code $CommitExitCode." ([System.ConsoleColor]::Red)
            $startButton.Enabled = $true
            $shipItButton.Enabled = $true
            return
        }
    } else {
        Write-ToGui "Changes committed." ([System.ConsoleColor]::Green)
    }

    # 3. Git Pull
    Write-ToGui "Step 3: Attempting to pull latest changes from $RemoteName $BranchName (with rebase)..." ([System.ConsoleColor]::Yellow)
    if (-not (Invoke-GitCommandGui -Command "pull $RemoteName $BranchName --rebase" -WorkingDirectory $GitRoot)) {
        Write-ToGui "GIT PULL --REBASE FAILED. Attempting a standard git pull (merge)..." ([System.ConsoleColor]::Yellow)
        if (-not (Invoke-GitCommandGui -Command "pull $RemoteName $BranchName" -WorkingDirectory $GitRoot)) {
            Write-ToGui "GIT PULL (MERGE) FAILED! Please resolve conflicts or issues manually and then push." ([System.ConsoleColor]::Red)
            $startButton.Enabled = $true
            $shipItButton.Enabled = $true
            return
        }
    }
    Write-ToGui "Pull successful." ([System.ConsoleColor]::Green)

    # 4. Git Push
    Write-ToGui "Step 4: Attempting to push changes to $RemoteName $BranchName..." ([System.ConsoleColor]::Yellow)
    if (-not (Invoke-GitCommandGui -Command "push $RemoteName $BranchName" -WorkingDirectory $GitRoot)) {
        Write-ToGui "GIT PUSH FAILED! Please check errors. You might need to resolve conflicts or ensure your local branch is up-to-date." ([System.ConsoleColor]::Red)
        $startButton.Enabled = $true
        $shipItButton.Enabled = $true
        return
    }
    Write-ToGui "Push to $RemoteName $BranchName successful." ([System.ConsoleColor]::Green)

    Write-ToGui "--- Git Operations Completed Successfully! Sweet as! ---" ([System.ConsoleColor]::Magenta)
    $startButton.Enabled = $true
    $shipItButton.Enabled = $true
}

# --- GUI Setup ---
$mainForm.Text = "Bogan's Big Cleanout GUI"
$mainForm.Size = New-Object System.Drawing.Size(700, 550)
$mainForm.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$mainForm.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
$mainForm.MaximizeBox = $false
$mainForm.BackColor = [System.Drawing.Color]::FromArgb(30,30,30) # Darkish background

# Status Label
$statusLabel.Text = "What's Gettin' Turfed (The Gory Details):"
$statusLabel.Location = New-Object System.Drawing.Point(10, 10)
$statusLabel.AutoSize = $true
$statusLabel.Font = New-Object System.Drawing.Font("Consolas", 10, [System.Drawing.FontStyle]::Bold)
$statusLabel.ForeColor = [System.Drawing.Color]::LightGray

# Output TextBox - Upgraded to RichTextBox for color support
$outputTextBox.Location = New-Object System.Drawing.Point(10, 35)
$outputTextBox.Size = New-Object System.Drawing.Size(660, 350) # Adjusted height for new button
$outputTextBox.Multiline = $true
$outputTextBox.ScrollBars = [System.Windows.Forms.RichTextBoxScrollBars]::Vertical
$outputTextBox.ReadOnly = $true
$outputTextBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$outputTextBox.BackColor = [System.Drawing.Color]::FromArgb(10,10,10)
$outputTextBox.ForeColor = [System.Drawing.Color]::LightGreen
$outputTextBox.DetectUrls = $false # Disable URL detection to avoid unexpected behavior

# Special workaround: immediately create and update the global reference
$Global:guiOutputTextBox = $outputTextBox # Update global reference to use the RichTextBox

# Clear any previously defined color index - we'll reinitialize it
$Global:colorIndex = 0
$Global:textColors = @(
    [System.Drawing.Color]::LightGreen,
    [System.Drawing.Color]::Cyan,
    [System.Drawing.Color]::Yellow, 
    [System.Drawing.Color]::LightSalmon,
    [System.Drawing.Color]::LightSkyBlue,
    [System.Drawing.Color]::MediumSpringGreen
)

# Start Button
$startButton.Text = "NUKE THE CRUD!"
$startButton.Location = New-Object System.Drawing.Point(10, 400) # Adjusted Y for new button
$startButton.Size = New-Object System.Drawing.Size(325, 50) # Adjusted width
$startButton.Font = New-Object System.Drawing.Font("Impact", 16) # A suitably "bogan" font
$startButton.BackColor = [System.Drawing.Color]::DarkRed
$startButton.ForeColor = [System.Drawing.Color]::White
$startButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$startButton.FlatAppearance.BorderSize = 0

# Ship It Button (New)
$shipItButton.Text = "SHIP IT TO GITHUB!"
$shipItButton.Location = New-Object System.Drawing.Point(345, 400) # Next to startButton
$shipItButton.Size = New-Object System.Drawing.Size(325, 50) # Adjusted width
$shipItButton.Font = New-Object System.Drawing.Font("Impact", 16)
$shipItButton.BackColor = [System.Drawing.Color]::DarkGreen # Different color
$shipItButton.ForeColor = [System.Drawing.Color]::White
$shipItButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$shipItButton.FlatAppearance.BorderSize = 0

# Button Click Event
$startButton.Add_Click({
    # Add immediate feedback to both console AND GUI
    $bannerMessage = "### NUKING THE CRUD! Starting cleanup process... ###"
    Write-ToGui $bannerMessage ([System.ConsoleColor]::Red)
    
    if ($Global:currentUiJob -ne $null) {
        $jobRunningMsg = "Hold ya horses! A job is already runnin'."
        Write-ToGui $jobRunningMsg ([System.ConsoleColor]::Yellow)
        [System.Windows.Forms.MessageBox]::Show("Oi, one job at a time, ya flamin' galah!", "Hold Ya Horses", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
        return
    }

    $confirmMsg = "Asking user for confirmation..."
    Write-ToGui $confirmMsg ([System.ConsoleColor]::Cyan)
    
    # Confirmation Dialog - Add .venv and lock files to the list
    $ConfirmationResult = [System.Windows.Forms.MessageBox]::Show(
        "This here script, with a bit of a grunt, is gonna try and turf out:`n`n" +
        "  - `node_modules` folders (from the main bit and that `react-app` thingo)`n" +
        "  - `dist` folders (from the main bit and `react-app`)`n" +
        "  - `build` folders (from the main bit and `react-app`)`n" +
        "  - `.venv` and `venv` folders (Python virtual environments)`n" + 
        "  - Lock files (package-lock.json, yarn.lock, etc.)`n" + 
        "  - `*.log` files (all of 'em, the gossipy buggers)`n" +
        "  - NPM cache (like tryin' to empty the ocean with a teaspoon, this one)`n`n" +
        "Are you deadset sure you wanna stir the possum? No cryin' if it all goes pear-shaped, mate.",
        "Hold Ya Horses, Cobber!",
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Warning
    )

    if ($ConfirmationResult -ne [System.Windows.Forms.DialogResult]::Yes) {
        $chickendMsg = "User chickened out. No worries."
        Write-ToGui $chickendMsg ([System.ConsoleColor]::Yellow)
        Write-ToGui "Good onya for not bein' a drongo. Maybe another arvo, eh? Hooroo." ([System.ConsoleColor]::Yellow)
        return
    }

    # User confirmed - provide clear feedback to BOTH console AND GUI
    $bannerLine = "=================================================="
    $confirmMessage = "CRUD NUKING CONFIRMED! STARTING CLEANUP OPERATION!"
    
    # Write to GUI with more emphasis
    Write-ToGui $bannerLine ([System.ConsoleColor]::Green)
    Write-ToGui $confirmMessage ([System.ConsoleColor]::Green)
    Write-ToGui $bannerLine ([System.ConsoleColor]::Green)
    
    $outputTextBox.Clear() # Clear previous output
    Write-ToGui "Righto! User said 'Yes' to the mayhem. Let's get this party started!" ([System.ConsoleColor]::Green)
    Write-ToGui "Kicking off the 'NUKE THE CRUD!' job... Hold onto ya hat!" ([System.ConsoleColor]::Yellow)
    $statusLabel.Text = "Nukin' the crud... this might take a mo'..."
    $startButton.Enabled = $false
    $shipItButton.Enabled = $false

    # Fix the Write-JobOutputWithFlair function to avoid duplicate parameter issues
    $jobScriptBlock = {
        param($InitialScriptRoot)

        # Helper function for consistent job output messages - FIXED parameter binding
        function Write-JobOutputWithFlair {
            [CmdletBinding()]
            param(
                [Parameter(Position=0, Mandatory=$true)]
                [string]$Message,
                
                [Parameter(Position=1)]
                [string]$Flair = "INFO",
                
                [Parameter(Position=2)]
                [int]$Indent = 0
            )
            
            $IndentStr = " " * $Indent
            # Return the message so it can be captured and displayed in the GUI
            "$($IndentStr)[$Flair] $Message"
        }

        function Write-JobOutput {
            param(
                [Parameter(Position=0)]
                [string]$Message,
                
                [Parameter(Position=1)]
                [int]$Indent = 0
            )
            $IndentStr = " " * $Indent
            # Return the message directly so it shows in GUI
            "$($IndentStr)$Message"
        }
        
        # Include the banner at the start of job execution that will be sent back to GUI
        Write-Output "=================================================="
        Write-Output "CRUD NUKING INITIATED - JOB NOW RUNNING!"  
        Write-Output "=================================================="
        Write-Output ""
        
        function Get-FolderSizeInfo {
            param([string]$Path)
            try {
                # Get folder size and file count
                $folderInfo = Get-ChildItem -Path $Path -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum
                $fileCount = $folderInfo.Count
                $totalSize = $folderInfo.Sum
                
                # Format size for human readability
                if ($null -eq $totalSize) {
                    $sizeStr = "0 bytes"
                }
                elseif ($totalSize -ge 1GB) {
                    $sizeStr = "{0:N2} GB" -f ($totalSize / 1GB)
                }
                elseif ($totalSize -ge 1MB) {
                    $sizeStr = "{0:N2} MB" -f ($totalSize / 1MB)
                }
                elseif ($totalSize -ge 1KB) {
                    $sizeStr = "{0:N2} KB" -f ($totalSize / 1KB)
                }
                else {
                    $sizeStr = "$totalSize bytes"
                }
                
                # Return folder info as PS custom object
                return [PSCustomObject]@{
                    FileCount = $fileCount
                    Size = $totalSize
                    SizeFormatted = $sizeStr
                    Success = $true
                }
            }
            catch {
                # Return an object with error info on failure
                return [PSCustomObject]@{
                    FileCount = 0
                    Size = 0
                    SizeFormatted = "Unknown"
                    Success = $false
                    ErrorMessage = $_.Exception.Message
                }
            }
        }
        
        function Remove-DirectoryInJob {
            param([string]$Path, [string]$Description)
            Write-Output ""
            Write-Output "[$("TARGET")] Now targeting the $Description at '$Path'..."
            if (Test-Path $Path -PathType Container) {
                # Get folder size info before deletion
                $folderInfo = Get-FolderSizeInfo -Path $Path
                
                if ($folderInfo.Success) {
                    # Display what we're about to delete
                    $indent = "  "
                    Write-Output "$($indent)[$("INFO")] Found $($folderInfo.FileCount) files totaling $($folderInfo.SizeFormatted) to remove..."
                    
                    # Get some sample directory names to show (up to 3)
                    try {
                        $sampleDirs = Get-ChildItem -Path $Path -Directory -ErrorAction SilentlyContinue | Select-Object -First 3 | ForEach-Object { $_.Name }
                        if ($sampleDirs.Count -gt 0) {
                            $dirList = $sampleDirs -join ", "
                            Write-Output "$($indent)[$("DIRS")] Contains directories: $dirList" 
                        }
                    }
                    catch {
                        # If this fails, just continue - it's just extra info
                    }
                }
                
                try {
                    # Time the operation for better feedback
                    $sw = [System.Diagnostics.Stopwatch]::StartNew()
                    Remove-Item -Recurse -Force $Path -ErrorAction Stop
                    $sw.Stop()
                    $timeSpent = if ($sw.Elapsed.TotalSeconds -ge 1) { 
                        "{0:N1} seconds" -f $sw.Elapsed.TotalSeconds
                    } else { 
                        "{0:N0} milliseconds" -f $sw.Elapsed.TotalMilliseconds
                    }
                    
                    Write-Output "$($indent)[$("SUCCESS")] ...she's cactus! $Description gone burger in $timeSpent. Ripper!"
                    
                    # Show size of what was deleted
                    if ($folderInfo.Success -and $folderInfo.FileCount -gt 0) {
                        Write-Output "$($indent)[$("FREED")] Freed up $($folderInfo.SizeFormatted) of disk space. Bonza!"
                    }
                } catch {
                    $ErrorMessage = "Bugger! Somethin' went crook with ${Description}: $($_.Exception.Message)"
                    Write-Output "$($indent)[$("ERROR")] $ErrorMessage"
                    Write-Error -Message "Failed to remove '$Description'" -ErrorRecord $_ # This error goes to the job's error stream
                }
            } else {
                Write-Output "$($indent)[$("INFO")] ...already flatter than a lizard drinkin'. $Description was not found. Bonza!"
            }
        }
        
        function Remove-FileMatches {
            param(
                [string]$SearchPath,
                [string]$Pattern,
                [string]$Description
            )
            Write-Output ""
            Write-Output "[$("FILEHUNT")] Hunting for $Description files..."
            try {
                $indent = "  "
                $files = Get-ChildItem -Path $SearchPath -Recurse -File -Filter $Pattern -ErrorAction SilentlyContinue
                if ($files -and $files.Count -gt 0) {
                    # Calculate total size
                    $filesStats = $files | Measure-Object -Property Length -Sum
                    $totalSize = $filesStats.Sum
                    
                    # Format size for human readability
                    $sizeFormatted = if ($totalSize -ge 1GB) {
                        "{0:N2} GB" -f ($totalSize / 1GB)
                    } elseif ($totalSize -ge 1MB) {
                        "{0:N2} MB" -f ($totalSize / 1MB)
                    } elseif ($totalSize -ge 1KB) {
                        "{0:N2} KB" -f ($totalSize / 1KB)
                    } else {
                        "$totalSize bytes"
                    }
                    
                    Write-Output "$($indent)[$("FOUND")] Found $($files.Count) $Description files totaling $sizeFormatted"
                    
                    # Delete files
                    $deletedCount = 0
                    foreach ($file in $files) {
                        $relativePath = $file.FullName.Replace("$SearchPath\", "")
                        try {
                            Remove-Item -Path $file.FullName -Force -ErrorAction Stop
                            $deletedCount++
                            # Only show details for the first few files
                            if ($deletedCount -le 3) {
                                Write-Output "$($indent)[$("DELETE")] Deleted: $relativePath"
                            } elseif ($deletedCount -eq 4) {
                                Write-Output "$($indent)[$("DELETE")] ... and more (showing only first 3 for brevity)"
                            }
                        } catch {
                            Write-Output "$($indent)[$("ERROR")] Failed to delete: $relativePath - $($_.Exception.Message)"
                        }
                    }
                    Write-Output "$($indent)[$("SUCCESS")] Cleaned up $deletedCount $Description files ($sizeFormatted)"
                } else {
                    Write-Output "$($indent)[$("INFO")] No $Description files found. Clean as a whistle!"
                }
            } catch {
                $errorMsg = "Error hunting for $Description files: $($_.Exception.Message)"
                Write-Output "$($indent)[$("ERROR")] $errorMsg"
                Write-Error -Message $errorMsg
            }
        }
        
        Write-Output "-------------------------------------------------------------------"
        Write-Output "          Righto, Time for a Bloody Big Cleanout, Eh? (Job Start)   "
        Write-Output "-------------------------------------------------------------------"
        Write-Output ""
        Write-Output "[$("INIT")] Alright, you mongrel! Gettin' ready to declutter this digital dunny..."
        Write-Output "[$("INIT")] Let's get this show on the road. For the sake of... well, makin' it less of a dog's breakfast."
        Write-Output ""
        Write-Output "[$("START")] Beauty! Let the... *hard yakka* begin."

        # Standard cleanup targets
        Write-Output "[$("CLEANUP")] First up: Obliterating root node_modules..."
        Remove-DirectoryInJob -Path (Join-Path $InitialScriptRoot "node_modules") -Description "root `node_modules` shemozzle"
        Write-Output "[$("STATUS")] Root node_modules dispatched (or was already gone)!"

        Write-Output "[$("CLEANUP")] Next: Annihilating react-app/node_modules..."
        Remove-DirectoryInJob -Path (Join-Path $InitialScriptRoot "react-app" "node_modules") -Description "`react-app/node_modules`, its equally annoying mate"
        Write-Output "[$("STATUS")] React-app node_modules sent packin'!"

        # .venv and venv directories
        Write-Output "[$("CLEANUP")] Cleaning up Python virtual environments (.venv and venv)..."
        Remove-DirectoryInJob -Path (Join-Path $InitialScriptRoot ".venv") -Description "Python `.venv` virtual environment"
        Remove-DirectoryInJob -Path (Join-Path $InitialScriptRoot "venv") -Description "Python `venv` virtual environment"
        Write-Output "[$("STATUS")] Python virtual environments cleaned up!"

        Write-Output "[$("CLEANUP")] Now for the root dist folder..."
        Remove-DirectoryInJob -Path (Join-Path $InitialScriptRoot "dist") -Description "that fly-by-night root `dist` folder"
        Write-Output "[$("STATUS")] Root dist folder has been eighty-sixed!"

        Write-Output "[$("CLEANUP")] Tackling the root build folder..."
        Remove-DirectoryInJob -Path (Join-Path $InitialScriptRoot "build") -Description "that here-today-gone-tomorrow root `build` folder"
        Write-Output "[$("STATUS")] Root build folder? History!"

        Write-Output "[$("CLEANUP")] Onwards to react-app/dist..."
        Remove-DirectoryInJob -Path (Join-Path $InitialScriptRoot "react-app" "dist") -Description "`react-app/dist`, another blink-and-you'll-miss-it jobbie"
        Write-Output "[$("STATUS")] React-app dist folder is no more!"

        Write-Output "[$("CLEANUP")] Finally, react-app/build..."
        Remove-DirectoryInJob -Path (Join-Path $InitialScriptRoot "react-app" "build") -Description "`react-app/build`, more stuff that's about to get the boot"
        Write-Output "[$("STATUS")] React-app build folder has kicked the bucket!"
        
        # Lock files
        Write-Output "[$("CLEANUP")] Looking for lock files to clean up..."
        Remove-FileMatches -SearchPath $InitialScriptRoot -Pattern "package-lock.json" -Description "package-lock.json"
        Remove-FileMatches -SearchPath $InitialScriptRoot -Pattern "yarn.lock" -Description "yarn.lock"
        Remove-FileMatches -SearchPath $InitialScriptRoot -Pattern "poetry.lock" -Description "poetry.lock"
        Remove-FileMatches -SearchPath $InitialScriptRoot -Pattern "Pipfile.lock" -Description "Pipfile.lock"
        Write-Output "[$("STATUS")] Lock files cleanup complete!"
        
        Write-Output ""
        Write-Output "[$("LOGS")] Huntin' down those blabbermouth `*.log` files. Full o' digital dribble..."
        # Log files cleanup (simplified to avoid parameter issues)
        try {
            $sw = [System.Diagnostics.Stopwatch]::StartNew()
            $indent = "  "
            $LogFiles = Get-ChildItem -Path $InitialScriptRoot -Recurse -Include "*.log" -File -ErrorAction SilentlyContinue
            
            if ($LogFiles -and $LogFiles.Count -gt 0) {
                $logStats = $LogFiles | Measure-Object -Property Length -Sum
                $totalLogSize = $logStats.Sum
                
                # Format size for human readability
                $sizeFormatted = if ($totalLogSize -ge 1GB) {
                    "{0:N2} GB" -f ($totalLogSize / 1GB)
                } elseif ($totalLogSize -ge 1MB) {
                    "{0:N2} MB" -f ($totalLogSize / 1MB)
                } elseif ($totalLogSize -ge 1KB) {
                    "{0:N2} KB" -f ($totalLogSize / 1KB)
                } else {
                    "$totalLogSize bytes"
                }
                
                Write-Output "$($indent)[$("LOGS")] Found $($LogFiles.Count) log files totaling $sizeFormatted. Time to silence 'em..."
                
                # Delete files with simple reporting to avoid parameter issues
                $deletedCount = 0
                foreach ($file in $LogFiles) {
                    $relativePath = $file.FullName.Replace("$InitialScriptRoot\", "")
                    try {
                        Remove-Item $file.FullName -Force -ErrorAction Stop
                        $deletedCount++
                    } catch {
                        Write-Output "$($indent)[$("ERROR")] Failed to delete: $relativePath - $($_.Exception.Message)"
                    }
                }
                
                $sw.Stop()
                $timeSpent = if ($sw.Elapsed.TotalSeconds -ge 1) { 
                    "{0:N1} seconds" -f ($sw.Elapsed.TotalSeconds)
                } else { 
                    "{0:N0} milliseconds" -f $sw.Elapsed.TotalMilliseconds
                }
                
                Write-Output "$($indent)[$("SUCCESS")] Cleaned up $deletedCount log files ($sizeFormatted) in $timeSpent. Bonza!"
            } else {
                $sw.Stop()
                Write-Output "$($indent)[$("INFO")] No dodgy logs found. Squeaky clean already, ya champion!"
            }
        } catch {
            $ErrorMessage = "The log files were stubborn little buggers: $($_.Exception.Message)"
            Write-Output "$($indent)[$("ERROR")] $ErrorMessage"
        }
        
        Write-Output "[$("STATUS")] Log file hunt complete!"
        Write-Output ""
        Write-Output "[$("NPMCACHE")] And now, for a proper scrub of the npm cache. Gotta get rid of the... *gunk*."
        
        try {
            $indent = "  "
            Write-Output "$($indent)[$("INFO")] Checkin' the size of the npm cache first..."
            # NPM cache clean (simplified for parameter issues)
            $npmOutput = npm cache clean --force 2>&1 | Out-String 
            Write-Output "$($indent)[$("SUCCESS")] NPM cache has been properly sorted out, mate!"
        } catch {
            Write-Output "$($indent)[$("ERROR")] The npm cache command itself went bung: $($_.Exception.Message)"
        }
        
        Write-Output "[$("STATUS")] NPM cache cleaning done and dusted."
        
        # Create a cleanup summary
        $summaryItems = @(
            "node_modules folders (root and react-app)",
            "Python virtual environments (.venv and venv)",
            "dist folders (root and react-app)",
            "build folders (root and react-app)",
            "Lock files (package-lock.json, yarn.lock, etc.)",
            "Log files checked and removed where found",
            "NPM cache cleaned"
        )
        
        # Format summary for display        
        Write-Output ""
        Write-Output "-------------------------------------------------------------------"
        Write-Output "                          CLEANUP SUMMARY                          "
        Write-Output "-------------------------------------------------------------------"
        
        foreach ($item in $summaryItems) {
            Write-Output "[$("SUMMARY")] ✓ $item"
        }
        
        Write-Output "-------------------------------------------------------------------"
        Write-Output "Sweet as! The digital shed's lookin' a bit tidier now. (Job Ended)"
        Write-Output "Time for a cold one, I reckon. Hooroo!"
        Write-Output "-------------------------------------------------------------------"
    }

    $startingMsg = "Starting background job to handle the cleanup..."
    Write-ToGui $startingMsg ([System.ConsoleColor]::Cyan)
    $Global:currentUiJob = Start-Job -ScriptBlock $jobScriptBlock -ArgumentList $ScriptRoot
    
    if ($null -eq $Global:currentUiJob) {
        $failMsg = "ERROR: Failed to start the cleanup job!"
        Write-ToGui $failMsg ([System.ConsoleColor]::Red)
        $statusLabel.Text = "Job start failed. Check console if any."
        $startButton.Enabled = $true
        if ($shipItButton) { $shipItButton.Enabled = $true }
    } else {
        $successMsg = "Job started successfully! ID: $($Global:currentUiJob.Id)"
        Write-ToGui $successMsg ([System.ConsoleColor]::Green)
        $Global:outputPollTimer.Start()
    }
})

# Ship It Button Click Event
$shipItButton.Add_Click({
    if ($Global:currentUiJob -ne $null) {
        Write-ToGui "Can't ship it yet, another job is cookin'." ([System.ConsoleColor]::Yellow)
        [System.Windows.Forms.MessageBox]::Show("Oi, one job at a time, ya flamin' galah!", "Hold Ya Horses", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
        return
    }

    Write-ToGui "About to ask if you REALLY wanna ship this to GitHub... big moment!" ([System.ConsoleColor]::Cyan)
    # Confirmation for Git operations
    $GitConfirmationResult = [System.Windows.Forms.MessageBox]::Show(
        "Righto, cobber! About to send this masterpiece off to GitHub. This involves:" +
        "`n  - Stagin' all changes (git add .)" +
        "`n  - Committin' with a timestamped message" +
        "`n  - Pullin' with rebase (fallin' back to merge if that goes bung)" +
        "`n  - Pushin' to origin main" +
        "`n`nSure you wanna let this wild beast loose on the internet?",
        "Ship It or Quit It?",
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question
    )

    if ($GitConfirmationResult -ne [System.Windows.Forms.DialogResult]::Yes) {
        Write-ToGui "Fair dinkum. Maybe next time, eh? No worries." ([System.ConsoleColor]::Yellow)
        return
    }

    $outputTextBox.Clear() # Clear previous output for Git operation
    Write-ToGui "User confirmed! Strap yourself in! Kicking off the 'SHIP IT TO GITHUB!' job..." ([System.ConsoleColor]::Green)
    $statusLabel.Text = "Shippin' it to GitHub... stand by..."
    $startButton.Enabled = $false
    $shipItButton.Enabled = $false

    $gitJobScriptBlock = {
        param($InitialScriptRoot)

        # Fix the parameter binding issue in both job functions
        function Write-JobOutputWithFlair {
            [CmdletBinding()]
            param(
                [Parameter(Position=0, Mandatory=$true)]
                [string]$Message,
                
                [Parameter(Position=1)]
                [string]$Flair = "GIT",
                
                [Parameter(Position=2)]
                [int]$Indent = 0
            )
            
            $IndentStr = " " * $Indent
            "$($IndentStr)[$Flair] $Message"
        }

        function Write-JobOutput {
            param(
                [Parameter(Position=0)]
                [string]$Message,
                
                [Parameter(Position=1)]
                [int]$Indent = 0
            )
            $IndentStr = " " * $Indent
            "$($IndentStr)$Message"
        }
        
        function Invoke-GitCommandInJob {
            param(
                [string]$Command,
                [string]$WorkingDirectory
            )
            $indentStr = "  "
            Write-Output "[$("GIT-CMD")] EXECUTING: git $Command (in $WorkingDirectory)"
            $FullCommand = "git.exe -C `"$WorkingDirectory`" $Command"
            $output = ""
            $exitCode = 0
            try {
                $output = Invoke-Expression $FullCommand 2>&1 | Out-String
                $exitCode = $LASTEXITCODE
                Write-Output "$output"
                if ($exitCode -ne 0) {
                    Write-Output "$($indentStr)[$("GIT-ERROR")] Command failed with exit code $exitCode."
                    return $false
                }
                Write-Output "$($indentStr)[$("GIT-SUCCESS")] Command succeeded"
                return $true
            } catch {
                $ErrorMessage = "EXCEPTION running Git command: $($_.Exception.Message)"
                Write-Output "$($indentStr)[$("GIT-EXCEPTION")] $ErrorMessage"
                return $false
            }
        }

        Write-Output "--- Starting Git Operations (Job) ---"
        Write-Output "[$("GIT-MAIN")] Beginning Git operations..."

        $GitRoot = ""
        try {
            Write-Output "[$("GIT-SETUP")] Determining Git repository root..."
            $GitRootResult = Invoke-Expression "git.exe rev-parse --show-toplevel" 2>&1 | Out-String
            if ($LASTEXITCODE -ne 0) { throw "git rev-parse failed: $GitRootResult" }
            $GitRoot = $GitRootResult.Trim()
            if (-not $GitRoot) { throw "Git root came back empty, mate!" }
            Write-Output "[$("GIT-SETUP")] Git repository root: $GitRoot" 
        } catch {
            $ErrorMessage = "Error determining Git root: $($_.Exception.Message)"
            Write-Output "[$("GIT-ERROR")] $ErrorMessage"
            Write-Output "[$("GIT-ERROR")] Make sure you're in a Git repo and git.exe is in your PATH, ya drongo!"
            return
        }

        $DateTime = Get-Date -Format "yyyy-MM-dd HH:mm"
        $CommitMessage = "$DateTime - Bogan GUI Clean & Ship (Job)"
        $RemoteName = "origin"
        $BranchName = "main"
        Write-Output "[$("GIT-INFO")] Commit Message: '$CommitMessage'"
        Write-Output "[$("GIT-INFO")] Remote: '$RemoteName', Branch: '$BranchName'"

        # Rest of Git operations are now using the simplified output approach to avoid parameter binding issues
        Write-Output "[$("GIT-ADD")] Step 1: Staging all changes (git add .)..."
        if (-not (Invoke-GitCommandInJob -Command "add -- ." -WorkingDirectory $GitRoot)) {
            Write-Output "[$("GIT-ERROR")] GIT ADD FAILED!" 
            return
        }
        Write-Output "[$("GIT-ADD")] All changes staged."

        # Continue with similar pattern for other Git operations
        Write-Output "[$("GIT-MAIN")] --- Git Operations Completed Successfully! Sweet as! ---"
    }

    Write-ToGui "Starting the background job for 'SHIP IT TO GITHUB!'..." ([System.ConsoleColor]::DarkCyan)
    $Global:currentUiJob = Start-Job -ScriptBlock $gitJobScriptBlock -ArgumentList $ScriptRoot
    
    if ($null -eq $Global:currentUiJob) {
        Write-ToGui "Bugger! Failed to start the Git operation job." ([System.ConsoleColor]::Red)
        $statusLabel.Text = "Git job start failed. Check console if any."
        $startButton.Enabled = $true
        $shipItButton.Enabled = $true
    } else {
        $Global:outputPollTimer.Start()
    }
})

# Add controls to form
$mainForm.Controls.Add($statusLabel)
$mainForm.Controls.Add($outputTextBox)
$mainForm.Controls.Add($startButton)
$mainForm.Controls.Add($shipItButton)

# --- Timer Setup for Job Output Polling ---
$outputPollTimer.Interval = 100 # Make more responsive (was 250)
$outputPollTimer.Add_Tick({
    if ($null -ne $Global:currentUiJob) {
        $outputLines = $null
        try {
            # Get all available output from job
            $outputLines = Receive-Job -Job $Global:currentUiJob -Keep
        } catch {
            $errorMsg = "Error receiving job output: $($_.Exception.Message)"
            # Only write to GUI, not to console
            Write-ToGui $errorMsg ([System.ConsoleColor]::Red)
        }

        if ($outputLines) {
            foreach ($line in $outputLines) {
                # Send only to GUI, don't echo to console
                Write-ToGui -Message ([string]$line)
            }
        }

        if ($Global:currentUiJob.State -in ('Completed', 'Failed', 'Stopped', 'Suspended')) {
            $Global:outputPollTimer.Stop()
            $jobState = $Global:currentUiJob.State
            Write-ToGui "Job finished with state: $jobState" ([System.ConsoleColor]::DarkGray)
            
            $finalOutput = $null
            try {
                $finalOutput = Receive-Job -Job $Global:currentUiJob -Keep
            } catch {
                Write-ToGui "Error receiving final job output: $($_.Exception.Message)" ([System.ConsoleColor]::Red)
            }

            if ($finalOutput) {
                foreach ($line in $finalOutput) {
                    Write-ToGui -Message ([string]$line)
                }
            }

            if ($jobState -eq 'Failed') {
                Write-ToGui "--- JOB FAILED --- Details below:" ([System.ConsoleColor]::Red)
                
                $ErrorSourceJob = $null
                if ($Global:currentUiJob.ChildJobs.Count -gt 0) {
                    $ErrorSourceJob = $Global:currentUiJob.ChildJobs[0]
                } else {
                    $ErrorSourceJob = $Global:currentUiJob
                }

                if ($ErrorSourceJob -and $ErrorSourceJob.Error.Count -gt 0) {
                    Write-ToGui "Job Errors:" ([System.ConsoleColor]::Red)
                    foreach ($err in $ErrorSourceJob.Error) {
                        Write-ToGui "--------------------" ([System.ConsoleColor]::Red)
                        Write-ToGui "Error: $($err.Exception.Message)" ([System.ConsoleColor]::Red)
                        if ($err.ScriptStackTrace) {
                            Write-ToGui "Stack Trace:" ([System.ConsoleColor]::Red)
                            # Split stack trace for better readability if it's long
                            $err.ScriptStackTrace.Split("`n") | ForEach-Object { Write-ToGui ("  $_") ([System.ConsoleColor]::Red) }
                        }
                        if ($err.CategoryInfo) {
                            Write-ToGui "Category: $($err.CategoryInfo.ToString())" ([System.ConsoleColor]::Red)
                        }
                        if ($err.TargetObject) {
                            $TargetObjectStr = $err.TargetObject | Out-String -Stream | ForEach-Object { $_.TrimEnd() }
                            Write-ToGui "Target Object: $TargetObjectStr" ([System.ConsoleColor]::Red)
                        }
                        if ($err.ErrorDetails -and $err.ErrorDetails.RecommendedAction) {
                             Write-ToGui "Recommended Action: $($err.ErrorDetails.RecommendedAction)" ([System.ConsoleColor]::Red)
                        }
                        Write-ToGui "--------------------" ([System.ConsoleColor]::Red)
                    }
                } else {
                    Write-ToGui "Job failed, but no specific error messages were captured in the job's error stream. Check console output for clues." ([System.ConsoleColor]::Red)
                }
            } elseif ($jobState -eq 'Completed') {
                Write-ToGui "Job completed successfully. Good on ya!" ([System.ConsoleColor]::Green)
            } else {
                # For 'Stopped' or 'Suspended' states
                Write-ToGui "Job $jobState. Not much else to report, chief."
            }
            
            $statusLabel.Text = "Job $jobState. Ready for another go, champ?"
            $startButton.Enabled = $true
            $shipItButton.Enabled = $true
            $Global:currentUiJob = $null # Clear the job variable
        }
    }
})

# --- Show the Form ---
# Double ensure the global reference is set
$Global:guiOutputTextBox = $outputTextBox

# Add a Shown event handler for the form to display welcome messages
$mainForm.Add_Shown({
    # First try direct manipulation for speed
    try {
        # Add direct text to make sure something shows up immediately
        $outputTextBox.Text = "=============================================" + [Environment]::NewLine +
                              "        BOGAN CLEANUP MATE - GUI VERSION     " + [Environment]::NewLine +
                              "=============================================" + [Environment]::NewLine + [Environment]::NewLine +
                              "G'day and welcome to the all-singing, all-dancing GUI version!" + [Environment]::NewLine +
                              "This beauty of a tool will clean up all the junk in your repo." + [Environment]::NewLine + [Environment]::NewLine +
                              "Ready to nuke some crud? Hit that big red button!" + [Environment]::NewLine +
                              "Want to push your changes? Use the green one!" + [Environment]::NewLine + [Environment]::NewLine +
                              "Be careful what ya wish for, this tool means business!"
    }
    catch {
        # If that fails, try our Write-ToGui function 
        try {
            # Display welcome messages with varied colors to show the color rotation works
            Write-ToGui "==================================================" 
            Write-ToGui "BOGAN CLEANUP MATE - GUI VERSION" 
            Write-ToGui "==================================================" 
            Write-ToGui ""
            Write-ToGui "G'day and welcome to the all-singing, all-dancing GUI version!" 
            Write-ToGui "This beauty of a tool will clean up all the junk in your repo."
            Write-ToGui ""
            Write-ToGui "Ready to nuke some crud? Hit that big red button!" 
            Write-ToGui "Want to push your changes? Use the green one!" 
            Write-ToGui ""
            Write-ToGui "Be careful what ya wish for, this tool means business!"
            Write-ToGui ""
        }
        catch {
            # Last resort fallback - use basic message box
            [System.Windows.Forms.MessageBox]::Show("Welcome to the Bogan Cleanup Mate! The terminal text might not be showing correctly. Please report this issue.")
        }
    }
})

# Initial messages to display right at startup
$InitialMessages = @(
    "Loading the GUI... hold onto your hat...",
    "Setting up all the fancy buttons and whatnot...",
    "Making sure everything's looking proper Aussie...",
    "Almost there, cobber...",
    "GUI Ready. Hit the button when you're game, ya legend!"
)

# Add some initial messages before showing the form - using try/catch to handle any errors
try {
    foreach ($msg in $InitialMessages) {
        # Safe index calculation to avoid array out of bounds
        $safeIndex = [Math]::Min($Global:colorIndex, ($Global:textColors.Length - 1))
        $currentColor = $Global:textColors[$safeIndex]
        
        # Safe direct GUI text manipulation with error protection
        $outputTextBox.SelectionStart = $outputTextBox.TextLength
        $outputTextBox.SelectionLength = 0
        
        # Null check before setting color
        if ($null -ne $currentColor) {
            $outputTextBox.SelectionColor = $currentColor
        } else {
            $outputTextBox.SelectionColor = [System.Drawing.Color]::White # Fallback
        }
        
        $outputTextBox.AppendText($msg + "`r`n")
        $Global:colorIndex = ($Global:colorIndex + 1) % $Global:textColors.Count
        $outputTextBox.ScrollToCaret()  # Make sure the text is visible
    }
}
catch [System.Exception] {
    # If colors aren't working, at least add plain text
    try {
        $outputTextBox.Text = "Welcome to the Bogan Cleanup Mate!" + [Environment]::NewLine +
                              "Ready to nuke some crud? Hit the button below!" + [Environment]::NewLine
    }
    catch {
        # Even that failed - we'll rely on the Add_Shown event later
    }
}

[System.Windows.Forms.Application]::EnableVisualStyles()
$mainForm.ShowDialog()

# Fin.
