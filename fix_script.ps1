$scriptPath = "c:\Users\aday\Desktop\Rebased\ArtBastard_DMX512FTW-main (1)\ArtBastard_DMX512FTW-main\LeGrandNettoyageArtistique.ps1"
$scriptContent = Get-Content -Path $scriptPath -Raw

# Fix Write-JobOutput without -Message parameter
$scriptContent = $scriptContent -replace 'Write-JobOutput ""', 'Write-JobOutput -Message ""'

# Fix missing line breaks where commands are running together
$scriptContent = $scriptContent -replace 'Write-JobOutputWithFlair -Message "NPM cache cleaning done and dusted." -Flair "STATUS"        # Create a cleanup summary', "Write-JobOutputWithFlair -Message `"NPM cache cleaning done and dusted.`" -Flair `"STATUS`"`r`n        # Create a cleanup summary"
$scriptContent = $scriptContent -replace '# Format summary for display        Write-JobOutput', "# Format summary for display`r`n        Write-JobOutput"
$scriptContent = $scriptContent -replace '}        Write-JobOutput', "}`r`n        Write-JobOutput"

# Save the modified script
Set-Content -Path $scriptPath -Value $scriptContent

Write-Host "Script fixes applied. Check for any remaining parameter transformation errors."
