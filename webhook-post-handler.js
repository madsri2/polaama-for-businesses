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
const TravelSfoPageHandler = require('travel-sfo-handler');
const SeaSprayHandler = require('sea-spray-handler');
const HackshawHandler = require('hackshaw-handler');

let recordMessage = true;
let previousMessage = {};
let pageAccessToken;

let TEST_MODE = false;
// NOTE: WebhookPostHandler is a singleton, so all state will need to be maintained in this.session object. fbidHandler is also a singleton, so that will be part of the WebhookPostHandler object.
function WebhookPostHandler(session, testing, pageId) {
  if(testing) TEST_MODE = true; // Use sparingly. Currently, only used in callSendAPI
  this.travelSfoPageHandler = new TravelSfoPageHandler();
  this.seaSprayHandler = new SeaSprayHandler(TEST_MODE);
  this.hackshawHandler = new HackshawHandler();
	this.pageId = PageHandler.defaultPageId;
  if(pageId) this.pageId = pageId;
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
function handleMessagingEvent(messagingEvent, pageId) {
  const fbid = messagingEvent.sender.id;
  // find or create the session here so it can be used elsewhere. Only do this if a session was NOT passed in the constructor.
  if(_.isUndefined(this.passedSession)) this.session = this.sessions.findOrCreate(fbid);
  else this.session = this.passedSession;
  this.sessionState = this.sessions.getSessionState(this.session.sessionId);
  if(!this.sessionState) {
    logger.error(`cannot find session state for sessionId ${this.session.sessionId}. Cannot proceed without it. session dump: ${JSON.stringify(this.session)}`);
    return sendTextMessage.call(this, fbid,"Even bots need to eat! Be back in a bit..");
  }
  if(!this.logOnce[this.session.sessionId]) {
    logger.debug(`handleMessagingEvent: First message from user ${this.session.fbid} with session ${this.session.sessionId} since this process started.`);
    this.logOnce[this.session.sessionId] = true;
  }
  const promise = this.pageHandler.add(fbid, pageId);
  const self = this;
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
            sendTextMessage.call(this, fbid,"Even bots need to eat! Be back in a bit");
          }
        }
        catch(err) {
          logger.error("an exception was thrown: " + err.stack);
          sendTextMessage.call(this, fbid,"Even bots need to eat! Be back in a bit");
        }
      }
      else {
        logger.warn(`handleMessagingEvent: adding new fbid ${fbid} to fbidHandler. Expected status to be true but it was ${status}`);
        sendTextMessage.call(this, messagingEvent.sender.id,"Even bots need to eat! Be back in a bit");
      }
      return Promise.resolve(true);
    },
    function(err) {
      logger.error(`handleMessagingEvent: error adding fbid ${fbid} to fbidHandler: ${err.stack}`);
      sendTextMessage.call(this, messagingEvent.sender.id,"Even bots need to eat! Be back in a bit");
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

function handlePageEntry(pageEntry) {
		this.pageId = pageEntry.id;
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
  // You must send back a 200, within 20 seconds, to let us know you've 
  // successfully received the callback. Otherwise, the request will time out.
  res.sendStatus(200);
}

function greetingForAnotherPage(fbid) {
  let response;
  switch(this.pageId) {
    case PageHandler.travelSfoPageId: 
      response = this.travelSfoPageHandler.greeting(this.pageId, fbid);
      break;
    case PageHandler.mySeaSprayPageId:
      response = this.seaSprayHandler.greeting(this.pageId, fbid);
      break;
    case PageHandler.myHackshawPageId:
      response = this.hackshawHandler.greeting(this.pageId, fbid);
      break;
  }
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
  let response;
  switch(this.pageId) {
    case PageHandler.travelSfoPageId: 
      response = this.travelSfoPageHandler.handlePostback(payload, this.pageId, fbid);
      break;
    case PageHandler.mySeaSprayPageId:
      return this.seaSprayHandler.handlePostback(payload, this.pageId, fbid);
      // break;
    case PageHandler.myHackshawPageId:
      response = this.hackshawHandler.handlePostback(payload, this.pageId, fbid);
      break;
  }
  if(!response) return false;
  if(Array.isArray(response)) this.sendMultipleMessages(fbid, response);
  else callSendAPI.call(this, response);
  return true;
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

function sendBoardingPass() {
    const boardingPass = (new Notifier(this.sessions)).getBoardingPass(this.session.tripData(), this.session.fbid);
    callSendAPI.call(this, boardingPass);
    return;
}

function sendReturnFlightDetails() {
  const trip = this.session.tripData();
  if(!fs.existsSync(trip.returnFlightFile())) {
    logger.warn(`sendReturnFlightDetails: No flight details exists for trip ${trip.rawTripName}`);
    if(!fs.existsSync(trip.itineraryFile())) {
      return sendNotFoundMessage.call(this, "flight", trip.rawTripName);
      // return this.sendTextMessage(this.session.fbid,`No flight itinerary present for your trip to ${trip.rawTripName}. If you have already booked a flight, send it to TRIPS@MAIL.POLAAMA.COM`);
    }
  }
  const fbid = this.session.fbid;
  const messageList = [];
  messageList.push({
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
  this.showReturnFlight = false;
  if(this.showOnwardFlight) {
    messageList.push({
      recipient: {
        id: fbid
      },
      message: {
        text: "See onward flight",
        quick_replies:[
          {
            content_type: "text",
            title: "Onward flight",
            payload: "qr_onward_flight",
          }
        ]
      }
    });
  }
  sendMultipleMessages.call(this, fbid, messageList);
}

function sendFlightBookingMessage(ssMinPrice) {
   const trip = this.session.tripData();
   const departureCode = trip.data.departureCityCode;
   const arrivalCode = trip.data.portOfEntryCode;
   const numPassengers = 1;
   const startDate = trip.data.startDate;
   const returnDate = trip.data.returnDate;
   const sdMoment = new moment(startDate);
   const startDay = sdMoment.date() < 10 ? `0${sdMoment.date()}` : sdMoment.date(); 
   const startMonth = (sdMoment.month()+1) < 10 ? `0${sdMoment.month()+1}` : sdMoment.month()+1; 
   const startYear = sdMoment.year();
   const rdMoment = new moment(returnDate);
   const returnDay = rdMoment.date() < 10 ? `0${rdMoment.date()}` : rdMoment.date();
   const returnMonth = (rdMoment.month()+1) < 10 ? `0${rdMoment.month()+1}` : rdMoment.month()+1; 
   const returnYear = rdMoment.year();
   const expediaStartDate = `${startMonth}%2F${startDay}%2F${startYear}`;
   const expediaReturnDate = `${returnMonth}%2F${returnDay}%2F${returnYear}`;
   const skyscannerSubtitle = (ssMinPrice) ? `Prices starting from $${ssMinPrice}/- (non-stop)` : "";
   // url: "https://www.expedia.com/Flights-Search?flight-type=on&starDate=09%2F09%2F2017&endDate=09%2F15%2F2017&_xpid=11905%7C1&mode=search&trip=roundtrip&leg1=from%3AEWRto%3ASFO%2Cdeparture%3A09%2F09%2F2017TANYT&leg2=from%3ASFOtoEWR%2Cdeparture%3A09%2F15%2F2017TANYT&passengers=children%3A0%2Cadults%3A1%2Cseniors%3A0%2Cinfantinlap%3AY"
   const skyscannerApiKey = this.secretManager.getSkyscannerApiKey();
   const message = {
     recipient: {
       id: this.session.fbid
     },
     message: {
       attachment: {
         "type": "template",
         payload: {
           template_type: "list",
           elements: [
             {
               "title": `Flight Booking`,
               "image_url": "http://icons.iconarchive.com/icons/andrea-aste/torineide/256/turin-map-detail-icon.png"
             },
             {
               "title": "Skyscanner",
               "subtitle": skyscannerSubtitle,
               "image_url": "https://www.skyscanner.com/images/opengraph.png",
               "buttons": [{
                 title: "Book",
                 type: "web_url",
                 url: `http://partners.api.skyscanner.net/apiservices/referral/v1.0/US/USD/en-US/${departureCode}/${arrivalCode}/${startDate}/${returnDate}?apiKey=${skyscannerApiKey}`
               }]
             },
             {
               "title": "Kayak",
               "image_url": "http://www.simplebooking.travel/wp-content/uploads/2016/07/kayak-logo.png",
               "buttons": [{
                 title: "Book",
                 type: "web_url",
                 url: `https://www.kayak.com/flights/${departureCode}-${arrivalCode}/${startDate}/${returnDate}`
               }]
             },
             {
               "title": "Expedia",
               "image_url": "https://viewfinder.expedia.com/img//exp_us_basic_lrg_4c_rgb.jpg",
               "buttons": [{
                 title: "Book",
                 type: "web_url",
                 url: `https://www.expedia.com/Flights-Search?flight-type=on&starDate=09%2F09%2F2017&endDate=09%2F15%2F2017&_xpid=11905%7C1&mode=search&trip=roundtrip&leg1=from%3A${departureCode}to%3A${arrivalCode}%2Cdeparture%3A${expediaStartDate}TANYT&leg2=from%3A${arrivalCode}to${departureCode}%2Cdeparture%3A${expediaReturnDate}TANYT&passengers=children%3A0%2Cadults%3A1%2Cseniors%3A0%2Cinfantinlap%3AY`
               }]
             }
           ]
         }
       }
     }
   };
   return callSendAPI.call(this, message);
}

function showFlightBookingOptions() {
  const trip = this.session.tripData();
  const tip = new TripInfoProvider(trip);
  const promise = tip.getLowestNonstopPrice();
  const self = this;
  promise.done(
    function(ssMinPrice) {
      sendFlightBookingMessage.call(self, ssMinPrice);
    },
    function(err) {
      logger.error(`showFlightBookingOptions: error getting min price from browse quotes: ${err.stack}. Proceeding without min price`);
      sendFlightBookingMessage.call(self);
    }
  );
}

function sendFlightItinerary() {
  const trip = this.session.tripData();
  if(!fs.existsSync(trip.itineraryFile())) {
    logger.warn(`sendFlightItinerary: No flight details exists for trip ${trip.rawTripName}`);
    if(!fs.existsSync(trip.returnFlightFile())) {
      return sendNotFoundMessage.call(this, "flight", trip.rawTripName);
      // return this.sendTextMessage(this.session.fbid,`No flight itinerary present for your trip to ${trip.rawTripName}. If you have already booked a flight, send it to TRIPS@MAIL.POLAAMA.COM`);
    }
  }
  const fbid = this.session.fbid;
  const messageList = [];
  messageList.push({
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
  this.showOnwardFlight = false;
  if(this.showReturnFlight) {
    messageList.push({
      recipient: {
        id: fbid
      },
      message: {
        text: "See return flight",
        quick_replies:[
          {
            content_type: "text",
            title: "Return flight",
            payload: "qr_return_flight",
            // image_url: ""
          }
        ]
      }
    });
  }
  sendMultipleMessages.call(this, fbid, messageList);
}

function createElementsList(payloadPrefix, elArray, title) {
  const elements = [];
  const buttons = [];
  elArray.forEach((receipt,i) => {
    const j = parseInt(i/3);
    if(!buttons[j]) {
      buttons[j] = [];
    }
    buttons[j].push({
      type: "postback",
      title: `${Encoder.decode(receipt)}`,
      payload: `${payloadPrefix} ${receipt}`
    });
  });
  let lastIndex = buttons.length - 1;
  let numDashes = 3 - buttons[lastIndex].length;
  // if numDashes is 0, the number of trips is an exact multiple of 3. Add another entry in buttons array
  while(numDashes-- > 0) {
    // fill the remaining slots with "-"
    buttons[lastIndex].push({
      type: "postback",
      title: "-",
      payload: "dash"
    });
  }
  buttons.forEach(list => {
    elements.push({
      title: title,
      buttons: list
    });
  });
  logger.debug(`createElementsList: elements dump: ${JSON.stringify(elements)}`);
  return elements;
}

function sendGeneralReceipt(title) {
  const fbid = this.session.fbid;
  const trip = this.session.tripData();
  if(!title) {
    const receipts = trip.receipts();
    if(!receipts) return sendTextMessage.call(this, fbid, `No receipts found for trip ${trip.rawTripName}`);
    /*
    receipts.forEach(receipt => {
      const button = {
        "type": "postback"
      };
      button.payload = `get_receipt ${receipt}`;
      button.title = Encoder.decode(receipt);
      logger.debug(`sendGeneralReceipt: decode details: ${receipt}; ${buttons.title}`);
      buttons.push(button);
    });
    */
    const elements = createElementsList("get_receipt", receipts, "Receipts");
    const message = {
      recipient: {
        id: fbid
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            /* 
              template_type: "button",
              text: "Which receipt would you like to see?",
              "buttons": buttons
            */
            template_type: "generic",
            "elements": elements
          }
        }
      }
    };
    return this.sendAnyMessage(message);
  }
  const receiptFile = trip.generalReceiptFile(title);
  if(!receiptFile) return sendTextMessage.call(this, fbid, `No receipts found for trip ${trip.rawTripName}`);
	const messages = [];
  const details = JSON.parse(fs.readFileSync(receiptFile));
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
  return sendMultipleMessages.call(this, this.session.fbid, messages);
}

function sendCarReceipt() {
  const fbid = this.session.fbid;
  const trip = this.session.tripData();
  // if(!fs.existsSync(trip.rentalCarReceiptFile())) return sendTextMessage.call(this, fbid, `No car receipt found for your trip ${trip.rawTripName}`);
  if(!fs.existsSync(trip.rentalCarReceiptFile())) return sendNotFoundMessage.call(this, "car", trip.rawTripName);
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
  sendMultipleMessages.call(this, this.session.fbid, messages);
}

function sendNotFoundMessage(prefix, trip) {
  const messageData = {
    recipient: {
      id: this.session.fbid
    },
    message: {
      attachment: {
        "type": "template",
        payload: {
          template_type: "list",
          elements: [
          {
            "title": `No ${prefix} details found for your ${trip} trip.`,
            "subtitle": "Have a reservation? Send it to us:",
            "image_url": "http://icons.iconarchive.com/icons/custom-icon-design/flatastic-1/128/alert-icon.png"
          },
          {
            "title": "Email",
            "subtitle": "receipt to trips@mail.polaama.com"
          },
          {
            "title": "Upload",
            "subtitle": "by clicking on the attachment icon below"
          }
          ]
        }
      }
    }
  };
	callSendAPI.call(this, messageData);
}

/*
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
  sendMultipleMessages.call(this, this.session.fbid, messages);
}
*/

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
  sendMultipleMessages.call(this, this.session.fbid, messages);
}

function sendHotelItinerary(payload) {
  let hotelKey;
  if(payload) {
    const contents = /hotel details (.*)/.exec(payload);
    if(contents) hotelKey = contents[1];
  }
  const fbid = this.session.fbid;
  const trip = this.session.tripData();
	const messages = [];
  const details = trip.getHotelReceiptDetails();
  if(!details) return sendNotFoundMessage.call(this, "hotel", trip.rawTripName); 
  const hotels = Object.keys(details);
  if(hotelKey && details[hotelKey]) return sendHotelReceiptMessage.call(this, fbid, details[hotelKey]);
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
    hotels.forEach((list,idx) => {
      const j = parseInt(idx/3);
      if(!buttons[j]) {
        buttons[j] = [];
      }
      buttons[j].push({
        "type": "postback",
        "title": `${Encoder.decode(list)}`,
        "payload": `${list}-hotel-receipt`
      });
    });
    const elements = [];
    buttons.forEach(buttonList => {
      elements.push({
        title: "Hotels",
        buttons: buttonList
      });
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
    return sendMultipleMessages.call(this, this.session.fbid, messages);
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
      const response = this.travelSfoPageHandler.handleSendingAttractionsNearMe(message, this.pageId, senderID);
      // const response = this.travelSfoPageHandler.handleSendingAttractionsNearMeVegas(message, this.pageId, senderID);
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
      sendTextMessage.call(this, senderID, "Message with attachment received");
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

function messageForAnotherPage(message, fbid, event) {
  let response;
  if(this.pageId !== PageHandler.travelSfoPageId && this.pageId !== PageHandler.mySeaSprayPageId && this.pageId !== PageHandler.myHackshawPageId) return false;
  switch(this.pageId) {
    case PageHandler.travelSfoPageId: 
      response = this.travelSfoPageHandler.handleText(message, this.pageId, fbid, event);
      break;
    case PageHandler.mySeaSprayPageId:
      return this.seaSprayHandler.handleText(message, this.pageId, fbid);
      // break;
    case PageHandler.myHackshawPageId:
      response = this.hackshawHandler.handleText(message, this.pageId, fbid);
      break;
  }
  if(!response) return false;
  if(Array.isArray(response)) this.sendMultipleMessages(fbid, response);
  else callSendAPI.call(this, response);
  return true;
}

function marketResearchPrototype(mesg, fbid) {
  // const response = this.travelSfoPageHandler.royalCoachResponse(mesg, fbid);
  // const response = this.travelSfoPageHandler.sanJoseBrewBike(mesg, fbid);
  const response = this.travelSfoPageHandler.mountainQueenExpeditions(mesg, fbid);
  logger.debug(`marketResearchPrototype: response: ${response}`);
  if(!response) return false;
  if(Array.isArray(response)) this.sendMultipleMessages(fbid, response);
  else callSendAPI.call(this, response);
  return true;
}

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
            if(Array.isArray(response)) self.sendMultipleMessages(senderID, response);
            else callSendAPI.call(self, response);
          },
          function(err) {
            sendTextMessage.call(self, senderID, "Even bots need to eat. Be back in a bit!");
          }
        );
    }
    // if messageForAnotherPage returned something, it indicates that we are done. So simply return.
    return;
  }
  else return sendTextMessage.call(self, senderID, "Busy at work. We will be back soon with an awesome chatbot for you! Prepare to be amazed!");
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
    logger.error(`Unable to send message <${JSON.stringify(messages[0])}> to recipient ${recipientId}. status code is ${response.statusCode}. Message from FB is <${response.body.error.message}>; Error type: ${response.body.error.type}`);
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
      logger.error(`Error is ${JSON.stringify(response.body["error"])}`);
      if(response.body && response.body.error) logger.error(`Continuation of above message: Message from FB is <${response.body.error.message}>; Error type: ${response.body.error.type}`);
      else if(response.body) logger.error(`Continuation of above message: response.body.error is undefined. response.body dump: ${JSON.stringify(response.body)}`);
      else logger.error(`Continuation of above message: response.body is undefined. response dump: ${JSON.stringify(response)}`);
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
