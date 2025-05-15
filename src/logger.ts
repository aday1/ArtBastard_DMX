import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import boxen from 'boxen';

// Constants for logging
const LOGS_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOGS_DIR, 'app.log');

let isLoggingEnabled = true;
let isConsoleLoggingEnabled = true;

// Define log types and their colors/styles
const logTypes = {
  INFO: { color: chalk.blue, label: 'INFO', colorString: 'blue' },
  ERROR: { color: chalk.red.bold, label: 'ERROR', colorString: 'red' },
  WARN: { color: chalk.yellow, label: 'WARN', colorString: 'yellow' },
  MIDI: { color: chalk.hex('#FFA500'), label: 'MIDI', colorString: 'orange' }, // Orange
  OSC: { color: chalk.green, label: 'OSC', colorString: 'green' },
  ARTNET: { color: chalk.cyan, label: 'ARTNET', colorString: 'cyan' },
  SERVER: { color: chalk.magenta, label: 'SERVER', colorString: 'magenta' },
  DMX: { color: chalk.gray, label: 'DMX', colorString: 'gray' },
  SYSTEM: { color: chalk.white.bold, label: 'SYSTEM', colorString: 'white' },
};

export type LogType = keyof typeof logTypes;

interface LogOptions {
  quiet?: boolean; // If true, don't output to console unless it's an error
  skipFile?: boolean; // If true, skip writing to the log file
  verboseOnly?: boolean; // If true, only show when verbose mode is enabled
}

// Default logging level
let verboseMode = false;

export function setVerboseMode(enabled: boolean): void {
  verboseMode = enabled;
  console.log(chalk.cyan(`Verbose logging ${enabled ? 'enabled' : 'disabled'}`));
}

export function log(message: string, type: LogType = 'INFO', data?: any): void {
    // Extract options if present
    const options: LogOptions = {};
    if (data && typeof data === 'object' && 'quiet' in data) {
      options.quiet = data.quiet;
      delete data.quiet;
    }
    if (data && typeof data === 'object' && 'skipFile' in data) {
      options.skipFile = data.skipFile;
      delete data.skipFile;
    }
    if (data && typeof data === 'object' && 'verboseOnly' in data) {
      options.verboseOnly = data.verboseOnly;
      delete data.verboseOnly;
    }
    
    // Skip verbose-only logs if not in verbose mode
    if (options.verboseOnly && !verboseMode) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const logConfig = logTypes[type] || logTypes.INFO;
    
    const formattedMessage = `${logConfig.label}: ${message}`;
    const consoleMessage = `${chalk.dim(timestamp)} ${logConfig.color(formattedMessage)}${data ? ' ' + chalk.dim(JSON.stringify(data)) : ''}`;
    const fileMessage = `${timestamp} - [${logConfig.label}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;

    // Write to file unless skipFile is true
    if (isLoggingEnabled && !options.skipFile) {
        try {
            if (!fs.existsSync(LOGS_DIR)) {
                fs.mkdirSync(LOGS_DIR, { recursive: true });
            }
            fs.appendFileSync(LOG_FILE, fileMessage);
        } catch (error) {
            console.error(chalk.red.bold('LOGGER ERROR:'), `Error writing to log file: ${error}`);
            // Fallback to console if file logging fails
            console.log(consoleMessage); 
        }
    }

    // Output to console unless quiet mode is requested or console logging is disabled
    if (isConsoleLoggingEnabled && 
        (!options.quiet || type === 'ERROR' || type === 'WARN')) {
        if (type === 'ERROR' || type === 'SYSTEM') { // For critical messages, use boxen
            console.log(boxen(consoleMessage, { padding: 1, margin: 1, borderColor: logConfig.colorString, borderStyle: 'round' }));
        } else {
            console.log(consoleMessage);
        }
    }
}

export function enableLogging(enable: boolean): void {
    isLoggingEnabled = enable;
}

export function enableConsoleLogging(enable: boolean): void {
    isConsoleLoggingEnabled = enable;
}