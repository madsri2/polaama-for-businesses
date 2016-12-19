'use strict';
const fetch = require('node-fetch');
const TripData = require('./trip-data.js');

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

function WitAi() {}

WitAi.protototype.actions = {
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
      logger.info("sending response from bot to recipient. text is \"",text,"\"");
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
    return new Promise(function(resolve, reject) {
      logger.info("createNewTrip: Called with context: " + JSON.stringify(context) + ". Entity: " + JSON.stringify(entities));
      captureAvailableEntity(context, entities, 'destination', 'missingLocation');
      captureAvailableEntity(context, entities, 'datetime', 'missingDatetime');
      captureAvailableEntity(context, entities, 'duration', 'missingDuration');
      if(context.missingLocation || context.missingDatetime || context.missingDuration) {
        logger.info("createNewTrip: Updated context: ",JSON.stringify(context));
        return resolve(context);
      }
      // both location & date time exist. Time to do some work.
      // TODO: we should call a weather API here
      const tripName = context.destination + "-" + context.datetime + "-" + context.duration;
      const tripData = new TripData(tripName);
      const trip = tripData.addTripDetailsAndPersist(context);
      context.firstResponse = "Great! It's going to be " + trip['weather'] + " in " + trip['destination'] + ". I have created your trip plan with pack list, todo lists etc. Check it out at https://polaama.com/trips";
      context.done = true;
      logger.info("createNewTrip: Updated context: ",JSON.stringify(context));
      return updateHistoryAndCallResolve(resolve, context.firstResponse, context);
    });
  },
  getName({context, entities}) {
    console.log("getName called");
    return new Promise(function(resolve, reject) {
      context.name = "Madhu";
      return updateHistoryAndCallResolve(resolve, context.name, context);
    });
  },
  greeting({context, entities}) {
    console.log("greeting called");
    return new Promise(function(resolve, reject) {
      const greeting = "Hi there! How can I help you today?";
      // if we are repeating ourselves, ask the user to help!
      const sessionId = context.sessionId;
      logger.info("session id in context is ",sessionId);
      const history = sessions[sessionId].botMesgHistory;
      if(history.length == HISTORY_LENGTH && history[history.length-1] === greeting) {
        // TODO: Get the message from a random list of strings so you don't ask the same thing..
        context.greeting = "Can you please ask the question a different way?";
        return resolve(context);
      }
      context.greeting = greeting;
      return updateHistoryAndCallResolve(resolve, greeting, context);
    });
  },
  farewellMessage({context, entities}) {
    console.log("farewell Message");
    return new Promise(function(resolve, reject) {
      context.farewellMessage = "Talk to you later.";
      return updateHistoryAndCallResolve(resolve, context.farewellMessage, context);
    });
  },
  saveFrequentFlyerDetails({context, entities}) {
    logger.info("saveFrequentFlyerDetails: Called with context: " + JSON.stringify(context) + ". Entity: " + JSON.stringify(entities));
    return new Promise(function(resolve, reject) {
      captureAvailableEntity(context, entities, 'contact', 'missingName');
      captureAvailableEntity(context, entities, 'mileageNumber', 'missingMileageNumber');
      captureAvailableEntity(context, entities, 'airlinesName', 'missingAirlines');
      if(context.missingName || context.missingMileageNumber || context.missingAirlines) {
        logger.info("saveFrequentFlyerDetails: Updated context: ",JSON.stringify(context));
        return resolve(context);
      }
      // If we have everything, do some work.
      // TODO: Need to overwrite existing mileage number.
      var miles = {};
      miles.name = context.contact;
      miles.mileageNumber = context.mileageNumber;
      miles.airlines = context.airlinesName;
      try {
        fs.appendFileSync("frequentFlyer.txt", JSON.stringify(miles));
        logger.info("Saved frequent flyer details: ", miles);
        context.message = "Saved!";
        // indicate that the session can be deleted after the response is sent!
        context.done = true;
      }
      catch(err) {
        logger.error("Error appending to frequent flyer file: ",err);
        context.message = "Could not save mileage details now. Please try again in a while..";
      }
      logger.info("saveFrequentFlyerDetails: Updated context: ",JSON.stringify(context));
      return updateHistoryAndCallResolve(resolve, context.message, context);
    });
  }
};

const WIT_ACCESS_TOKEN = "2DA4HZAX6JJKVBN5OWWB6FZHGHVGQUAN"
// Setting up our bot
const wit = new Wit({
  accessToken: WIT_ACCESS_TOKEN,
  actions,
  logger: logger
});

// at this point, we are only keeping 2 messages in history
const HISTORY_LENGTH = 2;

function updateHistoryAndCallResolve(resolve, message, context) {
  const sessionId = context.sessionId;
  var history = sessions[sessionId].botMesgHistory;
  // add this message to the sessions's previous messages.
  if(history.length == HISTORY_LENGTH) {
    // an innefficient circular buffer
    history.forEach(function(element,i,array) {
      history[i] = history[i+1];
    });
    history[HISTORY_LENGTH - 1] = message;
  }
  else {
    history.push(message);
  }
  return resolve(context);
}

function captureAvailableEntity(context, entities, valueKey, missingKey) {
  const value = firstEntityValue(entities, valueKey);
  if(value) { 
    logger.info("Found value " + value + " for " + valueKey);
    context[valueKey] = value;
  }
  // even if the value was not passed in this entity, it might have been passed to this session in a previous entity and persisted in the session state.
  if(context[valueKey]) {
    logger.info("Deleting " + missingKey + " from context since valueKey was found with value: " + context[valueKey]);
    delete context[missingKey];
  }
  else {
    logger.info("Did not find value for " + valueKey + ". Adding " + missingKey + " to context");
    context[missingKey] = true;
  }
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

module.exports = WitAi;
