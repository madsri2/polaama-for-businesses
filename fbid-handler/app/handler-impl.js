'use strict';

const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);

/**** STOP: Don't use this class directly. Use FbidHandler instead ******/
// list of all fbids that Polaama knows about. See 
function FbidHandlerImpl(fbidDetails) {
  this.fbidDetails = fbidDetails;
  this.nameFbidMap = new Map(); // using a map so that it's easy to add friends.
  this.idFbidMap = new Map();
  Object.keys(this.fbidDetails).forEach(fbid => {
    this.nameFbidMap.set(this.fbidDetails[fbid].name.toLowerCase(), fbid);
    this.idFbidMap.set(this.fbidDetails[fbid].id, fbid);
  });
  addFriends.call(this);
  // logger.debug(`FbidHandlerImpl: loaded ${this.nameFbidMap.size} fbids`);
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

FbidHandlerImpl.prototype.getId = function(name) {
  if(!name) throw new Error(`getId: required parameter name is missing`);
  const fbid = this.fbid(name);
  return this.encode(fbid);
}

FbidHandlerImpl.prototype.fbid = function(name) {
  if(!name) throw new Error(`fbid: required parameter name is missing`);
  const fbid = this.nameFbidMap.get(name.toLowerCase());
  return fbid;
}

FbidHandlerImpl.prototype.getFriends = function(fbid) {
  return this.friends[fbid];
}

FbidHandlerImpl.prototype.getName = function(fbid) {
  if(this.fbidDetails[fbid]) return this.fbidDetails[fbid].name;
  return null;
}

// given the id, return corresponding fbid
FbidHandlerImpl.prototype.decode = function(encodedId) {
  const fbid = this.idFbidMap.get(encodedId);
  return fbid;
}

// given an fbid, return corresponding id
FbidHandlerImpl.prototype.encode = function(fbid) {
  if(this.fbidDetails[fbid]) return this.fbidDetails[fbid].id;
  return null;
}

FbidHandlerImpl.prototype.addFbidDetails = function(fbid, encodedId, json, profilePic) {
  // try to obtain name from fbid and then store it here.
  // nothing to do if the fbid already exists
  // if an id already exists, this is a bug. Throw EXCEPTION.
  if(this.idFbidMap.get(encodedId)) throw new Error(`encodedId ${encodedId} already exists as id for fbid ${this.idFbidMap.get(encodedId)}. This can only mean that randomstring generated a duplicate id. POSSIBLE BUG!!`);
  this.fbidDetails[fbid] = {
    name: `${json.first_name} ${json.last_name}`,
    id: encodedId,
    profile_pic: profilePic
  };
  // update the maps!
  this.idFbidMap.set(this.fbidDetails[fbid].id, fbid);
  this.nameFbidMap.set(this.fbidDetails[fbid].name.toLowerCase(), fbid);
  addFriends.call(this);
  return this.fbidDetails;
}

/************ TESTING APIS ************************/
FbidHandlerImpl.prototype.testing_delete = function(fbid) {
  this.idFbidMap.delete(this.fbidDetails[fbid].id);
  this.nameFbidMap.delete(this.fbidDetails[fbid].name.toLowerCase());
  delete this.fbidDetails[fbid];
}
/************ TESTING APIS ************************/

module.exports = FbidHandlerImpl;
