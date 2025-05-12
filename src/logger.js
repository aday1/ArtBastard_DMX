const chalk = require('chalk');
const boxen = require('boxen');

// Define log levels with string color values for boxen
const LOG_LEVELS = {
  INFO: {
    color: 'blue',
    prefix: 'ℹ️',
    borderColor: 'blue'  // String value instead of function
  },
  SUCCESS: {
    color: 'green',
    prefix: '✅',
    borderColor: 'green'  // String value instead of function
  },
  WARNING: {
    color: 'yellow',
    prefix: '⚠️',
    borderColor: 'yellow'  // String value instead of function
  },
  ERROR: {
    color: 'red',
    prefix: '❌',
    borderColor: 'red'  // String value instead of function
  },
  DEBUG: {
    color: 'magenta',
    prefix: '🔍',
    borderColor: 'magenta'  // String value instead of function
  }
};

/**
 * Log a message with optional styling
 * @param {string} message - The message to log
 * @param {string} level - Log level (INFO, SUCCESS, WARNING, ERROR, DEBUG)
 * @param {boolean} box - Whether to display the message in a box
 */
function log(message, level = 'INFO', box = false) {
  const config = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  const colorFunction = chalk[config.color];
  
  let formattedMessage = `${config.prefix} ${message}`;
  
  if (box) {
    console.log(boxen(colorFunction(formattedMessage), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: config.borderColor, // Using string value, not chalk function
      backgroundColor: '#000'
    }));
  } else {
    console.log(colorFunction(formattedMessage));
  }
}

module.exports = {
  log,
  info: (message, box = false) => log(message, 'INFO', box),
  success: (message, box = false) => log(message, 'SUCCESS', box),
  warning: (message, box = false) => log(message, 'WARNING', box),
  error: (message, box = false) => log(message, 'ERROR', box),
  debug: (message, box = false) => log(message, 'DEBUG', box)
};
