'use strict';
const logger = require('./my-logger');
const Sessions = require('./sessions');
const FbidHandler = require('./fbid-handler');
const TripInfoProvider = require('./trip-info-provider');
const CommentParser = require('./expense-report/app/comment-parser');
const ExpenseReportWorkflow = require('./expense-report/app/workflow');
const CreateItinerary = require('./trip-itinerary/app/create-itin');

const _ = require('lodash');
const request = require('request');
const moment = require('moment');
const formidable = require('formidable');
const Promise = require('promise');
const validator = require('node-validator');

// NOTE: WebhookPostHandler is a singleton, so all state will need to be maintained in this.session object. fbidHandler is also a singleton, so that will be part of the WebhookPostHandler object.
function WebhookPostHandler(session) {
  this.sessions = new Sessions();
  this.fbidHandler = new FbidHandler();
  if(!_.isUndefined(session)) {
    logger.info(`WebhookPostHandler: A session with id ${session.sessionId} was passed. Using that in the post hook handler`);
    this.passedSession = session;
    this.session = session;
  }
}

function handleMessagingEvent(messagingEvent) {
  // find or create the session here so it can be used elsewhere. Only do this if a session was NOT passed in the constructor.
  if(_.isUndefined(this.passedSession)) {
    this.session = this.sessions.findOrCreate(messagingEvent.sender.id);
    logger.info(`handleMessagingEvent: This chat's session id is ${this.session.sessionId}`);
  }
  else {
    this.session = this.passedSession;
  }

  try {
    if (messagingEvent.optin) {
      receivedAuthentication(messagingEvent);
    } else if (messagingEvent.message) {
      receivedMessage.call(this, messagingEvent);
    } else if (messagingEvent.delivery) {
      // console.log("Message delivered");
      // receivedDeliveryConfirmation(messagingEvent);
    } else if (messagingEvent.postback) {
      receivedPostback.call(this, messagingEvent);
    } else {
      logger.info("Webhook received unknown messagingEvent: ", messagingEvent);
    }
  }
  catch(err) {
    logger.error("an exception was thrown: " + err.stack);
		sendTextMessage(messagingEvent.sender.id,"Even bots need to eat! Be back in a bit (after fixing an internal server error)");
  }
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
  sendTextMessage(senderID, "Authentication successful");
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

function enterCommentAsMessage() {
  // update this session that we are awaiting response for comments postback
  this.session.awaitingComment = true;
  sendTextMessage(this.session.fbid, "Enter your free-form text");
  return;
}

function enterTodoItemAsMessage() {
  this.session.awaitingTodoItem = true;
  sendTextMessage(this.session.fbid, "Enter a todo item");
  return;
}

function enterPackItemAsMessage() {
  this.session.awaitingPacklistItem = true;
  sendTextMessage(this.session.fbid, "Enter a pack-list item");
  return;
}

function getTripInContext(payload) {
  const tripName = payload.substring("trip_in_context ".length);
  logger.info(`Setting the trip name for this session's context to ${tripName}. User assumes this is an existing trip.`);
  this.session.addTrip(tripName);
  return;
}

function sendUrlButton(title, urlPath) {
  let messageData = {
    recipient: {
      id: this.session.fbid
    }
  };
  const tripData = this.session.tripData();
  const rawName = tripData.rawTripName;
  messageData.message = {
    attachment: {
      type: "template",
      payload: {
        template_type: "generic",
        elements: [{
          title: "Link",
          buttons: [{
            type: "web_url",
            url: sendUrl.call(this, urlPath),
            title: title,
            webview_height_ratio: "compact",
            messenger_extensions: true,
            fallback_url: sendUrl.call(this, urlPath)
          }]
        }]
      }
    }
  };
  callSendAPI(messageData);
}

// Gather trip details (weather, flight, hotel, etc.) and send it in a web_url format.
// This is a callback that is passed to TripInfoProvider to be called after weather (and other relevant information) is obtained. TODO: Handler cases where there is no weather data / flight data etc.
function displayTripDetails() {
  let messageData = {
    recipient: {
      id: this.session.fbid
    }
  };
  const tripData = this.session.tripData();
  const rawName = tripData.rawTripName;
  messageData.message = {
    attachment: {
      type: "template",
      payload: {
        template_type: "generic",
        elements: [{
          title: "Get", 
          buttons: [{
            type: "web_url",
            url: sendUrl.call(this, tripData.weatherUrlPath()),
            title: "Weather",
            webview_height_ratio: "compact",
            messenger_extensions: true,
            fallback_url: sendUrl.call(this, tripData.weatherUrlPath()),
          },
          {
            type:"web_url",
            url: sendUrl.call(this, tripData.flightUrlPath()),
            title:"Flight",
            webview_height_ratio: "compact",
            messenger_extensions: true,
            fallback_url: sendUrl.call(this, tripData.flightUrlPath())
          }, /*{ // NOT supported yet!
          title: "Get Stay details",
          buttons: [{
            type:"web_url",
            url: sendUrl.call(this, tripData.stayUrlPath()),
            title:"Stay",
            webview_height_ratio: "compact",
            messenger_extensions: true,
            fallback_url: sendUrl.call(this, tripData.stayUrlPath())
          }]
          },*/ {
            type:"web_url",
            url: sendUrl.call(this, tripData.activitiesUrlPath()),
            title:"Activities",
            webview_height_ratio: "compact",
            messenger_extensions: true,
            fallback_url: sendUrl.call(this, tripData.activitiesUrlPath())
          }]
        }, {
          title: "Get",
          buttons: [{
            type: "web_url",
            url:sendUrl.call(this, `${rawName}/comments`),
            title: "Comments",
            webview_height_ratio: "compact",
            messenger_extensions: true
          }, {
            type: "web_url",
            url:sendUrl.call(this, `${rawName}/todo`),
            title: "Tasks",
            webview_height_ratio: "compact",
            messenger_extensions: true
          }, {
            type: "web_url",
            url:sendUrl.call(this, `${rawName}/pack-list`),
            title: "Pack list",
            webview_height_ratio: "compact",
            messenger_extensions: true
         }]
        }, {
          title: "Get",
          buttons: [{
            type: "web_url",
            url:sendUrl.call(this, `${rawName}/expense-report`),
            title: "Expense report",
            webview_height_ratio: "compact",
            messenger_extensions: true
          }, {
            type: "postback",
            title: "-",
            payload: "payload"
          }, {
            type: "postback",
            title: "-",
            payload: "payload"
          }]
        }]
      }
    }
  };
  callSendAPI(messageData);
}

// Start collecting useful information for trip and update the user.
WebhookPostHandler.prototype.startPlanningTrip = function() {
  sendTextMessage(this.session.fbid, `Gathering weather, flight and stay related information for ${this.session.tripNameInContext}`);
  sendTypingAction.call(this);

  // Create the itinerary based on cities and update the tripData.tripItin() file. This will be used to displayCalendar when the "/calendar" page is called
  const createItin = new CreateItinerary(this.session.tripData());
  createItin.create();

  const tip = new TripInfoProvider(this.session.tripData(), this.session.hometown);
  const activities = Promise.denodeify(tip.getActivities.bind(tip));
  const flightDetails = Promise.denodeify(tip.getFlightDetails.bind(tip));
  const weatherDetails = Promise.denodeify(tip.getWeatherInformation.bind(tip));
  const dtdCallback = displayTripDetails.bind(this);

  // TODO: If this is a beach destinataion, use http://www.blueflag.global/beaches2 to determine the swimmability. Also use http://www.myweather2.com/swimming-and-water-temp-index.aspx to determine if water conditions are swimmable
  activities()
    .then(flightDetails())
    .then(weatherDetails())
    .done(
      dtdCallback(), 
      function(err) {
        logger.error(`error in gathering data for trip ${this.session.tripNameInContext}: ${err.stack}`);
    });
}

function planNewTrip() {
  logger.info("User wants to plan a new trip");
  sendTextMessage(this.session.fbid, "Can you provide details about your trip: destination country, start date, duration (in days) as a comma separated list?"); 
  sendTextMessage(this.session.fbid, "Example: India,11/01,20 or India,11/01/17,20");
	this.session.awaitingNewTripDetails = true;
  this.session.planningNewTrip = true;
}

function receivedPostback(event) {
  const senderID = event.sender.id;
  const recipientID = event.recipient.id;
  const timeOfPostback = event.timestamp;
  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  let payload = event.postback.payload;

  logger.info("Received postback for user %d, page %d, session %d at timestamp: %d. Payload: %s", senderID, recipientID, this.session.fbid, timeOfPostback, payload);

  if(payload === "GET_STARTED_PAYLOAD") {
    return sendHelpMessage.call(this); 
  }

  // A pmenu, past_trips or a postback starting with "trip_in_context" is indicative of the beginning of a new state in the state machine. So, clear the session's "awaiting" states to indicate the beginning of a new state.
  this.session.clearAllAwaitingStates();

	// new trip cta
  if(payload === "new_trip" || payload === "pmenu_new_trip") {
    planNewTrip.call(this);
		return;
	}

  // existing trip
  if(payload.startsWith("trip_in_context")) {
    getTripInContext.call(this, payload);
    this.session.noTripContext = false;
    if(this.session.previousPayload) {
      // use the payload that the user chose before getting the trip in context
      payload = this.session.previousPayload;
      this.session.previousPayload = null;
    }
    else {
      // no previous payload. Simply present available options and return;
      sendAddOrGetOptions.call(this);
      return;
    }
  }

  if(payload === "pmenu_existing_trips") {
		sendTripButtons.call(this);
		return;
  }
  if(payload === "past_trips") {
    // Do not set past trip as trip context because there is not much users can do.
    sendPastTrips.call(this);
    return;
  }
	
	// In order to add travelers to a trip, we need to know the trip in context.
  if((!this.session.tripNameInContext || this.session.tripNameInContext === "") && 
      !this.session.noTripContext) {
    logger.info("receivedPostback: no trip name in context. Asking user!");
    // store the current payload so it can be handled once we have the tripInContext.
    this.session.previousPayload = payload; 
    sendTripButtons.call(this, true /* add new trip */);
    return;
  }

  if(payload === "add_comments") {
    enterCommentAsMessage.call(this);
    return;
  }
  if(payload === "add_todo") {
    enterTodoItemAsMessage.call(this);
    return;
  }
  if(payload === "add_pack_item") {
    enterPackItemAsMessage.call(this);
    return;
  }
  if(payload === "add_cities") {
    addCitiesToExistingTrip.call(this);
    return;
  }
  if(payload === "add_expense") {
    this.session.expenseReportWorkflow = new ExpenseReportWorkflow(this.session);
    callSendAPI(this.session.expenseReportWorkflow.startWork());
    return;
  }
  if(payload === "add_travelers") {
    determineTravelCompanions.call(this);
  }

  // When an unknown postback is called, we'll send a message back to the sender to 
  // let them know it was successful
  sendTextMessage(senderID, "Unhandled Postback called");
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

  logger.info("receivedMessage: Received event for user %d, page %d, session %d at timestamp: %d. Event: ", senderID, recipientID, this.session.fbid, timeOfMessage, JSON.stringify(event));

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
  const encodedId = this.fbidHandler.encode(this.session.fbid);
  return `https://polaama.com/${encodedId}/${urlPath}`;
}

function sendPastTrips() {
  // reset this sessions' context
  this.session.noTripContext = true;
  const elements = [];
  const tripNames = this.session.getPastTrips();
  tripNames.forEach(t => {
    elements.push({
      title: t.rawName,
      buttons: [{
        type: "web_url",
        url:sendUrl.call(this, `${t.rawName}`),
        title: t.name,
        webview_height_ratio: "compact",
        messenger_extensions: true
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
  callSendAPI(messageData);
  return;
}

function sendTripButtons(addNewTrip) {
  const tripDetails = this.session.getCurrentAndFutureTrips();
  const tripNames = tripDetails.futureTrips;
  logger.info(`sendTripButtons: trip length for fbid ${this.session.fbid} is ${tripNames.length}`);
  if(tripNames.length == 0) {
    const messageData = {
      recipient: {
        id: this.session.fbid
      },
      message: {
        text: `You don't have a any trips planned yet.`,
        quick_replies:[
          {
            content_type: "text",
            title: "Create New trip",
            payload: "qr_new_trip"
          }
        ]
      }
    };
    callSendAPI(messageData);
    return;
  }
    
  // reset this sessions' context
  this.session.noTripContext = true;
  sendTextMessage(this.session.fbid, "Hi, which trip are we discussing?");
  const elements = [];
  const buttons = [];
  tripNames.forEach((t,i) => {
    const j = parseInt(i/3);
    if(!buttons[j]) {
      buttons[j] = [];
    }
    buttons[j].push({
      type: "postback",
      title: t.name,
      payload: `trip_in_context ${t.name}`
    });
  });
  let lastIndex = buttons.length - 1;
  let numDashes = 3 - buttons[lastIndex].length;
  // if numDashes is 0, the number of trips is an exact multiple of 3. Add another entry in buttons array
  if(numDashes === 0) {
    lastIndex++;
    buttons[lastIndex] = []; // this does not exist, so create it.
    numDashes = 3;
  }
  let pastTrips = tripDetails.pastTrips;
  while(numDashes-- > 0) {
    if(pastTrips) {
      buttons[lastIndex].push({
        type: "postback",
        title: "Past Trips",
        payload: "past_trips"
      });
      pastTrips = false;
      continue;
    }
    if(addNewTrip) {
      buttons[lastIndex].push({
         type: "postback",
         title: "New Trip",
         payload: "new_trip"
      });
      addNewTrip = false;
      continue;
    }
    // fill the remaining slots with "-"
    buttons[lastIndex].push({
      type: "postback",
      title: "-",
      payload: "dash"
    });
  }
  buttons.forEach(list => {
    elements.push({
      title: "Trips",
      buttons: list
    });
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
  callSendAPI(messageData);
}

function sendAllTripsButtons() {
  const elements = [];
  const futureTrips = this.session.getCurrentAndFutureTrips();
  const pastTrips = this.session.getPastTrips();
  pastTrips.forEach(t => {
    elements.push({
      title: t.rawName,
      buttons: [{
        type: "web_url",
        url:sendUrl.call(this, `${t.rawName}/expense-report`),
        title: t.name,
        webview_height_ratio: "compact",
        messenger_extensions: true
      }]
    })
  });
  futureTrips.forEach(t => {
    elements.push({
      title: t.rawName,
      buttons: [{
        type: "web_url",
        url:sendUrl.call(this, `${t.rawName}/expense-report`),
        title: t.name,
        webview_height_ratio: "compact",
        messenger_extensions: true
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
  callSendAPI(messageData);
  return;
}

function handleQuickReplies(quick_reply) {
  const payload = quick_reply.payload;
  if(!payload) {
    logger.error(`handleQuickReplies: Payload is undefined in quick_reply.`);
    return true;
  }
  // User clicked on "Add ..." or "Get ..." in help message or after choosing a trip under "Existing trips"
  if(payload === "qr_add_") {
    sendAddButtons.call(this);
    return true;
  }

  if(payload === "qr_get_") {
    displayTripDetails.call(this);
    return true;
  }

  // This quick reply came from the user typing "help" (see sendHelpMessage)
  if(payload === "qr_new_trip") {
    planNewTrip.call(this);
    return true;
  }
  if(payload === "qr_existing_trips") {
		sendTripButtons.call(this);
    return true;
  }

  logger.warn(`handleQuickReplies: Session ${this.session.fbid}: quick_reply not handled here ${JSON.stringify(quick_reply)}`);
  return false;
}

function validateStartDate(value, onError) {
  const now = moment();
  
  const check = validator.isObject()
    .withRequired('startDate', validator.isDate());

  var errCount = 0;
  var error = {};
  validator.run(check, { startDate: value}, function(ec, e) {
      errCount = ec;
      error = e;
  });
  if(errCount > 0) {
    return onError(error[0].message, error.parameter, error.value);
  }

  if(now.diff(moment(new Date(value).toISOString()),'days') >= 0) {
    return onError("Provided start date is in the past","",value);
  }
  return null;
}

// An object that is expected to be thrown by extractNewDetails below
function UserConfirmation(message) {
	this.message = message;
	this.name = "UserConfirmation";
}

function createNewTrip(tripDetails) {
  this.session.addTrip(tripDetails.destination);
  const tripData = this.session.tripData();
  tripData.addTripDetailsAndPersist(tripDetails);
  logger.info(`extractNewTripDetails: This session's trip name in context is ${tripDetails.destination}`);
  this.session.awaitingNewTripDetails = false;
  // this new trip will also be the context for this session;
  this.session.noTripContext = false;
}

function extractNewTripDetails(messageText) {
	// short-circuit parsing the input and validation if the data already existed.
	if(this.session.previouslyEnteredTripDetails && this.session.previouslyEnteredTripDetails.tripStarted) {
		createNewTrip.call(this, this.session.previouslyEnteredTripDetails);
		return;
	}
  const td = messageText.split(',');
  if(td[1].match(/^ *\d+\/\d+$/)) { // if date is of the form "1/1", "10/10" or " 1/10", append year
    td[1] = td[1].concat(`/${new Date().getFullYear()}`);
  }
  const tripDetails = {
    destination: td[0],
    startDate:  td[1],
    duration: parseInt(td[2]) 
  };
  const customValidator = {
      validate: validateStartDate
  };
  // validate tripData
  const check = validator.isObject()
    .withRequired('duration', validator.isInteger({min: 1, max: 200}))
    .withRequired('startDate', customValidator)
    .withRequired('destination', validator.isString({regex: /^[A-Za-z]+$/}));
  
  var error = null;
  validator.run(check, tripDetails, function(ec, e) {
    if(ec > 0) {
      error = e;
    }
    return;
  });
  if(error) {
		if(error.length === 1 && error[0].message.startsWith("Provided")) {
			// store the tripDetail so we can use this depending on how the user responds to this question.
			this.session.previouslyEnteredTripDetails = tripDetails;
			throw new UserConfirmation('Provide date is in the past. Has your trip already started?');
		}
    logger.warn(`extractNewDetails: Validation error: ${JSON.stringify(error)}`);
    return error;
  }

	createNewTrip.call(this, tripDetails);
}

function extractCityDetails(messageText) {
  const cities = messageText.split(',');
  // TODO: Validate city
  this.session.tripData().addCities(cities);
  this.session.tripData().addPortOfEntry(cities[0]); // assume that the first city is port of entry. See determineResponseType 3rd step in new trip workflow
  // indicate that the tripData for this trip is stale in the session object.
  this.session.invalidateTripData();
  this.session.awaitingCitiesForNewTrip = false;
}

// TODO: This code duplicates some aspects of "getting cities for the trip" in determineResponseType. Fix that.
function addCitiesToExistingTrip() {
    const tripData = this.session.tripData();
    if(!determineCities.call(this, true /* existingTrip */)) {
      if(!this.session.awaitingCitiesForExistingTrip) {
        sendTextMessage(this.session.fbid, `What cities in ${tripData.data.destination} are you traveling to (comma separated list)?`);
        this.session.awaitingCitiesForExistingTrip = true;
        return;
      }
      else {
        if(tripData.data.cities) {
          logger.info(`addCitiesForExistingTrip: Start planning trip for customer`);
          this.startPlanningTrip();
        }
        else {
          logger.error(`addCitiesForExistingTrip: Session ${this.session.sessionId}: Cannot determine cities for trip ${tripData.data.destination} even after getting cities from customer. Possible BUG!`);
          sendTextMessage(this.session.fbid,"Even bots need to eat! Be back in a bit..");
        }
      }
    }
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
// TODO: Use a State Machine pattern
function determineResponseType(event) {
  const senderID = this.session.fbid;
  const messageText = event.message.text;
  const mesg = messageText.toLowerCase();

  // Before doing anything, if the user types help, send the help message!
  if(mesg.startsWith("help ") || mesg === "help") {
    // clear all states so that we can start on a clean state.
    this.session.clearAllAwaitingStates();
    if(this.session.tripNameInContext) {
      return sendAddOrGetOptions.call(this);
    }
    else {
      return sendHelpMessage.call(this); 
    }
  }

  // if we don't know what trip is being discussed, ask the user for this, unless the user is adding details about a new trip.
  if((_.isNull(this.session.tripNameInContext) 
			|| _.isUndefined(this.session.tripNameInContext) 
			|| this.session.tripNameInContext === "") 
			&& !this.session.planningNewTrip) {
    logger.info("determineResponseType: no trip name in context. Asking user!");
    sendTripButtons.call(this, true);
    return;
  }

  // New trip workflow
  if(this.session.planningNewTrip) {
    // 1) Extract trip details like destination, start date and duration
    if(this.session.awaitingNewTripDetails) {
			// if we are awaiting user confirmation, handle that differently
			if(this.session.awaitingUserConfirmation) {
        const userResponse = event.message.quick_reply.payload;
				if(userResponse === "qr_yes") {
					// Mark that the trip has already started. This will be used in startPlanningTrip
					this.session.previouslyEnteredTripDetails.tripStarted = true;
					this.session.awaitingUserConfirmation = false;
				}
				else if(userResponse === "qr_no") {
					this.session.awaitingUserConfirmation = false;
					planNewTrip.call(this);
					return;
				}		
				else {
					logger.error(`determineResponseType: BUG! Session is in state awaitingUserConfirmation  but the mesg is not qr_yes or qr_no. It is ${userResponse}. This is unexpected`);
					sendTextMessage(messagingEvent.sender.id,"Even bots need to eat! Be back in a bit (after fixing an internal server error)");
					return;
				}
			}
			try {
      	const err = extractNewTripDetails.call(this, messageText);
      	if(err) {
        	sendTextMessage(this.session.fbid, `Input error: parameter ${err[0].parameter}:${err[0].message}`);
        	return;
      	}
			}
			catch(e) {
				// Assume that the only exception being thrown now is UserConfirmation. Update if this changes in the future
				this.session.awaitingUserConfirmation = true;
				sendYesNoButtons.call(this, e.message);
				return;
			}
    }

    // 2) Get hometown if it's undefined and if the trip has not already started. If the trip has already started, we currently don't need it since the hometown is only needed for flight details currently
    const thisTrip = this.session.tripData().data;
    if(!this.session.hometown && !thisTrip.tripStarted) {
      // TODO: If the hometown is defined, don't simply assume that to be the point of origin. Confirm with the user.
      if(this.session.awaitingHometownInfo) {
        // TODO: Validate hometown
        this.session.persistHometown(messageText); 
        this.session.awaitingHometownInfo = false;
      }
      else {
        sendTextMessage(this.session.fbid, "What is your home city? We will use this as your trip's origin");
        this.session.awaitingHometownInfo = true;
        return;
      }
    }
  
    // 3) Get cities for the trip.
    // TODO: Handle case where user does not yet know which cities they are going to!
    if(this.session.awaitingCitiesForNewTrip) {
      extractCityDetails.call(this, messageText);
      const tripData = this.session.tripData();
      if(tripData.data.cities) {
        logger.info(`determineResponseType: Start planning trip for customer`);
        this.session.planningNewTrip = false;
        this.startPlanningTrip();
      }
      else {
        logger.error(`determineResponseType: Session ${this.session.sessionId}: Cannot determine cities for trip ${tripData.data.destination} even after getting cities from customer. Possible BUG!`);
        sendTextMessage(this.session.fbid,"Even bots need to eat! Be back in a bit..");
      }
      return;
    }

    const tripData = this.session.tripData();
    if(!determineCities.call(this)) {
      // ask user to enter cities and port of entry because we don't have that data yet.
      sendTextMessage(this.session.fbid, `What cities in ${tripData.data.destination} are you traveling to (comma separated list)?`);
      sendTextMessage(this.session.fbid, `The first city in your list will be used as your port of entry`);
      this.session.awaitingCitiesForNewTrip = true;
      return;
    }
    else { 
      // determineCities returned true, indicating that we have city list information
      // End of new trip workflow. The workflow will complete when user selects cities (handled by determineCities function) and webpage-handler.js calls the startPlanningTrip method
      // TODO: Rather than let webpage-handler.js call startPlanning (and thus exposing this functionality there), consider calling startPlanningTrip from here.. The presence of tripData.data.cities can be a signal from webpage-handler.js's formParseCallback method that the cities were correctly chosen and added here.
      this.session.planningNewTrip = false;
      this.session.awaitingCitiesForNewTrip = false;
    }
    return;
  }

  if(this.session.expenseReportWorkflow) {
    const workflow = this.session.expenseReportWorkflow;
    try {
      callSendAPI(workflow.doWork(event.message));
      if(workflow.done) {
        this.session.expenseReportWorkflow = null;
      }
    }
    catch(e) {
      logger.error(`determineResponseType: Error from expense report workflow: ${e}`);
      sendTextMessage(senderID,"Even bots need to eat. Out for lunch! Be back in a bit(after fixing the internal server error)");
    }
    return;
  }

  if(event.message.quick_reply) { 
    handleQuickReplies.call(this, event.message.quick_reply);
    return;
    // if it was not handled, it's possible that the quick_reply is meant for some other step below. continue on.
  }

  const tripData = this.session.tripData();
  if(mesg.startsWith("save") || this.session.awaitingComment) {
    const returnString = tripData.storeFreeFormText(senderID, messageText);
    sendTextMessage(senderID, returnString);
    this.session.awaitingComment = false;
    return;
  }
  if(mesg.startsWith("todo") || this.session.awaitingTodoItem) {
    const returnString = tripData.storeTodoList(senderID, messageText);
    sendTextMessage(senderID, returnString);
    this.session.awaitingTodoItem = false;
    return;
  }
  if(mesg.startsWith("pack") || this.session.awaitingPacklistItem) {
    const returnString = tripData.storePackList(senderID, messageText);
    sendTextMessage(senderID, returnString);
    this.session.awaitingPacklistItem = false;
    return;
  }
  if(mesg.startsWith("get todo")) {
    sendUrlButton.call(this, "Get Todo list", tripData.todoUrlPath());
    return;
  }
  if(mesg.startsWith("get expense")) {
    sendUrlButton.call(this, "Get expense report", tripData.expenseReportUrlPath());
    return;
  }
  if(mesg.startsWith("retrieve") || mesg.startsWith("comments") || mesg.startsWith("get comments")) {
    sendUrlButton.call(this, "Get Comments", tripData.commentUrlPath());
    return;
  }
  if(mesg.startsWith("get list") || mesg.startsWith("get pack")) {
    sendUrlButton.call(this, "Get pack-list", tripData.packListPath());
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
    interceptMessage.call(this, humanContext,senderID,event);
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
      logger.info(`sendReminderNotification: Trip ${trip.data.name} from session ${id} has ${todoList.length} todo items.`);
      if(!todoList.length) {
        return;
      }
      const now = moment();
      const tripEnd = trip.data.returnDate;
      if(now.diff(tripEnd,'days') >= 0) {
        logger.info(`Trip ${trip.data.name} started on ${trip.data.startDate} and has a duration of ${trip.data.duration} days. No longer sending reminder because the trip is over (difference is ${now.diff(tripEnd,'days')} days).`);
        return;
      }
      // only send reminder if we are within 45 days of the trip.
      const startDate = moment(new Date(trip.data.startDate).toISOString());
      const daysToTrip = startDate.diff(now, 'days');
      if(daysToTrip <= 45) {
        sendTextMessage(sessions[id].fbid, `Reminder: You still have ${todoList.length} items to do for your trip to ${trip.data.name}`);
      }
      else {
        logger.info(`Not sending reminder because there are ${daysToTrip} days to the trip ${trip.data.name}`);
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
  // TODO: Figure out a way if we need to reconcile the original sender's session with the session of the human. This might be needed because the human could be handling multiple sessions at once. One way to accomplish this would be to keep a separate session for the human inside the user's session and use that. Also, think about making a session have a 1:1 mapping with trip-fbid. Might make things easier..
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
  // TODO: awaitingResponse should be reset automatically after a certain period of time.
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
  sendTypingAction.call(this, senderID);
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
    sendTextMessage(senderID,"Even bots need to eat. Out for lunch! Be back in a bit(after fixing the internal server error)");
  })
}

function determineCities(existingTrip) {
	const trip = this.session.tripData();
  const country = trip.country;
  if(_.isUndefined(country.cities)) {
    logger.warn(`determineCities: countries not defined in trip ${trip.rawTripName}. Doing nothing`);
    return false;
  }
  // logger.info(`Asking user to select from the following cities: ${JSON.stringify(country)} for country ${trip.rawTripName}.`);
  sendTextMessage(this.session.fbid,`Which cities of ${country.name} are you traveling to?`);
  let uri = "cities";
  if(existingTrip) {
    uri = "add-cities";
  }
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
            title: "Select cities",
            buttons: [{
              type:"web_url",
              url: sendUrl.call(this, `${trip.rawTripName}/${uri}`),
              title:"Cities",
              webview_height_ratio: "compact",
              messenger_extensions: true,
            }]
          }]
        }
      }
    }
  };
  callSendAPI(messageData);
  return true;
}

function determineTravelCompanions() {
  sendTextMessage(this.session.fbid, `Choose your travel companions`);
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
            title: "Who are you traveling with?",
            buttons: [{
              type:"web_url",
              url: sendUrl.call(this, "friends"),
              title:"Choose Friends",
              webview_height_ratio: "compact",
              messenger_extensions: true,
              fallback_url: sendUrl.call(this, "friends")
            }]
          }]
        }
      }
    }
  };
  callSendAPI(messageData);
}

function sendAddOrGetOptions() {
  let msgSuffix = "";
  if(this.session.tripNameInContext) {
    msgSuffix = ` for your ${this.session.tripNameInContext} trip`;
  }
  const messageData = {
    recipient: {
      id: this.session.fbid
    },
    message: {
      text: `What would you like to do${msgSuffix}?`,
      quick_replies:[
        {
          content_type: "text",
          title: "Add ...",
          payload: "qr_add_"
        },
        {
          content_type: "text",
          title: "Get ...",
          payload: "qr_get_"
        }
      ]
    }
  };
  callSendAPI(messageData);
}

/*
 * Typically, this should match the top level entries in Persistent Menu.
 */
function sendHelpMessage() {
  const messageData = {
    recipient: {
      id: this.session.fbid
    },
    message: {
      text: `What would you like to do?`,
      quick_replies:[
        {
          content_type: "text",
          title: "Create new trip",
          payload: "qr_new_trip"
        },
        {
          content_type: "text",
          title: "Get Existing trips",
          payload: "qr_existing_trips"
        }
      ]
    }
  };
  callSendAPI(messageData);
}

// used by workflow for planningNewTrip
function sendYesNoButtons(message) {
  const messageData = {
    recipient: {
      id: this.session.fbid
    },
    message: {
      text: message,
      quick_replies:[
        {
          content_type: "text",
          title: "Yes",
          payload: "qr_yes",
        },
				{
					content_type: "text",
					title: "Re-enter trip details",
					payload: "qr_no",
				},
			]
		}
	};
	callSendAPI(messageData);
}

function sendAddButtons() {
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
            title: "Add", // Comments, Tasks, Pack list
            buttons:[{
              type: "postback",
              title: "Comments",
              payload: "add_comments",
            },
            {
              type: "postback",
              title: "Tasks",
              payload: "add_todo",
            },
            {
              type: "postback",
              title: "Pack item",
              payload: "add_pack_item",
            }],
          }, {
            title: "Add", // cities, Expense report 
            buttons:[{
              type: "postback",
              title: "Cities",
              payload: "add_cities"
            },
            {
              type: "postback",
              title: "Expense item",
              payload: "add_expense"
            },
            {
              type: "postback",
              title: "Travelers",
              payload: "add_travelers"
            }],
          }]
        }
      }
    }
  };
  callSendAPI(messageData);
}

/*
function sendOtherGetButtons() {
  const rawName = this.session.tripData().rawTripName;
  const elements = [
    {
      title: "Get",
        type: "web_url",
        url:sendUrl.call(this, `${rawName}/expense-report`),
        title: "Expense report",
        webview_height_ratio: "compact",
        messenger_extensions: true
      }]
    }
  ];
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
  callSendAPI(messageData);
  return;
}
*/

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

function sendTypingAction() {
  logger.info(`sendTypingAction: session id is ${this.session.sessionId}`);
  const messageData = {
    recipient: {
      id: this.session.fbid
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
      // logger.info("Successfully sent generic message with id %s to recipient %s", messageId, recipientId);
    } else {
      // TODO: If there was an error in sending an intercept message to a human, then send a push notification to the original sender that we are having some technical difficulty and will respond to them shortly.
      logger.error(`Unable to send message to recipient ${recipientId}. status code is ${response.statusCode}. Message from FB is <${response.body.error.message}>; Error type: ${response.body.error.type}`);
    }
  });  
}

module.exports = WebhookPostHandler;
