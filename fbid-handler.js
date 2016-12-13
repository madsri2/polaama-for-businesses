'use strict';
const random = require('randomstring');
const Log = require('./logger');
const logger = (new Log()).init();

/*
curl -X GET "https://graph.facebook.com/v2.6/1041923339269341?access_token=EAAXu91clmx0BAONN06z8f5Nna6XnCH3oWJChlbooiZCaYbKOUccVsfvrbY0nCZBXmZCQmZCzPEvkcJrBZAHbVEZANKe46D9AaxOhNPqwqZAGZC5ZCQCK4dpxtvgsPGmsQNzKhNv5OdNkizC9NfrzUQ9s8FwXa7GK3EAkOWpDHjZAiGZAgZDZD"
*/
// 322170138147525: 'Polaama', // GoForLakePowell page

function FbidHandler() {
  // list of all fbids that Polaama knows about.
  this.fbidNames = {
    1120615267993271: 'Madhuvanesh Parthasarathy',
    1041923339269341: 'Aparna Rangarajan',
    1326674134041820: 'Pol Aama',
  };
  // generate new random strings for every fbid to use everywhere else.
  Object.keys(fbidNames).forEach(id => {
    this.fbidMap[id] = random.generate({
      length: 4,
      charset: 'alphanumeric'
    });
  });
  this.friends = {};
  // Now add friends for each fbid;
  Object.keys(fbidNames).forEach(id => {
    switch(fbidNames[id]) {
      case "Pol Aama": 
        this.friends[id].push(fbid.call(this,"Madhuvanesh Parthasarathy"));
        break;
      case "Aparna Rangarajan":
        this.friends[id].push(fbid.call(this,"Madhuvanesh Parthasarathy"));
        break;
      case "Madhuvanesh Parthasarathy":
        this.friends[id].push([
          fbid.call(this,"Pol Aama"),
          fbid.call(this,"Aparna Rangarajan")
        ]);
        break;
    }
  });
}

function fbid(name) {
  Object.keys(this.fbidNames).forEach(id => {
    if(name === this.fbidNames[id]) {
      // found it
      return id;
    }
  });
  logger.error(`BUG: could not find id for name: ${name}`);
  return undefined;
}

FbidHandler.prototype.getFriends(fbid) {
  return this.friends[fbid];
}

FbidHandler.prototype.getName(fbid) {
  return this.fbidNames[fbid];
}
