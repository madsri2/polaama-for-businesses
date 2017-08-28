'use strict';
const levenshtein = require('fast-levenshtein');
const fs = require('fs');
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const Encoder = require(`${baseDir}/encoder`);
const TripData = require(`${baseDir}/trip-data`);

function EventKeywordHandler(fbid) {
  this.fbid = fbid;
}

function getElementsMatchingKeywords(allKeywords, json, keyword) {
  const elements = [];
  Object.keys(allKeywords).forEach(key => {
    const keywords = allKeywords[key];
    Object.keys(keywords).forEach(k => {
      const encodedK = Encoder.encode(k);
      const encodedKeyword = Encoder.encode(keyword);
      const idx = keywords[k];
      // logger.debug(`handleKeywords: comparing ${encodedK} with ${encodedKeyword}`);
      if(encodedK === encodedKeyword && json[key][idx]) elements.push(json[key][idx]);
      else {
        const dist = levenshtein.get(encodedK, encodedKeyword);
        // assume that 3 letters can be missing or off from a word. 
        if(dist < 2 && json[key][idx]) elements.push(json[key][idx]);
      }
    });
  });
  return elements;
}

EventKeywordHandler.prototype.handleKeywords = function(eventName, keyword) {
  const eventDir = `${TripData.eventBaseDir}/${eventName}`;
  if(!fs.existsSync(eventDir)) {
    logger.warn(`handleKeywords: eventDir ${eventDir} does not exist`);
    return null;
  }
  const files = fs.readdirSync(eventDir);
  // logger.debug(`handleKeywords: files to look are ${files}`);
  let elements = [];
  files.forEach(f => {
    const file = `${eventDir}/${f}`;
    if(file === "." || file === ".." || file.includes(".swp")) return;
    // logger.debug(`EventKeywordHandler: Handling file ${file}`);
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    let allKeywords = json.keywords;
    if(!allKeywords) {
      // see if there exists a key of the form "Mon DD". If there is, see if that has a keywords and use that. 
      Object.keys(json).forEach(jsonKey => {
        // expect to match "Oct 11", "sep 1" etc.
        const contents = /^[A-Za-z]{3} \d+$/.exec(jsonKey);
        if(!contents) return;
        // see if {"oct 11": {"firstSet": {"keywords": {}}}} matches
        allKeywords = json[jsonKey].keywords;
        if(!allKeywords) return;
        // logger.debug(`jsonKey: keywords is ${JSON.stringify(allKeywords)}`);
        const el = getElementsMatchingKeywords.call(this, allKeywords, json[jsonKey], keyword);
        if(el.length > 0) elements = elements.concat(el);
      });
      // either way, we are done with this file.
      return;
    }
    // logger.debug(`handleKeywords: keywords is ${JSON.stringify(allKeywords)}`);
    const el = getElementsMatchingKeywords.call(this, allKeywords, json, keyword);
    if(el.length > 0) elements = elements.concat(el);
    // logger.debug(`handleKeywords: elements is <${JSON.stringify(elements)}>`);
  });
  if(elements.length === 0) return null;
  let message = {
    recipient: {
      id: this.fbid
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "list",
          elements: elements
        }
      }
    }
  };
  if(elements.length === 1) {
    message.message.attachment.payload.template_type = "generic";
    message.message.attachment.payload.image_aspect_ratio = "square";
    return message;
  }
  // automatically make first item compact if image_url is not present.
  if(!elements[0].image_url) message.message.attachment.payload.top_element_style = "compact";
  return message;
}

module.exports = EventKeywordHandler;
