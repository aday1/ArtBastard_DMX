Write-Host "🎭✨ Grand ArtBastard DMX512FTW Orchestrator Activated! ✨🎭" -ForegroundColor Magenta
Write-Host "----------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "Get ready for a *spectacular* setup, darling!" -ForegroundColor Cyan
Write-Host ""

# Get the directory of the current script and treat it as the project root.
$ProjectRootPath = $PSScriptRoot
if (-not $ProjectRootPath) {
    # Fallback for environments where $PSScriptRoot might not be set (e.g., ISE direct run without saving)
    $ProjectRootPath = (Get-Location).Path
}
Set-Location $ProjectRootPath
Write-Host "📍 Our stage is set at: $($ProjectRootPath)" -ForegroundColor Yellow

if (-not (Test-Path -Path (Join-Path $ProjectRootPath "package.json") -PathType Leaf) -or -not (Test-Path -Path (Join-Path $ProjectRootPath "react-app") -PathType Container)) {
    Write-Error "🛑 STOP THE PRESSES! This script must be conducted from the ArtBastard_DMX project's main stage!"
    Write-Error "Ensure 'package.json' and the 'react-app' directory are in place: $ProjectRootPath"
    Exit 1
}

Write-Host ""
Write-Host "🧹 Act I: The Grand Clearing of the Stage! 🧹" -ForegroundColor Green
Write-Host "Clearing away the cobwebs and old props..." -ForegroundColor DarkCyan

# Remove potential leftover build artifacts
$BackendDistDir = ".\dist"
$FrontendDistDir = ".\react-app\dist"
$NodeModulesDir = ".\node_modules"
$FrontendNodeModulesDir = ".\react-app\node_modules"

if (Test-Path $BackendDistDir) {
    Write-Host "Removing backend build directory: $BackendDistDir 💨" -ForegroundColor DarkCyan
    Remove-Item -Recurse -Force $BackendDistDir
}
if (Test-Path $FrontendDistDir) {
    Write-Host "Removing frontend build directory: $FrontendDistDir 💨" -ForegroundColor DarkCyan
    Remove-Item -Recurse -Force $FrontendDistDir
}
# Optional: For a truly clean slate, uncomment to remove node_modules
# if (Test-Path $NodeModulesDir) {
#     Write-Host "Removing backend node_modules: $NodeModulesDir (This might take a moment!)" -ForegroundColor DarkYellow
#     Remove-Item -Recurse -Force $NodeModulesDir
# }
# if (Test-Path $FrontendNodeModulesDir) {
#     Write-Host "Removing frontend node_modules: $FrontendNodeModulesDir (Patience, darling!)" -ForegroundColor DarkYellow
#     Remove-Item -Recurse -Force $FrontendNodeModulesDir
# }

Write-Host "✨ Stage cleared! Ready for a fresh performance!" -ForegroundColor Green
Write-Host ""

Write-Host "🎶 Act II: Assembling the Orchestra (Dependencies)! 🎶" -ForegroundColor Green
Write-Host "Summoning the finest musicians (npm packages)..." -ForegroundColor Cyan

Write-Host "Installing backend virtuosos..." -ForegroundColor DarkCyan
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "💔 Oh dear, the backend orchestra is out of tune! (npm install failed)"; Exit 1 }
Write-Host "✅ Backend orchestra assembled!" -ForegroundColor Green

Write-Host "Installing frontend divas..." -ForegroundColor DarkCyan
if (-not (Test-Path -Path (Join-Path $ProjectRootPath "react-app") -PathType Container)) {
    Write-Error "🛑 Missing the frontend stage! 'react-app' directory not found at '$ProjectRootPath\\react-app'."
    Exit 1
}
Push-Location -Path (Join-Path $ProjectRootPath "react-app")
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "💔 Heavens, the frontend divas are having a tantrum! (npm install failed)"; Pop-Location; Exit 1 }
Pop-Location
Write-Host "✅ Frontend divas are ready for their spotlight!" -ForegroundColor Green
Write-Host ""

Write-Host "🎬 Act III: The Backend Spectacle Begins! 🎬" -ForegroundColor Green
Write-Host "Raising the curtains on the server-side drama..." -ForegroundColor Cyan
Write-Host "(The backend server, our magnificent 'node start-server.js', shall appear in a new PowerShell window!)"
Write-Host "This mystical process also conjures the frontend build if needed. Marvelous!"
Write-Host "Expect the backend spirits to manifest on port 3030."

$BackendCommand = "Write-Host '🌟 Backend Server - The Star of the Show! 🌟' -ForegroundColor Yellow; Write-Host 'This sacred space hosts our backend server (node start-server.js). Close this window to end the performance.'; Write-Host 'All server-side enchantments will appear here.'; Set-Location '$ProjectRootPath'; node start-server.js; Write-Host 'The backend server has taken its bow. Press Enter to close this window.'; Read-Host"
Start-Process pwsh.exe -ArgumentList "-NoExit", "-Command", $BackendCommand

Write-Host "🚀 Backend server launched into the cosmos (new window)!" -ForegroundColor Green
Write-Host "   Keep an eye on that new window for the backend's grand pronouncements."
Write-Host ""

Write-Host "💡 Act IV: The Frontend Extravaganza - Your Cue! 💡" -ForegroundColor Green
Write-Host "--------------------------------------------------------------------" -ForegroundColor Yellow
Write-Host "‼️ ATTENTION, STAGE MANAGER (That's You!) ‼️" -ForegroundColor Red
Write-Host "The spotlight now turns to you for the frontend!" -ForegroundColor Yellow
Write-Host "Please, with dramatic flair, open a NEW PowerShell terminal/tab, and command:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Set-Location '$($ProjectRootPath)\\react-app'" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "And behold! The frontend UI shall illuminate your screen, typically at http://localhost:3001 (dev server) but if it's not, then it's likely the port shown in the console after running the command." -ForegroundColor Yellow
Write-Host "--------------------------------------------------------------------" -ForegroundColor Yellow
Write-Host ""
Write-Host "Follow your cue in Act IV to bring the frontend to life!"
Write-Host "May your lights be bright and your cues be perfect!" -ForegroundColor Cyan
