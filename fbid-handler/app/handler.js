'use strict';
const randomstring = require('randomstring');
const _=require('lodash');
const request = require('request');
// request.debug = true
const SecretManager = require('secret-manager/app/manager');
const Promise = require('promise');
const fs = require('fs');

const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
// curl -X GET "https://graph.facebook.com/v2.6/1041923339269341?access_token=$PAGE_ACCESS_TOKEN"
// 322170138147525: 'Polaama', // GoForLakePowell page

let globalFbidHandler = null;

FbidHandler.get = function(testFbidFile) {
  if(!globalFbidHandler) globalFbidHandler = new FbidHandler(testFbidFile); 
  if(globalFbidHandler.reload) {
    logger.debug(`get: The reload flag is set. Reloading fbid handler from persistent store`);
    globalFbidHandler = new FbidHandler(testFbidFile);
  }
  return globalFbidHandler;
}

// list of all fbids that Polaama knows about.
function FbidHandler(testFbidFile) {
  if(testFbidFile) this.fbidFile = testFbidFile; // this functionality is currently used by test-handler.js to store test data in a different file.
  this.fbidDetails = {};
  this.nameFbidMap = new Map(); // using a map so that it's easy to add friends.
  this.idFbidMap = new Map();
  try {
    // Read the file synchronously. It's fairly small, so it should not incur any penalty.
    this.fbidDetails = JSON.parse(fs.readFileSync(file.call(this), 'utf8'));
    Object.keys(this.fbidDetails).forEach(fbid => {
      this.nameFbidMap.set(this.fbidDetails[fbid].name.toLowerCase(), fbid);
      this.idFbidMap.set(this.fbidDetails[fbid].id, fbid);
    });
    addFriends.call(this);
    logger.debug(`FbidHandler: loaded ${this.nameFbidMap.size} fbids from ${file.call(this)}`);
  }
  catch(err) {
    if(err.code != 'ENOENT') {
      logger.error(`error reading file: ${err.stack}`);
    }
  }
}

// Add friends for each fbid; 
// TODO: Move this into the file if it proves to be useful
function addFriends() {
  // TODO: You need to use https://graph.facebook.com/v2.6/1370147206379852/friends to get friends who are using this app. For this to work, each user needs to give the app user_friends permission. Details are here: https://developers.facebook.com/docs/facebook-login/permissions#reference-user_friends. 
  Object.keys(this.fbidDetails).forEach(id => {
    if(!this.friends) this.friends = {};
    this.friends[id] = [];
    switch(this.fbidDetails[id].name) {
      case "Test test":
        ["Pol Aama", "Madhuvanesh Parthasarathy"].forEach(name => {
          name = name.toLowerCase();
          if(this.nameFbidMap.has(name)) this.friends[id].push(this.nameFbidMap.get(name));
        });
        break;
      case "Pol Aama": 
        ["Madhuvanesh Parthasarathy"].forEach(name => {
          name = name.toLowerCase();
          if(this.nameFbidMap.has(name)) this.friends[id].push(this.nameFbidMap.get(name));
        });
        break;
      case "Madhuvanesh Parthasarathy":
        ["Pol Aama", "Adhu Artha","Jaideep Iyengar","Reshma Ananthakrishnan","Dhu Rtha","Hu Tha"].forEach(name => {
          name = name.toLowerCase();
          if(this.nameFbidMap.has(name)) this.friends[id].push(this.nameFbidMap.get(name));
        });
        break;
    }
  });
}

FbidHandler.prototype.fbid = function(name) {
  if(!name) throw new Error(`fbid: required parameter name is missing`);
  const fbid = this.nameFbidMap.get(name.toLowerCase());
  if(!fbid) logger.warn(`get fbid: could not find id for name: <${name}> in this.nameFbidMap. Maybe you forgot to add it?`);
  return fbid;
}

FbidHandler.prototype.getFriends = function(fbid) {
  return this.friends[fbid];
}

FbidHandler.prototype.getName = function(fbid) {
  return this.fbidDetails[fbid].name;
}

// given the id, return corresponding fbid
FbidHandler.prototype.decode = function(encodedId) {
  const fbid = this.idFbidMap.get(encodedId);
  if(!fbid) logger.warn(`decode: Could not find fbid for id ${encodedId}`);
  return fbid;
}

// given an fbid, return corresponding id
FbidHandler.prototype.encode = function(fbid) {
  if(this.fbidDetails[fbid]) return this.fbidDetails[fbid].id;
  return null;
}

function updateFbidDetails(fbid, json) {
  const encodedId = randomstring.generate({ length: 4, charset: 'alphabetic' });
  // if an id already exists, this is a bug. Throw EXCEPTION.
  if(this.idFbidMap.get(encodedId)) throw new Error(`encodedId ${encodedId} already exists as id for fbid ${this.idFbidMap.get(encodedId)}. This can only mean that randomstring generated a duplicate id. POSSIBLE BUG!!`);
  this.fbidDetails[fbid] = {
    name: `${json.first_name} ${json.last_name}`,
    id: encodedId
  };
  // update the maps!
  this.idFbidMap.set(this.fbidDetails[fbid].id, fbid);
  this.nameFbidMap.set(this.fbidDetails[fbid].name.toLowerCase(), fbid);
}

// TODO: We only fetch details from facebook once. That can get stale. Fix ME by doing repeated fetches from facebook and then updating fbidDetails.
/*
curl -X GET "https://graph.facebook.com/v2.8/1120615267993271?fields=hometown&access_token=$PAT"
{"first_name":"Madhuvanesh","last_name":"Parthasarathy","profile_pic":"https:\/\/scontent.xx.fbcdn.net\/v\/t31.0-1\/p960x960\/416136_10151101037035141_1635951042_o.jpg?oh=04b8577076c642ac843d41d066b381c2&oe=592206DD","locale":"en_US","timezone":-8,"gender":"male"}[ec2-user@ip-172-31-55-42 ~] 
*/
FbidHandler.prototype.add = function(fbid) {
  // try to obtain name from fbid and then store it here.
  const accessToken = (new SecretManager()).getPageAccessToken();
  // nothing to do if the fbid already exists
  if(this.fbidDetails[fbid] && this.fbidDetails[fbid].name) return null;
  const self = this;
  return new Promise((fulfill, reject) => {
    request(`https://graph.facebook.com/v2.8/${fbid}?access_token=${accessToken}`,
      function(err, response, body){
        if(err) {
          logger.error(`add: Error in getting details from fb: ${err.stack}`);
          return reject(err);
        }
        if(response.statusCode != 200) {
          const err = new Error(`add: response status is ${response.statusCode}. body: ${body}`);
          logger.error(`add: Response status is ${response.statusCode}. body: ${body}`);
          return reject(err);
        }
        logger.debug(`add: fbid ${fbid}; Response from facebook: <${body}>`);
        const json = JSON.parse(body);
        updateFbidDetails.call(self, fbid, json);
        fulfill(true);
    });
  }).then(
    // persist the add to file so it can be used again.
    function(status) {
      if(!status) return new Error(`Expected status of true from previous promise. But received ${status}`);
      return new Promise((fulfil, reject) => {
        logger.debug(`second promise: writing to file`);
        fs.writeFile(file.call(self), JSON.stringify(self.fbidDetails), function(err, res) {
          if(err) return reject(err);
          // mark that the next time FbidHandler.get gets called, we need to read from persistent store
          globalFbidHandler.reload = true; 
          fulfil(true);
        });
      });
    }, 
    function(err) {
      return err;
    }
  );
}

function file() {
  let fileName = `fbid.txt`;
  if(this.fbidFile) fileName = this.fbidFile; 
  return `${baseDir}/fbid-handler/${fileName}`;
}


/************ TESTING APIS ************************/
FbidHandler.prototype.testing_add = function(fbid, entry) {
  if(this.fbidDetails[fbid] && this.fbidDetails[fbid].name) return null;
  updateFbidDetails.call(this, fbid, entry);
  fs.writeFileSync(file.call(this), JSON.stringify(this.fbidDetails));
}

FbidHandler.prototype.testing_delete = function(fbid) {
  this.idFbidMap.delete(this.fbidDetails[fbid].id);
  this.nameFbidMap.delete(this.fbidDetails[fbid].name.toLowerCase());
  delete this.fbidDetails[fbid];
  fs.writeFileSync(file.call(this), JSON.stringify(this.fbidDetails));
}
/************ TESTING APIS ************************/

module.exports = FbidHandler;
