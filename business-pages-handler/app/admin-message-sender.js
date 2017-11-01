'use strict';
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
const FBTemplateCreator = require(`${baseDir}/fb-template-creator`);
const FbidHandler = require('fbid-handler/app/handler');

function AdminMessageSender(adminId) {
  this.sentMessageToAdmin = {};
  this.awaitingResponseFromAdmin = {};
  this.questions = {};
  this.adminId = adminId;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

AdminMessageSender.prototype.handleResponseFromAdmin = function(adminFbid, mesg, pageDetails) {
  const keys = Object.keys(this.awaitingResponseFromAdmin);
  if(keys.length === 0) return null;
  // if(keys.length > 1) throw new Error("More than 1 customer waiting for response. This is currently unhandled");
  // Just respond to the first customer if we have more than 1 customer waiting. TODO: Fix me!
  const fbid = keys[0];
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
        subtitle: `Original question: ${this.questions[fbid]}`,
        buttons: pageDetails.buttons
      }
    ]
  }));
  messageList.push(FBTemplateCreator.text({
    fbid: adminFbid,
    text: `Successfully sent your response to customer ${getName(fbid)}`
  }));
  this.sentMessageToAdmin[fbid] = false;
  delete this.awaitingResponseFromAdmin[fbid];
  this.questions[fbid] = null;
  return messageList;
}

function getName(fbid) {
  let name = FbidHandler.get().getName(fbid);
  if(!name) {
    logger.warn(`sendMessageToAdmin: Cannot get name for fbid ${fbid}. Using fbid to refer to customer when sending message to admin`);
    name = fbid;
  }
  return name;
}

AdminMessageSender.prototype.sendMessageToAdmin = function(fbid, mesg) {
  const messageList = [];
  let message = { recipient: { id: fbid } };
  message.message = {
    text: "I did not understand the question, so I have asked one of our crew members to help me with this question. We will get back to you asap",
    metadata: "DEVELOPER_DEFINED_METADATA"
  };
  messageList.push(message);
  messageList.push(FBTemplateCreator.list({
    fbid: this.adminId,
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
      payload: `respond_to_customer_${fbid}`
    }]
  }));
  this.sentMessageToAdmin[fbid] = true;
  this.questions[fbid] = mesg;
  /* 
    Keep state that you are awaiting a message for a particular user. As soon as message is received by user and they respond, if the state is set, then send this message to the original user and clear the state. 
  */
  return messageList;
}

AdminMessageSender.prototype.handleWaitingForAdminResponse = function(adminFbid, payload) {
  // only handle messages that are meant for us.
  if(!payload.startsWith("respond_to_customer")) return null;
  const contents = /respond_to_customer_(\d*)/.exec(payload);
  if(!contents || (contents.length != 2)) throw new Error(`payload is not in expected format respond_to_customer_<fbid>. Value is ${payload}`);
  const fbid = contents[1];
  if(!this.sentMessageToAdmin[fbid]) throw new Error(`expected sentMessageToAdmin for fbid ${fbid} to be true. But its not. Dump of sentMessageToAdmin: ${JSON.stringify(this.sentMessageToAdmin)}`);
  // Ask admin to send response
  if(!this.awaitingResponseFromAdmin[fbid]) {
    this.awaitingResponseFromAdmin[fbid] = true; 
    return FBTemplateCreator.text({
      fbid: adminFbid, 
      text: `Enter your response for customer ${fbid}`
    });
  }
}


module.exports = AdminMessageSender;
