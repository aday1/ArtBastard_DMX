import express, { RequestHandler, Request, Response, NextFunction } from 'express';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { log } from './logger'; // Import from logger instead of index
import { 
  setDmxChannel, 
  learnMidiMapping, 
  loadScene, 
  saveScene, 
  loadConfig, 
  saveConfig, 
  clearMidiMappings,
  loadScenes,
  saveScenes,
  pingArtNetDevice,
  updateArtNetConfig
} from './index';

const DATA_DIR = path.join(__dirname, '..', 'data');
const EXPORT_FILE = path.join(DATA_DIR, 'all_settings.json');

// Add type definitions for global variables
declare global {
  namespace NodeJS {
    interface Global {
      io: Server
      activeMidiInputs: { [key: string]: any }
      artnetSender: any
    }
  }
}

// Create API router
const apiRouter = express.Router();

// Add error handling middleware to ensure all responses are valid JSON
apiRouter.use((req, res, next) => {
  // Store the original res.json function
  const originalJson = res.json;
  
  // Override res.json to ensure it always sends valid JSON
  res.json = function(data) {
    // Make sure response has proper content type
    res.contentType('application/json');
    
    // Ensure data is an object that can be serialized
    if (data === undefined || data === null) {
      data = {};
    }
    
    // Call original json method with our processed data
    return originalJson.call(this, data);
  };
  
  // Continue with request chain
  next();
});

// Middleware to parse JSON
apiRouter.use(express.json());

// Add global error handler for API routes
apiRouter.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  log('API error', 'ERROR', { message: err.message, path: req.path, method: req.method });
  if (!res.headersSent) {
    res.status(500).json({ 
      error: `Server error: ${err.message}`, 
      success: false 
    });
  }
  next(err);
});

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  const io = global.io;
  
  // Get socket connection stats
  const stats = {
    serverStatus: 'healthy',
    socketConnections: io.engine.clientsCount || 0,
    socketStatus: io.sockets.sockets.size > 0 ? 'listening' : 'not listening',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memoryUsage: process.memoryUsage(),
    midiDevicesConnected: Object.keys(global.activeMidiInputs || {}).length,
    artnetStatus: global.artnetSender ? 'initialized' : 'not initialized'
  };
  
  // Determine overall health
  const isHealthy = stats.serverStatus === 'healthy' && stats.socketStatus === 'listening';
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    ...stats
  });
});

// Get initial state
apiRouter.get('/state', (req, res) => {
  try {
    // Load configuration and scenes
    const configData = fs.readFileSync(path.join(DATA_DIR, 'config.json'), 'utf-8');
    const config = JSON.parse(configData);
    
    const scenesData = fs.readFileSync(path.join(DATA_DIR, 'scenes.json'), 'utf-8');
    const scenes = JSON.parse(scenesData);
    
    // Return all state
    res.json({
      artNetConfig: config.artNetConfig,
      midiMappings: config.midiMappings,
      scenes,
      // Add any other state that needs to be initialized
      dmxChannels: new Array(512).fill(0), // This is placeholder, actual state is in memory
      oscAssignments: new Array(512).fill('').map((_, i) => `/fixture/DMX${i + 1}`), // Placeholder
      channelNames: new Array(512).fill('').map((_, i) => `CH ${i + 1}`), // Placeholder
      fixtures: [], 
      groups: []    
    });
  } catch (error) {
    log('Error getting initial state', 'ERROR', { error });
    res.status(500).json({ error: `Failed to get initial state: ${error}` });
  }
});

// Set DMX channel value
const dmxHandler: RequestHandler = (req: Request, res: Response) => {
  try {
    const { channel, value } = req.body;
    
    if (typeof channel !== 'number' || typeof value !== 'number') {
      res.status(400).json({ error: 'Invalid channel or value' });
      return;
    }
    
    setDmxChannel(channel, value);
    res.json({ success: true });
  } catch (error) {
    log('Error setting DMX channel', 'ERROR', { error, body: req.body });
    res.status(500).json({ error: `Failed to set DMX channel: ${error}` });
  }
};

apiRouter.post('/dmx', dmxHandler);

// MIDI Learn endpoints
const midiLearnHandler: RequestHandler = (req: Request, res: Response) => {
  try {
    const { channel } = req.body;
    
    if (typeof channel !== 'number') {
      res.status(400).json({ error: 'Invalid channel' });
      return;
    }
    
    // This function should be implemented in your index.ts file
    // It should emit a socket event to start MIDI learn mode
    global.io.emit('startMidiLearn', { channel });
    
    res.json({ success: true });
  } catch (error) {
    log('Error starting MIDI learn', 'ERROR', { error, body: req.body });
    res.status(500).json({ error: `Failed to start MIDI learn: ${error}` });
  }
};

apiRouter.post('/midi/learn', midiLearnHandler);

apiRouter.post('/midi/cancel-learn', (req, res) => {
  try {
    const { channel } = req.body;
    
    global.io.emit('midiLearnCancelled', { channel });
    
    res.json({ success: true });
  } catch (error) {
    log('Error cancelling MIDI learn', 'ERROR', { error, body: req.body });
    res.status(500).json({ error: `Failed to cancel MIDI learn: ${error}` });
  }
});

apiRouter.post('/midi/mapping', (req, res) => {
  try {
    const { dmxChannel, mapping } = req.body;
    
    learnMidiMapping(global.io, dmxChannel, mapping);
    saveConfig();
    
    res.json({ success: true });
  } catch (error) {
    log('Error adding MIDI mapping', 'ERROR', { error, body: req.body });
    res.status(500).json({ error: `Failed to add MIDI mapping: ${error}` });
  }
});

apiRouter.delete('/midi/mapping/:channel', (req, res) => {
  try {
    const channel = parseInt(req.params.channel);
    
    // Remove the MIDI mapping for the given channel
    const config = loadConfig();
    if (config.midiMappings && channel in config.midiMappings) {
      delete config.midiMappings[channel];
    }
    saveConfig();
    
    res.json({ success: true });
  } catch (error) {
    log('Error removing MIDI mapping', 'ERROR', { error, params: req.params });
    res.status(500).json({ error: `Failed to remove MIDI mapping: ${error}` });
  }
});

apiRouter.delete('/midi/mappings', (req, res) => {
  try {
    // Clear all MIDI mappings
    const config = loadConfig();
    config.midiMappings = {};
    saveConfig();
    
    res.json({ success: true });
  } catch (error) {
    log('Error clearing all MIDI mappings', 'ERROR', { error });
    res.status(500).json({ error: `Failed to clear all MIDI mappings: ${error}` });
  }
});

// Scene endpoints
apiRouter.post('/scenes', (req, res) => {
  try {
    const { name, oscAddress, channelValues } = req.body;
    
    saveScene(global.io, name, oscAddress, channelValues);
    
    res.json({ success: true });
  } catch (error) {
    log('Error saving scene', 'ERROR', { error, body: req.body });
    res.status(500).json({ error: `Failed to save scene: ${error}` });
  }
});

apiRouter.post('/scenes/load', (req, res) => {
  try {
    const { name } = req.body;
    
    loadScene(global.io, name);
    
    res.json({ success: true });
  } catch (error) {
    log('Error loading scene', 'ERROR', { error, body: req.body });
    res.status(500).json({ error: `Failed to load scene: ${error}` });
  }
});

apiRouter.delete('/scenes/:name', (req, res) => {
  try {
    const { name } = req.params;
    
    // This function should be implemented in your index.ts file
    // It should delete the scene with the given name
    // Load scenes, filter out the one to delete, and save
    const scenes = loadScenes();
    const updatedScenes = scenes.filter((scene: any) => scene.name !== name);
    saveScenes(updatedScenes);
    
    global.io.emit('sceneList', updatedScenes);
    
    res.json({ success: true });
  } catch (error) {
    log('Error deleting scene', 'ERROR', { error, params: req.params });
    res.status(500).json({ error: `Failed to delete scene: ${error}` });
  }
});

// ArtNet configuration
apiRouter.post('/config/artnet', (req, res) => {
  try {
    const artNetConfig = req.body;
    
    // Update ArtNet configuration
    const config = loadConfig();
    config.artNetConfig = { ...config.artNetConfig, ...artNetConfig };
    saveConfig();
    
    res.json({ success: true });
  } catch (error) {
    log('Error updating ArtNet config', 'ERROR', { error, body: req.body });
    res.status(500).json({ error: `Failed to update ArtNet config: ${error}` });
  }
});

// Export all settings
apiRouter.post('/export', (req, res) => {
  try {
    const config = loadConfig();
    const scenes = loadScenes();
    
    const allSettings = {
      config,
      scenes,
      // Add any other settings you want to export
    };
    
    fs.writeFileSync(EXPORT_FILE, JSON.stringify(allSettings, null, 2));
    
    res.json({ success: true, filePath: EXPORT_FILE });
  } catch (error) {
    log('Error exporting settings', 'ERROR', { error });
    res.status(500).json({ error: `Failed to export settings: ${error}` });
  }
});

// Import settings
const importHandler: RequestHandler = (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(EXPORT_FILE)) {
      res.status(404).json({ error: 'Export file not found' });
      return;
    }
    
    const data = fs.readFileSync(EXPORT_FILE, 'utf-8');
    const allSettings = JSON.parse(data);
    
    // Apply imported settings
    if (allSettings.config) {
      // Use the current config as a base and update it
      const config = loadConfig();
      Object.assign(config, allSettings.config);
      saveConfig();
    }
    
    if (allSettings.scenes) {
      saveScenes(allSettings.scenes);
    }
    
    // Notify clients
    global.io.emit('configUpdate', allSettings.config);
    global.io.emit('sceneList', allSettings.scenes);
    
    res.json({ success: true, settings: allSettings });
  } catch (error) {
    log('Error importing settings', 'ERROR', { error });
    res.status(500).json({ error: `Failed to import settings: ${error}` });
  }
};

apiRouter.post('/import', importHandler);

// Ping ArtNet device
apiRouter.post('/ping-artnet', (req, res) => {
  try {
    const { ip } = req.body;
    
    pingArtNetDevice(global.io, ip);
    
    res.json({ success: true });
  } catch (error) {
    log('Error pinging ArtNet device', 'ERROR', { error, body: req.body });
    res.status(500).json({ error: `Failed to ping ArtNet device: ${error}` });
  }
});

// Socket.IO handler setup
function setupSocketHandlers(io: Server) {
  // Store the io instance globally for use in API routes
  global.io = io;
  
  io.on('connection', (socket) => {
    // Handle settings export
    socket.on('exportSettings', () => {
      try {
        const config = loadConfig();
        const scenes = loadScenes();
        
        const allSettings = {
          config,
          scenes,
          // Add any other settings you want to export
        };
        
        fs.writeFileSync(EXPORT_FILE, JSON.stringify(allSettings, null, 2));
        
        socket.emit('settingsExported', EXPORT_FILE);
      } catch (error) {
        log('Error exporting settings via socket', 'ERROR', { error, socketId: socket.id });
        socket.emit('exportError', error instanceof Error ? error.message : String(error));
      }
    });
    
    // Handle settings import
    socket.on('importSettings', () => {
      try {
        if (!fs.existsSync(EXPORT_FILE)) {
          socket.emit('importError', 'Export file not found');
          return;
        }
        
        const data = fs.readFileSync(EXPORT_FILE, 'utf-8');
        const allSettings = JSON.parse(data);
        
        // Apply imported settings
        if (allSettings.config) {
          // Use the current config as a base and update it
          const config = loadConfig();
          Object.assign(config, allSettings.config);
          saveConfig();
        }
        
        if (allSettings.scenes) {
          saveScenes(allSettings.scenes);
        }
        
        // Notify clients
        io.emit('configUpdate', allSettings.config);
        io.emit('sceneList', allSettings.scenes);
        
        socket.emit('settingsImported', allSettings);
      } catch (error) {
        log('Error importing settings via socket', 'ERROR', { error, socketId: socket.id });
        socket.emit('importError', error instanceof Error ? error.message : String(error));
      }
    });
    
    // Handle sending OSC messages
    socket.on('sendOsc', (message) => {
      try {
        // This function should be implemented in your index.ts file
        // It should send an OSC message with the given address and args
        sendOscMessage(message.address, message.args);
        
        // Forward OSC message to all clients for display
        io.emit('oscMessage', {
          ...message,
          timestamp: Date.now()
        });
      } catch (error) {
        log('Error sending OSC message via socket', 'ERROR', { error, message, socketId: socket.id });
        socket.emit('error', `Failed to send OSC message: ${error}`);
      }
    });
    
    // Handle ArtNet ping
    socket.on('pingArtNet', (ip) => {
      pingArtNetDevice(io, ip);
    });
  });
}

// OSC message handler (to be implemented in index.ts)
function sendOscMessage(address: string, args: any[]) {
  // Implementation will depend on your OSC setup
  log('Sending OSC message', 'OSC', { address, args });
  // Actual implementation should send message to OSC sender
}

export { apiRouter, setupSocketHandlers };