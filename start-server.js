#!/usr/bin/env node

/**
 * Enhanced startup script for ArtBastard DMX512FTW server
 * This script ensures proper configuration and startup of all components
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎛️  Starting ArtBastard DMX512FTW Server...');

// Ensure the dist directory exists
if (!fs.existsSync(path.join(__dirname, 'dist'))) {
  console.log('Building backend first...');
  execSync('node build-without-typechecking.js', { stdio: 'inherit' });
}

// Ensure React app is built
if (!fs.existsSync(path.join(__dirname, 'react-app', 'dist'))) {
  console.log('Building React frontend...');
  try {
    execSync('cd react-app && node build-without-ts-checks.js', { stdio: 'inherit' });
  } catch (error) {
    console.warn('React build had issues but continuing with fallback UI...');
  }
}

// Set environment variables to improve server behavior
process.env.NODE_ENV = 'production';
process.env.DEBUG = 'socket.io:*';

try {  // Start the server with output streaming to console
  console.log('🚀 Launching server...');
  
  const serverProcess = spawn('node', ['dist/main.js'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      FORCE_COLOR: 'true' // Enable colored output
    }
  });
  
  // Handle server process events
  serverProcess.on('error', (err) => {
    console.error(`❌ Failed to start server: ${err.message}`);
    process.exit(1);
  });
  
  serverProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Server process exited with code ${code}`);
      process.exit(code);
    }
  });
  
  // Handle CTRL+C and other termination signals
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    serverProcess.kill('SIGINT');
    setTimeout(() => process.exit(0), 1000);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Terminating server...');
    serverProcess.kill('SIGTERM');
    setTimeout(() => process.exit(0), 1000);
  });
  
} catch (error) {
  console.error(`❌ Error starting server: ${error.message}`);
  process.exit(1);
}