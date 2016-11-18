'use strict';
const _ = require('lodash');
const request = require('request');
const Log = require('./logger');
const logger = (new Log()).init();
const TripData = require('./trip-data');
const tripData = new TripData();
const Session = require('./session');
const session = new Session();
const sessions = session.getSessions();

// TODO: This needs to be obtained from the user session. When a session gets created, the trip-name needs to be passed along with it and the session-id will have the trip name embedded with it.
const tripNameInContext = tripData.encode("Big Island");

function WebhookPostHandler() {}

WebhookPostHandler.prototype.handle = function(req, res) {
  logger.info("In postHandlerWebhook");
  const data = req.body;
  
  // Make sure this is a page subscription
  if(data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      const pageID = pageEntry.id;
      const timeOfEvent = pageEntry.time;
      pageEntry.messaging.forEach(function(messagingEvent) {
        try {
          if (messagingEvent.optin) {
            console.log("optin message");
            // receivedAuthentication(messagingEvent);
          } else if (messagingEvent.message) {
            logger.info("Received Messaging event");
            receivedMessage(messagingEvent);
          } else if (messagingEvent.delivery) {
            console.log("Message delivered");
            // receivedDeliveryConfirmation(messagingEvent);
          } else if (messagingEvent.postback) {
            console.log("Deliver postback"); 
            receivedPostback(messagingEvent);
          } else {
            logger.info("Webhook received unknown messagingEvent: ", messagingEvent);
          }
        }
        catch(err) {
          logger.error("an exception was thrown: " + err.stack);
          sendTextMessage(messagingEvent.sender.id,"Even bots need to eat! Be back in a bit..");
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've 
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
}

function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  var payload = event.postback.payload;

  logger.info("Received postback for user %d and page %d with payload '%s' " + 
    "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to 
  // let them know it was successful
  sendTextMessage(senderID, "Postback called");
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

  logger.info("Received event for user %d and page %d at %d. Event: ", 
    senderID, recipientID, timeOfMessage, JSON.stringify(event));

  if(message.is_echo) {
    // for now simply log a message and return 200;
    logger.info("Echo message received. Doing nothing at this point");
    return;
  }

  const messageText = message.text;
  const messageAttachments = message.attachments;
  // find or create the session here so it can be used elsewhere.
  // TODO: The hardcoded trip name needs to be obtained a different way. Possibly by asking the user and or inferring it somehow.
  session.findOrCreate(senderID,["Big Island"]);
  if (messageText) {
      // If we receive a text message, check to see if it matches any special
      // keywords and send back the corresponding example. Otherwise, just echo
      // the text we received.
      switch (messageText) {
        case 'generic':
          sendGenericMessage(senderID);
          break;
        case 'Help':
          handleHelpMessage(senderID); 
          break;
        default:
          determineResponseType(senderID,event);
      }
    } else if (messageAttachments) {
      sendTextMessage(senderID, "Message with attachment received");
    }
}

function determineResponseType(senderID, event) {
  const messageText = event.message.text;
  const mesg = messageText.toLowerCase();

  if(mesg.startsWith("save")) {
    storeFreeFormText(senderID, messageText);
    return;
  }
  if(mesg.startsWith("todo")) {
    storeTodoList(senderID, messageText);
    return;
  }
  if(mesg.startsWith("pack")) {
    storePackList(senderID, messageText);
    return;
  }
  if(mesg.startsWith("get todo")) {
    retrieveTodoList(senderID, messageText);
    return;
  }
  if(mesg.startsWith("retrieve") || mesg.startsWith("comments") || mesg.startsWith("get comments")) {
    retrieveStoredText(senderID, messageText);
    return;
  }
  if(mesg.startsWith("get list") || mesg.startsWith("get pack")) {
    retrievePackList(senderID, messageText);
    return;
  }
  if(mesg.startsWith("deals")) {
    retrieveDeals(senderID, messageText);
    return;
  }
  let humanContext = sessions[session.find(senderID)][tripNameInContext].humanContext;
  logger.info("determineResponseType: human context: ",JSON.stringify(humanContext));
  if(senderID != humanContext.fbid) {
    // TODO: If response was not sent to human as expected, we need to figure out what to do. One option is to wing it and send the message to bot. Another option is to simply throw an error that we are experieincing difficult. This might be a little 
    interceptMessage(humanContext,senderID,event);
    logger.info("intercepted message and updated human context: ",JSON.stringify(humanContext),"; sessions dump: ",JSON.stringify(sessions));
    return;
  }
  // This message was sent by the human. Figure out if it was sent in response to a previous question by one of our users. If so, identify the user and send response back to the right user.
  const arr = messageText.split(' ');
  const [origSenderId,seq,done] = arr[0].split('-');
  if(_.isUndefined(origSenderId) || _.isUndefined(seq)) {
    // TODO: We should be doing this only if any of the conversations in humanContext are awaiting a response.
    logger.info("determineResponseType: response from human is not in the right format. senderId and/or sequence number is missing");
    sendTextMessage(senderID,"wrong format. correct format is <original-sender-id>-<sequence number> message text");
    return;
  }
  // send the message from human to the original user. If human indicated that a bot look at it, send the user's original message to the bot.
  arr.shift(); // remove first element.
  let mesgToSender = arr.toLocaleString();
  logger.info("determineResponseType: obtained original sender id ",origSenderId,"; seq ",seq,"; human context: ", JSON.stringify(humanContext),"; sessions: ",JSON.stringify(sessions));
  let thread = humanContext.conversations[seq];
  thread.messagesSent.push(mesgToSender);
  if(mesgToSender === "ai" ) {
    const origMsg = thread.originalMessage;
    logger.info("human says ai. Send original message ",origMsg, " to bot");
    sendResponseFromWitBot(origSenderId,origMsg);
  }
  else {
    sendMessageFromHuman(origSenderId, mesgToSender);
  }
  if(!_.isUndefined(done) || (mesgToSender === "ai")) {
    logger.info("determineResponseType: human has sent the last message for this conversation. Mark awaiting response as done");
    thread.awaitingResponse = true;
  }
  logger.info("determineResponseType: updated conversation for original user ",origSenderId, "; value is ", JSON.stringify(humanContext));
}

function sendMessageFromHuman(originalSenderId, messageText) {
  // expect message from human to be of the form 1326674134041820-1714-done <text meant to be sent to the user
  const messageData = {
    recipient: {
      id: originalSenderId
    },
    message: {
      text: messageText,
      metadata: "response from human"
    }
  };
  logger.info("sendMesssageFromHuman: sending message from human to sender: " + JSON.stringify(messageData));
  callSendAPI(messageData);
}

function interceptMessage(hContext, senderID, event) {
  const textFromSender = event.message.text;
  // update the conversation in humanContext
  if(_.isUndefined(hContext.conversations[event.message.seq])) {
    hContext.conversations[event.message.seq] = {};
  }
  hContext.conversations[event.message.seq].awaitingResponse = true;
  hContext.conversations[event.message.seq].originalMessage = textFromSender;
  hContext.conversations[event.message.seq].messagesSent = [];

  const msg = _.template("msg from ${senderId}-${seq}: ${origMsg}")({
    senderId: senderID,
    seq: event.message.seq,
    origMsg: textFromSender
  });
  const messageData = {
    recipient: {
      id: hContext.fbid
    },
    message: {
      text: msg,
      metadata: senderID, // a way to capture the original sender. This will be used when sending it back to the right user. TODO: This is not how metadata works. See http://tinyurl.com/ju3h74b
    }
  };
  logger.info("intercepting message and sending to human: " + JSON.stringify(messageData));
  callSendAPI(messageData);
  sendTypingAction(senderID);
  return;
}

function retrieveStoredText(senderID, messageText) {
  const tn = tripData.encode(sessions[session.find(senderID)].tripName);
  const url = _.template('https://polaama.com/${tripName}/comments')({
    tripName: tn
  });
  sendTextMessage(senderID, url);
}

function retrieveTodoList(senderID, messageText) {
  const tn = tripData.encode(sessions[session.find(senderID)].tripName);
  const url = _.template('https://polaama.com/${tripName}/todo')({
    tripName: tn
  });
  sendTextMessage(senderID, url);
}

function retrievePackList(senderID, messageText) {
  const tn = tripData.encode(sessions[session.find(senderID)].tripName);
  const url = _.template('https://polaama.com/${tripName}/pack-list')({
    tripName: tn
  });
  sendTextMessage(senderID, url);
}

function retrieveDeals(senderId, messageText) {
  const messageData = {
    recipient: {
      id: senderId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "Wine tasting tour deal from livingsocial",
            subtitle: "Great deal on a wine tasting tour",
            item_url: "https://www.livingsocial.com/deals/1618024-2017-washington-wine-passport-with-tastings",
            image_url: "https://a1.lscdn.net/imgs/fe9f05ff-f78a-4652-b350-2e7bc0c13d7a/570_q80.jpg",
            buttons: [{
              type: "web_url",
              url: "https://www.livingsocial.com/deals/1618024-2017-washington-wine-passport-with-tastings",
              title: "Open Web URL"
            }],
          }]
        }
      }
    }
  };  
  callSendAPI(messageData);
}

function storeList(senderId, messageText, regex, key, retrieveString) {
  const tripName = sessions[session.find(senderId)].tripName;
  const trip = retrieveTrip(tripName);
  // retrieve text
  const items = messageText.replace(regex,"").split(',');
  if(!(key in trip)) {
    trip[key] = [];
  } 
  trip[key] = trip[key].concat(items);
  // store it locally
  persistUpdatedTrip(tripName, trip);
  logger.info("successfully stored item " + items + " in " + key);
  sendTextMessage(senderId, "Saved! You can retrieve this by saying \"" + retrieveString + "\"");
  return;
}

function storeTodoList(senderId, messageText) {
  const reg = new RegExp("todo[:]*[ ]*","i"); // ignore case
  storeList(senderId, messageText, reg, "todoList", "get todo");  
}

function storePackList(senderId, messageText) {
  const reg = new RegExp("pack[:]*[ ]*","i"); // ignore case
  storeList(senderId, messageText, reg, "packList", "get pack list");  
}

/*
 * Store whatever string the user input and return "Saved!"
 */
function storeFreeFormText(senderId, messageText) {
  const reg = new RegExp("save[:]*[ ]*","i"); // ignore case
  storeList(senderId, messageText, reg, "comments", "comments, get comments or retrieve");
}

/*
 * Send the text to wit bot and send the response sent by wit
 */
function sendResponseFromWitBot(senderID, messageText) {
  // This is needed for our bot to figure out the conversation history
  const sessionId = session.find(senderID);

  // Let's forward the message to the Wit.ai Bot Engine
  // This will run all actions until our bot has nothing left to do
  wit.runActions(
    sessionId, // the user's current session
    messageText, // the user's message
    sessions[sessionId].context // the user's current session state
  ).then((context) => {
    // Our bot did everything it has to do.
    // Now it's waiting for further messages to proceed.
    logger.info('Waiting for next user message. current context: ', JSON.stringify(context));

    // Based on the session state, you might want to reset the session.
    // This depends heavily on the business logic of your bot.
    // Example:
    if (context.done) {
      logger.info("Deleting Session " + sessionId + " and associated context since all related work is done");
      delete sessions[sessionId].context;
    }
    else {
      // Updating the user's current session state. 
      sessions[sessionId].context = context;
    }
  })
  .catch((err) => {
    logger.error('Oops! Got an error from Wit: ', err.stack || err);
    sendTextMessage(senderID,"Even bots need to eat. Out for lunch! Be back in a bit.");
  })
}

/*
 * Send a few buttons in response to "Help message" from the user.
 */
function handleHelpMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "What do you want to do next?",
          buttons: [
            {
              type: "postback",
              title: "Start new trip",
              payload: "DEVELOPER_DEFINED_PAYLOAD",
            },
            {
              type: "postback",
              title: "List trips",
              payload: "DEVELOPER_DEFINED_PAYLOAD",
            },
          ]
        }
      }
    }
  };
  callSendAPI(messageData);
}

/*
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",               
            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",               
            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };  
  callSendAPI(messageData);
}

function sendTypingAction(recipientId) {
  const messageData = {
    recipient: {
      id: recipientId
    },
    sender_action:"typing_on"
  };

  callSendAPI(messageData);
}

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
  const messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
}

const PAGE_ACCESS_TOKEN = "EAAXu91clmx0BAONN06z8f5Nna6XnCH3oWJChlbooiZCaYbKOUccVsfvrbY0nCZBXmZCQmZCzPEvkcJrBZAHbVEZANKe46D9AaxOhNPqwqZAGZC5ZCQCK4dpxtvgsPGmsQNzKhNv5OdNkizC9NfrzUQ9s8FwXa7GK3EAkOWpDHjZAiGZAgZDZD";
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      logger.info("Successfully sent generic message with id %s to recipient %s", 
        messageId, recipientId);
    } else {
      // TODO: If there was an error in sending an intercept message to a human, then send a push notification to the original sender that we are having some technical difficulty and will respond to them shortly.
      logger.error("Unable to send message. status code is " + response.statusCode + ". Message from FB is <" + response.body.error.message + ">; Error type: " + response.body.error.type);
    }
  });  
}

module.exports = WebhookPostHandler;
