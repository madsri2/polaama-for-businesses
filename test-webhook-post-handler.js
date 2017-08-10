'use strict';
const baseDir = "/home/ec2-user";
const Sessions = require(`${baseDir}/sessions`);
const WebhookPostHandler = require(`${baseDir}/webhook-post-handler`);
const TripData = require(`${baseDir}/trip-data`);
const TripInfoProvider = require(`${baseDir}/trip-info-provider`);
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig(); // indicate that we are logging for a test
const FbidHandler = require('fbid-handler/app/handler');
const SessionState = require('session-state/app/state');
const fs = require('fs');

const moment = require('moment');
const Promise = require('promise');

function testGatheringDetailsForNewTrip() {
  const dtdCallback = function() { 
    logger.debug("All callbacks successfully called");
  }
  // Iceland
  const td = new TripData("san_francisco", "1234");
  td.addTripDetailsAndPersist({
    startDate: "9/11/2017",
    destination: "san_francisco",
    duration: 4,
  });
  td.addPortOfEntry("san_francisco");
  const tip = new TripInfoProvider(td, "ewr");
  
  const activities = Promise.denodeify(tip.getActivities.bind(tip));
  // const flightDetails = Promise.denodeify(tip.getFlightDetails.bind(tip));
  // const flightQuote = tip.getFlightQuotes();
  const weatherDetails = Promise.denodeify(tip.getWeatherInformation.bind(tip));
  
  activities()
    // .then(flightDetails())
    .then(
      function(response) {
        return tip.getFlightQuotes();
      },
      function(err) {
        logger.error(`Activities promise returned error: ${err.stack}`);
        return Promise.reject(err);
      }
    )
    .then(
      function(response) {
        return weatherDetails();
      },
      function(err) {
        logger.error(`FlightQuotes promise returned error: ${err.stack}`);
        return Promise.reject(err);
      }
    )
    .done(
      function(response) {
        console.log(`all functions called. response type is ${typeof response}`);
      }, function(err) {
        console.log(`test-webhook-post-handler error: ${err.stack}`);
      }
    );
}

function setup() {
  // set up
  const myFbid = "1234";
  const tripName = "test-extractCityDetails";
  const sessions = Sessions.get();
  // first clean up previous test state
  sessions.testing_delete(myFbid);
  new TripData(tripName, myFbid).testing_delete();
  const session = sessions.findOrCreate(myFbid);
  // create new trip
  const handler = new WebhookPostHandler(session, true /* testing */);
  const state = new SessionState();
  state.set("awaitingNewTripDetails");
  handler.testing_setState(state);
  handler.testing_createNewTrip({
    destination: tripName,
    startDate: moment().add(7, 'days').format("MM/DD/YYYY"), // 05/10/2017,
    duration: 10
  });
  session.persistHometown("san francisco");
  return handler;
}

function setupTelAvivTrip() {
  // set up
  const myFbid = "1234";
  const tripName = "test-tel-aviv";
  const sessions = Sessions.get();
  // first clean up previous test state
  sessions.testing_delete(myFbid);
  new TripData(tripName, myFbid).testing_delete();
  const session = sessions.findOrCreate(myFbid);
  // create new trip
  const handler = new WebhookPostHandler(session, true /* testing */);
  handler.testing_createNewTrip({
    destination: tripName,
    startDate: "06/10/2017",
    duration: 8,
    leavingFrom: "san francisco",
    portOfEntry: "tel aviv"
  });
  session.persistHometown("san francisco");
  // create the necessary files
  const itin = {
    "6/10/2017": {
      city: ["san_francisco", "tel_aviv"]
    },
    "6/19/2017": {
      city: "tel_aviv"
    }
  };
  const trip = session.tripData();
  const fs = require('fs');
  fs.writeFileSync(trip.tripItinFile(), JSON.stringify(itin), "utf8");
  const dayItin = {
    "firstSet": [
      {
        title: "First Item",
        subtitle: "First subtitle"
      },
      {
        "title": "09:30 Program with KamaTech at WIX",
        "subtitle": "Meet at WIX office",
        "default_action": {
          "type": "web_url",
          "url": "https://polaama.com/aeXf/tel_aviv/itin-detail/tel-aviv-2017-06-13-item-2",
          "webview_height_ratio": "full"
        }
      }
    ],
    "secondSet": [
      {
        title: "Second set First item",
        subtitle: "Second subtitle"
      },
      {
        "title": "Overnight at Nir Etzion",
        "image_url": "https://www.nirezion-hotel.com/octopus/Upload/images/Resorts/home6.jpg",
        "default_action": {
          "type": "web_ur",
          "url": "https://www.nirezion-hotel.com/",
          "webview_height_ratio": "full"
        }
      }
    ]
  };
  fs.writeFileSync(trip.dayItineraryFile(new Date("6/13/2017")), JSON.stringify(dayItin), "utf8");
  return handler;
}

function testStartPlanningTrip() {
  const sessions = Sessions.get();
  const myFbid = "1234";
  const tripName = "ewr-sfo";
  // set up
  // first clean up previous test state
  sessions.testing_delete(myFbid);
  const session = sessions.findOrCreate(myFbid);
  // create new trip
  const handler = new WebhookPostHandler(session, true /* testing */);
  handler.testing_createNewTrip({
    destination: "san_francisco",
    startDate: "09/11/2017",
    leavingFrom: "ewr",
    duration: 4
  });
  session.persistHometown("ewr");
  const sessionState = handler.sessionState;
  // setup state
  sessionState.set("planningNewTrip");
  const event = { message: { text: "invalid" } };
  // test
  handler.testing_determineResponseType(event);
}

function testRequestToBeAddedToTrip() {
  const sessions = Sessions.get();
  const myFbid = "1234";
  const tripName = "ewr-sfo";
  // set up
  // first clean up previous test state
  sessions.testing_delete(myFbid);
  sessions.testing_delete("2");
  const session = sessions.findOrCreate("2");
  // create new trip
  const handler = new WebhookPostHandler(session, true /* testing */);
  handler.testing_createNewTrip({
    destination: "san_francisco",
    startDate: "09/11/2017",
    leavingFrom: "ewr",
    duration: 4
  });
  session.persistHometown("ewr");
  const event = { message: { text: "invalid" }, sender: { id: "2"} };
  event.message.quick_reply = { payload: "qr_request_to_be_added" };
  // test
  handler.testing_determineResponseType(event);
}

function testExtractingCityDetails() {
  const handler = setup();
  handler.session.tripData().data.leavingFrom = "san_francisco";
  const sessionState = handler.sessionState;
  // setup state
  sessionState.set("planningNewTrip");
  sessionState.set("awaitingCitiesForNewTrip");
  // test
  const event = { message: { text: "city(1)" } };
  handler.testing_determineResponseType(event);
}

function testAddingCityToExistingTrip() {
  const handler = setup();
  const session = handler.session;
  // first add three cities.
  // setup state
  const state = handler.sessionState;
  state.set("planningNewTrip");
  state.set("awaitingCitiesForNewTrip");
  // test
  {
    const event = { message: { text: "city(1),cityx(2),cityy(3)" } };
    handler.testing_setState(state);
    handler.testing_determineResponseType(event);
  }
  logger.debug(`*************** Existing Trip *****************`);
  // setup state
  state.set("awaitingCitiesForExistingTrip");
  // now test adding 4th city
  const event = { message: { text: "another city(6)" } };
  handler.testing_determineResponseType(event);
}

function testDisplayTripDetails() {
  // create new trip
  const handler = setup();
  handler.testing_displayTripDetails();
  // create a fake boarding pass file
  require('fs').writeFileSync(handler.session.findTrip().boardingPassFile(), "empty"); 
  handler.testing_displayTripDetails();
}

function testDayPlanCommand() {
  // create new trip
  const handler = setupTelAvivTrip();
  const session = handler.session;
  // set up state
  session.planningNewTrip = false;
  const event = { message: { text: "13th" } };
  logger.debug(`testDayPlanCommand: ****** About to start test ********`); 
  handler.testing_determineResponseType(event);
}

function testDayPlanSecondSetCommand() {
  // create new trip
  const handler = setupTelAvivTrip();
  const session = handler.session;
  // set up state
  session.planningNewTrip = false;
  let event = { message: { text: "13th" } };
  // const message = handler.testing_determineResponseType(event);
  // const postback = message.message.attachment.payload.buttons[0].payload;
  const postback = "2017-5-13-itin_second_set";
  event = { 
    sender: {
      id: session.fbid
    }, 
    recipient: {
      id: session.fbid
    }, 
    timestamp: "12345",
    postback: { 
      payload: postback 
    } 
  };
  logger.debug(`testDayPlanCommand: ****** About to start test ********`); 
  handler.testing_receivedPostback(event);
}

function testHotelItinerarySingleHotel() {
  const handler = setup();
  // update with hotel details
  const hotels = {"port_moresby":{"receipt":{"template_type":"receipt","recipient_name":"Madhuvanesh Parthasarathy","order_number":"65786645","merchant_name":"Holiday Inn","payment_method":"Unknown","currency":"USD","order_url":"http://tinyurl.com/yb6uvywg","elements":[{"title":"Confirmation #:65786645","price":"177.73","currency":"USD"}],"address":{"street_1":"Cnr Waigani Drive & Wards Rd, Boroko","city":"Port Moresby","state":"National Capital District","country":"Papua New Guinea","postal_code":"121"},"summary":{"total_cost":"177.73"}},"receipt_ext":{"template_type":"generic","elements":[{"title":"Phone: 675-303-2000","buttons":[{"type":"web_url","url":"http://tinyurl.com/yb6uvywg","title":"Hotel rental"}],"subtitle":"CHECK-IN: Aug 11 2017 02:00 PM; CHECK-OUT: Aug 12 2017 11:00 AM"}]}}};
  const session = handler.session;
  const trip = session.findTrip(); 
  fs.writeFileSync(trip.hotelRentalReceiptFile(), JSON.stringify(hotels), 'utf8');
  const event = { 
    sender: {
      id: session.fbid
    }, 
    recipient: {
      id: session.fbid
    }, 
    timestamp: "12345",
    postback: { 
      payload: "hotel details" 
    } 
  };
  handler.testing_receivedPostback(event);
}

function testHotelItineraryMultipleHotels() {
  const handler = setup();
  // update with hotel details
  const hotels = {"port_moresby":{"receipt":{"template_type":"receipt","recipient_name":"Madhuvanesh Parthasarathy","order_number":"65786645","merchant_name":"Holiday Inn","payment_method":"Unknown","currency":"USD","order_url":"http://tinyurl.com/yb6uvywg","elements":[{"title":"Confirmation #:65786645","price":"177.73","currency":"USD"}],"address":{"street_1":"Cnr Waigani Drive & Wards Rd, Boroko","city":"Port Moresby","state":"National Capital District","country":"Papua New Guinea","postal_code":"121"},"summary":{"total_cost":"177.73"}},"receipt_ext":{"template_type":"generic","elements":[{"title":"Phone: 675-303-2000","buttons":[{"type":"web_url","url":"http://tinyurl.com/yb6uvywg","title":"Hotel rental"}],"subtitle":"CHECK-IN: Aug 11 2017 02:00 PM; CHECK-OUT: Aug 12 2017 11:00 AM"}]}},"brisbane":{"receipt":{"template_type":"receipt","recipient_name":"Madhuvanesh Parthasarathy","order_number":"BB1706166422446","merchant_name":"Novotel Brisbane Airport","payment_method":"Unknown","currency":"AUD","order_url":"http://www.novotelbrisbaneairport.com.au/guest-rooms/standard-room/","elements":[{"title":"Confirmation #:BB1706166422446","price":"333.00","currency":"AUD"}],"address":{"street_1":"6-8 The Circuit, Brisbane Airport","city":"Brisbane","state":"QLD","country":"Australia","postal_code":"4008"},"summary":{"total_cost":"333.00"}},"receipt_ext":{"template_type":"generic","elements":[{"title":"Phone: +61 7 3175 3100","buttons":[{"type":"web_url","url":"http://www.novotelbrisbaneairport.com.au/guest-rooms/standard-room/","title":"Hotel rental"}],"subtitle":"CHECK-IN: Aug 24 2017 02:00 PM; CHECK-OUT: Aug 25 2017 11:00 AM"}]}}};
  const session = handler.session;
  const trip = session.findTrip(); 
  fs.writeFileSync(trip.hotelRentalReceiptFile(), JSON.stringify(hotels), 'utf8');
  const event = { 
    sender: {
      id: session.fbid
    }, 
    recipient: {
      id: session.fbid
    }, 
    timestamp: "12345",
    postback: { 
      payload: "hotel details" 
    } 
  };
  handler.testing_receivedPostback(event);
  event.postback.payload = "port_moresby-hotel-receipt";
  handler.testing_receivedPostback(event);
  event.postback.payload = "brisbane-hotel-receipt";
  handler.testing_receivedPostback(event);
}

function testAddingDepartureCityThatIsNotHometown() {
  const handler = setup();
  const trip = handler.session.findTrip();
  handler.sessionState.set("planningNewTrip");
  handler.sessionState.set("awaitingUseHometownAsDepartureCity");
  const event = { message: { text: "", quick_reply: { payload: "qr_use_hometown_as_dep_city_no" }}};
  let response = handler.testing_determineResponseType(event);
  console.log(`testAddingDepartureCityThatIsNotHometown: response from determineResponseType is ${response}`);
  event.message.quick_reply = null;
  event.message.text = "newark";
  response = handler.testing_determineResponseType(event);
  console.log(`testAddingDepartureCityThatIsNotHometown: response from determineResponseType is ${response}`);
}

function testAddingDepartureCityNoHometownSet() {
  const handler = setup();
  handler.session.hometown = null;
  handler.sessionState.set("planningNewTrip");
  handler.sessionState.set("awaitingDepartureCityDetails");
  const event = { message: { text: "newark" }};
  let response = handler.testing_determineResponseType(event);
  console.log(`testAddingDepartureCityNoHometownSet: response from determineResponseType is ${response}`);
  event.message.quick_reply = { payload: "qr_use_as_hometown_yes" };
  response = handler.testing_determineResponseType(event);
  console.log(`testAddingDepartureCityNoHometownSet: response from determineResponseType is ${response}; hometown: ${handler.session.hometown}`);
}

testRequestToBeAddedToTrip();

// testAddingDepartureCityNoHometownSet();

// testAddingDepartureCityThatIsNotHometown();

// testHotelItinerarySingleHotel();
// testHotelItineraryMultipleHotels();

// testDayPlanSecondSetCommand();

// testDayPlanCommand();

// testDisplayTripDetails();

// testAddingCityToExistingTrip();

// testExtractingCityDetails();

// testStartPlanningTrip();

// testGatheringDetailsForNewTrip();

// testAddingDepartureCity();
