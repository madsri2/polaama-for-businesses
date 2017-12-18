'use strict';
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
const FBTemplateCreator = require(`${baseDir}/fb-template-creator`);
const FbidHandler = require('fbid-handler/app/handler');
const Manager = require('state-manager');
const Promise = require('promise');

function AdminMessageSender(adminIds, testing) {
  let fileName = "business-admin-handler.txt";
  if(testing) fileName = "testing-business-admin-handler.txt";
  this.stateManager = new Manager(fileName);
  this.adminIds = adminIds;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

AdminMessageSender.prototype.handleResponseFromAdmin = function(adminFbid, mesg, pageDetails) {
  const self = this;
  return this.stateManager.get(["awaitingResponseFromAdmin", adminFbid]).then(
    (response) => {
      // if we don't find a value it means that this text was not sent by admin in response to a question. In other words, this message is not meant to be handled here.
      if(!response) return Promise.resolve(null);
      const fbid = response.fbid;
      const question = response.question;
      const messageList = [];
      messageList.push(FBTemplateCreator.list({
        fbid: fbid,
        elements: [
          {
            title: pageDetails.title,
            image_url: pageDetails.image_url
          },
          {
            title: capitalizeFirstLetter(mesg),
            subtitle: `Original question: ${question}`,
            buttons: pageDetails.buttons
          }
        ]
      }));
      messageList.push(FBTemplateCreator.text({
        fbid: adminFbid,
        text: `Successfully sent your response to customer ${getName(fbid)}`
      }));
      self.messageList = messageList;
      return self.stateManager.clear(["messageSentToAdmin", fbid, question]);
    },
    (err) => {
      return Promise.reject(err);
  }).then(
    () => {
      return self.stateManager.clear(["awaitingResponseFromAdmin",adminFbid]);
    },
    (err) => {
      return Promise.reject(err);
  }).then(
    () => {
      const messageList = self.messageList;
      delete self.messageList;
      return Promise.resolve(messageList);
    },
    (err) => {
      return Promise.reject(err);
  });
}

function getName(fbid) {
  let name = FbidHandler.get().getName(fbid);
  if(!name) {
    logger.warn(`sendMessageToAdmin: Cannot get name for fbid ${fbid}. Using fbid to refer to customer when sending message to admin`);
    name = fbid;
  }
  return name;
}

AdminMessageSender.prototype.sendMessageToAdmin = function(fbid, mesg, categoryValue) {
  const messageList = [];
  let message = { recipient: { id: fbid } };
  let prefix = "";
  if(categoryValue) {
    if(categoryValue === "frustration") prefix = "Sorry that I was unable to help you. ";
    if(categoryValue !== "talk-to-human") prefix = "I did not understand the question, so "; 
  }
  message.message = {
    text: `${prefix}I have asked one of our crew members to help. We will get back to you asap`,
    metadata: "DEVELOPER_DEFINED_METADATA"
  };
  messageList.push(message);
  let messageToAdmin = {
    elements: [
      {
        title: "ACTION REQD",
        subtitle: `Question from customer ${getName(fbid)}`
      },
      {
        title: mesg,
        subtitle: "is the question"
      }
    ],
    buttons:[{
      title: "Respond",
      type: "postback",
      payload: `respond_to_customer_${fbid}-_${mesg}`
    }]
  };
  // send the message to all admins in the list.
  this.adminIds.forEach(adminId => {
    messageToAdmin.fbid = adminId;
    messageList.push(FBTemplateCreator.list(messageToAdmin));
  });
  /* 
    Keep state that you are awaiting a message for a particular user. As soon as message is received by user and they respond, if the state is set, then send this message to the original user and clear the state. 
  */
  const self = this;
  return this.stateManager.set(["messageSentToAdmin", fbid, mesg]).then(
    () => {
      const response = {
        message: messageList,
        category: (categoryValue) ? categoryValue : "input.unknown"
      };
      return Promise.resolve(response);
    },
    (err) => {
      return Promise.reject(err);
  });
}

AdminMessageSender.prototype.handleWaitingForAdminResponse = function(adminFbid, payload) {
  // only handle messages that are meant for us.
  if(!payload.startsWith("respond_to_customer")) return Promise.resolve(null);
  const contents = /respond_to_customer_(\d*)-_(.*)/.exec(payload);
  if(!contents || (contents.length != 3)) throw new Error(`payload is not in expected format respond_to_customer_<fbid>-_<original message>. Value is ${payload}`);
  const fbid = contents[1];
  const originalMessage = contents[2];
  const self = this;
  let resultDone = false;
  // first check that we have actually recorded the fact that we have sent a message to admin. Then, record the fact that we are going to ask the admin to respond and then ask the admin to respond.
  return this.stateManager.get(["messageSentToAdmin",fbid, originalMessage]).then(
    (value) => { // see if we recorded the fact that we sent message to admin. If not, throw error.
      if(!value) return Promise.reject(new Error(`expected sentMessageToAdmin for fbid ${fbid} to be true. But its not. Dump of sentMessageToAdmin: ${JSON.stringify(self.sentMessageToAdmin)}`));
      // if we are already waiting for admin to respond to any fbid and it's not the same admin passed in here, send a note to this admin indicating someone else will be responding. 
      return self.stateManager.keyStartingWith("awaitingResponseFromAdmin");
    },
    (err) => {
      return Promise.reject(err);
  }).then(
    (key) => {
      if(key && !key.includes(adminFbid)) {
        resultDone = true;
        const adminName = getName(self.stateManager.parseKey(key)[1]);
        return Promise.resolve(FBTemplateCreator.text({
          fbid: adminFbid, 
          text: `Another admin "${adminName}" is already responding to this customer`
        }));
      }
      // the key is not present or it's the same admin who has indicated again that they will be responding.
      return self.stateManager.set(["awaitingResponseFromAdmin", adminFbid], { 
        fbid: fbid, 
        question: originalMessage
      });
    },
    (err) => {
      return Promise.reject(err);
  }).then( // actually ask the admin to respond
    (value) => {
      if(value) return Promise.resolve(value);
      return Promise.resolve(FBTemplateCreator.text({
        fbid: adminFbid, 
        text: `Enter your response for customer ${fbid}. Question is \"${originalMessage}\"`
      }));
    },
    (err) => {
      return Promise.reject(err);
  });
}

AdminMessageSender.prototype.testing_clearState = function() {
  // clear the state file
  this.stateManager = new Manager("business-admin-handler", true);
}

module.exports = AdminMessageSender;
