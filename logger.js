'use strict';
const fs = require('fs');

// Set up logging
const winston = require('winston');
const logDir = '/home/ec2-user/log';

function Logger() {}

Logger.prototype.init = function() {
  // Create the log directory if it does not exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }
  winston.level = 'debug';
  const tsFormat = () => (new Date()).toLocaleTimeString();
  const logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ json: false, timestamp: tsFormat, level: 'info' }),
      new winston.transports.File({ 
        filename: `${logDir}/results.log`, 
        json: false, 
        colorize: true, 
        timestamp: tsFormat, 
        level: 'debug' 
      })
    ],
    exceptionHandlers: [
      new (winston.transports.Console)({ json: false, timestamp: true }),
      new winston.transports.File({ filename: `${logDir}/exceptions.log`, json: false })
    ],
    exitOnError: false
  });
  return logger;
}

module.exports = Logger;
