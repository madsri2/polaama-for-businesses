'use strict';
const fs = require('fs');
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const SecretManager = require('secret-manager/app/manager');
const FbidHandlerImpl = require('fbid-handler/app/handler-impl');
const request = require('request');
// request.debug = true
const randomstring = require('randomstring');
const _=require('lodash');
const Promise = require('promise');

PageHandler.defaultPageId = "322170138147525";
let globalPageHandler;

const pages = [PageHandler.defaultPageId, "1852118738377984", "118953662103163"];

/**** STOP: Don't use this class directly. Use FbidHandler instead. This class is only meant to be used by webhook-post-handler to add an fbid ******/
PageHandler.get = function(testFbidFile) {
  // logger.debug(`get called with file ${testFbidFile}: ${new Error().stack}`);
  if(!globalPageHandler) globalPageHandler = new PageHandler(testFbidFile); 
  if(globalPageHandler.reload) {
    logger.debug(`get: The reload flag is set. Reloading fbid handler from persistent store`);
    globalPageHandler = new PageHandler(testFbidFile);
  }
	// logger.debug(`get: There are ${Object.keys(globalPageHandler.pageFbidDetails).length} pages in pageFbidDetails`);
  return globalPageHandler; 
}

function PageHandler(testPageFile) {
	this.defaultPageId = PageHandler.defaultPageId;
  this.fbidHandlers = {};
	this.fbidHandlers[this.defaultPageId] = new FbidHandlerImpl({});
  // this functionality is currently used by test-handler.js to store test data in a different file.
  if(testPageFile) this.testPageFile = testPageFile; 
  try {
    // Read the file synchronously. It's fairly small, so it should not incur any penalty.
    this.pageFbidDetails = JSON.parse(fs.readFileSync(file.call(this), 'utf8'));
    // nothing to do if the file is empty
    if(Object.keys(this.pageFbidDetails).length === 0) return;
    Object.keys(this.pageFbidDetails).forEach(pageId => {
      this.fbidHandlers[pageId] = new FbidHandlerImpl(this.pageFbidDetails[pageId]);
    });
  }
  catch(err) {
    this.pageFbidDetails = {};
    logger.error(`error reading file: ${err.stack}`);
    throw err;
  }
}

//  See if this user has already been associated with any of the pages. If so, use the same id
function getExistingId(name, profile_pic) {
  let pageIds = Object.keys(this.pageFbidDetails);
  // logger.debug(`getExistingId: There are ${pageIds.length} pages`);
  for(let pageIdx = 0; pageIdx < pageIds.length; pageIdx++) {
    const thisPageId = pageIds[pageIdx];
    let userFbids = Object.keys(this.pageFbidDetails[thisPageId]);
    for(let userIdx = 0; userIdx < userFbids.length; userIdx++) {
      const thisUserFbid = userFbids[userIdx];
      const user = this.pageFbidDetails[thisPageId][thisUserFbid];
      if(user.name === name && user.profile_pic === reduce(profile_pic)) return user.id;
      // logger.debug(`getExistingId: now comparing ${user.name} with ${name}`);
    }
  }
  logger.debug(`getExistingId: Did not find ${name} in existing fbid-handler file`);
  return null;
}

PageHandler.prototype.getPageAccessToken = function(pageId) {
	if(!pageId) pageId = this.defaultPageId;
  let pageAccessToken;
  if(!this.secretManager) this.secretManager = new SecretManager();
  switch(pageId) {
    case pages[0]:
      pageAccessToken = this.secretManager.getPolaamaBotPageAccessToken();
      break;
    case pages[1]:
      pageAccessToken = this.secretManager.getPolaamaPageAccessToken();
      break;
    case pages[2]:
      pageAccessToken = this.secretManager.getTravelSfoPageAccessToken();
      break;
  }
  return pageAccessToken;
}

PageHandler.prototype.getFbidHandler = function(pageId) {
  if(!pageId) pageId = this.defaultPageId;
  return this.fbidHandlers[pageId];
}

function reduce(str) {
	if(!str) return null;
  let hash = 0, chr;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    let chr = str.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
  }
  return hash;
}

function updateFbidDetails(fbidHandler, fbid, json) {
	json.name = `${json.first_name} ${json.last_name}`;
  /* 
    Originally, we wanted the different fbids to have the same "id" so that users can use different facebook pages and still get all their trip details created via any "polaama managed" page. That also requires changes to sessions (our session is associated with an fbid, which is different for each page for the same user). So, we currently keep the users separate for each page. If this functionality is ever needed, we can make that change. At that point, uncomment this code. 
    // let encodedId = getExistingId.call(this, json.name, json.profile_pic);
    // if(!encodedId) encodedId = randomstring.generate({ length: 4, charset: 'alphabetic' });
  */
  const encodedId = randomstring.generate({ length: 4, charset: 'alphabetic' });
  fbidHandler.addFbidDetails(fbid, encodedId, json, reduce(json.profile_pic));
}

// TODO: We only fetch details from facebook once. That can get stale. Fix ME by doing repeated fetches from facebook and then updating fbidDetails.
/* 
curl -X GET "https://graph.facebook.com/v2.8/1120615267993271?fields=hometown&access_token=$PAT"
{"first_name":"Madhuvanesh","last_name":"Parthasarathy","profile_pic":"https:\/\/scontent.xx.fbcdn.net\/v\/t31.0-1\/p960x960\/416136_10151101037035141_1635951042_o.jpg?oh=04b8577076c642ac843d41d066b381c2&oe=592206DD","locale":"en_US","timezone":-8,"gender":"male"}[ec2-user@ip-172-31-55-42 ~] 
*/
PageHandler.prototype.add = function(fbid, pageId) {
  if(!pageId) pageId = this.defaultPageId;
  if(!fbid) return Promise.reject(new Error("expected parameter fbid not present. nothing to add"));
  if(pages.includes(fbid)) {
    // logger.debug(`add: not adding fbid ${fbid} which is actually a page id`);  
    return Promise.resolve(true);
  }
	// logger.debug(`add: PageHandler add called with fbid ${fbid} and page id ${pageId}`);
  const accessToken = this.getPageAccessToken(pageId);
  let fbidHandler = this.fbidHandlers[pageId];
  if(!fbidHandler) {
    fbidHandler = new FbidHandlerImpl({});
    this.fbidHandlers[pageId] = fbidHandler;
  }
  const fbidDetails = fbidHandler.fbidDetails;
  // if the fbid is already present, there's nothing left to do.
  // if(fbidDetails) logger.debug(`add: fbidDetails has ${Object.keys(fbidDetails).length} ids`);
  if(fbidDetails && fbidDetails[fbid] && fbidDetails[fbid].name) return Promise.resolve(true);
  const self = this;
  // get the details for this fbid and page from facebook and update the file.
  return new Promise((fulfil, reject) => {
    // no fbid for this page. Get the details, then create fbidHandler.
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
        // logger.debug(`add: fbid ${fbid}; Response from facebook: <${body}>`);
        const json = JSON.parse(body);
        updateFbidDetails.call(self, fbidHandler, fbid, json);
        self.pageFbidDetails[pageId] = fbidHandler.fbidDetails;
        fulfil(true);
    });
	}).then(
    // persist the add to file so it can be used again.
    function(status) {
      if(!status) return Promise.reject(`Expected true from previous promise, received ${status}`);
      return new Promise((fulfil, reject) => {
        // logger.debug(`second promise: writing to file`);
				try {
          fs.writeFile(file.call(self), JSON.stringify(self.pageFbidDetails), function(err, res) {
            if(err) return reject(err);
            // mark that the next time get() is called, we need to read from persistent store
            self.reload = true; 
  					// logger.debug(`Writing File Promise: Set reload to true`);
            fulfil(true);
          });
				}
				catch(err) {
					logger.error(`WriteFile Promise: error writing to file ${err.stack}`);
					reject(err);
				}
      });
    }, 
    function(err) {
			logger.debug(`add: Error calling facebook: ${err.stack}`);
      return Promise.reject(err);
    }
  );
}

function file() {
  let fileName = `fbid.txt`;
  if(this.testPageFile) fileName = this.testPageFile; 
  // logger.debug(`PageHandler: returning file ${fileName}`);
  return `${baseDir}/fbid-handler/${fileName}`;
}

/************ TESTING APIS ************************/
PageHandler.prototype.testing_add = function(fbid, entry) {
  const pageId = this.defaultPageId;
  const fbidHandler = this.fbidHandlers[pageId];
  if(fbidHandler.fbidDetails[fbid] && fbidHandler.fbidDetails[fbid].name) return;
  logger.debug(`testing_add: creating a 4 letter id for ${fbid}. fbid details: ${JSON.stringify(fbidHandler.fbidDetails)}`);
  updateFbidDetails.call(this, fbidHandler, fbid, entry);
  this.pageFbidDetails[pageId] = fbidHandler.fbidDetails;
  fs.writeFileSync(file.call(this), JSON.stringify(this.pageFbidDetails));
}

PageHandler.prototype.testing_delete = function(fbid) {
  const pageId = this.defaultPageId;
  const fbidHandler = this.fbidHandlers[fbid];
  const fbidDetails = fbidHandler.testing_delete(fbid);
  this.pageFbidDetails[pageId] = fbidHandler.fbidDetails;
  fs.writeFileSync(file.call(this), JSON.stringify(this.pageFbidDetails));
}

PageHandler.testing_delete_file = function() {
	// remove this file to force fetch from facebook graph.
	const oldFile = `${baseDir}/fbid-handler/fbid-test.txt`; 
	const newFile = `${baseDir}/fbid-handler/fbid-test.txt.orig`; 
	if(fs.existsSync(oldFile)) fs.renameSync(oldFile, newFile);
	// create an empty file
	logger.debug(`testing_delete_file: Writing to old file ${oldFile}`);
	fs.writeFileSync(oldFile, "{}", 'utf-8');
  if(globalPageHandler) globalPageHandler.reload = true; 
}

/************ TESTING APIS ************************/

module.exports = PageHandler;
