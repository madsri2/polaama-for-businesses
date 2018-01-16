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
  // logger.debug(`encrypt: result is ${encrypted}`);
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
// Token for the "Polamaa Bot" page
SecretManager.prototype.getPolaamaBotPageAccessToken = function() {
  // Polaama bot app page token
  const encryptedPat = "LXMsEKkeoWXqSBoi64Gt+Ou/NcjoFR7aiLUjuSRdTTYuVUKOGoElSU/nqCE8pl1wnIa9MZ8vd4vCIvosJmFiBkYLLZmawSURPWbEFH2apqmTokt+4Lj1DQZ7nVjcLMhM6EyJildZX4qcFqZvozuV2obi889/eUjb4l70E3KsftARrfwMxoS4g/BQaE1iTJnd3l+FGu0hMgHHNFMZKxUC6ml6pY79rxs53UtN5tcaAW3qt/JPqP1bApTiLF0ytpe+";
  return this.decrypt(encryptedPat);
}

// Token for the "travelpolaama" or "Polaama" page
SecretManager.prototype.getPolaamaPageAccessToken = function() {
  const encryptedPat = "QFk4Wvg3ZFUtO0AN91PaPsScnRXBAqI/d7VypQVoy5zvJNuN0e94q5/Qy4xhXxmPzijKbg6tzt+l17KlAoy1cmKxicPrnnLHwQWHl1bb+HKYmjejLbVwjOPumSOMR4D5SPTVRHEZP3WN7cHXj3r0mdpZYBMASiKwSCLtVZ/CnbqMviY1Kfcuonl0ocZEgldb+hsFFsNwJjisPCmVYFYn5GGq2A8Fi/8pXX/fijVZsPg=";
  return this.decrypt(encryptedPat);
}

// Token for the "Travel SFO" page: https://www.facebook.com/polaama.sfo/
SecretManager.prototype.getTravelSfoPageAccessToken = function() {
  const encryptedPat = "bPfnd6Rn5+kdj3R2KjoL2mdSI6tYyMLpW2C1fz6226Z0y4cfz+NhApXY2r1ejuVPHRn6MwAyqA8uspHJGlMel6lTNHWcIPe31j9T1riK8ICG8texCrISau4x1NUGfvKaKaophCDyBZxwkq0kPIEh1o7DMpC8j8g0vUs6ooMHQoaNmDmDsQESCOaODGDMF8DAldXR5GAu7OfHb3hBILMbwFs2/rTgM3HkfVm9KGbdB3932OkC36NUYQdybTWNmDIv";
  return this.decrypt(encryptedPat);
}

// Token for the "My Hackshaw" page: 
SecretManager.prototype.getMyHackshawPageAccessToken = function() {
  const encryptedPat = "0svPwwhUqbKBc9chMVVpLTpcxoBayk4JpidUvzIh5yWrsl8wRVPMf2TucTCTZnYqBhsOACO3yBx0M+XHolz9nbyQl3xLLvR8tyhw4e6cS9WjThhe8U+FrZm50exN/dLCj9pBQc9zP5di+CodxEmS4mm+/KoeduAaRKPeaxf5juNQs/Bz4JAoEuPxCpcZ3RTNhbECxEeB+YJ8zF+zX3t0wCJvVJUwmXe5dZA/hlUaRXWRlQlEkHv8TjjTPv593A9P";
  return this.decrypt(encryptedPat);
}

SecretManager.prototype.getSeaSprayPageAccessToken = function() {
  const encryptedPat = "Pgal1FPBd+OWrpf51LdEuQFklF+RFiuZObkL2Y6vYi/a7W82dUWBaTIPVfn0KJ0yqMTAlOvCjdU1G2MJJnfnrAMLRXOhSOlY2zFKlVJHB8BJZsbYVZp/0pNgYZ+1P7d1muj4Tl7uSTjT464RUJp57dB0q8v0fP13sI3Z+31Euki/sLmr9FhaQvTpPBKs/+Qs0xlAMTYF+0fqyXymMekUlrWgZtbljdwIz/K1MlYMuI4h8TgE7m9/MNrHkeBsBYx/";
  return this.decrypt(encryptedPat);
}

// Token for the "My Sea Spray" page: 
SecretManager.prototype.getMySeaSprayPageAccessToken = function() {
  const encryptedPat = "0Xr4FwXXiWn7Kh2hf5JHv5r2Wi6QiA4uGtTnaus50XNJtD+EmMNQ1N9KxvfRo3RiQAXFak160EOJzjJi5iPZvq860xT9LA34qeamKzkPPXn+5u2+hft8gO+OMit/Et8wbf9ZcFrRiOcKM3LY2rhhbmzs3Olt5/b/7Nr/fdGr3tA/ubPCp0TWViymoVa7kraC23vyer7wY8SLP5eFwvl2YhMayF8AkeTEOLhWLpM1pVM=";
  return this.decrypt(encryptedPat);
}

SecretManager.prototype.getDialogflowClientToken = function() {
  const encrypted = "+MtG+GuCowhJ76swEQQXLdQxc4urxlK6/4DiH5P+TQ3eKs8DgiZfs1osVhfHbuIx";
  return this.decrypt(encrypted);
}

SecretManager.prototype.getHackshawDialogflowClientToken = function() {
  const encrypted = "ThCF8lAuWOxjA8GJD/wivBcIdfrEG5MJRQA55Hwzkg0Cx2Xv+u360PseJ66vJfbK";
  return this.decrypt(encrypted);
}

SecretManager.prototype.getHackshawDialogflowDeveloperAccessToken = function() {
  const encrypted = "gpx5K3WN4MTWKmYlgTJ10XoDhlDKEYRqtK7AdEjwLKygxpN704M0q3kBQoYWLr4v";
  return this.decrypt(encrypted);
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
