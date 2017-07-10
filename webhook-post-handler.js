'use strict';
const Notifier = require('notifications/app/notifier');

const baseDir = '/home/ec2-user';
const logger = require('./my-logger');
const Sessions = require('./sessions');
const Session = require('./session');
const FbidHandler = require('fbid-handler/app/handler');
const SecretManager = require('secret-manager/app/manager');
const ButtonsPlacement = require('get-buttons-placer/app/buttons-placement');
const watch = require('watch');
const fs = require('fs');
const RequestProfiler = require('./request-profiler');

const TripInfoProvider = require('./trip-info-provider');
const CommentParser = require('./expense-report/app/comment-parser');
const ExpenseReportWorkflow = require('./expense-report/app/workflow');
const CreateItinerary = require('trip-itinerary/app/create-itin');
const Commands = require('trip-itinerary/app/commands');

const _ = require('lodash');
const request = require('request');
const moment = require('moment-timezone');
const formidable = require('formidable');
const Promise = require('promise');
const validator = require('node-validator');

let TEST_MODE = false;
// NOTE: WebhookPostHandler is a singleton, so all state will need to be maintained in this.session object. fbidHandler is also a singleton, so that will be part of the WebhookPostHandler object.
function WebhookPostHandler(session, testing) {
  if(testing) TEST_MODE = true; // Use sparingly. Currently, only used in callSendAPI
  this.sessions = Sessions.get();
  this.fbidHandler = FbidHandler.get();
  if(session) {
    logger.info(`WebhookPostHandler: A session with id ${session.sessionId} was passed. Using that in the post hook handler`);
    this.passedSession = session;
    this.session = session;
  }
  this.notifier = new Notifier(this.sessions);
  this.logOnce = {};
  const self = this;
	// A Cheap way to trigger data update on changes across processes: Create a monitor that will trigger when files in ~/sessions changes, and reload the session that changed. This way, we don't have to reload sessions all over the place and this will work even across processes (for eg. when we create a new trip as a result of an itinerary or boarding pass email, the main webserver's sessions will automatically be reloaded within a few minutes)
  watch.createMonitor(Sessions.path(), { ignoreDotFiles: true }, function(monitor) {
    monitor.on('changed', function(f) {
      logger.debug(`file ${f} changed. reloading it`);
      const s = JSON.parse(fs.readFileSync(f, 'utf8'));
      self.sessions.reloadSession(s.sessionId);
      self.tripCount = null; // force tripCount to be reloaded in determineResponseType below
    });
  });
}

// called to handle every message from the customer.
function handleMessagingEvent(messagingEvent) {
  const fbid = messagingEvent.sender.id;
  // find or create the session here so it can be used elsewhere. Only do this if a session was NOT passed in the constructor.
  if(_.isUndefined(this.passedSession)) {
    this.session = this.sessions.findOrCreate(fbid);
  }
  else {
    this.session = this.passedSession;
  }
  if(!this.logOnce[this.session.sessionId]) {
    logger.debug(`handleMessagingEvent: First message from user ${this.session.fbid} with session ${this.session.sessionId} since this process started`);
    this.logOnce[this.session.sessionId] = true;
  }
  const promise = this.fbidHandler.add(fbid);
  if(promise) {
    promise.then(
      function(status) {
        if(status) {
          logger.info(`handleMessagingEvent: added new fbid ${fbid} to fbidHandler`);
        }
        else {
          logger.warn(`handleMessagingEvent: adding new fbid ${fbid} to fbidHandler. Expected status to be true but it was ${status}`);
        }
      },
      function(err) {
        logger.error(`handleMessagingEvent: error adding fbid ${fbid} to fbidHandler: ${err.stack}`);
      }
    );
  }
  // else logger.debug(`handleMessagingEvent: fbid ${fbid} already exists in fbidHandler file.`);
  // if promise was null, it means this fbid already exists in the fbidHandler file. So, nothing to do

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
      logger.error("Webhook received unknown messagingEvent: ", messagingEvent);
    }
  }
  catch(err) {
    logger.error("an exception was thrown: " + err.stack);
		sendTextMessage(messagingEvent.sender.id,"Even bots need to eat! Be back in a bit");
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
}

function enterTodoItemAsMessage() {
  this.session.awaitingTodoItem = true;
  sendTextMessage(this.session.fbid, "Enter a todo item");
}

function enterPackItemAsMessage() {
  this.session.awaitingPacklistItem = true;
  sendTextMessage(this.session.fbid, "Enter a pack-list item");
}

function setTripInContext(payload) {
  let tripName = payload.substring("trip_in_context ".length);
  this.session.setTripContextAndPersist(tripName);
}

WebhookPostHandler.prototype.urlButtonMessage = function(title, urlPath) {
  let messageData = {
    recipient: {
      id: this.session.fbid
    }
  };
  const tripData = this.session.tripData();
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
            webview_height_ratio: "full",
            messenger_extensions: true,
            fallback_url: sendUrl.call(this, urlPath)
          }]
        }]
      }
    }
  };
  return messageData;
}

function sendUrlButton(title, urlPath) {
  callSendAPI(this.urlButtonMessage(title, urlPath));
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
  const tripName = tripData.data.name;
  const buttons = new ButtonsPlacement(this.urlPrefix(), tripData).getPlacement();
  messageData.message = {
    attachment: {
      type: "template",
      payload: {
        template_type: "generic",
        elements: [{
          title: "Get", 
          buttons: buttons.firstSet
        }]
      }
    }
  };
  if(buttons.secondSet) {
    messageData.message.attachment.payload.elements.push({
      title: "Get",
      buttons: buttons.secondSet
    });
  }
  if(buttons.thirdSet) {
    messageData.message.attachment.payload.elements.push({
      title: "Get",
      buttons: buttons.thirdSet
    });
  }
  callSendAPI(messageData);
}

WebhookPostHandler.prototype.setWeatherAndItineraryForNewTrip = function(tripName) {
	if(!tripName) throw new Error(`setWeatherAndItineraryForNewTrip: required parameter "tripName" not passed.`);
	logger.debug(`setWeatherAndItineraryForNewTrip: This sessions' guid is ${this.session.guid}. Beginning to set weather and trip itinerary details for new trip ${tripName}`);
	// reload this session to get the latest details about trips for this session (like flight itinerary and return flight itinerary).
	const session = this.sessions.reloadSession(this.session.sessionId);
	const trip = session.getTrip(tripName);
	if(!trip) throw new Error(`setWeatherAndItineraryForNewTrip: could not find trip ${tripName} in session with fbid ${session.fbid}`);
  // logger.debug(`setWeatherAndItineraryForNewTrip: trip dump is ${JSON.stringify(trip)}`);
	const tip = new TripInfoProvider(trip, trip.flightItin[0].departure_airport.city);
	const weatherDetails = Promise.denodeify(tip.getWeatherInformation.bind(tip));

	// TODO: If this is a beach destinataion, use http://www.blueflag.global/beaches2 to determine the swimmability. Also use http://www.myweather2.com/swimming-and-water-temp-index.aspx to determine if water conditions are swimmable
	const self = this;
	return weatherDetails()
		.then(
			function(response) {
				const tripNameInContext = trip.tripName;
				try {
					const createItin = new CreateItinerary(trip, trip.flightItin[0].departure_airport.city);
					Promise.all(createItin.create()).done(
						function(values) {
							// nothing to do here if create succeeds. The itinerary will be persisted and can be obtained by reading the file, which is done in trip-data-formatter:displayCalendar when /calendar is called
							logger.info(`Successfully created itinerary for trip ${tripNameInContext}`);
						},
						function(error) {
							logger.error(`Error creating itinerary for trip ${tripNameInContext}: ${error.stack}`);
						}
					);
				}
				catch(e) {
					logger.error(`Error creating itinerary for trip ${tripNameInContext}: ${e.stack}`);
				}
			},
			function(err) {
				logger.error(`error in gathering data for trip ${tripNameInContext}: ${err.stack}`);
			}
		);
}

// Start collecting useful information for trip and update the user.
WebhookPostHandler.prototype.startPlanningTrip = function() {
  sendTextMessage(this.session.fbid, `Gathering weather, flight and stay related information for ${this.session.tripNameInContext}`);
  sendTypingAction.call(this);
	logger.debug(`startPlanningTrip: This sessions' guid is ${this.session.guid}`);

  const tip = new TripInfoProvider(this.session.tripData(), this.session.hometown);
  const activities = Promise.denodeify(tip.getActivities.bind(tip));
  // const flightDetails = Promise.denodeify(tip.getFlightDetails.bind(tip));
  const flightQuotes = tip.getFlightQuotes();
  const weatherDetails = Promise.denodeify(tip.getWeatherInformation.bind(tip));
  const dtdCallback = displayTripDetails.bind(this);

  // TODO: If this is a beach destinataion, use http://www.blueflag.global/beaches2 to determine the swimmability. Also use http://www.myweather2.com/swimming-and-water-temp-index.aspx to determine if water conditions are swimmable
  const self = this;
  activities()
    .then(weatherDetails())
    .then(flightQuotes)
    .done(
      function(response) {
        try {
          const createItin = new CreateItinerary(self.session.tripData(), self.session.hometown);
          const tripNameInContext = self.session.tripNameInContext;
          Promise.all(createItin.create()).done(
            function(values) {
              // nothing to do here if create succeeds. The itinerary will be persisted and can be obtained by reading the file, which is done in trip-data-formatter:displayCalendar when /calendar is called
              logger.info(`Successfully created itinerary for trip ${tripNameInContext}`);
            },
            function(error) {
              logger.error(`Error creating itinerary for trip ${tripNameInContext}: ${error.stack}`);
            }
          );
        }
        catch(e) {
          logger.error(`Error creating itinerary for trip ${tripNameInContext}: ${e.stack}`);
          // proceed to continue with other aspects of trip planning
        }
        dtdCallback();
      },
      function(err) {
        logger.error(`error in gathering data for trip ${tripNameInContext}: ${err.stack}`);
        // even if one of the previous promises were rejected, call the dtdCallback since some of them might have succeeded.
        dtdCallback();
      }
    );
}

function emailOrEnterDetails() {
  const quickReplies = [{
    content_type: "text",
    title: "Enter details",
    payload: "qr_enter_details"
  }, {
    content_type: "text",
    title: "Email",
    payload: "qr_email"
  }];

  const messages = [];
  messages.push(getTextMessageData(this.session.fbid, "Great! Let's plan your trip together."));
  messages.push({
    recipient: {
      id: this.session.fbid
    },
    message: {
      text: `Enter your details or simply email your flight itinerary (or boarding pass) and I will automatically create your trip`,
      quick_replies: quickReplies
    }
  });
  sendMultipleMessages(this.session.fbid, messages);
}

function planNewTrip(userChoice) {
  if(!userChoice) {
    // this will result in quick_replies that will be handled by handleQuickReplies
    emailOrEnterDetails.call(this); 
    return;
  }
  logger.info("User wants to plan a new trip");
  if(userChoice.enter_details) {
    const messages = [
      "Can you provide details about your trip: destination country, start date, duration (in days) as a comma separated list?",
      "Example: India,11/01,20 or India,11/01/17,20"
    ];
    sendMultipleMessages(this.session.fbid, textMessages.call(this, messages));
	  this.session.awaitingNewTripDetails = true;
    this.session.planningNewTrip = true;
    return;
  }
  if(userChoice.email) sendMultipleMessages(this.session.fbid, textMessages.call(this, [
    'Send your flight itinerary or boarding pass to "TRIPS@MAIL.POLAAMA.COM". As soon as we receive it, we will send you an "ack" message',
    'If your trip is starting within 24 hours, we will send you the boarding pass']));
}

function receivedPostback(event) {
  const senderID = event.sender.id;
  const recipientID = event.recipient.id;
  const timeOfPostback = event.timestamp;
  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  let payload = event.postback.payload;

  logger.info("Received postback for user %d, page %d, session %d at timestamp: %d. Payload: %s", senderID, recipientID, this.session.fbid, timeOfPostback, payload);

  if(payload === "GET_STARTED_PAYLOAD") return sendWelcomeMessage.call(this, senderID); 

  // A pmenu, past_trips or a postback starting with "trip_in_context" is indicative of the beginning of a new state in the state machine. So, clear the session's "awaiting" states to indicate the beginning of a new state.
  this.session.clearAllAwaitingStates();

	// new trip cta
  if(payload === "new_trip" || payload === "pmenu_new_trip") return planNewTrip.call(this);

  // existing trip
  if(payload.startsWith("trip_in_context")) {
    setTripInContext.call(this, payload);
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

  if(payload === "pmenu_existing_trips") return sendTripButtons.call(this);
  // Do not set past trip as trip context because there is not much users can do.
  if(payload === "past_trips") return sendPastTrips.call(this);
	
	// In order to add travelers to a trip, we need to know the trip in context.
  if(!this.session.doesTripContextExist()) { 
    logger.info("receivedPostback: no trip name in context. Asking user!");
    // store the current payload so it can be handled once we have the tripInContext.
    this.session.previousPayload = payload; 
    sendTripButtons.call(this, true /* add new trip */);
    return;
  }

  if(payload === "add_comments") return enterCommentAsMessage.call(this);
  if(payload === "add_todo") return enterTodoItemAsMessage.call(this);
  if(payload === "add_pack_item") return enterPackItemAsMessage.call(this);
  if(payload === "add_cities") return addCitiesToExistingTrip.call(this);
  if(payload === "add_expense") {
    this.session.expenseReportWorkflow = new ExpenseReportWorkflow(this.session);
    callSendAPI(this.session.expenseReportWorkflow.startWork());
    return;
  }
  if(payload === "add_travelers") return determineTravelCompanions.call(this);
  if(payload === "boarding_pass" || payload === "boarding pass") return sendBoardingPass.call(this);
  if(payload === "flight itinerary") return sendFlightItinerary.call(this);
  if(payload === "return flight") return sendReturnFlightDetails.call(this);
  if(payload === "hotel details") return sendHotelItinerary.call(this);
  if(payload.includes("-hotel-receipt")) return sendCityHotelReceipt.call(this, payload);
  if(payload === "car details") return sendCarReceipt.call(this);
  if(payload === "get receipt") return sendGeneralReceipt.call(this);

  const commands = new Commands(this.session.tripData(), this.session.fbid);
  if(payload.includes("recommendation_next_set")) return callSendAPI(commands.handleRecommendationPostback(payload));
  let handled = commands.handlePostback(payload);
  if(handled && (typeof handled === "object")) return callSendAPI(handled);
  handled = commands.handleActivityPostback(payload);
  if(handled && (typeof handled === "object")) return callSendAPI(handled);
  handled = commands.handleRecommendationPostback(payload);
  if(handled && (typeof handled === "object")) return callSendAPI(handled);

  // When an unknown postback is called, we'll send a message back to the sender to 
  // let them know it was successful
  sendTextMessage(senderID, `Unhandled Postback ${payload} called `);
}

function sendBoardingPass() {
    const boardingPass = (new Notifier(this.sessions)).getBoardingPass(this.session.tripData(), this.session.fbid);
    callSendAPI(boardingPass);
    return;
}

function sendReturnFlightDetails() {
  const trip = this.session.tripData();
  const fbid = this.session.fbid;
  callSendAPI({
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        type: "template",
        payload: JSON.parse(fs.readFileSync(trip.returnFlightFile(), 'utf8'))
      }
    }
  });
}

function sendFlightItinerary() {
  const trip = this.session.tripData();
  const fbid = this.session.fbid;
  callSendAPI({
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        type: "template",
        payload: JSON.parse(fs.readFileSync(trip.itineraryFile(), 'utf8'))
      }
    }
  });
}

function sendGeneralReceipt() {
  const fbid = this.session.fbid;
  const trip = this.session.tripData();
  const receiptFiles = trip.generalReceiptFile();
  if(receiptFiles.length > 1) throw new Error(`sendGeneralReceipt: We don't currently support handling more than 1 receipt`);
	const messages = [];
  const details = JSON.parse(fs.readFileSync(receiptFiles[0]));
  messages.push({
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        type: "template",
        payload: details.receipt
      }
    }
  });
  messages.push({
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        type: "template",
        payload: details.receipt_ext
      }
    }
  });
  sendMultipleMessages(this.session.fbid, messages);
}

function sendCarReceipt() {
  const fbid = this.session.fbid;
  const trip = this.session.tripData();
  const details = JSON.parse(fs.readFileSync(trip.rentalCarReceiptFile(), 'utf8'));
	const messages = [];
  messages.push({
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        type: "template",
        payload: details.receipt
      }
    }
  });
  messages.push({
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        type: "template",
        payload: details.receipt_ext
      }
    }
  });
  sendMultipleMessages(this.session.fbid, messages);
}

function sendTourDetails() {
	const TripReceiptManager = require('receipt-manager/app/trip-receipt-manager');
	const messages = [];
	messages.push({
		recipient: {
			id: this.session.fbid
		},
		message: {
			attachment: {
				type: "template",
				payload: new TripReceiptManager().handle()
			}
		}
	});
  messages.push(getTextMessageData(this.session.fbid, "See you at our place at 9 AM"));
  messages.push(getTextMessageData(this.session.fbid, "It will be 80˚F and clear skies. The water will be calm and visibility is 100 feet, perfect for diving!"));
  sendMultipleMessages(this.session.fbid, messages);
}

function sendCityHotelReceipt(payload) {
  const content = /(.*)-.*-.*/.exec(payload);
  if(!content) throw new Error(`cannot find city in hotel receipt postback: ${payload}`);
  const city = content[1];
  const trip = this.session.tripData();
  const details = trip.getHotelReceiptDetails();
  // logger.debug(`sendCityHotelReceipt: getting details for hotel [${content}]; ${city}: ${JSON.stringify(details[city])}`);
  sendHotelReceiptMessage.call(this, this.session.fbid, details[city]);
}

function sendHotelReceiptMessage(fbid, details) {
	const messages = [];
  messages.push({
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        type: "template",
        payload: details.receipt
      }
    }
  });
  messages.push({
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        type: "template",
        payload: details.receipt_ext
      }
    }
  });
  sendMultipleMessages(this.session.fbid, messages);
}

function sendHotelItinerary() {
  const fbid = this.session.fbid;
  const trip = this.session.tripData();
	const messages = [];
  const details = trip.getHotelReceiptDetails();
  if(!details) return sendTextMessage(fbid, `No hotel receipts for your ${trip.data.rawName} trip! If you have made hotel reservations, send receipt to TRIPS@MAIL.POLAAMA.COM`);
  const hotels = Object.keys(details);
  if(hotels.length > 1) {
    logger.debug(`cities with hotels: ${hotels}`);
    messages.push({
      recipient: {
        id: fbid
      },
      message: {
        text: "Which hotel's receipt would you like to see?",
        metadata: "hotel_receipt_list"
      }
    });
    const buttons = [];
    hotels.forEach(list => {
        buttons.push({
          "type": "postback",
          "title": `${list}`,
          "payload": `${list}-hotel-receipt`
        });
    });
    const elements = [];
    elements.push({
      title: "Hotel list",
      buttons: buttons
    });
    messages.push({
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
    });
    return sendMultipleMessages(this.session.fbid, messages);
  }
  sendHotelReceiptMessage.call(this, fbid, details[hotels[0]]);
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
      sendTextMessage(senderID, "Message with attachment received");
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

function sendPastTrips() {
  // reset this sessions' context
  this.session.resetTripContext();
  const elements = [];
  const tripNames = this.session.getPastTrips();
  tripNames.forEach(t => {
    elements.push({
      title: t.rawName,
      buttons: [{
        type: "web_url",
        url:sendUrl.call(this, `${t.name}`),
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
	// Anytime we send trips for users to choose from, invalidate the session's tripData so it can be re-read from file. This way, any information that was added to the trip (by other session instances like the one in webpage-handler.js) will be re-read.
	this.session.invalidateTripData();
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

  // if there is only one trip, there is no point in asking user
  // TODO: How would users get past trips in this case? Maybe add a separate "past trips" in Persistent Menu.
  if(tripNames.length === 1) {
    const t = tripNames[0];
    this.session.setTripContextAndPersist(t.name);
    sendAddOrGetOptions.call(this);
    return;
  }
    
  // reset this sessions' context
  this.session.resetTripContext();
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
      title: t.rawName,
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

function handleQuickRepliesToPlanNewTrip(quick_reply) {
  const payload = quick_reply.payload;
  if(!payload) throw new Error(`handleQuickRepliesToPlanNewTrip: payload is undefined in passed quick_reply: ${JSON.stringify(quick_reply)}`);
  // This quick reply came from the user typing "help" (see getHelpMessage)
  if(payload === "qr_new_trip") {
    planNewTrip.call(this);
    return true;
  }

  // this quick reply came in response to emailOrEnterDetails
  if(payload === "qr_email") {
    planNewTrip.call(this, { email: true });
    return true;
  }
  if(payload === "qr_enter_details") {
    planNewTrip.call(this, { enter_details: true });
    return true;
  }

  return false;
}

function handleQuickReplies(quick_reply) {
  const payload = quick_reply.payload;
  if(!payload) throw new Error(`handleQuickReplies: payload is undefined in passed quick_reply: ${JSON.stringify(quick_reply)}`);

  // User clicked on "Add ..." or "Get ..." in help message or after choosing a trip under "Existing trips"
  if(payload === "qr_add_") {
    sendAddButtons.call(this);
    return true;
  }
  if(payload === "qr_get_") {
    displayTripDetails.call(this);
    return true;
  }

  // This quick reply came from the user typing "help" (see getHelpMessage)
  if(payload === "qr_existing_trips") {
		sendTripButtons.call(this);
    return true;
  }

  logger.warn(`handleQuickReplies: Session ${this.session.fbid}: quick_reply not handled here ${JSON.stringify(quick_reply)}`);
  return false;
}

function validateStartDate(value, onError) {
  const now = moment().tz("Etc/UTC");
  
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
  const startDate = moment.tz(value, "Etc/UTC");
  // logger.debug(`Time now is ${now}; Passed value is ${new Date(value).toISOString()}. Difference is ${now.diff(startDate, 'days')}`);
  if(now.diff(startDate,'days') >= 0) {
    return onError("Provided start date is in the past", "", value);
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
  this.tripCount = this.session.getCurrentAndFutureTrips().futureTrips.length;
  const tripData = this.session.tripData();
  tripData.addTripDetailsAndPersist(tripDetails);
  logger.info(`createNewTrip: This session's trip name in context is ${tripDetails.destination}`);
  this.session.awaitingNewTripDetails = false;
}

function extractNewTripDetails(messageText) {
	// short-circuit parsing the input and validation if the data already existed.
	if(this.session.previouslyEnteredTripDetails && this.session.previouslyEnteredTripDetails.tripStarted) {
		logger.debug(`extractNewTripDetails: User previously entered trip information and the trip has already started. Creating new trip`);
		createNewTrip.call(this, this.session.previouslyEnteredTripDetails);
		return;
	}
  const td = messageText.split(',');
  if(td.length != 3) {
    logger.error(`extractNewTripDetails: Expected 3 items in tripDetails, but only found ${td.length}: [${td}]. Message text: ${messageText}`);
    const error = [];
    error.push({
      message: "invalid separator. Please enter a comma separated list of destination country, start date and duration (in days)"
    });
    return error;
  }
  if(td[1].match(/^ *\d+\/\d+$/)) { // if date is of the form "1/1", "10/10" or " 1/10", append year
    td[1] = td[1].concat(`/${new Date().getFullYear()}`);
  }
  const tripDetails = {
    destination: td[0].trim(),
    startDate:  td[1].trim(),
    duration: parseInt(td[2].trim()) 
  };
  const customValidator = {
      validate: validateStartDate
  };
	logger.debug(`Validating trip data: ${JSON.stringify(tripDetails)}`);
  // validate tripData
  const check = validator.isObject()
    .withRequired('duration', validator.isInteger({min: 1, max: 200}))
    .withRequired('startDate', customValidator)
    .withRequired('destination', validator.isString({regex: /^[A-Z a-z]+$/}));
  
  var error = null;
  validator.run(check, tripDetails, function(ec, e) {
    if(ec > 0) {
      error = e;
    }
    return;
  });
  if(error) {
		if(error.length === 1 && error[0].message.startsWith("Provided")) {
			logger.warn(`extractNewDetails: Validation error thrown ${JSON.stringify(error)}`);
			// store the tripDetail so we can use this depending on how the user responds to this question.
			this.session.previouslyEnteredTripDetails = tripDetails;
			throw new UserConfirmation('Provided date is in the past. Has your trip already started?');
		}
    logger.warn(`extractNewDetails: Validation error: ${JSON.stringify(error)}`);
    return error;
  }
	createNewTrip.call(this, tripDetails);
}

// TODO: this duplicates functionality in webpage-handler.formParseCallback. Fix it. 
function getCityDetailsAndStartPlanningTrip(messageText, existingTrip) {
  try {
    const input = messageText.split(',');
    const regex = /^[A-Z a-z]+\((\d+)\)/;
    const check = validator.isArray(validator.isString({'regex': regex, message: "It should be of the form 'city(2)'"}), {min: 1});
    let error = null;
    validator.run(check, input, function(ec, e) {
      if(ec > 0) error = new Error(`Invalid input value "${e[0].value}": ${e[0].message}`);
    });
    if(error) throw error;
    let cities = [];
    let numberOfDays = [];
    input.forEach(item => {
      cities.push(item.split('(')[0]);
      numberOfDays.push(item.match(regex)[1]);
    });
    
    if(existingTrip) {
      this.session.awaitingCitiesForExistingTrip = false;
    }
    else {
      this.session.tripData().addPortOfEntry(cities[0]); // assume that the first city is port of entry. See determineResponseType 3rd step in new trip workflow
      this.session.awaitingCitiesForNewTrip = false;
    }
    // TODO: Validate city is valid by comparing against list of known cities
    this.session.tripData().addCityItinerary(cities, numberOfDays);
    // indicate that tripData for this trip is stale in the session object so that trip data will be read from the file
    this.session.invalidateTripData();
  }
  catch(e) {
    logger.error(`getCityDetailsAndStartPlanningTrip: exception calling getCityDetailsAndStartPlanningTrip: ${e.stack}`);
    sendTextMessage(this.session.fbid, e.message);
    return;
  }
  const tripData = this.session.tripData();
  if(tripData.data.cities) {
    logger.debug(`getCityDetailsAndStartPlanningTrip: cities available for trip ${tripData.rawTripName}. Start planning trip for customer ${this.session.fbid}`);
    this.session.planningNewTrip = false;
    this.startPlanningTrip();
  }
  else {
    logger.error(`getCityDetailsAndStartPlanningTrip: Session ${this.session.sessionId}: Cannot determine cities for trip ${tripData.data.country} even after getting cities from customer. Possible BUG!`);
    sendTextMessage(this.session.fbid,"Even bots need to eat! Be back in a bit..");
  }
}

// TODO: This code duplicates some aspects of "getting cities for the trip" in determineResponseType. Fix that.
function addCitiesToExistingTrip() {
  const tripData = this.session.tripData();
  if(determineCities.call(this, true /* existingTrip */)) return;
  if(!this.session.awaitingCitiesForExistingTrip) {
    const messages = [
      `For your trip to ${tripData.data.country}, add cities and number of days in each city in the following format`,
      `seattle(3),portland(4),sfo(5)` 
    ];
    sendMultipleMessages(this.session.fbid, textMessages.call(this, messages));
    this.session.awaitingCitiesForExistingTrip = true;
    // After user enters the additional cities, determineResponseType will be called and the code block that checks for awaitingCitiesForExistingTrip and takes action
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
  if(!this.tripCount) this.tripCount = this.session.getCurrentAndFutureTrips().futureTrips.length;
  if(mesg === "hello" || mesg === "hi" || mesg === "howdy" || mesg === "hiya" || mesg.startsWith("help ") || mesg === "help") {
    if(mesg.startsWith("help ") || mesg === "help") {
      // clear all states 
      this.session.clearAllAwaitingStates();
      if(this.session.doesTripContextExist()) return sendAddOrGetOptions.call(this);
    }
    if(this.tripCount) {
      const messages = [];
      messages.push(getTextMessageData(senderID, "Hi! Welcome back to Polaama. How can I help you today?"));
      messages.push(getHelpMessageData.call(this, senderID, "Choose from the options below."));
      return sendMultipleMessages(senderID, messages);
    }
    return sendWelcomeMessage.call(this, senderID);
  }

  if(event.message.quick_reply && handleQuickRepliesToPlanNewTrip.call(this, event.message.quick_reply)) return;

  // At this point, if no trip exists and it's not being planned, the user has entered something we don't understand. Simply send them the Welcome message.
  if(!this.tripCount && !this.session.planningNewTrip) return callSendAPI(getHelpMessageData.call(this, senderID, "Hi, I am your new personal travel assistant. Would you like to create a new trip to get started?"));

  // if we don't know what trip is being discussed, ask the user for this, unless the user is adding details about a new trip.
  if(!this.session.doesTripContextExist() && !this.session.planningNewTrip) {
    logger.info("determineResponseType: no trip name in context. Asking user!");
    sendTripButtons.call(this, true);
    return;
  }

  // New trip workflow
  if(this.session.planningNewTrip) {
    // 1) Extract trip details like country, start date and duration
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
					sendTextMessage(messagingEvent.sender.id,"Even bots need to eat! Be back in a bit..");
					return;
				}
			}
			try {
      	const err = extractNewTripDetails.call(this, messageText);
      	if(err) {
          const param = (err[0].parameter) ? `parameter ${err[0].parameter}`: "";
        	sendTextMessage(this.session.fbid, `Input error: ${param}:${err[0].message}`);
        	return;
      	}
			}
			catch(e) {
				// Assume that the only exception being thrown now is UserConfirmation. Update if this changes in the future
				logger.debug(`determineResponse type: error thrown ${e}; ${e.stack}`);
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
  
    // 3) If we already asked for cities, handle that and start planning. Else, get cities for the trip.
    // TODO: Handle case where user does not yet know which cities they are going to!
    if(this.session.awaitingCitiesForNewTrip) return getCityDetailsAndStartPlanningTrip.call(this, messageText);

    const tripData = this.session.tripData();
    if(!determineCities.call(this)) {
      // ask user to enter cities and port of entry because we don't have that data yet.
      const messages = [
        `For your trip to ${tripData.data.country}, add cities and number of days in each city in the following format`,
        `seattle(3),portland(4),sfo(5)`,
        `The first city in your list will be the port of entry` 
      ];
      sendMultipleMessages(this.session.fbid, textMessages.call(this, messages));
      this.session.awaitingCitiesForNewTrip = true;
      return;
    }
    else { 
      // determineCities returned true, indicating that we have city list information
      // End of new trip workflow. The workflow will complete when user selects cities (handled by determineCities function) and webpage-handler.js calls the startPlanningTrip method
      // TODO: Rather than let webpage-handler.js call startPlanning (and thus exposing this functionality there), consider calling startPlanningTrip from here.. The presence of tripData.data.cities can be a signal from webpage-handler.js's formParseCallback method that the cities were correctly chosen and added here.
      this.session.planningNewTrip = false;
      this.session.awaitingCitiesForNewTrip = false;
			// invalidate this trip in the session so that it will be fetched from a datastore.
			this.session.invalidateTripData();
    }
    return;
  }

  if(this.session.awaitingCitiesForExistingTrip) return getCityDetailsAndStartPlanningTrip.call(this, messageText, true /* existing trip */);

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
      sendTextMessage(senderID,"Even bots need to eat. Out for lunch! Be back in a bit..");
    }
    return;
  }

  if(event.message.quick_reply) { 
    if(handleQuickReplies.call(this, event.message.quick_reply)) return;
    // if it was not handled, it's possible that the quick_reply is meant for some other step below. continue on.
  }

  const tripData = this.session.tripData();
  // same as user choosing "Add" after choosing trip from "Existing trip" persistent menu
  if(mesg === "add") return sendAddButtons.call(this);
  // same as user choosing "Get" after choosing trip from "Existing trip" persistent menu
  if(mesg === "get") return displayTripDetails.call(this); 
  // same as user clicking "existing trips" on persistent menu
  if(mesg === "existing trips" || mesg === "trips") return sendTripButtons.call(this); 
  if(mesg.startsWith("save ") || mesg.startsWith("comment ") || this.session.awaitingComment) {
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
  if(mesg.startsWith("pack ") || this.session.awaitingPacklistItem) {
    const returnString = tripData.storePackList(messageText);
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
  if(mesg.startsWith("get list") || mesg.startsWith("get pack") || mesg === "packlist" || mesg === "pack") {
    sendUrlButton.call(this, "Get pack-list", tripData.packListPath());
    return;
  }
	if(mesg.startsWith("get trip details") || mesg.startsWith("trip details") || mesg.startsWith("trip calendar") || mesg.startsWith("get trip calendar") || mesg.startsWith("calendar") || mesg.startsWith("trip itinerary") || mesg.startsWith("itinerary") || mesg.startsWith("get itinerary")) return sendUrlButton.call(this, `${tripData.data.rawName} Trip calendar`, `${tripData.data.name}/calendar`);
	if(mesg.startsWith("tomorrow's plans") || mesg.startsWith("plans for tomorrow") || mesg.startsWith("get plans for tomorrow")) return sendUrlButton.call(this, `Day plan`, `${tripData.data.rawName}/day-plan`);

  if(mesg.startsWith("deals")) return retrieveDeals(senderID, messageText);
  if(mesg.startsWith("top activity list") || mesg.startsWith("top activities") || mesg.startsWith("get top activities")) {
    sendActivityList.call(this, messageText);
    return;
  }
  if(mesg.startsWith("other activity list") || mesg.startsWith("other activities") || mesg.startsWith("get other activities")) {
    sendOtherActivities.call(this, messageText);
    return;
  }
  if(mesg.startsWith("get boarding pass") || mesg.startsWith("boarding pass")) return sendBoardingPass.call(this);
  if(mesg.startsWith("get flight itinerary") || mesg.startsWith("flight")) return sendFlightItinerary.call(this);
  if(mesg.startsWith("get car details") || mesg.startsWith("car")) return sendCarReceipt.call(this);
  if(mesg.startsWith("get receipt") || mesg.startsWith("receipt ")) return sendGeneralReceipt.call(this);
  if(mesg.startsWith("get hotel details") || mesg.startsWith("hotel")) return sendHotelItinerary.call(this);
	if(mesg.startsWith("get tour details") || mesg.startsWith("tour details")) return sendTourDetails.call(this);
  if(mesg.startsWith("get return flight") || mesg.startsWith("return flight")) return sendReturnFlightDetails.call(this);

  const commands = new Commands(tripData, this.session.fbid);
  const canHandle = commands.canHandle(mesg);
  if(canHandle) {
    // case where user entered an invalid message.
    if(typeof canHandle === "object") return callSendAPI(canHandle); 
    const itinAsList = commands.handle(mesg); 
    if(typeof itinAsList === "object") return callSendAPI(itinAsList);
    logger.warn(`determineResponseType: Could not get list template from Commands. Defaulting to sending url`);
    return sendUrlButton.call(this, `Itin for ${mesg}`, `${tripData.data.name}/${commands.getPath()}`);
  }
  if(commands.canHandleActivity(mesg)) {
    const result = commands.handleActivity(mesg);
    if(result) return callSendAPI(result);
  }

  if(commands.canHandleMealsCommand(mesg)) {
    const result = commands.handleMealsCommand(mesg);
    if(result) return callSendAPI(result);
  }

  logger.debug(`determineResponseType: Did not understand the context of message <${mesg}>. Dump of session states: ${this.session.dumpState()}`);
  // We don't understand the text sent. Simply present the options we present on "getting started".
  return callSendAPI(getHelpMessageData.call(this, senderID, "Hi, I did not understand what you said. I can help you with the following."));
  
  // ****** INTENTIONALLY UNREACHABLE CODE 
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
      const todoList = trip.getTodoList();
      logger.info(`sendReminderNotification: Trip ${trip.data.name} from session ${id} has ${todoList.length} todo items.`);
      if(!todoList.length) return;
      const now = moment().tz("Etc/UTC");
      const tripEnd = moment.tz(trip.data.returnDate, "Etc/UTC");
      if(now.diff(tripEnd,'days') >= 0) {
        logger.debug(`Trip ${trip.data.name} started on ${trip.data.startDate} and has a duration of ${trip.data.duration} days. No longer sending reminder because the trip is over (difference is ${now.diff(tripEnd,'days')} days).`);
        return;
      }
      // only send reminder if we are within 45 days of the trip.
      const startDate = moment.tz(trip.data.startDate, "Etc/UTC");
      const daysToTrip = startDate.diff(now, 'days');
      if(daysToTrip <= 45) {
        sendTextMessage(sessions[id].fbid, `Reminder: You still have ${todoList.length} items to do for your trip to ${trip.data.name}`);
        // TODO: Add a button for user to get the list of todo items.
      }
      else {
        logger.info(`Not sending reminder because there are ${daysToTrip} days to the trip ${trip.data.name}`);
      }
    });
  });
}

WebhookPostHandler.prototype.notifyAdmin = function(emailId) {
  const fbid = Session.adminId;
  logger.debug(`notifyAdmin: fbid is ${fbid}, email is ${emailId}`);
  return sendTextMessage(fbid, `[ACTION REQD]: You got email from ${emailId}`);
}

WebhookPostHandler.prototype.notifyUser = function(message) {
	sendTextMessage(this.session.fbid, message);
}

WebhookPostHandler.prototype.sendBoardingPass = function(message) {
  callSendAPI(message);
}

WebhookPostHandler.prototype.pushTripDetailsJustBeforeTrip = function() {
  // logger.debug(`Type of this is ${this.constructor.name}`);
  const sessions = this.sessions.allSessions();
  this.notifier.imminentTripsList().forEach(message => {
    this.sendBoardingPass(message);
  }, this);
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
    sendTextMessage(senderID,"Even bots need to eat. Out for lunch! Be back in a bit..");
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
              url: sendUrl.call(this, `${trip.data.name}/${uri}`),
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
  const trip = this.session.findTrip();
  if(!trip) throw new Error(`Expected trip context to be present for fbid ${this.session.fbid}. Possible BUG!`);
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
              fallback_url: sendUrl.call(this, `${trip.data.name}/friends`)
            }]
          }]
        }
      }
    }
  };
  callSendAPI(messageData);
}

// only call this method if there is a trip name in context
function sendAddOrGetOptions() {
  if(!this.session.tripNameInContext) throw new Error(`sendAddOrGetOptions: I was called even though there is no trip in context in session ${this.session.sessionId}. Potential BUG!`);
  const messageData = {
    recipient: {
      id: this.session.fbid
    },
    message: {
      text: `What would you like to do for your ${this.session.rawTripNameInContext} trip?`,
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
function getHelpMessageData(senderID, message) {
  if(!message) message = "What would you like to do?";
  const quickReplies = [{
    content_type: "text",
    title: "New trip",
    payload: "qr_new_trip"
  }];
  if(this.tripCount) quickReplies.push({
      content_type: "text",
      title: "Existing trips",
      payload: "qr_existing_trips"
  });
  return {
    recipient: {
      id: senderID
    },
    message: {
      text: `${message}`,
      quick_replies: quickReplies
    }
  };
}

function sendWelcomeMessage(senderID) {
  const messages = [];
  messages.push(getTextMessageData(senderID, "Hi there! Welcome to Polaama, your personal travel assistant!"));
  messages.push(getHelpMessageData.call(this, senderID, "Create a new trip to see how we can simplify travel planning for you."));
  return sendMultipleMessages(senderID, messages);
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
  callSendAPI(getTextMessageData(senderID, messageText));
}

WebhookPostHandler.prototype.sendAnyMessage = function(message) {
  callSendAPI(message);
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

WebhookPostHandler.prototype.sendMultipleMessages = sendMultipleMessages;

// send messages strictly one after another
function sendMultipleMessages(recipientId, messages) {
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
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: (new SecretManager()).getPageAccessToken() },
    method: 'POST',
    json: messages[0]
  }, function (error, response, body) {
    if (response.statusCode == 200) {
      // recursively call, but remove the first element from the array
      sendMultipleMessages(recipientId, messages.slice(1, messages.length));
      return;
    }
    if(error) {
      logger.error(`sendMultipleMessages: Error sending message: ${error}`);
      return;
    }
    logger.error(`Unable to send message <${JSON.stringify(messages[0])}> to recipient ${recipientId}. status code is ${response.statusCode}. Message from FB is <${response.body.error.message}>; Error type: ${response.body.error.type}`);
  });  
}

function callSendAPI(messageData) {
  if(TEST_MODE) return logger.debug(`MESSAGE TO CHAT: ${JSON.stringify(messageData)}`);
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: (new SecretManager()).getPageAccessToken() },
    method: 'POST',
    json: messageData
  }, function (error, response, body) {
    if(error) return logger.error(`callSendAPI: Unable to send message ${JSON.stringify(messageData)}: ${error}`);
     // TODO: If there was an error in sending an intercept message to a human, then send a push notification to the original sender that we are having some technical difficulty and will respond to them shortly.
    if(response.statusCode != 200) logger.error(`Unable to send message ${JSON.stringify(messageData)}. status code is ${response.statusCode}. Message from FB is <${response.body.error.message}>; Error type: ${response.body.error.type}`);
  });  
}

// ********************************* TESTING *************************************
WebhookPostHandler.prototype.testing_determineResponseType = determineResponseType;
WebhookPostHandler.prototype.testing_createNewTrip = createNewTrip;
WebhookPostHandler.prototype.testing_displayTripDetails = displayTripDetails;
WebhookPostHandler.prototype.testing_receivedPostback = receivedPostback;

// ********************************* TESTING *************************************

module.exports = WebhookPostHandler;
