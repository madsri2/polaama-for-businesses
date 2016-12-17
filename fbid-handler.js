'use strict';
const random = require('randomstring');
const Log = require('./logger');
const logger = (new Log()).init();
const _=require('lodash');

/*
curl -X GET "https://graph.facebook.com/v2.6/1041923339269341?access_token=EAAXu91clmx0BAONN06z8f5Nna6XnCH3oWJChlbooiZCaYbKOUccVsfvrbY0nCZBXmZCQmZCzPEvkcJrBZAHbVEZANKe46D9AaxOhNPqwqZAGZC5ZCQCK4dpxtvgsPGmsQNzKhNv5OdNkizC9NfrzUQ9s8FwXa7GK3EAkOWpDHjZAiGZAgZDZD"
*/
// 322170138147525: 'Polaama', // GoForLakePowell page

function FbidHandler() {
  // list of all fbids that Polaama knows about.
  this.fbidNames = {
    "2": "Test test",
    "1120615267993271": "Madhuvanesh Parthasarathy",
    "1041923339269341": "Aparna Rangarajan",
    "1326674134041820": "Pol Aama",
  };
  this.fbidMap = {
    "aaaa": "2",
    "aeXf": "1120615267993271",
    "eA12": "1041923339269341",
    "bRt2": "1326674134041820"
  };
  this.friends = {};
  // Now add friends for each fbid;
  Object.keys(this.fbidNames).forEach(id => {
    this.friends[id] = [];
    switch(this.fbidNames[id]) {
      case "Test test":
        this.friends[id].push(this.fbid("Pol Aama"));
        this.friends[id].push(this.fbid("Madhuvanesh Parthasarathy"));
        break;
      case "Pol Aama": 
        this.friends[id].push(this.fbid("Madhuvanesh Parthasarathy"));
        break;
      case "Aparna Rangarajan":
        this.friends[id].push(this.fbid("Madhuvanesh Parthasarathy"));
        break;
      case "Madhuvanesh Parthasarathy":
        this.friends[id].push(
          this.fbid("Pol Aama")
          // this.fbid("Aparna Rangarajan")
        );
        break;
    }
  });
}

FbidHandler.prototype.fbid = function(name) {
  let id;
  Object.keys(this.fbidNames).forEach(i => {
    if(name === this.fbidNames[i]) {
      // found it
      id = i;
    }
  });
  if(_.isUndefined(id)) {
    logger.error(`BUG: could not find id for name: <${name}>`);
  }
  return id;
}

FbidHandler.prototype.getFriends = function(fbid) {
  return this.friends[fbid];
}

FbidHandler.prototype.getName = function(fbid) {
  return this.fbidNames[fbid];
}

FbidHandler.prototype.decode = function(encodedId) {
  return this.fbidMap[encodedId];
}

FbidHandler.prototype.encode = function(fbid) {
  let id;
  Object.keys(this.fbidMap).forEach(k => {
    if(fbid === this.fbidMap[k]) {
      // found
      id = k;
      return;
    }
  });
  return id;
}

module.exports = FbidHandler;
