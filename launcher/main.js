const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const os = require('os');

// Global references to keep objects in memory
let mainWindow;
let serverProcess = null;
let reactProcess = null;

// Server and React ports
const SERVER_PORT = 3030;
const REACT_PORT = 3001;

// Log file paths
const ROOT_DIR = path.join(__dirname, '..');
const DMX_LOG_PATH = path.join(ROOT_DIR, 'dmx-channel-traffic.log');
const MIDI_LOG_PATH = path.join(ROOT_DIR, 'midi-traffic.log');
const ARTNET_LOG_PATH = path.join(ROOT_DIR, 'artnet-status.log');
const WEBSERVER_LOG_PATH = path.join(ROOT_DIR, 'webserver-issues.log');

// Initialize log files
function initLogFiles() {
  const logFiles = [DMX_LOG_PATH, MIDI_LOG_PATH, ARTNET_LOG_PATH, WEBSERVER_LOG_PATH];
  for (const file of logFiles) {
    fs.writeFileSync(file, '', { encoding: 'utf8' });
  }
}

// Add demo data to logs
function addDemoLogData() {
  const date = new Date().toISOString().replace('T', ' ').substring(0, 19);
  
  // DMX log
  fs.appendFileSync(DMX_LOG_PATH, 
    `${date} - DMX: Channel 1 set to 255 (100 pct)\n${date} - DMX: Channel 2 set to 127 (50 pct)\n${date} - DMX: Universe 1, Channels 10-20 set for scene 'BlueWash'\n`
  );
  
  // MIDI log
  fs.appendFileSync(MIDI_LOG_PATH, 
    `${date} - MIDI: Note On C4 (velocity 100)\n${date} - MIDI: CC 7 (Volume) set to 120\n${date} - MIDI: Program Change to #5\n`
  );
  
  // ArtNet log
  fs.appendFileSync(ARTNET_LOG_PATH, 
    `${date} - ArtNet: Node 192.168.1.100 connected\n${date} - ArtNet: Network configured with 2 universes\n${date} - ArtNet: Polling detected 3 nodes\n`
  );
  
  // WebServer log
  fs.appendFileSync(WEBSERVER_LOG_PATH, 
    `${date} - Web Server: Started on port ${SERVER_PORT}\n${date} - Web Server: Client connected from 192.168.1.50\n${date} - Web Server: Scene editor loaded\n`
  );
}

// Create log watcher to update UI
function watchLogFile(file, channel) {
  try {
    const watcher = fs.watch(file, (eventType) => {
      if (eventType === 'change' && mainWindow && !mainWindow.isDestroyed()) {
        const content = fs.readFileSync(file, 'utf8');
        mainWindow.webContents.send(channel, content);
      }
    });
    return watcher;
  } catch (error) {
    console.error(`Error watching file ${file}:`, error);
    return null;
  }
}

// Start server process
function startServer() {
  try {
    const mainJsPath = path.join(ROOT_DIR, 'dist', 'main.js');
    if (!fs.existsSync(mainJsPath)) {
      mainWindow.webContents.send('log-webserver', 'ERROR: Could not find main.js at ' + mainJsPath);
      return false;
    }
    
    serverProcess = spawn('node', [mainJsPath], {
      cwd: ROOT_DIR,
      stdio: 'pipe'
    });
    
    serverProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('server-output', message);
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('log-webserver', 'ERROR: ' + message);
      }
    });
    
    serverProcess.on('error', (error) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('log-webserver', 'ERROR: Failed to start server: ' + error.message);
      }
    });
    
    serverProcess.on('close', (code) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('log-webserver', 'Server process exited with code: ' + code);
      }
      serverProcess = null;
    });
    
    const date = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const logMsg = `${date} - Server started on port ${SERVER_PORT}`;
    fs.appendFileSync(WEBSERVER_LOG_PATH, logMsg + '\n');
    
    return true;
  } catch (error) {
    mainWindow.webContents.send('log-webserver', 'ERROR: Failed to start server: ' + error.message);
    return false;
  }
}

// Start React frontend
function startReactApp() {
  try {
    const reactAppDir = path.join(ROOT_DIR, 'react-app');
    if (!fs.existsSync(reactAppDir)) {
      mainWindow.webContents.send('log-webserver', 'ERROR: Could not find react-app directory at ' + reactAppDir);
      return false;
    }
    
    reactProcess = spawn('npm', ['start'], {
      cwd: reactAppDir,
      shell: true,
      stdio: 'pipe'
    });
    
    reactProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('react-output', message);
      }
    });
    
    reactProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('log-webserver', 'React: ' + message);
      }
    });
    
    reactProcess.on('error', (error) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('log-webserver', 'ERROR: Failed to start React app: ' + error.message);
      }
    });
    
    reactProcess.on('close', (code) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('log-webserver', 'React process exited with code: ' + code);
      }
      reactProcess = null;
    });
    
    const date = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const logMsg = `${date} - React UI started on port ${REACT_PORT}`;
    fs.appendFileSync(WEBSERVER_LOG_PATH, logMsg + '\n');
    
    return true;
  } catch (error) {
    mainWindow.webContents.send('log-webserver', 'ERROR: Failed to start React app: ' + error.message);
    return false;
  }
}

// Stop server and React processes
function stopProcesses() {
  let success = true;
  
  try {
    if (serverProcess) {
      serverProcess.kill();
      const date = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const logMsg = `${date} - Server stopped on port ${SERVER_PORT}`;
      fs.appendFileSync(WEBSERVER_LOG_PATH, logMsg + '\n');
    }
    
    if (reactProcess) {
      reactProcess.kill();
      const date = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const logMsg = `${date} - React UI stopped on port ${REACT_PORT}`;
      fs.appendFileSync(WEBSERVER_LOG_PATH, logMsg + '\n');
    }
  } catch (error) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('log-webserver', 'ERROR: Failed to stop processes: ' + error.message);
    }
    success = false;
  }
  
  return success;
}

// Build backend using build script
function buildBackend() {
  return new Promise((resolve, reject) => {
    const buildProcess = spawn('node', ['build-backend.js'], {
      cwd: ROOT_DIR,
      stdio: 'pipe'
    });
    
    let buildOutput = '';
    
    buildProcess.stdout.on('data', (data) => {
      buildOutput += data.toString();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('build-output', data.toString());
      }
    });
    
    buildProcess.stderr.on('data', (data) => {
      buildOutput += data.toString();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('build-output', data.toString());
      }
    });
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`Build failed with exit code ${code}: ${buildOutput}`));
      }
    });
    
    buildProcess.on('error', (error) => {
      reject(error);
    });
  });
}

// Clear all log files and UI
function clearLogs() {
  const logFiles = [DMX_LOG_PATH, MIDI_LOG_PATH, ARTNET_LOG_PATH, WEBSERVER_LOG_PATH];
  for (const file of logFiles) {
    fs.writeFileSync(file, '', { encoding: 'utf8' });
  }
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log-dmx', '');
    mainWindow.webContents.send('log-midi', '');
    mainWindow.webContents.send('log-artnet', '');
    mainWindow.webContents.send('log-webserver', '');
  }
}

// Check if port is in use
function checkPortInUse(port) {
  return new Promise((resolve) => {
    const netstat = spawn('netstat', ['-ano'], { shell: true });
    let data = '';
    
    netstat.stdout.on('data', (chunk) => {
      data += chunk.toString();
    });
    
    netstat.on('close', () => {
      const inUse = data.split('\r\n').some(line => {
        const match = line.match(/TCP\s+.*:(\d+)\s+.*LISTENING/);
        return match && parseInt(match[1], 10) === port;
      });
      resolve(inUse);
    });
  });
}

// Create main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    backgroundColor: '#1e1e1e',
    show: false
  });
  
  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Check ports
    Promise.all([
      checkPortInUse(SERVER_PORT),
      checkPortInUse(REACT_PORT)
    ]).then(([serverPortInUse, reactPortInUse]) => {
      if (serverPortInUse) {
        mainWindow.webContents.send('port-warning', { port: SERVER_PORT, type: 'server' });
      }
      if (reactPortInUse) {
        mainWindow.webContents.send('port-warning', { port: REACT_PORT, type: 'react' });
      }
    });
  });
  
  // Set up log file watchers
  const watchers = [
    watchLogFile(DMX_LOG_PATH, 'log-dmx'),
    watchLogFile(MIDI_LOG_PATH, 'log-midi'),
    watchLogFile(ARTNET_LOG_PATH, 'log-artnet'),
    watchLogFile(WEBSERVER_LOG_PATH, 'log-webserver')
  ];
  
  // Clean up on window close
  mainWindow.on('closed', () => {
    watchers.forEach(watcher => watcher && watcher.close());
    mainWindow = null;
  });
}

// When electron app is ready
app.whenReady().then(() => {
  // Initialize log files
  initLogFiles();
  
  // Add demo log data
  addDemoLogData();
  
  // Create the application window
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// IPC handlers for UI interactions
ipcMain.on('start-services', async (event, options) => {
  let needsBuilding = !fs.existsSync(path.join(ROOT_DIR, 'dist', 'main.js'));
  
  if (needsBuilding && !options.skipBuild) {
    try {
      event.sender.send('update-status', { status: 'Building backend...', color: 'yellow' });
      await buildBackend();
      event.sender.send('update-status', { status: 'Build completed', color: 'green' });
    } catch (error) {
      event.sender.send('update-status', { status: 'Build failed', color: 'red' });
      event.sender.send('log-webserver', 'ERROR: ' + error.message);
      return;
    }
  }
  
  // Start the backend server
  event.sender.send('update-status', { status: 'Starting server...', color: 'yellow' });
  const serverStarted = startServer();
  
  // Start the React frontend
  if (serverStarted) {
    event.sender.send('update-status', { status: 'Starting React UI...', color: 'yellow' });
    const reactStarted = startReactApp();
    
    if (reactStarted) {
      event.sender.send('update-status', { status: 'RUNNING', color: 'green' });
      event.sender.send('services-started');
    }
  }
});

ipcMain.on('stop-services', (event) => {
  event.sender.send('update-status', { status: 'Stopping...', color: 'yellow' });
  const success = stopProcesses();
  
  if (success) {
    event.sender.send('update-status', { status: 'STOPPED', color: 'red' });
    event.sender.send('services-stopped');
  }
});

ipcMain.on('clear-logs', () => {
  clearLogs();
});

// Handle app close
app.on('window-all-closed', () => {
  stopProcesses();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Kill all processes when app is quitting
app.on('quit', () => {
  stopProcesses();
});
