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
  this.sessions = sessions.allSessions();
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
Notifier.prototype.tripDetailsJustBeforeTrip = function() {
  const sendList = [];
  Object.keys(this.sessions).forEach(id => {
    this.sessions[id].allTrips().forEach(trip => {
      if(!trip.data.startDate) return;
      const now = moment().tz("Etc/UTC"); 
      const startDate = moment.tz(trip.data.startDate, "Etc/UTC");
      const daysToTrip = startDate.diff(now, 'days');
      const name = trip.data.name;
      logger.debug(`tripDetailsJustBeforeTrip: Trip ${name} from session ${id} starting on ${trip.data.startDate}; daysToTrip: ${daysToTrip}`);
      const fbid = this.sessions[id].fbid;
      if(daysToTrip >= 0 && daysToTrip <= 2 && !this.sentList[getSentListKey.call(this, fbid, name)]) {
        logger.debug(`tripDetailsJustBeforeTrip: Sending boarding pass for ${name}, which is ${daysToTrip} days away`);
        this.sentList[getSentListKey.call(this, fbid, name)] = true;
        sendList.push(getBoardingPass(fbid));
      }
    });
  });
  return sendList;
}

function getSentListKey(fbid, name) {
  return `${fbid}-${name}`;
}

function getBoardingPass(fbid) {
  const boardingPass = [];
  boardingPass.push({
    "passenger_name": "SMITH\/NICOLAS",
    "pnr_number": "CG4X7U",
    "travel_class": "business",
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
    "logo_image_url": "https:\/\/www.example.com\/en\/logo.png",
    "header_image_url": "https:\/\/www.example.com\/en\/fb\/header.png",
    // "qr_code": "M1SMITH\/NICOLAS  CG4X7U nawouehgawgnapwi3jfa0wfh",
    "barcode_image_url": "https://polaama.com/-/images/boarding-pass",
    "above_bar_code_image_url": "https:\/\/www.example.com\/en\/PLAT.png",
    "flight_info": {
      "flight_number": "KL0642",
      "departure_airport": {
        "airport_code": "JFK",
        "city": "New York",
        "terminal": "T1",
        "gate": "D57"
      },
      "arrival_airport": {
        "airport_code": "AMS",
        "city": "Amsterdam"
      },
      "flight_schedule": {
        "departure_time": "2016-01-02T19:05",
        "arrival_time": "2016-01-05T17:30"
      }
    }
  });
  return {
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "airline_boardingpass",
          "intro_message": "You are checked in.",
          "locale": "en_US",
          "boarding_pass": boardingPass
        }
      }
    }
  };
}

module.exports = Notifier;
