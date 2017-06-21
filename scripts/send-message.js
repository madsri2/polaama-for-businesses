'use strict';

const baseDir = "/home/ec2-user";
const WebhookPostHandler = require(`${baseDir}/webhook-post-handler`);
const TripData = require(`${baseDir}/trip-data`);
const Sessions = require(`${baseDir}/sessions`);
const Commands = require(`trip-itinerary/app/commands`);
const FbidHandler = require('fbid-handler/app/handler');

// const fbid = "1120615267993271"; // madhu
const fbid = "1718674778147181"; // Beth
const trip = new TripData("tel_aviv", fbid);
const session = Sessions.get().find(fbid);
if(!session) throw new Error(`could not find session for fbid ${fbid}`);
const handler = new WebhookPostHandler(session);

function sendPackList() {
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
      "title": "See your 6/18 itinerary as a map",
      "subtitle": "Click to see map",
      "image_url": "https://polaama.com/XQLn/tel_aviv/2017-6-18/-/map",
      "default_action": {
        "type": "web_url",
        "url": "https://goo.gl/maps/y4NdfL5RuYC2",
        "webview_height_ratio": "full"
      }
    },
    {
      "title": "Breakfast and relaxing morning at the hotel",
      "subtitle": "Check-out",
      "image_url": "http://tinyurl.com/ycud3a3o",
      "default_action": {
        "type": "web_url",
        "url": "http://www.isrotelexclusivecollection.com/beresheet/",
        "webview_height_ratio": "full"
      }
    },
    {
      "title": "Visit Ben Gurion's grave",
      "subtitle": "The decision we make as leaders",
      "image_url": "http://www.parks.org.il/sites/English/ParksAndReserves/benGorion/PublishingImages/%D7%90%D7%97%D7%95%D7%96%D7%AA%20%D7%A7%D7%91%D7%A8%20%D7%91%D7%9F%20%D7%92%D7%95%D7%A8%D7%99%D7%95%D7%9F.jpg",
      "default_action": {
        "type": "web_url",
        "url": "https://polaama.com/XQLn/tel_aviv/2017-6-18/item-2",
        "webview_height_ratio": "full"
      }
    },
    {
      "title": "Leadership Dilemmas",
      "subtitle": "Sde Boker",
      "default_action": {
        "type": "web_url",
        "url": "https://polaama.com/XQLn/tel_aviv/2017-6-18/item-3",
        "webview_height_ratio": "full"
      }
    },
  ];
  const secondSet = [
    {
      "title": "Closing session and Dinner",
      "subtitle": "Hedal Offaim's home",
      "image_url": "http://www.ofaimme.com/wp-content/uploads/2013/08/2-672x400.jpg",
      "default_action": {
        "type": "web_url",
        "url": "https://polaama.com/XQLn/tel_aviv/2017-6-18/item-4",
        "webview_height_ratio": "full"
      }
    },
    {
      "title": "Bus departs for Ben Gurion airport",
      "subtitle": "Depart at 23:10. Flight UA91",
      "image_url": "http://tinyurl.com/ybrq92nt",
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
          elements: secondSet,
          buttons: [{
            title: "Return Flight",
            "type": "postback",
            payload: "return flight"
          }]
        }
      }
    }
  };
  const messageList = [];
  messageList.push(message);
  handler.sendMultipleMessages(fbid, messageList);
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
              "title": "Flight DL752 departs SEA at 7:24 AM on July 26th",
              "subtitle": "Mostly sunny in Seattle; Partly cloudy in Salt Lake City",
              "image_url": "https://polaama.com/aeXf/salt_lake_city/2017-7-26/-/map",
              "default_action": {
                "type": "web_url",
                "url": "https://flightaware.com/live/flight/DL752",
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
          elements: [{
            "title": "Feature Alert",
            "subtitle": `Add details to your itinerary with the "trip calendar" command`
          },
          {
            "title": "Feature Alert",
            "subtitle": `See a specific day's itinerary by entering a travel day. Eg. "25", "26th" etc.`
          }]
        }
      }
    }
  };
  handler.sendAnyMessage(message);
}

function sendNewFeatureMessage() {
  const messageList = [];
  messageList.push(handler.getTextMessageData(fbid, `New Feature Alert: You can now find out where you are going to eat with simple commands like "breakfast", "lunch","dinner","lunch on 18th" etc.`));
  handler.sendMultipleMessages(fbid, messageList);
  
}

function sendGoodMorningMessage() {
  const commands = new Commands(trip, fbid);
  const message = commands.handle("today");
  const messageList = [];
  let name = new FbidHandler().getName(fbid);
  if(!name) name = "";
  else name = name.substring(0, name.indexOf(" "));
  messageList.push(handler.getTextMessageData(fbid, `Good morning ${name}!. Hope you had a great trip. You will be flying home today. Here is your itinerary.`));
  messageList.push(message);
  handler.sendMultipleMessages(fbid, messageList);
}

// sendDayPlan();
// sendGoodMorningMessage();

// sendSingleActivity();
// sendNewFeatureMessage();
sendFeatureMessage();

// flightStatusAndWaitTimes();
// sendPackList();
