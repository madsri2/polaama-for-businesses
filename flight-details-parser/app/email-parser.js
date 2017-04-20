'use strict';

const formidable = require('formidable');
const util = require('util');
const async = require('async');
const multiparty = require('multiparty');
const fs = require('fs');
const moment = require('moment');

const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const WebhookPostHandler = require(`${baseDir}/webhook-post-handler`);
EmailParser.dir = `${baseDir}/emails`;

function EmailParser(req, res) {
  this.request = req;
  this.response = res;
}

// Obtained async code & multiparty code from https://github.com/Flolagale/mailin/blob/master/samples/server.js
EmailParser.prototype.parse = function(req, res, callback) {
  /* Parse the multipart form. The attachments are parsed into fields and can
   * be huge, so set the maxFieldsSize accordingly. */
  const form = new multiparty.Form({
    maxFieldsSize: 2*1024*1024 // 2 MB
  });

  form.on('progress', function () {
      return function (recvd, expected) {
        logger.debug(`Progress: received ${recvd} bytes; expected ${expected} bytes`);
      };
  }());

  let emailId;
  form.parse(req, function (err, fields) {
    const msg = JSON.parse(fields.mailinMsg);
    if(spam(msg)) {
      logger.debug(`spammed by ${msg.from[0].address}. dropping message`);
      res.sendStatus(200);
      return null;
    }

    logger.debug(`Parsed email message has ${Object.keys(msg).length} keys in field.mailinMsg`); 
    /* Write down the payload for ulterior inspection. */
    async.auto({
      writeParsedMessage: function (cbAuto) {
        emailId = msg.from[0].address;
        const filename = getFileName(emailId, "message.json");
        logger.debug(`writeParsedMessage: Writing message to file ${filename}`);
        fs.writeFile(filename, fields.mailinMsg, cbAuto);
      },
      writeAttachments: function (cbAuto) {
        async.eachLimit(msg.attachments, 3, function (attachment, cbEach) {
          const attachFile = getFileName(emailId, `${attachment.generatedFileName}`);
          logger.debug(`writeAttachments: Writing attachment to file ${attachFile}`);
          fs.writeFile(attachFile, fields[attachment.generatedFileName], 'base64', cbEach);
        }, cbAuto);
      },
      writeText: function(cbAuto) {
        if(!msg.text) return cbAuto("Error: email message does not contain text key");
        const textFile = getFileName(emailId, "text.txt");
        const text = msg.text.split("\\n").join("\n");
        logger.debug(`writeText: Writing text to file ${textFile}`);
        fs.writeFile(textFile, text, cbAuto);
      }
    }, function (err) {
      if (err) {
          logger.error(`parse: Error in getting mail payload: ${err.stack}`);
          res.sendStatus(500, 'Unable to write payload');
      } else {
          res.sendStatus(200);
          // notify the admin that an email was sent so they can persist the itinerary and notify the customer
          (new WebhookPostHandler()).notifyAdmin(emailId);
          logger.debug('Webhook payload written and sent notification');
      }
    });
  });
  return emailId;
}

function spam(msg) {
  const blacklist = ["spameri@tiscali.it"];
  if(msg.spamScore && msg.spamScore > 5) {
    logger.debug("spam score greater than 5. Marking message as spam");
    return true;
  }
  const origin = msg.from[0].address;
  let emailBlacklisted = false;
  blacklist.forEach(email => {
    if(email === origin) {
      logger.debug(`${origin} email is blacklisted. Marking message as spam`);
      emailBlacklisted = true;
    }
  });
  return emailBlacklisted;
}

function getFileName(emailId, suffix) {
  let dir = EmailParser.dir;
  if(!fs.existsSync(dir)) fs.mkdirSync(dir);
  dir += `/${emailId}`;
  if(!fs.existsSync(dir)) fs.mkdirSync(dir);
  dir += `/${moment().format("YYYY-MM-DDTHH:mm")}`;
  if(!fs.existsSync(dir)) fs.mkdirSync(dir);
  if(suffix) return dir.concat(`/${suffix}`);
  return dir;
}

/****** Testing purposes *******/

EmailParser.testingGetFileName = getFileName; 
EmailParser.testingSpam = spam; 

/****** Testing purposes *******/

module.exports = EmailParser;
