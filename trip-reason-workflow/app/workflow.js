'use strict';

const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
const Encoder = require(`${baseDir}/encoder`);

function TripReasonWorkflow(handler) {
  this.handler = handler;
  this.sessionState = handler.sessionState;
  this.session = handler.session;
  this.trip = this.session.tripData();
}

/*
  1) Ask user if it's a business or leisure trip.
  2) If it's business, ask them to enter conference or event name. 
  3) If you can't find the conference or event name, tell them that you will update the itinerary based on it and show them the "displayTripDetails" function.

  return true if we are done handling. 
  return false if we are still awaiting information from user.
*/
TripReasonWorkflow.prototype.handle = function(message) {
  if(this.sessionState.get("awaitingTripReason")) {
    if(message === "pb_leisure") {
      // this.handler.sendTextMessage(this.session.fbid, `Gathering details for your trip. To get recommendations for an activity or restaurant,  use the "reco" command: "reco walking tours"...`);
      this.handler.sendTextMessage(this.session.fbid, `Gathering details for your trip...`);
      this.handler.handleDisplayTripDetailsPromise();
      this.sessionState.clear("awaitingTripReason");
      // nothing more to do here.
      return true;
    }
    if(message === "pb_event") {
      this.handler.sendTextMessage(this.session.fbid, `Enter the name of the conference/event you are planning to attend? (use comma for multiple conferences)`);
      this.sessionState.set("awaitingConferenceName");
      return false;
    }
    if(this.sessionState.get("awaitingConferenceName")) {
      // done with everything.
      this.sessionState.clear("awaitingTripReason");
      this.sessionState.clear("awaitingConferenceName");
      // TODO: In this case, add a way to let admin know that someone wants a new conference details added.
      if(!handlePhocuswrightConference.call(this, Encoder.encode(message))) this.handler.sendTextMessage(this.session.fbid, `We will gather details about event ${message} and update your itinerary accordingly`);
      this.handler.handleDisplayTripDetailsPromise();
      return true;
    }
    throw new Error(`handle: session state "awaitingTripReason" is set, but message is not pb_leisure or pb_event. And session state "awaitingConferenceName" is not set. Possible BUG!`);
  }
  this.sessionState.set("awaitingTripReason");
  return sendTripReasonChoices.call(this);
}

function handlePhocuswrightConference(mesg) {
  // see if there are multiple.
  if(mesg.includes(",")) {
    let result = false;
    mesg.split(',').forEach(m => {
      if(!m.includes("phocuswright") && !m.includes("the americas") && !m.includes("battleground") && !m.includes("arival")) { result = false; return; }
      result = true;
      this.trip.addEvent(m);
    }, this);
    if(!result) return false;
    this.handler.sendTextMessage(this.session.fbid, `Gathering details for your ${this.trip.rawTripName} trip, including details about your events...`);
    return true;
  }
  if(!mesg.includes("phocuswright") && !mesg.includes("the americas") && !mesg.includes("battleground") && !mesg.includes("arival")) return false;
  this.handler.sendTextMessage(this.session.fbid, `Gathering details for your ${this.trip.rawTripName} trip, including details about your event ${mesg}...`);
  this.trip.addEvent(mesg);
  return true;
}

function sendTripReasonChoices() {
  const messageData = {
    recipient: {
      id: this.session.fbid
    },
    message: {
      attachment: {
        "type": "template",
        payload: {
          template_type: "generic",
          elements: [{
            "title": "What's the reason for your trip?",
            buttons: [{
              type: "postback",
              payload: "pb_leisure",
              title: "Leisure"
            },
            {
              type: "postback",
              payload: "pb_event",
              title: "Conference/Events"
            }]
          }]
        }
      }
    }
  };
  this.handler.sendAnyMessage(messageData);
  return false;
}

module.exports = TripReasonWorkflow;
