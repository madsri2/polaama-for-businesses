'use strict';
const fs = require('fs');

// Set up logging
const winston = require('winston');
const logDir = '/home/ec2-user/log';
const traceback = require('traceback');

function Logger(configFile) {
  const config = `/home/ec2-user/config/${configFile}`;
  console.log(`Logger setup: using config file ${config}`);
  try {
    const json = JSON.parse(fs.readFileSync(config, 'utf8'));
    if(!json.fileName) {
      console.log(`Error setting up logger: log fileName not present in file ${config}`);
      return;
    }
    if(json.fileName.charAt(0) != "/") {
      // relative filename. Append logDir
      this.fileName = `${logDir}/${json.fileName}`;
    }
    else {
      this.fileName = json.fileName;
    }
    console.log(`Logger setup: logging to file ${this.fileName}`);
    if(json.logLevel) {
      this.logLevel = json.logLevel;
    }
    else {
      this.logLevel = "info";
    }
    console.log(`Logger setup: log level is ${this.logLevel}`);
  }
  catch(e) {
    console.log(`Error setting up logger: could not open file ${config}: ${e}`);
    return;
  }
  // Create the log directory if it does not exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }
}

Logger.prototype.init = function() {
  winston.level = this.logLevel;
  const tsFormat = () => (new Date()).toLocaleTimeString();
  const logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ 
				json: false, 
        colorize: true, 
        timestamp: tsFormat,
        level: this.logLevel
      }),
      new winston.transports.File({ 
        filename: this.fileName,
        json: false, 
        colorize: true, 
        timestamp: tsFormat, 
        level: this.logLevel
      })
    ],
    exceptionHandlers: [
      new (winston.transports.Console)({ json: false, timestamp: true }),
      new winston.transports.File({ filename: `${logDir}/exceptions.log`, json: false })
    ],
    exitOnError: false
  });
  logger.filters.push((level, msg, meta) => {
    return `${msg}`;
  });
  return logger;
}

module.exports = Logger;
