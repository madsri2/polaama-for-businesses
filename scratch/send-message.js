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
      "title": "See your 6/17 itinerary as a map",
      "subtitle": "Click to see map",
      "image_url": "https://polaama.com/XQLn/tel_aviv/2017-6-17/-/map",
      "default_action": {
        "type": "web_url",
        "url": "https://goo.gl/maps/jyNPwEpNC1v",
        "webview_height_ratio": "full"
      }
    },
    {
      "title": "Breakfast at Mamilla Hotel",
      "subtitle": "\"Check out\" after breakfast",
      "image_url": "http://tinyurl.com/y6w2q96e",
      "default_action": {
        "type": "web_url",
        "url": "http://www.mamillahotel.com/",
        "webview_height_ratio": "full"
      }
    },
    {
      "title": "Hike Masada",
      "subtitle": "Ascend Masada and tour King Herod’s historic hilltop fortress",
      "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Israel-2013-Aerial_21-Masada.jpg/180px-Israel-2013-Aerial_21-Masada.jpg",
      "default_action": {
        "type": "web_url",
        "url": "https://polaama.com/XQLn/tel_aviv/2017-6-17/item-2",
        "webview_height_ratio": "full"
      }
    },
    {
      "title": "Float at the Dead sea",
      "subtitle": "Lunch at International beach",
      "image_url": "http://www.movenpick.com/fileadmin/_migrated/pics/DeadSea_xxxxxxx_i104829_13.jpg",
      "default_action": {
        "type": "web_url",
        "url": "https://polaama.com/XQLn/tel_aviv/2017-6-17/item-3",
        "webview_height_ratio": "full"
      }
    }
  ];
  const secondSet = [
    {
      "title": "Drive south to Ramon Crater",
      "subtitle": "Visit the largest erosion center",
      "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Israel-2013-Aerial_00-Negev-Makhtesh_Ramon.jpg/256px-Israel-2013-Aerial_00-Negev-Makhtesh_Ramon.jpg",
      "default_action": {
        "url": "https://en.wikipedia.org/wiki/Makhtesh_Ramon",
        "type": "web_url",
        "webview_height_ratio": "full"
      }
    },
    {
      "title": "Sunset/Havdalah at Mizpe Ramon",
      "subtitle": "Check-in at \"Beresheet hotel\"",
      "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Mitzepe_Ramon_02.jpg/250px-Mitzepe_Ramon_02.jpg",
      "default_action": {
        "type": "web_url",
        "url": "https://polaama.com/XQLn/tel_aviv/2017-6-17/item-5",
        "webview_height_ratio": "full"
      }
    },
    {
      "title": "Hitbodedut at Ramon crater",
      "subtitle": "Unstructured, spontaneous and individualized form of prayer",
      "image_url": "http://tinyurl.com/ybo2pksh",
      "default_action": {
        "type": "web_url",
        "url": "https://polaama.com/XQLn/tel_aviv/2017-6-17/item-6",
        "webview_height_ratio": "full"
      }
    }
  ];
  const thirdSet = [
    {
      "title": "21:00 Desert Dinner experience",
      "subtitle": "Ramon crater",
    },
    {
      "title": "Overnight at Bereshhet hotel",
      "image_url": "http://tinyurl.com/ycud3a3o",
      "default_action": {
        "type": "web_url",
        "url": "http://www.isrotelexclusivecollection.com/beresheet/",
        "webview_height_ratio": "full"
      }
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
          elements: thirdSet,
          buttons: [{
            title: "View more",
            "type": "postback",
            payload: "view_more"
          }]
        }
      }
    }
  };
  const messageList = [];
  messageList.push(message);
  handler.sendMultipleMessages(fbid, messageList);
}

function sendGoodMorningMessage() {
  const commands = new Commands(trip, fbid);
  const message = commands.handle("today");
  const messageList = [];
  let name = new FbidHandler().getName(fbid);
  if(!name) name = "";
  else name = name.substring(0, name.indexOf(" "));
  messageList.push(handler.getTextMessageData(fbid, `Good morning ${name}! It's going to be partly cloudy today. That's good, because there is going to be lots of traveling. Here is your itinerary`));
  messageList.push(message);
  handler.sendMultipleMessages(fbid, messageList);
}


// sendGoodMorningMessage();

// sendDayPlan();
// flightStatusAndWaitTimes();
// sendPackList();
