'use strict';
const levenshtein = require('fast-levenshtein');
const fs = require('fs');
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const Encoder = require(`${baseDir}/encoder`);

function EventKeywordHandler(fbid) {
  this.fbid = fbid;
}

EventKeywordHandler.prototype.handleKeywords = function(eventName, keyword) {
  const eventDir = `${baseDir}/trips/shared/${eventName}`;
  if(!fs.existsSync(eventDir)) {
    logger.warn(`handleKeywords: eventDir ${eventDir} does not exist`);
    return null;
  }
  const files = fs.readdirSync(eventDir);
  // logger.debug(`handleKeywords: files are ${files}`);
  let elements = [];
  files.forEach(f => {
    const file = `${eventDir}/${f}`;
    if(file === "." || file === ".." || file.includes(".swp")) return;
    // logger.debug(`EventKeywordHandler: Handling file ${file}`);
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    if(!json.keywords) return;
    // logger.debug(`handleKeywords: keywords is ${JSON.stringify(json.keywords)}`);
    Object.keys(json.keywords).forEach(key => {
      const keywords = json.keywords[key];
      Object.keys(keywords).forEach(k => {
        const encodedK = Encoder.encode(k);
        const encodedKeyword = Encoder.encode(keyword);
        const idx = keywords[k];
        // logger.debug(`handleKeywords: comparing ${encodedK} with ${encodedKeyword}`);
        if(encodedK === encodedKeyword) elements.push(json[key][idx]);
        else {
          const dist = levenshtein.get(encodedK, encodedKeyword);
          // assume that 3 letters can be missing or off from a word. 
          if(dist < 3) elements.push(json[key][idx]);
        }
      });
    });
  });
  // logger.debug(`handleKeywords: elements is <${elements}>`);
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
  }
  return message;
}

module.exports = EventKeywordHandler;
