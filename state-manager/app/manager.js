'use strict';
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const fs = require('fs');
const Promise = require('promise');
const stateDir = `/home/ec2-user/state-manager/state.dat`;

/* 
  A simple state manager that persists state. It's completely non-blocking, using promises! For now, we are persisting it locally. Also, the data structure is a simple key - value store. We offer APIs for users of this class to create complex keys from many values.
*/

function Manager(name, testing) {
  if(!name) return new Error("required parameter 'name' is missing");  
  if(testing) name = "testing-".concat(name);
  this.state = {};
  const self = this;
  this.promise = new Promise(function(fulfil, reject) {
    fs.mkdir(stateDir, function(err) {
      if(err && err.code !== 'EEXIST') return reject(err);
      self.fileName = `${stateDir}/${name}`;
      fs.readFile(self.fileName, 'utf8', function(err, data) {
        let createFile = false;
        if(err) {
          if(err.code === "ENOENT") createFile = true;
          else return reject(err);
        }
        if(testing || createFile) {
          // logger.debug(`file ${self.fileName} not present`);
          // create an empty file to establish state
          fs.writeFile(self.fileName, JSON.stringify(self.state), 'utf8', function(err) {
            if(err) return reject(err);
            // logger.debug(`writeFile: file ${self.fileName} written`);
            fulfil();
          });
          return;
        }
        // logger.debug(`mkdir: data is ${JSON.stringify(data)}`);
        self.state = JSON.parse(data);
        fulfil();
      });
    });
  });
}

Manager.prototype.set = function(key, value) {
  const self = this;
  if(!value) value = true;
  return this.promise.then(
    function() {
      if(!key) return Promise.reject(new Error("required parameter 'key' is missing"));
      self.state[getActualKey(key)] = value;
      return persist.call(self);
    },
    function(err) {
      return Promise.reject(err);
    }
  );
}

Manager.prototype.keyStartingWith = function(prefix) {
  const self = this;
  return this.promise.then(
    function() {
      if(self.reload) return reloadState.call(self);
      return Promise.resolve();
    },
    function(err) {
      return Promise.reject(err);
    }
  ).then(
    function() {
      const keys = Object.keys(self.state);
      let k = null;
      keys.forEach(key => {
        if(key.startsWith(prefix)) k = key;
      });
      return Promise.resolve(k);
    },
    function(err) {
      return Promise.reject(err);
    }
  );
}

Manager.prototype.get = function(key) {
  const self = this;
  return this.promise.then(
    function() {
      if(self.reload) return reloadState.call(self);
    },
    function(err) {
      return Promise.reject(err);
    }
  ).then(
    function() {
      return Promise.resolve(self.state[getActualKey(key)]);
    },
    function(err) {
      return Promise.reject(err);
    }
  );
}

Manager.prototype.clear = function(key) {
  const self = this;
  return this.promise.then(
    function() {
      return self.get(key);
    },
    function(err) {
      return Promise.reject(err);
    }
  ).then(
    function(value) {
      if(!value) return Promise.resolve(true);
      delete self.state[getActualKey(key)];
      return persist.call(self);
    },
    function(err) {
      return Promise.reject(err);
    }
  );
}

Manager.prototype.parseKey = function(key) {
  return key.split("-_");
}

function getActualKey(list) {
  if(typeof list !== "object") return list;
  let key = "";
  list.forEach(item => {
    key = key.concat(`${item}-_`);
  });
  // logger.debug(`key: ${key}`);
  return key;
}

function reloadState() {
  const self = this;
  return new Promise((fulfil, reject) => {
    fs.readFile(self.fileName, 'utf8', function(err, data) {
      if(err) return reject(err);
      self.state = JSON.parse(data);
      fulfil();
    });
  });
}

function persist() {
  const self = this;
  return new Promise((fulfil, reject) => {
    fs.writeFile(self.fileName, JSON.stringify(self.state), 'utf8', function(err) {
      if(err) reject(err);
      self.reload = true;
      fulfil();
    });
  });
}

module.exports = Manager;
