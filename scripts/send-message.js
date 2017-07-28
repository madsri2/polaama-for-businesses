'use strict';

const baseDir = "/home/ec2-user";
const WebhookPostHandler = require(`${baseDir}/webhook-post-handler`);
const TripData = require(`${baseDir}/trip-data`);
const Sessions = require(`${baseDir}/sessions`);
const Commands = require(`trip-itinerary/app/commands`);
const FbidHandler = require('fbid-handler/app/handler');

// const fbid = "1630377990366886"; // raj
// const fbid = "1311237785652279"; // divya
const fbid = "1120615267993271"; // madhu
// const fbid = "1718674778147181"; // Beth
// const fbid = "1420839671315623"; // Aparna
let name = new FbidHandler().getName(fbid);
if(!name) name = ""; else name = name.substring(0, name.indexOf(" "));
const session = Sessions.get().find(fbid);
if(!session) throw new Error(`could not find session for fbid ${fbid}`);
const handler = new WebhookPostHandler(session);

function sendPackList() {
	const trip = new TripData("london", fbid);
  handler.sendMultipleMessages(fbid, [
    handler.getTextMessageData(fbid, `Don't forget "sunscreen" for your ${trip.data.rawName} trip. It is going to be sunny (around 80°F)`), 
    handler.getTextMessageData(fbid, "We have created a full pack list for you"),
    handler.urlButtonMessage("Pack list", trip.packListPath())
  ]);
}

function flightStatusAndWaitTimes() {
  handler.sendMultipleMessages(fbid, [
    handler.getTextMessageData(fbid, `Good news! Your flight UA90 is expected to be on time. Expected departure: 22:45 from Terminal C, Gate C138`),
    handler.getTextMessageData(fbid, "There is an approximate wait of 10-20 minutes at the security gate for Terminal C"),
    handler.getTextMessageData(fbid, "Bon Voyage!")
  ]);
}

function sendDayPlan() {
	const firstSet = [
    {
      "title": "Running trails in Salt Lake city",
      "subtitle": "Near your hotel",
      "image_url": "https://cdn.pixabay.com/photo/2012/04/02/12/56/exercising-24419_960_720.png"
    },
    {
      "title": "Herman Franks Park",
      "subtitle": ".3 miles from hotel",
      "image_url": "http://www.slcgov.com/sites/default/files/images/parks/2012/hermanfranks-(1)-1185.jpg",
      "default_action": {
        "type": "web_url",
        "url": "http://www.slcgov.com/cityparks/parks-herman-franks-park",
        "webview_height_ratio": "full"
      },
      "buttons": [
        {
          "title": "Directions",
          "type": "web_url",
          "url": "https://goo.gl/maps/zQvhVZGjxSx",
          "webview_height_ratio": "full"
        }
      ]
    },
    {
      "title": "Liberty Park",
      "subtitle": "1 mile from hotel",
      "image_url": "http://www.slcgov.com/sites/default/files/images/parks/2012/IMG_2859.jpg",
      "default_action": {
        "type": "web_url",
        "webview_height_ratio": "full",
        "url": "http://www.slcgov.com/cityparks/parks-liberty-park"
      },
      "buttons": [
        {
          "title": "Directions",
          "type": "web_url",
          "url": "https://goo.gl/maps/zQvhVZGjxSx",
          "webview_height_ratio": "full"
        }
      ]
    }
  ];
  // Interactive SLC: http://www.slcgov.com/cityparks/parks-wasatch-hollow-park
	const secondSet = [
    {
      "title": "Sunnyside Park",
      "subtitle": "2.2 miles from hotel",
      "image_url": "http://www.slcgov.com/sites/default/files/images/parks/2012/sunnyside-(6)-1333.jpg",
      "default_action": {
        "type": "web_url",
        "url": "http://www.slcgov.com/cityparks/parks-sunnyside-park",
        "webview_height_ratio": "full"
      },
      "buttons": [
        {
          "title": "Directions",
          "type": "web_url",
          "url": "https://goo.gl/maps/JvwRiVZnJy42",
          "webview_height_ratio": "full"
        }
      ]
    },
    {
      "title": "Wasatch Hollow park",
      "subtitle": "1.6 miles from hotel",
      "image_url": "http://www.slcgov.com/sites/default/files/images/parks/2012/wasatchhollow-(1)-1294.jpg",
      "default_action": {
        "type": "web_url",
        "webview_height_ratio": "full",
        "url": "http://www.slcgov.com/cityparks/parks-wasatch-hollow-park"
      },
      "buttons": [
        {
          "title": "Directions",
          "type": "web_url",
          "url": "https://goo.gl/maps/wah5FyTtxTy",
          "webview_height_ratio": "full"
        }
      ]
    }
	];
  const message = {
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        "type": "template",
        payload: {
          template_type: "list",
          "top_element_style": "compact",
          // elements: firstSet,
          elements: secondSet,
          buttons: [{
            title: "View more",
            "type": "postback",
            payload: "view more"
          }]
        }
      }
    }
  };
  const messageList = [];
  messageList.push(message);
  handler.sendMultipleMessages(fbid, messageList);
}

function sendCheckinMessage() {
  const message = {
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        "type": "template",
        payload: {
          "template_type": "airline_checkin",
          "intro_message": "Hope you had a great time! Its time to head back home",
          "locale": "en_US",
          "pnr_number": "VZECCB",
          "flight_info": [
            {
              "flight_number": "EK205",
              "departure_airport": {
                "airport_code": "MXP",
                "city": "Milan",
              },
              "arrival_airport": {
                "airport_code": "JFK",
                "city": "New York",
              },
              "flight_schedule": {
                "departure_time": "2017-07-22T16:10",
                "arrival_time": "2017-07-22T19:00"
              }
            }
          ],
          "checkin_url": "https://mobile.emirates.com/english/CKIN/OLCI/flightInfo.xhtml"
  	    }
      }
    }
	};
  handler.sendAnyMessage(message);
}

function sendSingleActivity() {
  const message = {
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        "type": "template",
        payload: {
          template_type: "generic",
          elements: [{
              "title": "Your Emirates Flight EK205 leaves at 4.10 p.m. tomorrow",
              "subtitle": "Time to check-in",
              "default_action": {
                "type": "web_url",
                "url": "https://flightaware.com/live/flight/EK205",
                "webview_height_ratio": "full"
              },
            buttons: [{
              "title": "Flight details",
              "type": "postback", 
              "payload": "flight itinerary"
            }]
          }]
        }
      }
    }
  };
  handler.sendAnyMessage(message);
}

function sendFeatureMessage() {
  const message = {
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        "type": "template",
        payload: {
          top_element_style: "compact",
          template_type: "list",
          elements: [
					{
            "title": "Feature Alert",
            "subtitle": `Add details to your itinerary with the "trip calendar" command`
          },
          {
            "title": "Feature Alert",
            "subtitle": `See a specific day's itinerary by entering a travel day. Eg. "25", "26th" etc.`
          }
					]
        }
      }
    }
  };
  handler.sendAnyMessage(message);
}

function sendRecommendationAlert() {
  const message = {
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        "type": "template",
        payload: {
          template_type: "generic",
          elements: [
					{
            "title": "Alert: We have added plans for tomorrow",
            "subtitle": `Type 20th or "tomorrow" to see our recommendations`
          },
					]
        }
      }
    }
  };
  handler.sendAnyMessage(message);
}

function sendNewFeatureMessage() {
  const message = {
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        "type": "template",
        payload: {
          template_type: "generic",
          elements: [
					{
            "title": "New Feature Alert: We have added running trail recommendations",
            "subtitle": `See trails near your Salt Lake City hotel with commands: "running" or "trails"`
          },
					]
        }
      }
    }
  };
  handler.sendAnyMessage(message);
  // handler.sendMultipleMessages(fbid, messageList);
}

function sendBeforeFlightMessage() {
	const trip = new TripData("salt_lake_city", fbid);
  const commands = new Commands(trip, fbid);
  const message = commands.handle("26th");
  const messageList = [];
  messageList.push(handler.getTextMessageData(fbid, `Hi ${name}! Your flight to Salt lake city leaves at 7.24 a.m. tomorrow. Here is your day's itinerary`));
  messageList.push(message);
  handler.sendMultipleMessages(fbid, messageList);
}

function sendGoodMorningMessage() {
	const trip = new TripData("salt_lake_city", fbid);
  const commands = new Commands(trip, fbid);
  // const message = commands.handle("today");
  const messageList = [];
  messageList.push(handler.getTextMessageData(fbid,`Good morning ${name}! It'll be mostly sunny in Salt Lake City today with a high of 91°F (don't forget  your hat, sunglasses and sunscreen)!`));
  messageList.push(handler.getTextMessageData(fbid,`You don't seem to have any plans today. Use the 'reco' command to get recommendations or details about anything. Type 'veg rest' to see lunch recommendations.`));
  handler.sendMultipleMessages(fbid, messageList);
}

function sendRentalCarDetails() {
	const trip = new TripData("salt_lake_city", fbid);
  const commands = new Commands(trip, fbid);
  const messageList = [];
  messageList.push(handler.getTextMessageData(fbid, `Welcome to Salt Lake City ${name}! Here are your rental car details`));
  messageList.push({
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        "type": "template",
        payload: {
          template_type: "generic",
          elements: [
          {
            "title": "Rental car details",
      "buttons": [
        {
          "title": "Enterprise",
          "type": "postback",
          "payload": "car details"
        }
      ]
          }]
        }
      }
    }
  });
  handler.sendMultipleMessages(fbid, messageList);
}

function sendExpenseAndFeedbackRequest() {
  const trip = new TripData("milan", fbid);
  const messageList = [];
  messageList.push(handler.getTextMessageData(fbid, `Hope you had a great time at Milan ${name}. Your total expenses (that Polaama knows about) is $3714/-`));
  messageList.push({
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        "type": "template",
        payload: {
          template_type: "generic",
          elements: [
          {
            "title": "Can you take a quick survey?",
            "subtitle": "We appreciate your feedback. Click to begin",
            "default_action": {
              "type": "web_url",
              "url": "https://madhu85.typeform.com/to/S9SnZi",
              "webview_height_ratio": "full"
            }
          }]
        }
      }
    }
  });
  handler.sendMultipleMessages(fbid, messageList);
}

const readline = require('readline-sync');
const proceed = readline.question(`Send message to ${name}? [Y/N] `);
if(proceed !== 'Y' && proceed !== 'y') {
  console.log(`Doing nothing`);
  return process.exit(0);
}
console.log(`Sending message to ${name}`);
// Surveys: Goal: See if user liked it, would they pay, features.
/*
* What feature in the bot did you use the most?
* What feature(s) did you wish the bot had?
* How did the Bot help for your Milan trip? (N/A if it did not).
* Is there any trip planning feature would you pay for? If so, what? (say N/A if there is no such feature)
* Any other general comments about the bot?
*/

sendGoodMorningMessage();
// sendRentalCarDetails();
// sendBeforeFlightMessage();
// sendExpenseAndFeedbackRequest();
// sendRecommendationAlert();
// sendDayPlan();
// sendCheckinMessage();
// sendSingleActivity();
// sendNewFeatureMessage();
// sendFeatureMessage();
// flightStatusAndWaitTimes();
// sendPackList();
