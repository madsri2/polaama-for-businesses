'use strict';

const SecretManager = require('/home/ec2-user/secret-manager/app/manager');

if(process.argv.length < 4) {
  console.log(`usage: node crypto.js <-e|-d> <data>`);
  return;
}

const manager = new SecretManager();
if(process.argv[2] === "-e") {
  console.log(manager.encrypt(process.argv[3]));
  return;
}

if(process.argv[2] === "-d") {
  console.log(manager.decrypt(process.argv[3]));
  return;
}

