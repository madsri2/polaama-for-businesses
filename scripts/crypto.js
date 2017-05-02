'use strict';

const SecretManager = require('/home/ec2-user/secret-manager/app/manager');
// https://www.npmjs.com/package/command-line-args
const cmdLineArgs = require('command-line-args');

const optionsDefn = [
  {name: 'encrypt', alias: 'e'}, // default type: String
  {name: 'decrypt', alias: 'd'},
  {name: 'pat', type: Boolean}
];

const options = cmdLineArgs(optionsDefn);
const manager = new SecretManager();
if(options.encrypt) return console.log(manager.encrypt(options.encrypt));
if(options.decrypt) return console.log(manager.decrypt(options.decrypt));
if(options.pat) { return console.log(manager.getPageAccessToken()); }

console.log(`usage: node crypto.js [-e data | -d <data> | -pat]`);
/*
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
*/
