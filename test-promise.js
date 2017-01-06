'use strict';
const fs = require('fs');
const Promise = require('promise');
const sleep = require('sleep');

const f1P = Promise.denodeify(f1);
const f2P = Promise.denodeify(f2);

f1P().then(f2P()).done(
  function(res) {
    console.log(`content length after promise is fulfilled is ${res.length}`);
  }, function(err) {
    console.log(`error: ${err.stack}`);
  });

function f1(callback) {
  console.log("f1 called");
  fs.readFile("flights/SEAtoLISon2017-02-03.txt", 'utf8', callback);  
}


function f2(callback) {
  console.log("f2 called");
  fs.readFile("flights/SEAtoLISon2017-02-03.txt", 'utf8', callback);  
}
