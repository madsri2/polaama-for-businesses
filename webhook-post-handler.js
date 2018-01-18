'use strict';

const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
const Sessions = require('./sessions');
const Session = require('./session');
const FbidHandler = require('fbid-handler/app/handler');
const PageHandler = require('fbid-handler/app/page-handler');
const SecretManager = require('secret-manager/app/manager');
const watch = require('watch');
const fs = require('fs-extra');
const RequestProfiler = require('./request-profiler');

const _ = require('lodash');
const request = require('request');
const moment = require('moment-timezone');
const formidable = require('formidable');
const Promise = require('promise');
const validator = require('node-validator');
const Encoder = require(`${baseDir}/encoder`);
const BaseHandler = require('business-pages-handler/app/base-handler');
const TravelSfoPageHandler = require('travel-sfo-handler');
const SeaSprayHandler = require('sea-spray-handler');
const SeaSprayPrototypeHandler = require('sea-spray-handler/app/prototype-handler');
const HackshawHandler = require('hackshaw-handler');
const HackshawPrototypeHandler = require('hackshaw-handler/app/prototype-handler');

let recordMessage = true;
let previousMessage = {};
let pageAccessToken;

let TEST_MODE = false;
// NOTE: WebhookPostHandler is a singleton, so all state will need to be maintained in this.session object. fbidHandler is also a singleton, so that will be part of the WebhookPostHandler object.
function WebhookPostHandler(session, testing, pageId) {
  if(testing) TEST_MODE = true; // Use sparingly. Currently, only used in callSendAPI
  this.travelSfoPageHandler = new TravelSfoPageHandler();
  this.seaSprayHandler = new BaseHandler(new SeaSprayHandler(TEST_MODE));
  this.seaSprayPrototypeHandler = new BaseHandler(new SeaSprayPrototypeHandler(TEST_MODE));
  this.hackshawHandler = new BaseHandler(new HackshawHandler(TEST_MODE));
  this.hackshawPrototypeHandler = new BaseHandler(new HackshawPrototypeHandler(TEST_MODE));
  this.newCustomerForSeaSpray = {};
	this.pageId = PageHandler.defaultPageId;
  if(pageId) {
    this.pageId = pageId;
    if(testing) setBusinessPageHandler.call(this);
  }
  this.secretManager = new SecretManager();
  this.sessions = Sessions.get();
  if(testing) this.pageHandler = PageHandler.get("fbid-test.txt");
	else this.pageHandler = PageHandler.get();
  this.fbidHandler = this.pageHandler.getFbidHandler();
  if(session) {
    logger.info(`WebhookPostHandler: A session with id ${session.sessionId} was passed. Using that in the post hook handler`);
    this.passedSession = session;
    this.session = session;
    logger.info(`WebhookPostHandler: Setting session state`);
    this.sessionState = this.sessions.testing_getState(session);
  }
  this.logOnce = {};
  // Creating this here because the constructor reads a huge file. Creating this here would mean we can simply pass this around, instead of creating it every single time.
  this.airportCodes = new AirportCodes();
  const self = this;
	// A Cheap way to trigger data update on changes across processes: Create a monitor that will trigger when files in ~/sessions changes, and reload the session that changed. This way, we don't have to reload sessions all over the place and this will work even across processes (for eg. when we create a new trip as a result of an itinerary or boarding pass email, the main webserver's sessions will automatically be reloaded within a few minutes)
  watch.createMonitor(Sessions.path(), { ignoreDotFiles: true }, function(monitor) {
    monitor.on('changed', function(f) {
      logger.debug(`file ${f} changed. reloading it.`);
      const s = JSON.parse(fs.readFileSync(f, 'utf8'));
      self.sessions.reloadSession(s.sessionId);
    });
  });
}

// called to handle every message from the customer.
// TODO: there is already a this.pageId. Use that and remove the second parameter 'pageId' here.
function handleMessagingEvent(messagingEvent, pageId) {
  if(!this.businessPageHandler) {
    logger.error(`handleMessagingEvent: Error. Unable to get business page handler for pageId '${this.pageId}'`);
    return sendTextMessage.call(this, pageEntry.messaging[i].sender.id, "We are working on something awesome! Check back in a few weeks.");
  }
  const fbid = messagingEvent.sender.id;
  // find or create the session here so it can be used elsewhere. Only do this if a session was NOT passed in the constructor.
  if(_.isUndefined(this.passedSession)) this.session = this.sessions.findOrCreate(fbid);
  else this.session = this.passedSession;
  this.sessionState = this.sessions.getSessionState(this.session.sessionId);
  if(!this.sessionState) {
    logger.error(`cannot find session state for sessionId ${this.session.sessionId}. Cannot proceed without it. session dump: ${JSON.stringify(this.session)}`);
    return sendTextMessage.call(this, fbid,"We will be back shortly.");
  }
  if(!this.logOnce[this.session.sessionId]) {
    logger.debug(`handleMessagingEvent: First message from user ${this.session.fbid} with session ${this.session.sessionId} since this process started.`);
    this.logOnce[this.session.sessionId] = true;
  }
  const self = this;
  const promise = this.pageHandler.add(fbid, pageId);
  return promise.then(
    function(status) {
      if(status) {
				self.fbidHandler = self.pageHandler.getFbidHandler(pageId);
        // logger.debug(`handleMessagingEvent: added new fbid ${fbid} to page ${pageId}`);
        try {
          if (messagingEvent.optin) {
            receivedAuthentication(messagingEvent);
          } else if (messagingEvent.message) {
            receivedMessage.call(self, messagingEvent);
          } else if (messagingEvent.delivery) {
            // console.log("Message delivered");
            // receivedDeliveryConfirmation(messagingEvent);
          } else if (messagingEvent.postback) {
            receivedPostback.call(self, messagingEvent);
          } else {
            logger.error("Webhook received unknown messagingEvent: ", messagingEvent);
            sendTextMessage.call(self, fbid,"We will be back shortly.");
          }
        }
        catch(err) {
          logger.error("an exception was thrown: " + err.stack);
          sendTextMessage.call(self, fbid,"We will be back shortly.");
        }
      }
      else {
        logger.warn(`handleMessagingEvent: adding new fbid ${fbid} to fbidHandler. Expected status to be true but it was ${status}`);
        sendTextMessage.call(self, fbid,"We will be back shortly.");
      }
      return Promise.resolve(true);
    },
    function(err) {
      logger.error(`handleMessagingEvent: error adding fbid ${fbid} to fbidHandler: ${err.stack}`);
      sendTextMessage.call(self, fbid,"We will be back shortly.");
      return Promise.resolve(false);
    }
  );
}

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to 
 * Messenger" plugin, it is the 'data-ref' field. Read more at 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication(event) {
  const senderID = event.sender.id;
  const recipientID = event.recipient.id;
  const timeOfAuth = event.timestamp;

  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the 
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger' 
  // plugin.
  const passThroughParam = event.optin.data-ref;

  logger.info("Received authentication for user %d, page %d, session %d at timestamp: %d. Pass-through param: %s", senderID, recipientID, this.session.fbid, timeOfMessage, passThroughParam);

  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  sendTextMessage.call(this, senderID, "Authentication successful");
}

function setBusinessPageHandler() {
  switch(this.pageId) {
     case this.seaSprayPrototypeHandler.businessHandler.businessPageId:
      this.businessPageHandler = this.seaSprayPrototypeHandler;
      break;
     case this.seaSprayHandler.businessHandler.businessPageId:
       this.businessPageHandler = this.seaSprayHandler;
       break;
     case this.hackshawPrototypeHandler.businessHandler.businessPageId:
       this.businessPageHandler = this.hackshawPrototypeHandler;
       break;
     case this.hackshawHandler.businessHandler.businessPageId:
       this.businessPageHandler = this.hackshawHandler;
       break;
   }
}

function handlePageEntry(pageEntry) {
		this.pageId = pageEntry.id;
    setBusinessPageHandler.call(this);
    pageAccessToken = this.pageHandler.getPageAccessToken(this.pageId);
    const timeOfEvent = pageEntry.time;
    for (let i = 0, len = pageEntry.messaging.length; i < len; i++) {
      handleMessagingEvent.call(this, pageEntry.messaging[i], pageEntry.id);
    }
}

WebhookPostHandler.prototype.handle = function(req, res) {
  const data = req.body;
  
  // Make sure this is a page subscription
  if(data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    for(let i = 0, len = data.entry.length; i < len; i++) {
      handlePageEntry.call(this, data.entry[i]);
    }
  }
  // Assume all went well.
  //
  // You must send back a 200, within 20 seconds, to let facebook know you've 
  // successfully received the callback. Otherwise, the request will time out.
  res.sendStatus(200);
}

function greetingForAnotherPage(fbid) {
  const response = this.businessPageHandler.greeting(this.pageId, fbid);
  if(!response) return false;
  if(Array.isArray(response)) this.sendMultipleMessages(fbid, response);
  else callSendAPI.call(this, response);
  return true;
}

function handleGettingStarted(senderID) {
  if(greetingForAnotherPage.call(this, senderID)) return;
  return sendWelcomeMessage.call(this, senderID); 
}

function postbackForAnotherPage(payload, fbid) {
  return this.businessPageHandler.handlePostback(payload, this.pageId, fbid);
}

function receivedPostback(event) {
  const senderID = event.sender.id;
  const recipientID = event.recipient.id;
  const timeOfPostback = event.timestamp;
  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  let payload = event.postback.payload;

  logger.info("Received postback for user %d, page %d, session %d at timestamp: %d. Payload: %s", senderID, recipientID, this.session.fbid, timeOfPostback, payload);

  if(payload === "GET_STARTED_PAYLOAD") return handleGettingStarted.call(this, senderID);

  // if(postbackForAnotherPage.call(this, payload, senderID)) return;
  const self = this;
  const promise = postbackForAnotherPage.call(this, payload, senderID);
  if(promise) {
    if(typeof promise === "object") {
      promise.done(
        function(response) {
          if(Array.isArray(response)) self.sendMultipleMessages(senderID, response);
          else callSendAPI.call(self, response);
        },
        function(err) {
          sendTextMessage.call(self, senderID, "Even bots need to eat. Be back in a bit!");
        }
      );
    }
    return;
  }
  else return sendTextMessage.call(self, senderID, "Busy at work. We will be back soon with an awesome chatbot for you! Prepare to be amazed!");
}

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message' 
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some 
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've 
 * created. If we receive a message with an attachment (image, video, audio), 
 * then we'll simply confirm that we've received the attachment.
 * 
 */
function receivedMessage(event) {
  const senderID = event.sender.id;
  const recipientID = event.recipient.id;
  const timeOfMessage = event.timestamp;
  const message = event.message;

  if(message.is_echo) {
    // for now simply log a message and return 200;
    // logger.info("Echo message received. Doing nothing at this point");
    return;
  }

  // logger.info("receivedMessage: Received event for user %d, page %d, session %d at timestamp: %d, guid: %s Event: ", senderID, recipientID, this.session.fbid, timeOfMessage, this.session.guid, JSON.stringify(event));

  const messageText = message.text;
  const messageAttachments = message.attachments;
  if (messageText) {
      // If we receive a text message, check to see if it matches any special
      // keywords and send back the corresponding example. Otherwise, just echo
      // the text we received.
      switch (messageText) {
        case 'generic':
          sendGenericMessage(senderID);
          break;
        default:
          determineResponseType.call(this, event);
      }
    } else if (messageAttachments) {
      const response = this.travelSfoPageHandler.handleSendingAttractionsNearMe(message, this.pageId, senderID);
      if(response) return callSendAPI.call(this, response);
      const stickerId = message.sticker_id;
      if(stickerId && stickerId === 369239263222822) {
        const handleMesg = this.travelSfoPageHandler.handleLikeButton(this.pageId, senderID);
        if(handleMesg) {
          if(Array.isArray(handleMesg)) {
            callSendAPI.call(this, handleMesg[0]);
            const self = this;
            setTimeout(function() {
              callSendAPI.call(self, handleMesg[1]);
            }, 2000);
            return;
          }
          return callSendAPI.call(this, handleMesg);
        }
        return sendTextMessage.call(this, senderID, "Glad you like us!");
      }
      // sendTextMessage.call(this, senderID, "Message with attachment received");
      return sendTextMessage.call(this, senderID, "Thanks!");
    }
}

WebhookPostHandler.prototype.urlPrefix = function() {
  const encodedId = this.fbidHandler.encode(this.session.fbid);
  return `https://polaama.com/${encodedId}`;
}

WebhookPostHandler.prototype.createUrl = function(urlPath) {
  return `${this.urlPrefix()}/${urlPath}`;
}

function sendUrl(urlPath) {
  return this.createUrl(urlPath);
}
WebhookPostHandler.prototype.sendUrl = sendUrl;

/*
  Handle message for another page like "My Sea Spray Cruise"
*/
function determineResponseType(event) {
  const senderID = this.session.fbid;
  const messageText = event.message.text;
  const mesg = messageText.toLowerCase();

  const self = this;
  const mesgPromise = messageForAnotherPage.call(this, mesg, senderID, event);
  if(mesgPromise) {
    if(typeof mesgPromise === "object") {
        mesgPromise.done(
          function(result) {
            const response = result.message;
            // logger.debug(`response: ${JSON.stringify(response)}`);
            if(Array.isArray(response)) self.sendMultipleMessages(senderID, response);
            else callSendAPI.call(self, response);
            // if this is the first message from this sender, send a note to "me"
            notifyAdminOfNewMessage.call(self, mesg, senderID);
          },
          function(err) {
            // sendTextMessage.call(self, senderID, "Even bots need to eat. Be back in a bit!");
            logger.error(`Error sending a response for message '${mesg}' from fbid ${senderID}: ${err}`);
            sendTextMessage.call(self, senderID, "We will get back to you shortly.");
          }
        );
    }
    // if messageForAnotherPage returned something, it indicates that we are done. So simply return.
    return;
  }
  else return sendTextMessage.call(self, senderID, "Busy at work. We will be back soon with an awesome chatbot for you! Prepare to be amazed!");
}

function messageForAnotherPage(message, fbid, event) {
  return this.businessPageHandler.handleText(message, this.pageId, fbid);
}

function notifyAdminOfNewMessage(mesg, senderId) {
  if(this.newCustomerForSeaSpray[senderId]) return;
  this.newCustomerForSeaSpray[senderId] = true;
  let name = FbidHandler.get().getName(senderId);
  if(!name) name = senderId;
  let recipientId = this.businessPageHandler.businessHandler.madhusPageScopedFbid();
  if(!recipientId) return logger.error(`Cannot get madhus page scoped fbid for business page '${this.pageId}' (name: <{this.businessPageHandler.businessHandler.name}>). Not notifying Madhu of new message '${mesg}' from sender '${name}'`);
  sendTextMessage.call(this, recipientId, `[ALERT] Received new message from user '${name}'. Message is "${mesg}"`);
}

WebhookPostHandler.prototype.notifyAdmin = function(emailId) {
  const fbid = Session.adminId;
  logger.debug(`notifyAdmin: fbid is ${fbid}, email is ${emailId}`);
  return sendTextMessage.call(this, fbid, `[ACTION REQD]: You got email from ${emailId}`);
}

WebhookPostHandler.prototype.notifyUser = function(message) {
	sendTextMessage.call(this, this.session.fbid, message);
}

function sendWelcomeMessage(senderID) {
	// logger.debug(`fbid handler: ${JSON.stringify(this.fbidHandler)}`);
  let name = this.fbidHandler.getName(senderID);
  if(!name) name = ""; else name = ` ${name.substring(0, name.indexOf(" "))}`;
  return getHelpMessageData.call(this, senderID, `Hi${name}! Welcome to Polaama, an end-to-end customer engagement solution for the Tours & Activities Industry. We are working on an awesome chatbot product for customers. Stay tuned!`);
}

function sendTypingAction() {
  // logger.info(`sendTypingAction: session id is ${this.session.sessionId}`);
  const messageData = {
    recipient: {
      id: this.session.fbid
    },
    sender_action:"typing_on"
  };

  callSendAPI.call(this, messageData);
}

function getTextMessageData(senderID, text) {
  return {
    recipient: {
      id: senderID
    },
    message: {
      text: text,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };
}

WebhookPostHandler.prototype.getTextMessageData = getTextMessageData;

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(senderID, messageText) {
  callSendAPI.call(this, getTextMessageData(senderID, messageText));
}
WebhookPostHandler.prototype.sendTextMessage = sendTextMessage;

WebhookPostHandler.prototype.sendAnyMessage = function(message) {
  callSendAPI.call(this, message);
}

WebhookPostHandler.prototype.sendMessage = function(senderID, messageText) {
  sendTextMessage.call(this, senderID, messageText);
  logger.debug(`sendMessage: sent message ${messageText}`);
}

function textMessages(messages) {
  const fbMessages = [];
  messages.forEach(msg => {
    fbMessages.push(getTextMessageData(this.session.fbid, msg));
  });
  return fbMessages;
}

WebhookPostHandler.prototype.textMessages = textMessages;
WebhookPostHandler.prototype.sendMultipleMessages = sendMultipleMessages;

// send messages strictly one after another
function sendMultipleMessages(recipientId, messages, alreadyRecorded) {
  if(recordMessage && !alreadyRecorded) previousMessage = {
    "func": "sendMultipleMessages",
    "message": messages
  };
  // as a precaution, don't send more than 3 messages at once.
  if(messages.length > 3) {
    logger.warn(`sendMultipleMessages: The current implementation does not allow sending more than 3 messages in sequence. Not sending any message`);
    return;
  }
  if(messages.length === 0) return;
  if(TEST_MODE) {
    messages.forEach(message => {
      logger.debug(`MESSAGE TO CHAT: ${JSON.stringify(message)}`);
    });
    return;
  }
	const self = this;
	if(!pageAccessToken) pageAccessToken = this.pageHandler.getPageAccessToken(this.pageId);
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: pageAccessToken },
    method: 'POST',
    json: messages[0]
  }, function (error, response, body) {
    if (response.statusCode == 200) {
      // recursively call, but remove the first element from the array
      sendMultipleMessages.call(self, recipientId, messages.slice(1, messages.length), true /* alreadyRecorded */);
      return;
    }
    if(error) {
      logger.error(`sendMultipleMessages: Error sending message: ${error}`);
      return;
    }
    logger.error(`Unable to send message <${JSON.stringify(messages[0])}>. status code is ${response.statusCode}. Message from FB is <${response.body.error.message}>; Error type: ${response.body.error.type}. stack trace: ${new Error().stack}`);
  });  
}

function callSendAPI(messageData) {
  if(recordMessage) previousMessage = {
    "func": "callSendAPI",
    "message": messageData
  };
  if(TEST_MODE) return logger.debug(`MESSAGE TO CHAT: ${JSON.stringify(messageData)}`);
	if(!pageAccessToken) pageAccessToken = this.pageHandler.getPageAccessToken(this.pageId);
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: pageAccessToken },
    method: 'POST',
    json: messageData
  }, function (error, response, body) {
    if(error) return logger.error(`callSendAPI: Unable to send message ${JSON.stringify(messageData)}: ${error}`);
     // TODO: If there was an error in sending an intercept message to a human, then send a push notification to the original sender that we are having some technical difficulty and will respond to them shortly.
    if(response.statusCode != 200) {
      logger.error(`Unable to send message ${JSON.stringify(messageData)}. status code is ${response.statusCode}.`);
      if(response.body && response.body.error) logger.error(`Continuation of above message: Message from FB is <${response.body.error.message}>; Error type: ${response.body.error.type}`);
      else if(response.body) logger.error(`Continuation of above message: response.body.error is undefined. response.body dump: ${JSON.stringify(response.body)}`);
      else logger.error(`Continuation of above message: response.body is undefined. response dump: ${JSON.stringify(response)}`);
      logger.error(`stack trace: ${new Error().stack}`);
    }
  });  
}

// ********************************* TESTING *************************************
WebhookPostHandler.prototype.testing_determineResponseType = determineResponseType;
WebhookPostHandler.prototype.testing_handleMessagingEvent = handleMessagingEvent;
WebhookPostHandler.prototype.testing_createNewTrip = createNewTrip;
WebhookPostHandler.prototype.testing_displayTripDetails = displayTripDetails;
WebhookPostHandler.prototype.testing_receivedPostback = receivedPostback;

WebhookPostHandler.prototype.testing_setState = function(sessionState) {
  if(!this.session) throw new Error(`testing_setState: session not defined in handler`);
  if(!sessionState) throw new Error(`testing_setState: required parameter sessionState not present`);
  this.sessions.testing_setState(this.session.sessionId, sessionState);
}

// ********************************* TESTING *************************************

module.exports = WebhookPostHandler;
