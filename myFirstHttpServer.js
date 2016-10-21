// Set up logging
const winston = require('winston');
const fs = require('fs');
const logDir = '/home/ec2-user/log';

// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
winston.level = 'debug';
const tsFormat = () => (new Date()).toLocaleTimeString();
const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ json: false, timestamp: tsFormat, level: 'info' }),
    new winston.transports.File({ filename: `${logDir}/results.log`, json: false, 
      colorize: true, timestamp: tsFormat, level: 'debug' })
  ],
  exceptionHandlers: [
    new (winston.transports.Console)({ json: false, timestamp: true }),
    new winston.transports.File({ filename: `${logDir}/exceptions.log`, json: false })
  ],
  exitOnError: false
});
logger.info('log to file');

// ----------------------------------------------------------------------------
// Wit.ai bot specific code

let Wit = null;
let log = null;
try {
  // if running from repo
  Wit = require('../').Wit;
  log = require('../').log;
} catch (e) {
  Wit = require('node-wit').Wit;
  log = require('node-wit').log;
}

const firstEntityValue = (entities, entity) => {
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value
  ;
  if (!val) {
    return null;
  }
  return typeof val === 'object' ? val.value : val;
};

const request = require('request');
const fetch = require('node-fetch');

// The function used by the wit bot to send a message to facebook, which will then be posted to the user as part of the messenger chat.
const fbMessage = (id, text) => {
  const body = JSON.stringify({
    recipient: { id },
    message: { text },
  });
  const qs = 'access_token=' + encodeURIComponent(PAGE_ACCESS_TOKEN);
  return fetch('https://graph.facebook.com/v2.6/me/messages?' + qs, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body,
  })
  .then(rsp => rsp.json())
  .then(json => {
    if (json.error && json.error.message) {
      throw new Error(json.error.message);
    }
    return json;
  });
};

var savedLocation;
var savedDate;
var savedDuration;

function captureAvailableEntities(context, location, datetime, duration) {
  // capture location & datetime if they are present
  if(!savedLocation) {
    if(location) {
      // save location for later use
      savedLocation = location;
    }
    else {
      logger.info("Missing location");
      context.missingLocation = true;
    }
  }
  if(!savedDate) {
    if(datetime) {
      // save datetime for later use
      savedDate = datetime;
    }
    else {
      logger.info("Missing datetime");
      context.missingDate = true;
    }
  }
  if(!savedDuration) {
    if(duration) {
      // save duration for later use
      savedDuration = duration;
    }
    else {
      logger.info("Missing Duration");
      context.missingDuration = true;
    }
  }
  if(savedLocation) {
    // indicate to bot that location was present
    delete context.missingLocation;
  }
  if(savedDate) {
    // indicate to bot that datetime was present & captured
    delete context.missingDate; 
  }
  if(savedDuration) {
    // indicate to bot that duration was present & captured
    delete context.missingDuration;
  }
  return context;
}

const actions = {
  send(request, response) {
    const {sessionId, context, entities} = request;
    const {text, quickreplies} = response;
    // Our bot has something to say!
    // Let's retrieve the Facebook user whose session belongs to
    const recipientId = sessions[sessionId].fbid;
    if (recipientId) {
      // Yay, we found our recipient!
      // Let's forward our bot response to her.
      // We return a promise to let our bot know when we're done sending
      logger.info("sending response from bot to recipient");
      return fbMessage(recipientId, text)
      .then(() => null)
      .catch((err) => {
        logger.error(
          'Oops! An error occurred while forwarding the response to',
          recipientId,
          ':',
          err.stack || err
        );
      });
    } else {
      logger.error('Oops! Couldn\'t find user for session:', sessionId);
      // Giving the wheel back to our bot
      return Promise.resolve()
    }
  },
  createNewTrip({context, entities}) {
    console.log("Called createNewTrip action");
    return new Promise(function(resolve, reject) {
      var location = firstEntityValue(entities, 'location');
      var datetime = firstEntityValue(entities, 'datetime');
      var duration = firstEntityValue(entities, 'duration');
      var updatedContext = captureAvailableEntities(context, location, datetime, duration);
      console.log("Context received in createNewTrip Action: ",JSON.stringify(context));
      if(!savedLocation || !savedDate || !savedDuration) {
        delete updatedContext.forecast;
        delete updatedContext.tripName;
        return resolve(updatedContext);
      }
      // both location & date time exist. Time to do some work.
      console.log("location is " + savedLocation + ", date is " + savedDate + ", duration is " + duration);
      // we should call a weather API here
      updatedContext.forecast = 'sunny in ' + savedLocation + ' on ' + savedDate;
      updatedContext.tripName = savedLocation + "-" + savedDate + "-" + savedDuration;
      savedLocation = null;
      savedDate = null;
      savedDuration = null;
      return resolve(updatedContext);
    });
  },
  getName({context, entities}) {
    console.log("getName called");
    return new Promise(function(resolve, reject) {
      context.name = "Madhu";
      return resolve(context);
    });
  },
  farewellMessage({context, entities}) {
    console.log("farewell Message");
    return new Promise(function(resolve, reject) {
      context.farewellMessage = "Talk to you later.";
      return resolve(context);
    });
  }
};

const WIT_ACCESS_TOKEN = "2DA4HZAX6JJKVBN5OWWB6FZHGHVGQUAN"
// Setting up our bot
const wit = new Wit({
  accessToken: WIT_ACCESS_TOKEN,
  actions,
  // logger: new log.Logger(log.INFO)
  logger: logger
});

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
const sessions = {};

const findOrCreateSession = (fbid) => {
  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    if (sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
      console.log("Found session for ",fbid, JSON.stringify(sessions[sessionId]));
    }
  });
  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    console.log("Creating a new session for ",fbid);
    sessionId = new Date().toISOString();
    sessions[sessionId] = {fbid: fbid, context: {}};
  }
  return sessionId;
};


// ----------------------------------------------------------------------------
// Set up a webserver

// For validation with facebook & verifying signature
const VALIDATION_TOKEN = "go-for-lake-powell";
const PAGE_ACCESS_TOKEN = "EAAXu91clmx0BAONN06z8f5Nna6XnCH3oWJChlbooiZCaYbKOUccVsfvrbY0nCZBXmZCQmZCzPEvkcJrBZAHbVEZANKe46D9AaxOhNPqwqZAGZC5ZCQCK4dpxtvgsPGmsQNzKhNv5OdNkizC9NfrzUQ9s8FwXa7GK3EAkOWpDHjZAiGZAgZDZD";
const FB_APP_SECRET = "a26c4ad2358b5b61942227574532d174";

// A secure webserver
const express = require('express');  
const app = express();
const https = require('https');
const sslPath = '/etc/letsencrypt/live/polaama.com/';
const port = 443
const options = {  
    key: fs.readFileSync(sslPath + 'privkey.pem'),
    cert: fs.readFileSync(sslPath + 'fullchain.pem')
};

const crypto = require('crypto');
/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', FB_APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

var server = https.createServer(options, app);  
// this.io = require('socket.io').listen(this.server);  
server.listen(port, function() {
  logger.info("Listening on port " + port);
}); 
// logg every response
app.use(({method, url}, rsp, next) => {
  rsp.on('finish', () => {
    logger.info(`${rsp.statusCode} ${method} ${url}`);
  });
  next();
});
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
app.use(bodyParser.json({ verify: verifyRequestSignature }));

app.get('/', function(req, res) {
  return res.send("Hello secure world");
});

// handling webhook
app.get('/webhook', function(req, res) {
  logger.info("called /webhook");
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    logger.info("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    logger.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }  
});


app.post('/webhook', jsonParser, function(req, res) {
  logger.info("In post webhook");
  var data = req.body;
  
  // Make sure this is a page subscription
  if(data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.optin) {
          console.log("optin message");
          // receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          console.log("deliver message");
          // receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          console.log("deliver postback"); 
          receivedPostback(messagingEvent);
        } else {
          logger.info("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've 
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

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
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

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
        case 'Help':
          handleHelpMessage(senderID); 
          break;
        default:
          sendResponseFromWitBot(senderID,messageText);
          // sendTextMessage(senderID, messageText);
      }
    } else if (messageAttachments) {
      sendTextMessage(senderID, "Message with attachment received");
    }
}

/*
 * Send the text to wit bot and send the response sent by wit
 */
function sendResponseFromWitBot(senderID, messageText) {
  // This is needed for our bot to figure out the conversation history
  const sessionId = findOrCreateSession(senderID);

  // Let's forward the message to the Wit.ai Bot Engine
  // This will run all actions until our bot has nothing left to do
  wit.runActions(
    sessionId, // the user's current session
    messageText, // the user's message
    sessions[sessionId].context // the user's current session state
  ).then((context) => {
    // Our bot did everything it has to do.
    // Now it's waiting for further messages to proceed.
    logger.info('Waiting for next user messages. current context: ',JSON.stringify(context));

    // Based on the session state, you might want to reset the session.
    // This depends heavily on the business logic of your bot.
    // Example:
    // if (context['done']) {
    //   delete sessions[sessionId];
    // }

    // Updating the user's current session state. Commenting this to prevent old context from confusing wit bot into sending multiple texts to the user.
    // sessions[sessionId].context = context;
  })
  .catch((err) => {
    logger.error('Oops! Got an error from Wit: ', err.stack || err);
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

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
  var messageData = {
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
      logger.error("Unable to send message.");
      logger.error(response);
      logger.error(error);
    }
  });  
}

