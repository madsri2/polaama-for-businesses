'use strict';

let Wit = null;
let interactive = null;
try {
  // if running from repo
  Wit = require('../').Wit;
  interactive = require('../').interactive;
} catch (e) {
  Wit = require('node-wit').Wit;
  interactive = require('node-wit').interactive;
}

// Quickstart example
// See https://wit.ai/ar7hur/quickstart

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

var savedLocation;
var savedDate;

function captureAvailableEntities(context, location, datetime) {
  // capture location & datetime if they are present
  if(!savedLocation) {
    if(location) {
      // save location for later use
      savedLocation = location;
    }
    else {
      console.log("Missing location");
      context.missingLocation = true;
    }
  }
  if(!savedDate) {
    if(datetime) {
      // save datetime for later use
      savedDate = datetime;
    }
    else {
      console.log("Missing datetime");
      context.missingDate = true;
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
  return context;
}

const actions = {
  send(request, response) {
    const {sessionId, context, entities} = request;
    const {text, quickreplies} = response;
    return new Promise(function(resolve, reject) {
      console.log('sending...', JSON.stringify(response));
      return resolve();
    });
  },
  createNewTrip({context, entities}) {
    return new Promise(function(resolve, reject) {
      var location = firstEntityValue(entities, 'location');
      var datetime = firstEntityValue(entities, 'datetime');
      var updatedContext = captureAvailableEntities(context, location, datetime);
      if(!savedLocation || !savedDate) {
        delete updatedContext.forecast;
        delete updatedContext.tripName;
        console.log('resolving context...', JSON.stringify(context));
        return resolve(updatedContext);
      }
      // both location & date time exist. Time to do some work.
      console.log("location is " + savedLocation + " and date is " + savedDate);
      // we should call a weather API here
      updatedContext.forecast = 'sunny in ' + savedLocation + ' on ' + savedDate;
      updatedContext.tripName = savedLocation + "-" + savedDate;
      savedLocation = null;
      savedDate = null;
      return resolve(updatedContext);
    });
  },
};

const WIT_ACCESS_TOKEN = "2DA4HZAX6JJKVBN5OWWB6FZHGHVGQUAN"
const accessToken = (() => {
  return WIT_ACCESS_TOKEN;
})();
const client = new Wit({accessToken, actions});
interactive(client);
