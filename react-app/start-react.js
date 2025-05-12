const { execSync } = require('child_process');
const { createServer } = require('http');
const path = require('path');
const fs = require('fs');

console.log('Starting React app development server...');

try {
  // Check if vite is installed
  try {
    require.resolve('vite');
  } catch (e) {
    console.log('Installing vite...');
    execSync('npm install vite @vitejs/plugin-react --no-save');
  }

  console.log('Starting Vite development server...');
  console.log('Press Ctrl+C to stop the server when finished');
  
  // Start Vite directly using the Node.js spawn API to avoid PATH issues
  const spawn = require('child_process').spawn;
  
  // Run the npx command with shell option to handle path resolution
  const process = spawn('npx', ['vite', '--host'], { 
    shell: true,
    stdio: 'inherit', // This will pipe the child process I/O directly to the parent process
    cwd: __dirname // Run in the react-app directory
  });
  
  process.on('error', (err) => {
    console.error('Failed to start Vite server:', err);
  });

} catch (error) {
  console.error('Error starting server:', error);
  process.exit(1);
}