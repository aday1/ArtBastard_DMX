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
  INFO: { color: chalk.blue, label: 'INFO' },
  ERROR: { color: chalk.red.bold, label: 'ERROR' },
  WARN: { color: chalk.yellow, label: 'WARN' },
  MIDI: { color: chalk.hex('#FFA500'), label: 'MIDI' }, // Orange
  OSC: { color: chalk.green, label: 'OSC' },
  ARTNET: { color: chalk.cyan, label: 'ARTNET' },
  SERVER: { color: chalk.magenta, label: 'SERVER' },
  DMX: { color: chalk.gray, label: 'DMX' },
  SYSTEM: { color: chalk.white.bold, label: 'SYSTEM' },
};

export type LogType = keyof typeof logTypes;

export function log(message: string, type: LogType = 'INFO', data?: any): void {
    const timestamp = new Date().toISOString();
    const logConfig = logTypes[type] || logTypes.INFO;
    
    const formattedMessage = `${logConfig.label}: ${message}`;
    const consoleMessage = `${chalk.dim(timestamp)} ${logConfig.color(formattedMessage)}${data ? ' ' + chalk.dim(JSON.stringify(data)) : ''}`;
    const fileMessage = `${timestamp} - [${logConfig.label}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;

    if (isLoggingEnabled) {
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

    if (isConsoleLoggingEnabled) {
        if (type === 'ERROR' || type === 'SYSTEM') { // For critical messages, use boxen
            console.log(boxen(consoleMessage, { padding: 1, margin: 1, borderColor: logConfig.color as any, borderStyle: 'round' }));
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