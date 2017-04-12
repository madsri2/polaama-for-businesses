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
        sendList.push(getBoardingPass(trip, fbid));
      }
    });
  });
  return sendList;
}

function getSentListKey(fbid, name) {
  return `${fbid}-${name}`;
}

function getBoardingPass(trip, fbid) {
  const boardingPass = [];
  try {
    const bpDetails = fs.readFileSync(trip.boardingPassFile(), 'utf8');
  }
  catch(e) {
    logger.error(`getBoardingPass: could not read boarding pass details from file ${file}: ${e.stack}`);
    return boardingPass;
  }
  boardingPass.push({
    'passenger_name': bpDetails.full_name,
    'pnr_number': bpDetails.pnr_number,
    'logo_image_url': `https://www.example.com/en/logo.png`, 
    'barcode_image_url': `https://polaama.com/-/images/boarding-pass`, 
    'above_bar_code_image_url': `https://www.example.com/en/PLAT.png`, 
    'flight_info': {
      'flight_number': bpDetails.flight_number,
      'departure_airport': {
        'airport_code': bpDetails.departure_airport.airport_code,
        'city': bpDetails.departure_airport.city
      },
      'arrival_airport': {
        'airport_code': bpDetails.arrival_airport.airport_code,
        'city': bpDetails.arrival_airport.city
      },
      'flight_schedule': {
        'departure_time': bpDetails.flight_schedule.departure_time
      }
    }
  });

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

module.exports = Notifier;
