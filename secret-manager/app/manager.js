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

// Polaama Prototype page token
// const encryptedPat = "GDppF8QSELN0ycFlaDahtM34V1EDoZX8JRtoem2wSXpkl0pWmNhYZGbYnV0HfjdGQcKs9plL8+ityQl/DXN8WcN/rod11yN7/8tmWcyJK5NpF/YwPeF4pFuVzfroPxuzU4ckUDDbtKE6MPyiySsx9L0+GLswJsV92+HCSY0uvlc6v0hiirqg/KO9ebTv+Na+Q0fs8s0aziYAvo5f3pgIPxyhrUQW3ENzKZ/aEbLL8a5wXiXR6qq9b28lW1eu8E6S";
SecretManager.prototype.getPolaamaBotPageAccessToken = function() {
  // Polaama bot app page token
  const encryptedPat = "LXMsEKkeoWXqSBoi64Gt+Ou/NcjoFR7aiLUjuSRdTTYuVUKOGoElSU/nqCE8pl1wnIa9MZ8vd4vCIvosJmFiBkYLLZmawSURPWbEFH2apqmTokt+4Lj1DQZ7nVjcLMhM6EyJildZX4qcFqZvozuV2obi889/eUjb4l70E3KsftARrfwMxoS4g/BQaE1iTJnd3l+FGu0hMgHHNFMZKxUC6ml6pY79rxs53UtN5tcaAW3qt/JPqP1bApTiLF0ytpe+";
  return this.decrypt(encryptedPat);
}

SecretManager.prototype.getPolaamaPageAccessToken = function() {
  const encryptedPat = "QFk4Wvg3ZFUtO0AN91PaPsScnRXBAqI/d7VypQVoy5zvJNuN0e94q5/Qy4xhXxmPzijKbg6tzt+l17KlAoy1cmKxicPrnnLHwQWHl1bb+HKYmjejLbVwjOPumSOMR4D5SPTVRHEZP3WN7cHXj3r0mdpZYBMASiKwSCLtVZ/CnbqMviY1Kfcuonl0ocZEgldb+hsFFsNwJjisPCmVYFYn5GGq2A8Fi/8pXX/fijVZsPg=";
  return this.decrypt(encryptedPat);
}

SecretManager.prototype.getFBAppId = function() {
  const encryptedAppId = "0NEhMR1SJFm66aHxhkktNFsHg+ADlBjustDMPhZVx0BTexm/kH0aXjldQva8T/9P";
  return this.decrypt(encryptedAppId);
}

SecretManager.prototype.getFBAppSecret = function() {
  const encryptedSecret = "CEmqOqd32HL6uzcydAMiWw==";
  return this.decrypt(encryptedSecret);
}

SecretManager.prototype.getSkyscannerApiKey = function() {
  const encryptedSecret = "g5PlW5lhNO53X7f91XmuCV03/6EgjUHBvlQyEOqXb+C3vpMDKVlpwLAK8beq3I0Z";
  return this.decrypt(encryptedSecret);
}

SecretManager.prototype.getIatacodeApiKey = function() {
  const encryptedSecret = "HHZKRbdjXaY2o+mWdslpx+cwpMjDA0UWJmWI7wOla42XlxRJZloTr7FjYIvmc4SX";
  return this.decrypt(encryptedSecret);
}

module.exports = SecretManager;
