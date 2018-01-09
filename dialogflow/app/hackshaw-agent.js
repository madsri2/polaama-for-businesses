'use strict';

const SecretManager = require('secret-manager/app/manager');
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
const DialogFlowProxy = require('dialogflow');

function HackshawAgent() {
  this.proxy = new DialogFlowProxy(new SecretManager().getHackshawDialogflowClientToken());
}

HackshawAgent.prototype.classify = function(message) {
  return this.proxy.classify(message);
}

module.exports = HackshawAgent;
