'use strict';
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
const PageHandler = require('fbid-handler/app/page-handler');
const Handler = require('sea-spray-handler');

const dhuId = "1432849853450144";
const coreyId = "1536539953068228";

/* 
  A prototype of the actual SeaSpray business. This is used as a way to create a clone of the actual business' facebook page so a business owner can see features in action without the risk of impacting their customers.
  This class uses the actual business handler class for all business logic and only overrides a few properties.
*/
function SeaSprayPrototypeHandler(testing) {
  this.actualPageHandler = new Handler(testing);
  this.classifier = this.actualPageHandler.classifier;
  this.testing = testing;
  this.name = "Sea Spray Prototype";
  this.adminIds = [this.madhusPageScopedFbid()];
  this.businessPageId = PageHandler.mySeaSprayPageId;
}

SeaSprayPrototypeHandler.prototype.handleBusinessSpecificCategories = function(fbid, category, tourName) {
  return this.actualPageHandler.handleBusinessSpecificCategories(fbid, category, tourName);
}

SeaSprayPrototypeHandler.prototype.greeting = function(fbid) {
  return this.actualPageHandler.greeting(fbid);
}

SeaSprayPrototypeHandler.prototype.pageDetails = function() {
  return this.actualPageHandler.pageDetails();
}

SeaSprayPrototypeHandler.prototype.handleBusinessSpecificPayload = function(payload, fbid) {
  return this.actualPageHandler.handleBusinessSpecificPayload(payload, fbid);
}

// My page scoped fbid. Currently used in webhook-post-handler's notifyAdminOfNewMessage
SeaSprayPrototypeHandler.prototype.madhusPageScopedFbid = function() {
  return "1629856073725012";
}

module.exports = SeaSprayPrototypeHandler;
