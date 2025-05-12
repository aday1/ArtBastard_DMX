# ArtBastard DMX512FTW - Stability Improvements

This document outlines the issues that were fixed and the improvements made to the ArtBastard_DMX512FTW application to improve stability and fix rendering problems.

## Issues Fixed

### 1. WebGL Shader Errors

**Problem:** 
The application was experiencing WebGL shader errors related to the `uTime` uniform not being linkable between shaders.

**Solution:**
- Added `uniform float uTime;` declarations to the vertex and fragment shaders
- Added `time: WebGLUniformLocation` property to the uniformLocations interface
- Added proper initialization of the time uniform with `gl.getUniformLocation(shaderProgram, 'uTime')`
- Added `gl.uniform1f(programInfo.uniformLocations.time, Date.now() - startTimeRef.current)` to pass the time value to the shaders
- Added error handling with try/catch blocks to prevent crashes from WebGL errors

### 2. FancyQuotes Not Rotating

**Problem:**
The FancyQuotes component was not displaying or rotating correctly every 30 seconds.

**Solution:**
- Added proper initialization to ensure a valid starting quote is shown immediately
- Added logging for debugging quote rotation
- Fixed transition timing and animation

### 3. Browser Font Warnings

**Problem:**
The application was triggering font loading warnings in the browser.

**Solution:**
- Added `crossorigin="anonymous"` attribute to font stylesheets
- Implemented optimized font loading with `media="print" onload="this.media='all'"`
- Added noscript fallback for browsers with JavaScript disabled
- Added integrity attributes for CDN resources to improve security and caching

### 4. Application Crashes

**Problem:**
The application was crashing and requiring manual restarts.

**Solution:**
- Created a watchdog script (`watchdog.js`) that monitors the application and automatically restarts it if it crashes
- Created improved startup scripts with better error handling and cleanup:
  - `ShowMustGoOn-ImprovedStart.ps1` (PowerShell)
  - `ShowMustGoOn-ImprovedStart.sh` (Bash)
- Added error handling for port conflicts, existing processes, and build failures

## Running the Application

### With Improved Stability

Use the new startup scripts to run the application with improved stability:

#### Windows (PowerShell):
```powershell
.\ShowMustGoOn-ImprovedStart.ps1
```

#### Linux/macOS (Bash):
```bash
chmod +x ShowMustGoOn-ImprovedStart.sh
./ShowMustGoOn-ImprovedStart.sh
```

### Testing the Fixes

To verify the fixes, you can run:

```powershell
.\Debug-ApplicationIssues.ps1
```

This will create and open a test file that checks:
- If WebGL shaders can properly use the `uTime` uniform
- If quote rotation is working correctly

## Monitoring and Maintenance

The application now includes:

- The watchdog process that automatically restarts the app if it crashes
- Improved logging to help diagnose issues
- Better error handling throughout the codebase

## Network Issues

The logs indicate repeated network connection issues with ArtNet:
```
ArtNet device at 192.168.1.199 is unreachable: Connection timed out
```

This is likely due to incorrect network configuration or the device being offline. Check your network settings and ensure the ArtNet device is online and accessible at the configured IP address.
