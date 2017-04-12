'use strict';

const formidable = require('formidable');
const util = require('util');
const async = require('async');
const multiparty = require('multiparty');
const fs = require('fs');

const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);

function EmailParser(req, res) {
  this.request = req;
  this.response = res;
}

EmailParser.prototype.parse = function(req, res) {
    /* Parse the multipart form. The attachments are parsed into fields and can
     * be huge, so set the maxFieldsSize accordingly. */
    var form = new multiparty.Form({
      maxFieldsSize: 2*1024*1024 // 2 MB
    });

    form.on('progress', function () {
        return function (recvd, expected) {
          logger.debug(`Progress: received ${recvd} bytes; expected ${expected} bytes`);
        };
    }());

    form.parse(req, function (err, fields) {
      logger.debug(`parse: from mailin: ${fields.mailinMsg.text}`);
      logger.debug(`Parsed fields: ${Object.keys(fields)}`);

        /* Write down the payload for ulterior inspection. */
        async.auto({
            writeParsedMessage: function (cbAuto) {
                fs.writeFile('/tmp/payload.json', fields.mailinMsg, cbAuto);
            },
            writeAttachments: function (cbAuto) {
                var msg = JSON.parse(fields.mailinMsg);
                async.eachLimit(msg.attachments, 3, function (attachment, cbEach) {
                    fs.writeFile(attachment.generatedFileName, fields[attachment.generatedFileName], 'base64', cbEach);
                }, cbAuto);
            }
        }, function (err) {
            if (err) {
                logger.error(`parse: Error in getting mail payload: ${err.stack}`);
                res.send(500, 'Unable to write payload');
            } else {
                logger.debug('Webhook payload written.');
                res.sendStatus(200);
            }
        });
    });
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
