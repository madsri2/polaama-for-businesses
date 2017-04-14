'use strict';

const crypto = require('crypto');
const fs = require('fs');

const baseDir = `/home/ec2-user`;
const logger = require(`${baseDir}/my-logger`);

function SecretManager() {
  try {
    this.key = fs.readFileSync(`${baseDir}/ignore/key`);
  }
  catch(e) {
    logger.error(`Error: ${e.stack}`);
    throw e;
  }
}

SecretManager.prototype.encrypt = function(data) {
  const cipher = crypto.createCipher('AES256', this.key);
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  logger.debug(`encrypt: result is ${encrypted}`);
  return encrypted;
}

SecretManager.prototype.decrypt = function(cipher) {
  const decipher = crypto.createDecipher("AES256", this.key);
  let decrypted = decipher.update(cipher, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = SecretManager;
