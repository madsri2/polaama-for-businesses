'use strict';

const secretManager = require('secret-manager/app/manager');
const request = require('request');

function IntentManager(agent, accessToken) {
  if(!agent) throw new Error("Expected paramenter 'agent' missing");
  if(!accessToken) throw new Error("Expected parameter 'accessToken' missing");
  this.agentName = agent;
  this.headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": 'application/json; charset=utf-8'
  };
}

IntentManager.prototype.createIntent = function(intentName) {
  const uri = "https://api.dialogflow.com/v1/intents?v=20150910";
  const body = {
    name: intentName,
    userSays: [],
    responses: [{
      // action: this.intentList[intentName].action
    }]
  };
  return makeRequest.call(this, uri, "POST", body);
}

IntentManager.prototype.updateIntent = function(intentName, intentDetails) {
  const intentId = intentDetails.id;
  const uri = `https://api.dialogflow.com/v1/intents/${intentId}?v=20150910`;
  const body = {
    name: intentName,
    userSays: [],
    responses: [{
      action: intentDetails.action
    }]
  };
  const trainingSet = intentDetails.trainingSet;
  trainingSet.forEach(line => {
    body.userSays.push({
      count: 0,
      /*
      data: [{
        "text": line,
        "userDefined": true
      }]
      */
      data: line
    });
  });
  // console.log(JSON.stringify(body));
  return makeRequest.call(this, uri, "PUT", body);
}

IntentManager.prototype.getIntent = function(intentName, intentDetails) {
  const intentId = intentDetails.id;
  const uri = `https://api.dialogflow.com/v1/intents/${intentId}?v=20150910`;
  return makeRequest.call(this, uri, "GET");
}

function makeRequest(uri, method, body) {
  request({
    uri: uri,
    method: method,
    headers: this.headers,
    body: JSON.stringify(body)
  }, (error, response) => {
    if(error) console.log('error from dialogflow:', error);
    console.log('statusCode:', response && response.statusCode); 
    if(response.statusCode === 400) console.log(response.errorDetails);
    if(response.statusCode === 200) console.log('body:', response.body);
  });
}

module.exports = IntentManager;
