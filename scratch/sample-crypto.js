const crypto = require('crypto');

function encrypt(text){
  var cipher = crypto.createCipher('aes-256-cbc','Aadhav!')
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text){
  var decipher = crypto.createDecipher('aes-256-cbc','Aadhav!')
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}

/*
var hw = encrypt("hello world");
console.log(hw);
console.log(decrypt(hw));
*/

const random = require('randomstring');
console.log(random.generate({
  length: 4,
  charset: 'alphabetic'
}));
