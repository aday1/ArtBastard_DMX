#!/usr/bin/env node

/**
 * Launch Electron App for Development
 * 
 * This script helps to launch the electron app for development
 * It changes to the launcher directory and runs the electron app
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting ArtBastard DMX Launcher...');

// Path to launcher directory
const launcherPath = path.join(__dirname, 'launcher');

// Run electron in the launcher directory
const electronProcess = spawn('npx', ['electron', '.'], {
  cwd: launcherPath,
  stdio: 'inherit',
  shell: true
});

electronProcess.on('close', (code) => {
  console.log(`Electron process exited with code ${code}`);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('Closing launcher...');
  electronProcess.kill();
  process.exit(0);
});
