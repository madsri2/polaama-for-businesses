'use strict';

const formidable = require('formidable');
const util = require('util');
const async = require('async');
const multiparty = require('multiparty');
const fs = require('fs');

const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const WebhookPostHandler = require(`${baseDir}/webhook-post-handler`);

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
      logger.debug(`Parsed form. The json object has ${Object.keys(msg).length} keys in field.mailinMsg`); 
      /* Write down the payload for ulterior inspection. */
      async.auto({
        writeParsedMessage: function (cbAuto) {
          emailId = msg.from[0].address;
          const fileName =  `${baseDir}/emails/message-${emailId}.json`;
          logger.debug(`writeParsedMessage: Writing message to file ${fileName}`);
          fs.writeFile(fileName, fields.mailinMsg, cbAuto);
        },
        writeAttachments: function (cbAuto) {
          async.eachLimit(msg.attachments, 3, function (attachment, cbEach) {
            const attachFile = `${baseDir}/emails/message-${emailId}-${attachment.generatedFileName}`;
            logger.debug(`writeAttachments: Writing attachment to file ${attachFile}`);
            fs.writeFile(attachFile, fields[attachment.generatedFileName], 'base64', cbEach);
          }, cbAuto);
        },
        writeText: function(cbAuto) {
          if(!msg.text) return cbAuto("Error: email message does not contain text key");
          const textFileName =  `${baseDir}/emails/text-${emailId}.json`;
          const text = msg.text.split("\\n").join("\n");
          logger.debug(`writeText: Writing text to file ${textFileName}`);
          fs.writeFile(textFileName, text, cbAuto);
        }
      }, function (err) {
        if (err) {
            logger.error(`parse: Error in getting mail payload: ${err.stack}`);
            res.sendStatus(500, 'Unable to write payload');
        } else {
            res.sendStatus(200);
            (new WebhookPostHandler()).sendEmailNotification(emailId);
            logger.debug('Webhook payload written and sent notification');
        }
      });
    });
    return emailId;
}

EmailParser.prototype.oldParse = function() {
  logger.debug(`email parse called`);
  const form = new formidable.IncomingForm(); 
  form.type = 'multipart';
  const self = this;
  form.on('progress', function(recvd, expected) {
    logger.debug(`progress: received ${recvd} bytes. expected ${expected} bytes`);
  });
  form.on('file', function(name, file) {
    logger.debug(`file: received name ${name} and file ${file}`);
  });
  form.on('error', function(err) {
    logger.debug(`error: received error ${err}`);
  });
  form.on('field', function(name, value) {
    logger.debug(`field: received name ${name} and value ${value}`);
  });
  form.on('aborted', function() {
    logger.debug(`aborted`);
  });
  form.on('end', function() {
    logger.debug(`entire request has been received`);
  });
  form.on('fileBegin', function(name, file) {
    logger.debug(`file: received name ${name} and file ${file}`);
  });
  form.parse(this.request, function(err, fields, files) {
    console.log(`form.parse called`);
    logger.debug(`parse: from mailin ${util.inspect(fields.mailInMsg, {depth: 5})}`);
    logger.debug(`Parsed fields: ${Object.keys(fields)}`);
    self.response.sendStatus(200);
  });
  this.response.sendStatus(200);
  return;
}

module.exports = EmailParser;
