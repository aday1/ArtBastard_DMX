# Clean-Commit-Push.ps1
# Script to clean the project, commit, and push changes to the main branch.

# Strict mode for better error handling
Set-StrictMode -Version Latest

Write-Host "Starting Git clean, commit, and push process..." -ForegroundColor Cyan

# --- Get Git Repository Root ---
try {
    $GitCommand = "git.exe rev-parse --show-toplevel"
    Write-Host "EXECUTING: $GitCommand" -ForegroundColor Gray
    $GitRootResult = Invoke-Expression $GitCommand
    if ($LASTEXITCODE -ne 0) {
        throw "git rev-parse --show-toplevel failed with exit code $LASTEXITCODE. Output: $GitRootResult"
    }
    $GitRoot = $GitRootResult.Trim()
    if (-not $GitRoot) { # Check if $GitRoot is empty or null after trimming
        throw "git rev-parse --show-toplevel returned an empty string."
    }
    Write-Host "Git repository root: $GitRoot"
} catch {
    Write-Error "Error determining Git root: $($_.Exception.Message)"
    exit 1
}

# --- Configuration ---
$DateTime = Get-Date -Format "yyyy-MM-dd HH:mm"
$CommitMessage = "$DateTime - Clean code version"
$RemoteName = "origin"
$BranchName = "main"

# Define paths to clean relative to the Git root
$PathsToClean = @(
    "logs",
    "logs_backup",
    "errors.log",
    "dist",                             # Backend build output
    "react-app/dist",                   # Frontend build output
    "react-app/.vite",                  # Vite cache in react-app
    "node_modules/.vite",               # Vite cache in root node_modules
    ".cache"                            # General cache folder
)

# --- 1. Clean Project Artifacts ---
Write-Host "Step 1: Cleaning project directories and files..." -ForegroundColor Yellow
foreach ($RelativePath in $PathsToClean) {
    $FullPath = Join-Path $GitRoot $RelativePath
    if (Test-Path $FullPath) {
        Write-Host "Attempting to remove $FullPath..."
        try {
            if (($RelativePath -eq "logs" -or $RelativePath -eq "logs_backup") -and (Test-Path $FullPath -PathType Container)) {
                Write-Host "Removing contents of $FullPath first..." -ForegroundColor DarkGray
                Get-ChildItem -Path $FullPath -Recurse -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
            }
            Remove-Item -Path $FullPath -Recurse -Force -ErrorAction Stop
            Write-Host "Successfully removed $FullPath." -ForegroundColor Green
        } catch {
            Write-Warning "Could not fully remove $FullPath. Error: $($_.Exception.Message)"
            if ($RelativePath -eq "logs" -or $RelativePath -eq "logs_backup") {
                Write-Warning "This might be due to active log files. Ensure your application is not writing to these logs while the script runs."
            }
        }
    } else {
        Write-Host "Path not found, skipping: $FullPath"
    }
}
Write-Host "Project cleaning complete." -ForegroundColor Green

# --- 2. Git Add ---
Write-Host "Step 2: Staging all changes (git add .)..." -ForegroundColor Yellow
try {
    $GitCommand = "git.exe add -- ."
    Write-Host "EXECUTING: $GitCommand" -ForegroundColor Gray
    Invoke-Expression $GitCommand
    if ($LASTEXITCODE -ne 0) { throw "git add -- . failed with exit code $LASTEXITCODE" }
    Write-Host "All changes staged." -ForegroundColor Green
} catch {
    Write-Error "GIT ADD FAILED: $($_.Exception.Message)"
    exit 1
}

# --- 3. Git Commit ---
Write-Host "Step 3: Committing changes with message: '$CommitMessage'..." -ForegroundColor Yellow
try {
    # Properly quote the commit message for the command string
    $EscapedCommitMessage = $CommitMessage -replace '"','\\"'
    $GitCommand = "git.exe commit -m \`"$EscapedCommitMessage\`""
    Write-Host "EXECUTING: $GitCommand" -ForegroundColor Gray
    
    Invoke-Expression $GitCommand
    $CommitExitCode = $LASTEXITCODE

    if ($CommitExitCode -ne 0) {
        # Commit failed, check if it was because there was nothing to commit
        Write-Host "Git commit command exited with code $CommitExitCode. Checking status..." -ForegroundColor Magenta
        $GitStatusCommand = "git.exe status --porcelain"
        Write-Host "EXECUTING: $GitStatusCommand (to check commit status)" -ForegroundColor Gray
        $gitStatusOutput = Invoke-Expression $GitStatusCommand
        $StatusExitCode = $LASTEXITCODE

        if ($StatusExitCode -eq 0 -and -not $gitStatusOutput) {
            Write-Host "No changes to commit (status check confirmed)." -ForegroundColor Green
        } else {
            # If status check also failed or showed changes, then the original commit failure was real
            $AdditionalInfo = ""
            if ($StatusExitCode -ne 0) {
                $AdditionalInfo = "Additionally, '$GitStatusCommand' failed with exit code $StatusExitCode."
            } elseif ($gitStatusOutput) {
                $AdditionalInfo = "Additionally, '$GitStatusCommand' showed pending changes."
            }
            throw "Original git commit command failed with exit code $CommitExitCode. $AdditionalInfo"
        }
    } else {
        Write-Host "Changes committed." -ForegroundColor Green

        # Add a status check here before pulling
        Write-Host "Verifying working directory cleanliness after commit and before pull..." -ForegroundColor Magenta
        $GitStatusCommandBeforePull = "git.exe status --porcelain"
        Write-Host "EXECUTING: $GitStatusCommandBeforePull (to check for unexpected changes)" -ForegroundColor Gray
        $StatusOutputBeforePull = Invoke-Expression $GitStatusCommandBeforePull
        $StatusCheckExitCode = $LASTEXITCODE

        if ($StatusCheckExitCode -ne 0) {
            Write-Warning "git status --porcelain before pull failed with exit code $StatusCheckExitCode. Output: $StatusOutputBeforePull"
            Write-Warning "Proceeding with pull, but this might indicate an issue."
        } elseif ($StatusOutputBeforePull) {
            Write-Warning "GIT STATUS BEFORE PULL IS NOT CLEAN:"
            Write-Warning $StatusOutputBeforePull
            Write-Warning "This means Git detects changes in your working directory even AFTER the commit."
            Write-Warning "This is often caused by line-ending normalization (LF/CRLF issues) on Windows."
            Write-Warning "These unexpected changes are likely why 'git pull --rebase' fails."
            Write-Warning "RECOMMENDATIONS:"
            Write-Warning "1. Ensure you have a '.gitattributes' file to manage line endings consistently."
            Write-Warning "   Example for typical projects: '* text=auto eol=lf'"
            Write-Warning "2. Check your Git 'core.autocrlf' setting (git config core.autocrlf)."
            Write-Warning "Proceeding with pull, but it may fail or lead to conflicts."
        } else {
            Write-Host "Working directory is clean after commit and before pull." -ForegroundColor Green
        }
    }
} catch {
    Write-Error "GIT COMMIT FAILED: $($_.Exception.Message)"
    exit 1
}

# --- 4. Git Pull ---
Write-Host "Step 4: Attempting to pull latest changes from $RemoteName $BranchName (with rebase)..." -ForegroundColor Yellow
try {
    $GitCommand = "git.exe pull $RemoteName $BranchName --rebase"
    Write-Host "EXECUTING: $GitCommand" -ForegroundColor Gray
    Invoke-Expression $GitCommand
    if ($LASTEXITCODE -ne 0) { throw "git pull --rebase failed with exit code $LASTEXITCODE" }
    Write-Host "Pull with rebase successful." -ForegroundColor Green
} catch {
    Write-Warning "GIT PULL --REBASE FAILED: $($_.Exception.Message)"
    Write-Host "Attempting a standard git pull (merge)..." -ForegroundColor Yellow
    try {
        $GitCommand = "git.exe pull $RemoteName $BranchName"
        Write-Host "EXECUTING: $GitCommand" -ForegroundColor Gray
        Invoke-Expression $GitCommand
        if ($LASTEXITCODE -ne 0) { throw "standard git pull failed with exit code $LASTEXITCODE" }
        Write-Host "Standard pull successful." -ForegroundColor Green
    } catch {
        Write-Error "GIT PULL (MERGE) FAILED: $($_.Exception.Message). Please resolve conflicts or issues manually and then push."
        exit 1
    }
}

# --- 5. Git Push ---
Write-Host "Step 5: Attempting to push changes to $RemoteName $BranchName..." -ForegroundColor Yellow
try {
    $GitCommand = "git.exe push $RemoteName $BranchName"
    Write-Host "EXECUTING: $GitCommand" -ForegroundColor Gray
    Invoke-Expression $GitCommand
    if ($LASTEXITCODE -ne 0) { throw "git push failed with exit code $LASTEXITCODE" }
    Write-Host "Push to $RemoteName $BranchName successful." -ForegroundColor Green
} catch {
    Write-Error "GIT PUSH FAILED: $($_.Exception.Message). Please check the errors above. You might need to resolve conflicts or ensure your local branch is up-to-date with the remote."
    exit 1
}

Write-Host "Git operations completed successfully!" -ForegroundColor Cyan
