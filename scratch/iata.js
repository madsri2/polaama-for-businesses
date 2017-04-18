'use strict';
const IataCode = require('iatacodes');
const Promise = require('promise');
const ic = new IataCode('4a8368c8-4369-4ed3-90ab-f5c46ce34e54');

/*
const IataCodeGetter = require('/home/ec2-user/iatacode-getter.js');
const icg = new IataCodeGetter("lisbon");
let myCode = undefined;
icg.getCode(function(code) { console.log(`code is ${code}`); myCode = code; });
while(!myCode) {}
console.log(`My Code is ${myCode}`);
*/
const promise = new Promise(function(fulfil, reject) {
  ic.api('autocomplete', {query: 'JFK'}, function(err, response) {
    if(err) return reject(err);
    fulfil(response);
  });
});
promise.done(function(r) {
    console.log(`Response is ${JSON.stringify(r)}`);
  },
  function(e) {
    console.log(`Error is ${e.stack}`);
  }
);
