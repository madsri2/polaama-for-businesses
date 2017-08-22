'use strict';

const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const PageHandler = require('fbid-handler/app/page-handler');
const FbidHandlerImpl = require('fbid-handler/app/handler-impl');

FbidHandler.get = function(file) {
  const pageHandler = PageHandler.get(file);
  return new FbidHandler(pageHandler.getFbidHandler(), pageHandler);
}

function FbidHandler(impl, pageHandler) {
  this.fbidHandlerImpl = impl;
  // logger.debug(`fbidHandler constructor: ${JSON.stringify(this.fbidHandlerImpl)}`);
  this.pageHandler = pageHandler;
}

FbidHandler.prototype.getId = function(name) {
  let id = this.fbidHandlerImpl.getId(name);
  if(id) return id;
  // HACK: See if the other fbid-handlers in page-handler have this!
  const handlers = this.pageHandler.fbidHandlers;
  const pages = Object.keys(handlers);
  for(let idx = 0; idx < pages.length; idx++) {
    if(pages[idx] === PageHandler.defaultPageId) continue;
    id = handlers[pages[idx]].getId(name);
    if(id) return id;
  }
  return null;
}

FbidHandler.prototype.fbid = function(name) {
  let fbid = this.fbidHandlerImpl.fbid(name);
  if(fbid) return fbid;
  // HACK: See if the other fbid-handlers in page-handler have this!
  const handlers = this.pageHandler.fbidHandlers;
  const pages = Object.keys(handlers);
  for(let idx = 0; idx < pages.length; idx++) {
    if(pages[idx] === PageHandler.defaultPageId) continue;
    fbid = handlers[pages[idx]].fbid(name);
    if(fbid) return fbid;
  }
  logger.warn(`fbid: cannot find id for name: <${name}> in any page. Maybe you forgot to add it?`);
  return null;
}

FbidHandler.prototype.getFriends = function(fbid) {
  return this.fbidHandlerImpl.getFriends(fbid);
}

FbidHandler.prototype.getName = function(fbid) {
  let name = this.fbidHandlerImpl.getName(fbid);
  if(name) return name;
  // HACK: See if the other fbid-handlers in page-handler have this!
  const handlers = this.pageHandler.fbidHandlers;
  const pages = Object.keys(handlers);
  for(let idx = 0; idx < pages.length; idx++) {
    if(pages[idx] === PageHandler.defaultPageId) continue;
    name = handlers[pages[idx]].getName(fbid);
    if(name) return name;
  }
  return null;
}

// given the id, return corresponding fbid
FbidHandler.prototype.decode = function(encodedId) {
  let fbid = this.fbidHandlerImpl.decode(encodedId);
  if(fbid) return fbid;
  // HACK: See if the other fbid-handlers in page-handler have this!
  const handlers = this.pageHandler.fbidHandlers;
  const pages = Object.keys(handlers);
  for(let idx = 0; idx < pages.length; idx++) {
    if(pages[idx] === PageHandler.defaultPageId) continue;
    fbid = handlers[pages[idx]].decode(encodedId);
    if(fbid) return fbid;
  }
  logger.warn(`decode: Could not find fbid for id ${encodedId} in any page.`);
  return null;
}

// given an fbid, return corresponding id
FbidHandler.prototype.encode = function(fbid) {
  let id = this.fbidHandlerImpl.encode(fbid);
  if(id) return id;
  // HACK: See if the other fbid-handlers in page-handler have this!
  const handlers = this.pageHandler.fbidHandlers;
  const pages = Object.keys(handlers);
  for(let idx = 0; idx < pages.length; idx++) {
    if(pages[idx] === PageHandler.defaultPageId) continue;
    id = handlers[pages[idx]].encode(fbid);
    if(id) return id;
  }
  return null;
}

/************ TESTING APIS ************************/
FbidHandler.prototype.testing_add = function(fbid, entry) {
  return this.pageHandler.testing_add(fbid, entry);
}

FbidHandler.prototype.testing_delete = function(fbid) {
  return this.pageHandler.testing_delete(fbid);
}

/************ TESTING APIS ************************/

module.exports = FbidHandler;
