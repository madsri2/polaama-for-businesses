'use strict';

const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
const DialogFlowProxy = require('dialogflow');

// A Dialogflow classifier!
function DFClassifier() {
  this.dialogFlow = new DialogFlowProxy();
}

DFClassifier.prototype.classify = function(description) {
  return this.dialogFlow.classify(description);
}

module.exports = DFClassifier;
