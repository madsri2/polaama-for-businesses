'use strict';
const SecretManager = require('secret-manager/app/manager');
const Promise = require('promise');
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
const DialogFlow = require('apiai');

function DialogFlowProxy(clientToken) {
  if(clientToken) this.clientToken = clientToken;
  else this.clientToken = new SecretManager().getDialogflowClientToken();
}

/*
  This function creates a request. When request.on() is called, we need to 
*/
DialogFlowProxy.prototype.classify = function(message) {
  const app = DialogFlow(this.clientToken);
  const request = app.textRequest(message, {
    sessionId: "session-1234"
  });
  return new Promise(function(fulfil, reject) {
    /*
      reject("Testing failure of dialogflow");
      request.end();
      return;
    */
    request.on('response', function(response) {
      // logger.debug(JSON.stringify(response.result, null, 2));
      const result = {
        category: response.result.action
      };
      if(response.result.parameters && response.result.parameters.tourName) result.tourName = response.result.parameters.tourName;
      if(response.result.fulfillment && response.result.fulfillment.speech) result.defaultResponse = response.result.fulfillment.speech;
      // logger.debug(JSON.stringify(result));
      fulfil(result);
    });
    request.on('error', function(error) {
      logger.error(`error from dialogFlow: ${error}`);
      reject(error);
    });
    request.end();
  });
}

function test() {
  const app = DialogFlow(this.clientToken);
  const request = app.textRequest('maximum capacity for sunset cruise', {
    sessionId: "test-session"
  });
  request.on('response', function(response) {
    console.log(response);
  });
  request.on('error', function(error) {
    console.log(error);
  });
  request.end();
}

module.exports = DialogFlowProxy;
