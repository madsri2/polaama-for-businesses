'use strict';
const _ = require('lodash');
const request = require('request');
const Log = require('./logger');
const logger = (new Log()).init();
const TripData = require('./trip-data');
const Sessions = require('./sessions');
const moment = require('moment');

function WebhookPostHandler() {
  this.sessions = new Sessions();
  this.fbidHandler = new FbidHandler();
}

function handleMessagingEvent(messagingEvent) {
  // find or create the session here so it can be used elsewhere.
  this.session = this.sessions.findOrCreate(messagingEvent.sender.id);
  try {
    if (messagingEvent.optin) {
      console.log("optin message");
      // receivedAuthentication(messagingEvent);
    } else if (messagingEvent.message) {
      receivedMessage.call(this, messagingEvent);
    } else if (messagingEvent.delivery) {
      console.log("Message delivered");
      // receivedDeliveryConfirmation(messagingEvent);
    } else if (messagingEvent.postback) {
      console.log("Deliver postback"); 
      receivedPostback.call(this, messagingEvent);
    } else {
      logger.info("Webhook received unknown messagingEvent: ", messagingEvent);
    }
  }
  catch(err) {
    logger.error("an exception was thrown: " + err.stack);
    sendTextMessage(messagingEvent.sender.id,"Even bots need to eat! Be back in a bit..");
  }
}

function handlePageEntry(pageEntry) {
    const pageID = pageEntry.id;
    const timeOfEvent = pageEntry.time;
    for (let i = 0, len = pageEntry.messaging.length; i < len; i++) {
      handleMessagingEvent.call(this, pageEntry.messaging[i]);
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
  // You must send back a 200, within 20 seconds, to let us know you've 
  // successfully received the callback. Otherwise, the request will time out.
  res.sendStatus(200);
}

function getComment() {
  // update this session that we are awaiting response for comments postback
  this.session.awaitingComment = true;
  sendTextMessage(this.session.fbid, "Enter your free-form text");
  return;
}

function getTodoItem() {
  this.session.awaitingTodoItem = true;
  sendTextMessage(this.session.fbid, "Enter a todo item");
  return;
}

function getPacklistItem() {
  this.session.awaitingPacklistItem = true;
  sendTextMessage(this.session.fbid, "Enter a pack-list item");
  return;
}

function getTripInContext(payload) {
  const tripName = payload.substring("trip_in_context ".length);
  if(tripName === TripData.encode("New Trip")) {
    logger.info("User wants to plan a new trip");
    sendTextMessage(this.session.fbid, "Provide a name for your new trip");
    this.session.awaitingNewTripNameInContext = true;
  }
  else {
    logger.info(`Setting the trip name for this session's context to ${tripName}. User assumes this is an existing trip.`);
    this.session.addTrip(tripName);
    sendTextMessage(this.session.fbid, `Choose from the following list of features so I can help plan your trip to ${tripName}.`);
    sendHelpMessage(this.session.fbid);
  }
  return;
}

function receivedPostback(event) {
  const recipientID = event.recipient.id;
  const timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  const payload = event.postback.payload;

  logger.info("Received postback for user %d and page %d with payload '%s' " + 
    "at %d", this.session.fbid, recipientID, payload, timeOfPostback);

  if(payload.startsWith("new_trip_workflow")) {
    handleNewTripWorkflow.call(this, payload);
    return;
  }
  if(payload.startsWith("trip_in_context")) {
    getTripInContext.call(this, payload);
    return;
  }
  if(payload === "comments") {
    getComment.call(this);
    return;
  }
  if(payload === "todo") {
    getTodoItem.call(this);
    return;
  }
  if(payload === "pack-item") {
    getPacklistItem.call(this);
    return;
  }

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

  if(message.is_echo) {
    // for now simply log a message and return 200;
    logger.info("Echo message received. Doing nothing at this point");
    return;
  }

  logger.info("Received event for user %d and page %d at %d. Event: ", 
    senderID, recipientID, timeOfMessage, JSON.stringify(event));

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
      sendTextMessage(senderID, "Message with attachment received");
    }
}

function sendUrl(urlPath) {
  return `https://polaama.com/${urlPath}`;
}

function sendTripButtons() {
  const elements = [];
  elements.push({
    title: "Create new trip",
    buttons: [{
     type: "postback",
     title: "New Trip",
     payload: `trip_in_context ${TripData.encode("New Trip")}`
  }]
  });
  TripData.getTrips().forEach(k => {
    elements.push({
      title: k.rawName,
      buttons: [{
        type: "postback",
        title: k.name,
        payload: `trip_in_context ${k.name}`
      }]
    })
  });

  const messageData = {
    recipient: {
      id: this.session.fbid
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: elements
        }
      }
    }
  };
  sendTextMessage(this.session.fbid, "Hi, what trip are we discussing?");
  callSendAPI(messageData);
}

WebhookPostHandler.prototype.sendFriendsList = function(req, res) {
  // for this user's fbid, get the list of friends, update the html template with that and then send it.
  const new_trip = fs.readFileSync("new-trip-template.html", 'utf8');
  const friends = this.fbidHandler.getFriends(this.session.fbid);
  let cbox = "";
  friends.forEach(id => {
    const name = this.fbidHandler.getName(id);
    cbox += `<input type="checkbox" name="${name}" value="${name}">First checkbox<br>`;
  });
  const html = new_trip.replace("${friendsList}", cbox);
  return res.send(html);
}

WebhookPostHandler.prototype.handleTravelersForNewTrip = function(req, res) {
  // logger.info(`body: ${JSON.stringify(req.body)}; params: ${JSON.stringify(req.params)}, query-string: ${JSON.stringify(req.query)} headers: ${JSON.stringify(req.headers)}`);
  // logger.info("req value is " + util.inspect(req, {showHidden: true, color: true, depth: 5}));
  const form = new formidable.IncomingForm(); 
  form.parse(req, function (err, fields, files) {
    logger.info("Fields from form are: " + JSON.stringify(fields));
    res.send(`Values: ${JSON.stringify(fields)}`);
    // store the friends who have been selected in a file.
  });  
}

function handleFriendsList(text) {
  // get the friends list, add the trip to each of these friends' session, then send the "help buttons" to the user.
}

/*
function sendFriendsList() {
  // TODO: get list from userFbidMap for this fbid.
  const friends = userFbidMap[this.session.fbid];
  let list = "";
  let count = 1;
  Object.keys(friends).forEach(fbid => {
    list += `${count}. friends[fbid]\n`;
    count += 1;
  });
  list += `${count}. Everyone\n`;
  sendTextMessage(this.session.fbid, list);
}
*/

function handleNewTripWorkflow(payload) {
  const soloTraveler = payload.substring("new_trip_workflow ".length);
  if(soloTraveler === "yes") {
    sendTextMessage(this.session.fbid, `Choose from the following list of features to start planning your new trip?`);
    sendHelpMessage(this.session.fbid);
  }
  // Group travelers are handled by the new_trip page.
  /*
  else {
    // get the group list
    sendTextMessage(this.session.fbid, `Choose the people you are traveling with?`);
    sendFriendsList.call(this);
    this.session.awaitingFriendsList = true;
  }
  */
}

/*
New trip Workflow:

1) Create a new trip
2) Is this a group trip?
3) yes: 
      Add the names of travelers. This is the tricky part. How do we do this? For now, it could simply be the list of all people and asking the user to select from them.
      Add trip to the session of each of these travelers.
      For group trips, a message from any member of the group is shared with everyone. Only messages that are not comment, todo, pack list will be shared.
4) no:
      Add trip to just this user's session.
      Discussions will be between user, polaama (and human in background).
*/
function handleNewTrip(messageText) {
  this.session.addTrip(messageText);
  logger.info(`This session's trip name in context is ${messageText}`);
  sendTextMessage(this.session.fbid, `Are you traveling by yourselves?`);
  determineTravelCompanions(this.session.fbid);
  this.session.awaitingNewTripNameInContext = false;
  // TODO: Ask which travelers are going and add this trip to those sessions. For now, automatically add all trips to Madhu, Aparna & Polaama's sessions.
}

function determineResponseType(event) {
  const senderID = this.session.fbid;
  const messageText = event.message.text;
  const mesg = messageText.toLowerCase();

  if((_.isNull(this.session.tripNameInContext) || _.isUndefined(this.session.tripNameInContext)) && !this.session.awaitingNewTripNameInContext) {
    logger.info("determineResponseType: no trip name in context. Asking user!");
    sendTripButtons.call(this);
    return;
  }

  if(this.session.awaitingNewTripNameInContext) {
    handleNewTrip.call(this, messageText);
    return;
  } 

  /*
  if(this.session.awaitingFriendsList) {
    handleFriendsList.call(this, messageText);
    return;
  }
  */

  const tripData = this.session.tripData();

  if(mesg.startsWith("help")) {
    sendHelpMessage(senderID); 
    return;
  }
  if(mesg.startsWith("save") || (this.session.awaitingComment != undefined && this.session.awaitingComment === true)) {
    const returnString = tripData.storeFreeFormText(senderID, messageText);
    sendTextMessage(senderID, returnString);
    this.session.awaitingComment = false;
    return;
  }
  if(mesg.startsWith("todo") || (this.session.awaitingTodoItem != undefined && this.session.awaitingTodoItem === true)) {
    const returnString = tripData.storeTodoList(senderID, messageText);
    sendTextMessage(senderID, returnString);
    this.session.awaitingTodoItem = false;
    return;
  }
  if(mesg.startsWith("pack") || (this.session.awaitingPacklistItem != undefined && this.session.awaitingPacklistItem === true)) {
    const returnString = tripData.storePackList(senderID, messageText);
    sendTextMessage(senderID, returnString);
    this.session.awaitingPacklistItem = false;
    return;
  }
  if(mesg.startsWith("get todo")) {
    sendTextMessage(senderID, sendUrl(tripData.todoUrlPath()));
    return;
  }
  if(mesg.startsWith("retrieve") || mesg.startsWith("comments") || mesg.startsWith("get comments")) {
    sendTextMessage(senderID, sendUrl(tripData.commentUrlPath()));
    return;
  }
  if(mesg.startsWith("get list") || mesg.startsWith("get pack")) {
    sendTextMessage(senderID, sendUrl(tripData.packListPath()));
    return;
  }
  if(mesg.startsWith("deals")) {
    retrieveDeals(senderID, messageText);
    return;
  }
  if(mesg.startsWith("top activity list") || mesg.startsWith("top activities") || mesg.startsWith("get top activities")) {
    sendActivityList.call(this, messageText);
    return;
  }
  if(mesg.startsWith("other activity list") || mesg.startsWith("other activities") || mesg.startsWith("get other activities")) {
    sendOtherActivities.call(this, messageText);
    return;
  }
  const humanContext = this.session.humanContext();
  logger.info("determineResponseType: human context: ",JSON.stringify(humanContext));
  if(senderID != humanContext.fbid) {
    // TODO: If response could not be sent to human as expected, we need to figure out what to do. One option is to wing it and send the message to bot. Another option is to simply throw an error that we are experieincing difficult. This might be a little 
    interceptMessage(humanContext,senderID,event);
    logger.info("intercepted message and updated human context: ",JSON.stringify(humanContext));
    return;
  }
  handleMessageSentByHuman.call(this, messageText, senderID);
}

function sendOtherActivities(messageText) {
  const messageData = {
    recipient: {
      id: this.session.fbid
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "Lava flow viewing after sunset (~5.45 PM), Spectacular, but not kid friendly",
            subtitle: "32 miles (51 min drive) south of Hilo condo. Need to bike or walk 4.2 miles",
            buttons: [{
              type: "web_url",
              url: "http://www.familyvacationcritic.com/attraction/hawaii-county-kalapana-lava-visiting-site/big-island/",
              title: "Kalapana Lava visiting"
            }]
          }, {
            title: "Koi feeding on thursday and saturday, mall",
            subtitle: "26 miles (40 min drive) north of kona reef resort",
            buttons: [{
              type: "web_url",
              url: "http://queensmarketplace.net/",
              title: "Queens marketplace"
            }]
          }]
        }
      }
    }
  };
  callSendAPI(messageData);
}

function sendActivityList(messageText) {
  const messageData = {
    recipient: {
      id: this.session.fbid
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "Beautiful, sandy, family friendly beach with restrooms, can get windy",
            buttons: [{
              type: "web_url",
              url: "http://www.familyvacationcritic.com/attraction/hapuna-beach-state-recreation-area/big-island/",
              title: "Hapuna Beach"
            }],
            subtitle: "33 miles (49 min drive) north of Kona reef resort"
          }, {
            title: "Sandy, calm, small beach close to resort. Might be rough if windy",
            subtitle: "2.8 miles (7 min drive) south of kona reef resorts",
            buttons: [{
              type: "web_url",
              url: "http://tinyurl.com/jfka26v",
              title: "Magic sand beach"
            }]
          }, {
            title: "Garden, ocean views, waterfall, open 9 to 5, $15 pp, require 2-3 hours",
            subtitle: "10.5 miles (23 min drive) north of hotel",
            buttons: [{
              type: "web_url",
              url: "http://htbg.com/",
              title: "Botanical Gardens"
            }]
          }, {
            title: "Great for kids, very calm, sandy",
            subtitle: "32.3 miles (47 min drive) north of kona reef resort",
            buttons: [{
              type: "web_url",
              url: "http://tinyurl.com/gt8dyr9",
              title: "Beach 69"
            }]
          }, {
            title: "Go early, crowded, good sea-life BEWARE of sea urchins, slightly rocky",
            subtitle: "3.9 miles (10 min drive) south of kona reef resort",
            buttons: [{
              type: "web_url",
              url: "https://www.yelp.com/biz/kahaluu-beach-park-kailua-kona-2",
              title: "Kahaluu beach park"
            }]
          }]
        }
      }
    }
  };
  callSendAPI(messageData);
}

/*
 For each trip in this user's session, find the corresponding trip data information and if the trip is still not complete, then send a notification.
*/
WebhookPostHandler.prototype.sendReminderNotification = function() {
  // get todo list
  const sessions = this.sessions.allSessions();
  Object.keys(sessions).forEach(id => {
    sessions[id].allTrips().forEach(trip => {
      const todoList = trip.data.todoList;
      logger.info(`sendReminderNotification: ${trip.data.name} has ${todoList.length} todo items.`);
      const now = moment();
      const tripEnd = moment(trip.data.startDate).add(trip.data.duration,'days');
      console.log(`value of now is ${now}. value of tripEnd is ${tripEnd}`);
      if(now.diff(tripEnd,'days') >= 0) {
        logger.info(`Trip ${trip.data.name} started on ${trip.data.startDate} and has a duration of ${trip.data.duration} days. No longer sending reminder because the trip is over (difference is ${now.diff(tripEnd,'days')} days).`);
      }
      else {
        sendTextMessage(sessions[id].fbid, `Reminder: You still have ${todoList.length} items to do for your trip to ${trip.data.name}`);
      }
    });
  });
}

// This message was sent by the human. Figure out if it was sent in response to a previous question by one of our users. If so, identify the user and send response back to the right user.
function handleMessageSentByHuman(messageText, senderID) {
  const arr = messageText.split(' ');
  const [origSenderId,seq,done] = arr[0].split('-');
  if(_.isUndefined(origSenderId) || _.isUndefined(seq)) {
    if(this.session.nooneAwaitingResponse()) {
      logger.info("message being sent as user, not human. Sending message from them to ai bot");
      sendResponseFromWitBot.call(this, origSenderId, origMsg);
      return;
    }
    logger.info("handleMessageSentByHuman: response from human is not in the right format. senderId and/or sequence number is missing");
    sendTextMessage(senderID,"wrong format. correct format is <original-sender-id>-<sequence number> message text");
    return;
  }
  // send the message from human to the original user. If human indicated that a bot look at it, send the user's original message to the bot.
  arr.shift(); // remove first element.
  const mesgToSender = arr.join(' ');
  // TODO: Figure out a way if we need to reconcile the original sender's session with the session of the human. This might be needed because the human could be handle multiple sessions at once. One way to accomplish this would be to keep a separate session for the human inside the user's session and use that. Also, think about making a session have a 1:1 mapping with trip-fbid. Might make things easier..
  const origSenderSession = this.sessions.find(origSenderId);
  // TODO: Handle origSenderSession not being available
  const humanContext = origSenderSession.humanContext();
  logger.info(`handleMessageSentByHuman: obtained original sender id ${origSenderId}; seq ${seq}; mesg from human: ${mesgToSender}; human context: ${JSON.stringify(humanContext)}`);
  let thread = humanContext.conversations[seq];
  thread.messagesSent.push(mesgToSender);
  if(mesgToSender === "ai") {
    const origMsg = thread.originalMessage;
    logger.info("human sent \"ai\". Sending original message ",origMsg, " to ai bot");
    sendResponseFromWitBot.call(this, origSenderId, origMsg);
  }
  else {
    sendMessageFromHuman(origSenderId, mesgToSender);
  }
  if(!_.isUndefined(done) || (mesgToSender === "ai")) {
    logger.info("handleMessageSentByHuman: human has sent the last message for this conversation. Mark awaiting response as done");
    thread.awaitingResponse = false;
  }
  logger.info("handleMessageSentByHuman: updated conversation for original user ",origSenderId, "; value is ", JSON.stringify(humanContext));
  return;
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

/*
 * Send the text to wit bot and send the response sent by wit
 */
function sendResponseFromWitBot(senderID, messageText) {
  // This is needed for our bot to figure out the conversation history
  const aiContext = this.session.aiContext();
  // Let's forward the message to the Wit.ai Bot Engine
  // This will run all actions until our bot has nothing left to do
  wit.runActions(
    aiContext.sessionId, // the user's current session
    messageText, // the user's message
    aiContext // the user's current session state
  ).then((context) => {
    // Our bot did everything it has to do.
    // Now it's waiting for further messages to proceed.
    logger.info('Waiting for next user message. current context: ', JSON.stringify(context));

    // Based on the session state, you might want to reset the session.
    // This depends heavily on the business logic of your bot.
    // Example:
    if (context.done) {
      logger.info("Deleting Session " + aiContext.sessionId + " and associated context since all related work is done");
      this.session.deleteAiContext();
    }
    else {
      // Updating the user's current session state. 
      this.session.updateAiContext(context);
    }
  })
  .catch((err) => {
    logger.error('Oops! Got an error from Wit: ', err.stack || err);
    sendTextMessage(senderID,"Even bots need to eat. Out for lunch! Be back in a bit.");
  })
}

function determineTravelCompanions(recipientId) {
  const messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "Just me",
            buttons: [{
              type: "postback",
              title: "Yes",
              payload: "new_trip_workflow yes",
            }]
          }, {
            title: "With others",
            buttons: [{
              type:"web_url",
              url:"https://polaama.com/new_trip",
              title:"No",
              webview_height_ratio: "compact",
              messenger_extensions: true,
              fallback_url: "https://polaama.com/new_trip" 
            }]
          }]
        }
      }
    }
  };
  callSendAPI(messageData);
}

/*
 * Send a few buttons in response to "Help message" from the user.
 */
function sendHelpMessage(recipientId) {
  const messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "Add trip comments",
            buttons: [{
              type: "postback",
              title: "Add comments",
              payload: "comments",
            }]
          }, {
            title: "Add todo items",
            buttons: [{
              type: "postback",
              title: "Add todo",
              payload: "todo",
            }]
          }, {
            title: "Add to pack-list",
            buttons: [{
              type: "postback",
              title: "Add item ",
              payload: "pack-item",
            }]
          }]
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
