'use strict';

let instance;

Singleton.get = function() {
  if(instance) return instance;
  instance = new Singleton();
  return instance;
}

function Singleton() {
  console.log(`Singleton constructor called`);
}

module.exports = Singleton;
