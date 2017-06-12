'use strict';

const baseDir = "/home/ec2-user";
const WebhookPostHandler = require(`${baseDir}/webhook-post-handler`);
const TripData = require(`${baseDir}/trip-data`);
const Sessions = require(`${baseDir}/sessions`);
const Commands = require(`trip-itinerary/app/commands`);

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

function sendNextMessage() {
  const firstElementSet = [
      {
        title: "Breakfast at Carlton's",
        image_url: "http://www.touryourway.com/uploadImages/systemFiles/Carlton-hotel-Tel-Aviv%20(2).jpg",
        default_action: {
          type: "web_url",
          url: "www.carlton.co.il/en",
          "webview_height_ratio": "full",
        }
      },
      {
        title: '08:30: "An Overview of the Middle East & Israel" by Michael Bauer',
        subtitle: "Walking tour along Rothschild Boulevard",
        default_action: {
          type: "web_url",
          url: "https://polaama.com/aeXf/tel_aviv/itin-detail/tel-aviv-2017-06-12-item-2",
          webview_height_ratio: "full",
        }
      },
      {
        title: '11:30: Meet with Inbal Arieli and Nadav Zafrir',
        subtitle: "An Overview of the Israeli Tech Ecosystem and Its Roots at TBD",
        default_action: {
          type: "web_url",
          url: "https://polaama.com/aeXf/tel_aviv/itin-detail/tel-aviv-2017-06-12-item-3",
          "webview_height_ratio": "full",
        }
      },
      {
        title: '13:00: Lunch at Vicky & Crostina',
        image_url: "https://media-cdn.tripadvisor.com/media/photo-s/02/7b/38/90/vicky-cristina.jpg",
        default_action: {
          type: "web_url",
          url: "https://www.tripadvisor.com/Restaurant_Review-g293984-d2223803-Reviews-Vicky_Cristina-Tel_Aviv_Tel_Aviv_District.html",
          "webview_height_ratio": "full",
        }
      }
  ];
  const message = {
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "list",
          "top_element_style": "compact",
          elements: firstElementSet,
          buttons: [{
            title: "View more",
            type: "postback",
            payload: "todays_itin_next_set"
          }]
        }
      }
    }
  };
  const messageList = [];
  messageList.push(handler.getTextMessageData(fbid, `Good morning! This is your itinerary for today!`));
  messageList.push(message);
  handler.sendMultipleMessages(fbid, messageList);
}

function sendDayAsListMessage() {
  const commands = new Commands(trip, fbid);
  const message = commands.handle("13th");
  handler.sendAnyMessage(message);
}

sendDayAsListMessage();

// sendNextMessage();
// flightStatusAndWaitTimes();
// sendPackList();
