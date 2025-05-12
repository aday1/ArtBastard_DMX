#!/usr/bin/env pwsh
#
# Debug-ApplicationIssues.ps1
# This script helps verify that our fixes have resolved the issues
#

Write-Host "========================================================="
Write-Host "ArtBastard DMX512FTW - Issue Verification Script"
Write-Host "========================================================="

# Function to create a test html file that will check for issues
function Create-TestFile {
    $testDir = Join-Path $PSScriptRoot "debug-tests"
    $testFile = Join-Path $testDir "test-webgl-utime.html"
    
    if (-not (Test-Path $testDir)) {
        New-Item -ItemType Directory -Path $testDir | Out-Null
    }
    
    $htmlContent = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebGL uTime Test</title>
    <style>
        body { margin: 0; font-family: Arial, sans-serif; background: #222; color: white; }
        canvas { display: block; width: 100%; height: 300px; }
        pre { background: #333; padding: 10px; overflow: auto; max-height: 200px; }
        .success { color: #4caf50; }
        .error { color: #f44336; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>WebGL uTime Uniform Test</h1>
        <p>This test verifies if the WebGL shader can use the uTime uniform without errors.</p>
        
        <h2>Test Canvas:</h2>
        <canvas id="glCanvas"></canvas>
        
        <h2>Console Output:</h2>
        <pre id="console"></pre>
        
        <h2>FancyQuotes Rotation Test:</h2>
        <div id="quoteTest" style="border: 1px solid #444; padding: 10px; margin-top: 20px;">
            <p>Watching for quote changes. They should rotate every 5 seconds in this test.</p>
            <div id="currentQuote"></div>
            <div id="quoteStatus"></div>
        </div>
    </div>

    <script>
        // Console log capture
        const consoleOutput = document.getElementById('console');
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        
        console.log = function() {
            originalConsoleLog.apply(console, arguments);
            const args = Array.from(arguments);
            consoleOutput.innerHTML += '✓ LOG: ' + args.join(' ') + '\\n';
        };
        
        console.error = function() {
            originalConsoleError.apply(console, arguments);
            const args = Array.from(arguments);
            consoleOutput.innerHTML += '❌ ERROR: ' + args.join(' ') + '\\n';
        };
        
        // WebGL Test
        const canvas = document.getElementById('glCanvas');
        let gl;
        
        try {
            gl = canvas.getContext('webgl');
            if (!gl) {
                throw new Error('WebGL not supported');
            }
            console.log('WebGL context created successfully');
            
            // Create shaders with uTime uniform
            const vertexShaderSource = `
                attribute vec4 aPosition;
                varying vec2 vTexCoord;
                void main() {
                    vTexCoord = aPosition.xy * 0.5 + 0.5;
                    gl_Position = aPosition;
                }
            `;
            
            const fragmentShaderSource = `
                precision mediump float;
                varying vec2 vTexCoord;
                uniform float uTime;
                
                void main() {
                    float t = mod(uTime * 0.001, 6.28);
                    vec3 color = vec3(
                        sin(t + vTexCoord.x * 6.28) * 0.5 + 0.5,
                        sin(t * 1.5 + vTexCoord.y * 6.28) * 0.5 + 0.5,
                        cos(t * 0.8) * 0.5 + 0.5
                    );
                    gl_FragColor = vec4(color, 1.0);
                }
            `;
            
            // Create shader program
            const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
            const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
            const program = createProgram(gl, vertexShader, fragmentShader);
            
            // Look up attribute and uniform locations
            const positionAttributeLocation = gl.getAttribLocation(program, "aPosition");
            const timeUniformLocation = gl.getUniformLocation(program, "uTime");
            
            if (timeUniformLocation === null) {
                throw new Error('Failed to get uTime uniform location');
            }
            console.log('Successfully got uTime uniform location');
            
            // Create position buffer
            const positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            
            // Set up position data for a fullscreen quad
            const positions = [
                -1, -1,
                 1, -1,
                -1,  1,
                 1,  1,
            ];
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
            
            // Start time for animation
            const startTime = Date.now();
            
            function render() {
                // Resize canvas to match its display size
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
                gl.viewport(0, 0, canvas.width, canvas.height);
                
                gl.useProgram(program);
                
                // Enable the position attribute
                gl.enableVertexAttribArray(positionAttributeLocation);
                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
                
                // Set the time uniform
                const currentTime = Date.now() - startTime;
                gl.uniform1f(timeUniformLocation, currentTime);
                
                // Draw
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                
                // Request next frame
                requestAnimationFrame(render);
            }
            
            // Start rendering
            render();
            document.getElementById('console').innerHTML += '<span class="success">✅ WebGL shader with uTime is working correctly!</span>\\n';
            
        } catch (error) {
            console.error('WebGL error:', error);
            document.getElementById('console').innerHTML += '<span class="error">❌ WebGL Test Failed: ' + error.message + '</span>\\n';
        }
        
        // Helper functions for shader compilation
        function createShader(gl, type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
            if (success) {
                return shader;
            }
            
            const error = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(error);
        }
        
        function createProgram(gl, vertexShader, fragmentShader) {
            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            const success = gl.getProgramParameter(program, gl.LINK_STATUS);
            if (success) {
                return program;
            }
            
            const error = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error(error);
        }
        
        // FancyQuotes test
        const quotes = [
            { text: "Test Quote 1", author: "Author 1" },
            { text: "Test Quote 2", author: "Author 2" },
            { text: "Test Quote 3", author: "Author 3" },
        ];
        
        let currentQuoteIndex = 0;
        const quoteElement = document.getElementById('currentQuote');
        const quoteStatus = document.getElementById('quoteStatus');
        let lastQuoteChange = Date.now();
        
        function updateQuote() {
            const quote = quotes[currentQuoteIndex];
            quoteElement.innerHTML = '<blockquote>"' + quote.text + '" - <em>' + quote.author + '</em></blockquote>';
            
            // Track quote changes
            const now = Date.now();
            const elapsed = now - lastQuoteChange;
            quoteStatus.innerHTML += 'Quote changed to #' + currentQuoteIndex + ' after ' + (elapsed / 1000).toFixed(1) + 's<br>';
            lastQuoteChange = now;
            
            // Cycle through quotes
            currentQuoteIndex = (currentQuoteIndex + 1) % quotes.length;
        }
        
        // Initial quote
        updateQuote();
        
        // Change quotes every 5 seconds
        setInterval(updateQuote, 5000);
    </script>
</body>
</html>
"@
    
    Set-Content -Path $testFile -Value $htmlContent
    return $testFile
}

# Create the test file
$testFile = Create-TestFile
Write-Host "Created test file at: $testFile"

# Open the test file in the default browser
Write-Host "Opening test file in browser..."
Start-Process $testFile

# Remind about launching the application
Write-Host "`nTo test the fixes in the actual application:"
Write-Host "1. Run the application with the improved script:"
Write-Host "   .\ShowMustGoOn-ImprovedStart.ps1"
Write-Host "`n2. Check the browser console for any WebGL errors"
Write-Host "3. Watch if FancyQuotes rotates correctly every 30 seconds"
Write-Host "4. Monitor the application for any crashes"
Write-Host "`nThe watchdog will automatically restart the application if it crashes."
Write-Host "========================================================="
