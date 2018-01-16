'use strict';
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
const PageHandler = require('fbid-handler/app/page-handler');
const Handler = require('hackshaw-handler');

function HackshawPrototypeHandler(testing) {
  this.actualPageHandler = new Handler(testing);
  this.classifier = this.actualPageHandler.classifier;
  this.testing = testing;
  this.name = "Hackshaw boats Prototype";
  this.adminIds = [this.madhusPageScopedFbid()];
  this.businessPageId = PageHandler.myHackshawPageId;
}

HackshawPrototypeHandler.prototype.greeting = function(pageId, fbid) {
  return greeting(pageId, fbid);
}

HackshawPrototypeHandler.prototype.handleBusinessSpecificCategories = function(fbid, category, tourName) {
  return this.actualPageHandler.handleBusinessSpecificCategories(fbid, category, tourName);
}

HackshawPrototypeHandler.prototype.greeting = function(fbid) {
  return this.actualPageHandler.greeting(fbid);
}

HackshawPrototypeHandler.prototype.pageDetails = function() {
  return this.actualPageHandler.pageDetails();
}

HackshawPrototypeHandler.prototype.handleBusinessSpecificPayload = function(payload, fbid) {
  return this.actualPageHandler.handleBusinessSpecificPayload(payload, fbid);
}

HackshawPrototypeHandler.prototype.madhusPageScopedFbid = function() {
  return "1672189572825326";
}

module.exports = HackshawPrototypeHandler;
