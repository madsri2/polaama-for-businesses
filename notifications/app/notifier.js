'use strict';
const moment = require('moment-timezone');

const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);

/* 
  Schedule notifications to user about a particular trip.
    sendTextMessage(sessions[id].fbid, `[Trip flight details] flight #: XEVFSG; : 
    sendTextMessage(sessions[id].fbid, `[Trip Car details] confirmation #: XEVFSG; Hotel confirmation code: 
    sendTextMessage(sessions[id].fbid, `[Trip Hotel details] confirmation #: XEVFSG; Hotel confirmation code: 
*/
function Notifier(sessions) {
  if(sessions) this.sessions = sessions.allSessions();
  this.sentList = {};
}

/*
Day before:
  Flight: Lands at XX:XX; Next Leg Flight #: XXX; Terminal X Gate X; Departs at XX:XX; Lands at XX:XX;
  Car: Confirmation #: XEAFGH; Avis; Pick up at XX:XX
  Hotel: Confirmation #: XEWRW23; Check-in at XX:XX; Room type: Suite; Directions:
Day of:
  Boarding pass: 
*/
Notifier.prototype.imminentTripsList = function() {
  const sendList = []; // reset for every call to this method
  Object.keys(this.sessions).forEach(id => {
    this.sessions[id].allTrips().forEach(trip => {
      const boardingPass = this.getImminentTripBoardingPass(trip, this.sessions[id]);
      if(boardingPass) {
        sendList.push(boardingPass);
        this.sentList[getSentListKey.call(this, this.sessions[id].fbid, trip.data.name)] = true;
      }
    }, this);
  }, this);
  return sendList;
}

Notifier.prototype.getImminentTripBoardingPass = function(trip, session) {
  const sessionId = session.sessionId;
  if(!trip.data.startDate || (trip.data.startDate === "unknown")) return;
  const now = moment().tz("Etc/UTC"); 
  const startDate = moment.tz((new Date(trip.data.startDate)).toISOString(), "Etc/UTC");
  const daysToTrip = startDate.diff(now, 'days');
  const name = trip.data.name;
  // logger.debug(`getImminentTripBoardingPass: Trip ${name} from session ${sessionId} starting on ${trip.data.startDate}; daysToTrip: ${daysToTrip}`);
  const fbid = session.fbid;
  if(daysToTrip >= 0 && daysToTrip <= 1 && !this.sentList[getSentListKey.call(this, fbid, name)]) {
    logger.debug(`getImminentTripBoardingPass: user ${fbid}'s trip ${name} is ${daysToTrip} days away. sending boarding pass`);
    return getBoardingPass(trip, fbid);
  }
  // logger.debug(`getImminentTripBoardingPass: user ${fbid}'s trip ${name} is ${daysToTrip} days away. NOT sending boarding pass`);
  return null;
}

function getSentListKey(fbid, name) {
  return `${fbid}-${name}`;
}

Notifier.prototype.getBoardingPass = getBoardingPass;

function getBoardingPass(trip, fbid) {
  const boardingPass = [];
  const file = trip.boardingPassFile();
  try {
    const bpDetails = JSON.parse(require('fs').readFileSync(file, 'utf8'));
    boardingPass.push(bpDetails);
  }
  catch(e) {
    logger.warn(`getBoardingPass: could not read boarding pass details from file ${file}: ${e.stack}`);
    return undefined;
  }

  return {
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "airline_boardingpass", // required
          "intro_message": "You are checked in.", // required
          "locale": "en_US", // required
          "boarding_pass": boardingPass // required
        }
      }
    }
  };
}

  /*
  boardingPass.push({
    "passenger_name": "SMITH\/NICOLAS", // required
    "pnr_number": "CG4X7U", // required
    "seat": "74J",
    "auxiliary_fields": [
      {
        "label": "Terminal",
        "value": "T1"
      },
      {
        "label": "Departure",
        "value": "30OCT 19:05"
      } 
	  ],
    "secondary_fields": [
      {
        "label": "Boarding",
        "value": "18:30"
      },
      {
        "label": "Gate",
        "value": "D57"
      },
      {
        "label": "Seat",
        "value": "74J"
      },
      {
        "label": "Sec.Nr.",
        "value": "003"
      }
    ],
    "logo_image_url": "https:\/\/www.example.com\/en\/logo.png", // required
    "header_image_url": "https:\/\/www.example.com\/en\/fb\/header.png",
    // "qr_code": "M1SMITH\/NICOLAS  CG4X7U nawouehgawgnapwi3jfa0wfh",
    "barcode_image_url": "https://polaama.com/-/images/boarding-pass", // required (or qr_code)
    "above_bar_code_image_url": "https:\/\/www.example.com\/en\/PLAT.png", // required
    "flight_info": { 
      "flight_number": "KL0642", // required
      "departure_airport": { // required
        "airport_code": "JFK", // required
        "city": "New York", // required
        "terminal": "T1",
        "gate": "D57"
      },
      "arrival_airport": { // required
        "airport_code": "AMS", // required
        "city": "Amsterdam" // required
      },
      "flight_schedule": {
        "departure_time": "2016-01-02T19:05", // required
        "arrival_time": "2016-01-05T17:30" 
      }
    }
  });
  */

module.exports = Notifier;
