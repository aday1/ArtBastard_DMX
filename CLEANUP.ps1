Write-Host "🧼✨ The ArtBastard's Grand Exfoliation Ritual! ✨🧼" -ForegroundColor Magenta
Write-Host "--------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "Preparing your masterpiece for a flawless Git Push, darling!" -ForegroundColor Cyan
Write-Host ""

# Ensure we are at the project's magnificent proscenium (root)
$ProjectRootPath = $PSScriptRoot
if (-not $ProjectRootPath) {
    $ProjectRootPath = (Get-Location).Path
}
Set-Location $ProjectRootPath
Write-Host "📍 Conducting cleanup from: $($ProjectRootPath)" -ForegroundColor Yellow

if (-not (Test-Path -Path ".\package.json" -PathType Leaf) -or -not (Test-Path -Path ".\react-app" -PathType Container)) {
    Write-Error "🛑 Hold the curtain! This ritual must be performed from the ArtBastard_DMX project's main stage!"
    Write-Error "Ensure 'package.json' and the 'react-app' directory are present: $ProjectRootPath"
    Exit 1
}
Write-Host ""

Write-Host "🧹 Act I: Sweeping Away the Ephemeral! (Builds, Logs, Caches) 🧹" -ForegroundColor Green

# Define the paths to artistic remnants
$BackendDistDir = ".\dist"
$FrontendDistDir = ".\react-app\dist"
$LauncherDistDir = ".\launcher-dist"
$LogsDir = ".\logs" # Targeting the whole logs directory for simplicity
$BackendLogFile = ".\backend.log"
$ViteCacheDir = ".\react-app\.vite"
$RootTsBuildInfo = "*.tsbuildinfo" # Glob pattern for root
$ReactAppTsBuildInfo = ".\react-app\*.tsbuildinfo" # Glob pattern for react-app
$RootEslintCache = ".\.eslintcache"
$ReactAppEslintCache = ".\react-app\.eslintcache"

# Vanquishing build directories
if (Test-Path $BackendDistDir) {
    Write-Host "Removing backend build directory: $BackendDistDir 💨" -ForegroundColor DarkCyan
    Remove-Item -Recurse -Force $BackendDistDir
}
if (Test-Path $FrontendDistDir) {
    Write-Host "Removing frontend build directory: $FrontendDistDir 💨" -ForegroundColor DarkCyan
    Remove-Item -Recurse -Force $FrontendDistDir
}
if (Test-Path $LauncherDistDir) {
    Write-Host "Removing launcher build directory: $LauncherDistDir 💨" -ForegroundColor DarkCyan
    Remove-Item -Recurse -Force $LauncherDistDir
}

# Expunging logs
if (Test-Path $LogsDir) {
    Write-Host "Clearing out the logs directory: $LogsDir 📜🔥" -ForegroundColor DarkCyan
    Remove-Item -Recurse -Force $LogsDir # Removes the directory and its contents
    # If you prefer to keep the directory but clear its contents:
    # Get-ChildItem -Path $LogsDir -Recurse | Remove-Item -Force -Recurse
}
if (Test-Path $BackendLogFile) {
    Write-Host "Removing backend log file: $BackendLogFile 📜🔥" -ForegroundColor DarkCyan
    Remove-Item -Force $BackendLogFile
}

# Obliterating caches
if (Test-Path $ViteCacheDir) {
    Write-Host "Removing Vite cache: $ViteCacheDir 🌪️" -ForegroundColor DarkCyan
    Remove-Item -Recurse -Force $ViteCacheDir
}
if (Test-Path $RootEslintCache) {
    Write-Host "Removing root .eslintcache 🌪️" -ForegroundColor DarkCyan
    Remove-Item -Force $RootEslintCache
}
if (Test-Path $ReactAppEslintCache) {
    Write-Host "Removing react-app .eslintcache 🌪️" -ForegroundColor DarkCyan
    Remove-Item -Force $ReactAppEslintCache
}

Write-Host "✨ Stage is sparkling! Mandatory cleanup complete." -ForegroundColor Green
Write-Host ""

Write-Host "🎭 Act II: The Optional Deep Cleanse (For the Discerning Artiste) 🎭" -ForegroundColor Yellow

# Define paths for the truly devoted
$RootNodeModules = ".\node_modules"
$ReactAppNodeModules = ".\react-app\node_modules"
$LauncherNodeModules = ".\launcher\node_modules" # If you use the launcher's own deps

# Uncomment to banish node_modules (this will require a full 'npm install' afterwards!)
if (Test-Path $RootNodeModules) {
    Write-Host "OPTIONAL: Attempting to remove root node_modules: $RootNodeModules (This is a commitment, darling!) 🗑️" -ForegroundColor DarkYellow
    try {
        Remove-Item -Recurse -Force $RootNodeModules -ErrorAction Stop
        Write-Host "Successfully removed $RootNodeModules" -ForegroundColor Green
    }
    catch {
        Write-Warning "Could not remove $RootNodeModules. It might be in use. Please close any applications using it and try removing it manually if needed."
        Write-Warning "Error details: $($_.Exception.Message)"
    }
}
if (Test-Path $ReactAppNodeModules) {
    Write-Host "OPTIONAL: Attempting to remove react-app node_modules: $ReactAppNodeModules 🗑️" -ForegroundColor DarkYellow
    try {
        Remove-Item -Recurse -Force $ReactAppNodeModules -ErrorAction Stop
        Write-Host "Successfully removed $ReactAppNodeModules" -ForegroundColor Green
    }
    catch {
        Write-Warning "Could not remove $ReactAppNodeModules. It might be in use. Please close any applications using it and try removing it manually if needed."
        Write-Warning "Error details: $($_.Exception.Message)"
    }
}
if (Test-Path $LauncherNodeModules) {
    Write-Host "OPTIONAL: Attempting to remove launcher node_modules: $LauncherNodeModules 🗑️" -ForegroundColor DarkYellow
    try {
        Remove-Item -Recurse -Force $LauncherNodeModules -ErrorAction Stop
        Write-Host "Successfully removed $LauncherNodeModules" -ForegroundColor Green
    }
    catch {
        Write-Warning "Could not remove $LauncherNodeModules. It might be in use. Please close any applications using it and try removing it manually if needed."
        Write-Warning "Error details: $($_.Exception.Message)"
    }
}

# Uncomment to remove TypeScript build info files
# Write-Host "OPTIONAL: Removing TypeScript build info files (*.tsbuildinfo) 📝" -ForegroundColor DarkYellow
# Get-ChildItem -Path $ProjectRootPath -Include $RootTsBuildInfo -File -Recurse | Remove-Item -Force
# Get-ChildItem -Path (Join-Path $ProjectRootPath "react-app") -Include $ReactAppTsBuildInfo -File -Recurse | Remove-Item -Force

Write-Host ""
Write-Host "🎉 Bravo! The Grand Exfoliation is complete! 🎉" -ForegroundColor Magenta
Write-Host "Your ArtBastard DMX project is now impeccably prepared for its Git debut!" -ForegroundColor Cyan
Write-Host "Remember to re-install dependencies if you chose the deep cleanse!"
