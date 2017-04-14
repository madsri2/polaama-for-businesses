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

// list of all fbids that Polaama knows about.
// TODO: Use the following url to get the user's full name
/*
curl -X GET "https://graph.facebook.com/v2.8/1120615267993271?fields=hometown&access_token=$PAT"
{"first_name":"Madhuvanesh","last_name":"Parthasarathy","profile_pic":"https:\/\/scontent.xx.fbcdn.net\/v\/t31.0-1\/p960x960\/416136_10151101037035141_1635951042_o.jpg?oh=04b8577076c642ac843d41d066b381c2&oe=592206DD","locale":"en_US","timezone":-8,"gender":"male"}[ec2-user@ip-172-31-55-42 ~] 
*/
/*
this.fbidNames = {
  "2": "Test test",
  "1120615267993271": "Madhuvanesh Parthasarathy",
  "1041923339269341": "Aparna Rangarajan",
  "1326674134041820": "Pol Aama",
  "1280537748676473": "Adhu Artha",
  "1111111111111111": "Jaideep Iyengar", // TODO: fbid is made up
  "1111111111111112": "Reshma Ananthakrishnan", // TODO: fbid is made up
  "1370147206379852": "Dhu Rtha",
  "1406396006101231": "Tha Hu"
};
this.fbidMap = {
  "aaaa": "2",
  "aeXf": "1120615267993271",
  "eA12": "1041923339269341",
  "bRt2": "1326674134041820",
  "xeMt": "1280537748676473",
  "azft": "1111111111111111",
  "zw4g": "1111111111111112",
  "bx6q": "1370147206379852",
};
*/
function FbidHandler(fbidFile) {
  // this functionality is currently used by test-handler.js to store test data in a different file.
  if(fbidFile) this.fbidFile = fbidFile; 
  this.fbidDetails = {};
  this.nameFbidMap = new Map(); // using a map so that it's easy to add friends.
  this.idFbidMap = new Map();
  try {
    // Read the file synchronously. It's fairly small, so it should not incur any penalty.
    this.fbidDetails = JSON.parse(fs.readFileSync(this.file(), 'utf8'));
    Object.keys(this.fbidDetails).forEach(fbid => {
      this.nameFbidMap.set(this.fbidDetails[fbid].name, fbid);
      this.idFbidMap.set(this.fbidDetails[fbid].id, fbid);
    });
    addFriends.call(this);
    logger.debug(`FbidHandler: loaded ${this.nameFbidMap.size} fbids from ${this.file()}`);
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
          if(this.nameFbidMap.has(name)) this.friends[id].push(this.nameFbidMap.get(name));
        });
        break;
      case "Pol Aama": 
        ["Madhuvanesh Parthasarathy"].forEach(name => {
          if(this.nameFbidMap.has(name)) this.friends[id].push(this.nameFbidMap.get(name));
        });
        break;
      case "Madhuvanesh Parthasarathy":
        ["Pol Aama", "Adhu Artha","Jaideep Iyengar","Reshma Ananthakrishnan","Dhu Rtha","Hu Tha"].forEach(name => {
          if(this.nameFbidMap.has(name)) this.friends[id].push(this.nameFbidMap.get(name));
        });
        break;
    }
  });
}

FbidHandler.prototype.fbid = function(name) {
  const fbid = this.nameFbidMap.get(name);
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
  if(this.fbidDetails[fbid]) {
    return this.fbidDetails[fbid].id;
  }
  return null;
}

const encryptedPat = "GDppF8QSELN0ycFlaDahtM34V1EDoZX8JRtoem2wSXpkl0pWmNhYZGbYnV0HfjdGQcKs9plL8+ityQl/DXN8WcN/rod11yN7/8tmWcyJK5NpF/YwPeF4pFuVzfroPxuzU4ckUDDbtKE6MPyiySsx9L0+GLswJsV92+HCSY0uvlc6v0hiirqg/KO9ebTv+Na+Q0fs8s0aziYAvo5f3pgIPxyhrUQW3ENzKZ/aEbLL8a5wXiXR6qq9b28lW1eu8E6S";

function updateFbidDetails(fbid, json) {
  this.fbidDetails[fbid] = {
    name: `${json.first_name} ${json.last_name}`,
    id: randomstring.generate({ length: 4, charset: 'alphabetic' })
  };
  // update the maps!
  this.idFbidMap.set(this.fbidDetails[fbid].id, fbid);
  this.nameFbidMap.set(this.fbidDetails[fbid].name, fbid);
}

// TODO: We only fetch details from facebook once. That can get stale. Fix ME by doing repeated fetches from facebook and then updating fbidDetails.
FbidHandler.prototype.add = function(fbid) {
  // try to obtain name from fbid and then store it here.
  const manager = new SecretManager();
  const accessToken = manager.decrypt(encryptedPat);
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
        fs.writeFile(self.file(), JSON.stringify(self.fbidDetails), function(err, res) {
          if(err) return reject(err);
          fulfil(true);
        });
      });
    }, 
    function(err) {
      return err;
    }
  );
}

FbidHandler.prototype.file = function() {
  let fileName = `fbid.txt`;
  if(this.fbidFile) fileName = this.fbidFile; 
  return `${baseDir}/fbid-handler/${fileName}`;
}

module.exports = FbidHandler;
