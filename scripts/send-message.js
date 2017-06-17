'use strict';

const baseDir = "/home/ec2-user";
const WebhookPostHandler = require(`${baseDir}/webhook-post-handler`);
const TripData = require(`${baseDir}/trip-data`);
const Sessions = require(`${baseDir}/sessions`);
const Commands = require(`trip-itinerary/app/commands`);
const FbidHandler = require('fbid-handler/app/handler');

const fbid = "1120615267993271"; // madhu
// const fbid = "1443244455734100"; // gillian
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
              "title": "Hike Masada",
              "subtitle": "\"Activity 2 on 16th\": Option 1: Krav Maga(16:00 - 17:00) at beach near hotel; Option 2: SAP rental",
              "image_url": "http://tinyurl.com/ycud3a3o",
              "default_action": {
                "type": "web_url",
                "url": "http://www.isrotelexclusivecollection.com/beresheet/",
                "webview_height_ratio": "full"
              },
              buttons: [{
                title: "Next",
                "type": "postback",
                payload: "next"
              }]
          }]
        }
      }
    }
  };
  handler.sendAnyMessage(message);
}

function sendNewFeatureMessage() {
  const messageList = [];
  messageList.push(handler.getTextMessageData(fbid, `We are excited to announce a new feature that will display a single activity. Simply type "first" to see the first activity for today. You can type "next" and "prev" at any time to iterate over activities.`));
  messageList.push(handler.getTextMessageData(fbid, `Example commands to see a single activity for another day: "first for tomorrow", "next for 16th", "prev for 17th" etc. Try it out and tell us what you think!`));
  handler.sendMultipleMessages(fbid, messageList);
  
}

function sendGoodMorningMessage() {
  const commands = new Commands(trip, fbid);
  const message = commands.handle("today");
  const messageList = [];
  let name = new FbidHandler().getName(fbid);
  if(!name) name = "";
  else name = name.substring(0, name.indexOf(" "));
  messageList.push(handler.getTextMessageData(fbid, `Good morning ${name}!. It's going to be mostly sunny today and there is lots of driving, so be prepared. Here is the itinerary.`));
  messageList.push(message);
  handler.sendMultipleMessages(fbid, messageList);
}

// sendDayPlan();
sendGoodMorningMessage();

// sendSingleActivity();
// sendNewFeatureMessage();

// flightStatusAndWaitTimes();
// sendPackList();
