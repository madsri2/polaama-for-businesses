'use strict';
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
const FBTemplateCreator = require(`${baseDir}/fb-template-creator`);
const NBClassifier = require('sea-spray-handler/app/nb-classifier');
const moment = require('moment');
const AdminMessageSender = require('business-pages-handler');

function SeaSprayHandler() {
  this.classifier = new NBClassifier();
  this.adminMessageSender = new AdminMessageSender("1629856073725012");
}

SeaSprayHandler.pageId = "1510665378999204";

SeaSprayHandler.prototype.greeting = function(pageId, fbid) {
  if(pageId != SeaSprayHandler.pageId) return null;
  let messageList = [];
  messageList.push(FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "Welcome to Sea Spray cruises. How can I help you today?",
      subtitle: "I am a chat bot who can answer questions about our awesome cruises at St.Lucia",
      image_url: "http://tinyurl.com/y8v9ral5"
    }]
  }));
  messageList = messageList.concat(commonQuestionsButtons.call(this, fbid));
  return messageList;
}

SeaSprayHandler.prototype.handleText = function(mesg, pageId, fbid) {
  const pageDetails = {
    title: "Response from Sea Spray",
    image_url: "http://tinyurl.com/y8v9ral5",
    buttons: [{
      title: "Contact details",
      type: "postback",
      payload: "sea_spray_contact"
    }]
  };
  const responseFromAdmin = this.adminMessageSender.handleResponseFromAdmin(fbid, mesg, pageDetails);
  if(responseFromAdmin) return responseFromAdmin;

  const category = this.classifier.classify(mesg);
  if(category === "customer service") return customerService(fbid);
  if(category === "greeting") return this.greeting(pageId, fbid);
  if(category === "tout bagay days") return toutBagayDays(fbid);
  if(category === "sunset cruise days") return sunsetCruiseDays(fbid);
  if(category === "pirate days") return piratesDay(fbid);
  if(category === "bad weather") return badWeatherPolicy(fbid);
  if(category === "book tour") return bookTours(fbid);
  if(category === "large group discounts") return largeGroupDiscounts(fbid);
  if(category === "hotel transfers") return hotelTransfer(fbid);
  if(category === "advance booking") return advanceBooking(fbid);
  if(category === "passenger count") return passengerCount(fbid);
  if(category === "customer service") return customerServiceDetails(fbid);
  if(category === "unclassified") return this.adminMessageSender.sendMessageToAdmin(fbid, mesg);
  if(category === "location") return location(fbid);
  if(category === "operating season") return operatingSeason(fbid);
}

SeaSprayHandler.prototype.handlePostback = function(payload, pageId, fbid) {
  if(pageId != SeaSprayHandler.pageId) return null;
  const awaitingAdminResponse = this.adminMessageSender.handleWaitingForAdminResponse(fbid, payload);
  if(awaitingAdminResponse) return awaitingAdminResponse;

  if(payload === "sea_spray_contact") return customerService(fbid);
  if(payload === "sea_spray_book_tour") return bookTours.call(this, fbid);
  if(payload === "sea_spray_tout_bagay_operating_days") return toutBagayDays.call(this, fbid);
  if(payload === "sea_spray_pirate_days_operating_days") return piratesDay.call(this, fbid);
  if(payload === "sea_spray_sunset_cruise_operating_days") return sunsetCruiseDays.call(this, fbid);
  if(payload === "sea_spray_bad_weather") return badWeatherPolicy(fbid);
  if(payload === "sea_spray_advance_booking") return advanceBooking(fbid);
  if(payload === "sea_spray_group_discount") return largeGroupDiscounts(fbid);
  if(payload === "sea_spray_hotel_transfer") return hotelTransfer(fbid);
  if(payload === "sea_spray_common_questions") return commonQuestionsButtons.call(this, fbid);

  logger.error(`Do not know how to handle payload ${payload} from fbid ${fbid} for "sea spray" bot`);
  // we need to respond one way or another here. TODO: See if there is a bettter way to handle this.
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "We have notified our team, who will get back to you shortly",
      image_url: "http://tinyurl.com/y8v9ral5",
    }],
  });
}

function operatingSeason(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "We operate year round.",
      subtitle: "St. Lucia is beautiful year round. So, visit us anytime!",
      buttons: [{
        title: "Tour options",
        type: "postback",
        payload: "sea_spray_book_tour"
      }]
    }],
  });
}

function customerService(fbid) {
  return FBTemplateCreator.list({
    fbid: fbid,
    elements: [{
      title: "SEA SPRAY Cruises",
      subtitle: "Contact details",
      image_url: "http://tinyurl.com/y8v9ral5"
    }, {
      title: "Our phone numbers: +1-758-458-0123, +1-758-452-8644",
      subtitle: "US residents: +1-321-220-9423",
      buttons: [{
          type: "phone_number",
          title: "Call us",
          payload: "+13212209423"
      }]
    }, {
      title: "Hours (UTC-04:00 timezone)",
      subtitle: "Mon-Sat: 9 a.m. - 5 p.m."
    }, {
      title: "Email",
      subtitle: "info@seaspraycruises.com"
    }]
  });
}

function sunsetCruiseDays(fbid) {
    const year = moment().year();
    const month = moment().month() + 1;
    return FBTemplateCreator.list({
      fbid: fbid,
      elements: [{
        title: "Sunset Cruise",
        subtitle: "Operating hours",
        image_url: "http://tinyurl.com/y8cfqjla"
      }, {
        title: "Operates every Tuesday and Friday", 
        subtitle: "Email us. We sometimes add extra days",
      },{
        title: "Hotel pickup times vary",
        subtitle: "When booking, tell us your stay details"
      }],
      buttons: [{
        title: "Book Sunset cruise",
        type: "web_url",
        webview_height_ratio: "full",
        url: `https://fareharbor.com/embeds/book/seaspraycruises/items/35419/calendar/${year}/${month}/?full-items=yes`
      }]
    });
}

function piratesDay(fbid) {
    const year = moment().year();
    const month = moment().month() + 1;
    return FBTemplateCreator.list({
      fbid: fbid,
      elements: [{
        title: "Pirate Day's Adventure Cruise",
        subtitle: "Operating hours",
        image_url: "http://tinyurl.com/ybxwcufb",
      }, {
        title: "Every Tuesday and Friday, 5 p.m. - 7 p.m.", 
        subtitle: "Email us. We sometimes add extra days",
      },{
        title: "Hotel pickup times vary",
        subtitle: "When booking, tell us your stay details"
      }],
      buttons: [{
        title: "Book Pirate Day's cruise",
        type: "web_url",
        webview_height_ratio: "full",
        url: `https://fareharbor.com/embeds/book/seaspraycruises/items/35420/calendar/${year}/${month}/?full-items=yes`
      }]
    });
}

function toutBagayDays(fbid) {
    const year = moment().year();
    const month = moment().month() + 1;
    return FBTemplateCreator.list({
      fbid: fbid,
      elements: [{
        title: "Tout Bagay Cruise",
        subtitle: "Our MOST popular tour",
        image_url: "http://tinyurl.com/y8486a92",
      }, {
        title: "Operates every Monday, Wednesday and Saturday 8.30 a.m. - 5.00 p.m.",
        subtitle: "Email us. We sometimes add extra days",
      },{
        title: "Hotel pickup times vary",
        subtitle: "When booking, tell us your stay details"
      }],
      buttons: [{
        title: "Book Tout Bagay",
        type: "web_url",
        webview_height_ratio: "full",
        url: `https://fareharbor.com/embeds/book/seaspraycruises/items/35423/calendar/${year}/${month}/?full-items=yes`
      }]
    });
}

function bookTours(fbid) {
  const year = moment().year();
  const month = moment().month() + 1;
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "Tout Bagay Cruise",
      subtitle: "Our MOST popular tour. A guided historical tour along the west coast",
      image_url: "http://tinyurl.com/y8486a92",
      buttons: [{
        title: "Book cruise",
        type: "web_url",
        webview_height_ratio: "full",
        url: `https://fareharbor.com/embeds/book/seaspraycruises/items/35423/calendar/${year}/${month}/?full-items=yes`
      }]
    }, {
      title: "Pirate Day's Adventure Cruise",
      subtitle: "Join Captain John-T and his buccaneers crew as they set sail for Soufriere, along the west coast",
      image_url: "http://tinyurl.com/ybxwcufb",
      buttons: [{
        title: "Book cruise",
        type: "web_url",
        webview_height_ratio: "full",
        url: `https://fareharbor.com/embeds/book/seaspraycruises/items/35420/calendar/${year}/${month}/?full-items=yes`
      }]
    }, {
      title: "Sunset Cruise",
      subtitle: "Come, seek the green flash",
      image_url: "http://tinyurl.com/y8cfqjla",
      buttons: [{
        title: "Book cruise",
        type: "web_url",
        webview_height_ratio: "full",
        url: `https://fareharbor.com/embeds/book/seaspraycruises/items/35419/calendar/${year}/${month}/?full-items=yes`
      }]
    }, {
      title: "All tours",
      subtitle: "Click to see all tours. We offer a variety of tours for everyone",
      image_url: "http://tinyurl.com/y8v9ral5",
      default_action: {
        type: "web_url",
        url: "https://seaspraycruises.com/st-lucia-tours/",
        webview_height_ratio: "full",
      },
      buttons: [{
        title: "Book tours",
        type: "web_url",
        webview_height_ratio: "full",
        url: "https://fareharbor.com/embeds/book/seaspraycruises/items/?full-items=yes"
      }]
    }]
  });
}

function badWeatherPolicy(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "In case of bad weather, you can reschedule",
      subtitle: "Or cancel at no charge",
      image_url: "http://tinyurl.com/y8ykdh4g",
      buttons: [{
        title: "Book cruises",
        type: "postback",
        payload: "sea_spray_book_tour"
      }]
    }]
  });
}

function largeGroupDiscounts(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "Each situation is different, so email or call us",
      subtitle: "We will do our best to meet your requests",
      image_url: "http://tinyurl.com/y8v9ral5",
      buttons: [{
        title: "Contact details",
        type: "postback",
        payload: "sea_spray_contact"
      }]
    }],
  });
}

function hotelTransfer(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "We offer transfers for all hotels in the NORTH of the island",
      image_url: "http://tinyurl.com/y8v9ral5",
      buttons: [{
        title: "Book cruises",
        type: "postback",
        payload: "sea_spray_book_tour"
      }]
    }],
  });
}

function advanceBooking(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "We recommend booking as early as possible",
      subtitle: "Popular cruises sell out fast. Tours are sold on a first-come first-serve basis",
      image_url: "http://tinyurl.com/y8v9ral5",
      buttons: [{
        title: "Book cruises",
        type: "postback",
        payload: "sea_spray_book_tour"
      }]
    }],
  });
}

function passengerCount(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "The number varies depending on the time of year",
      subtitle: "Bulk bookings can happen anytime, so it's difficult to predict an exact number",
      image_url: "http://tinyurl.com/y8v9ral5",
      buttons: [{
        title: "Book cruises",
        type: "postback",
        payload: "sea_spray_book_tour"
      }]
    }],
  });
}

function commonQuestionsButtons(fbid) {
  const messageList = [];
  messageList.push(FBTemplateCreator.text({
    fbid: fbid,
    text: "Here's a list of some commonly asked questions"
  }));
  messageList.push(FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "What tours do you operate?",
      image_url: "https://seaspraycruises.com/wp-content/uploads/2016/02/02-560x400.jpg",
      buttons: [{
        title: "Tour options",
        type: "postback",
        payload: "sea_spray_book_tour",
      }]
    },{
      title: "What days does the Tout Bagay tour operate?",
      image_url: "http://tinyurl.com/y8486a92",
      buttons: [{
        title: "Operating days",
        type: "postback",
        payload: "sea_spray_tout_bagay_operating_days"
      }]
    },{
      title: "What days does the Pirate Days tour operate?",
      image_url: "http://tinyurl.com/ybxwcufb",
      buttons: [{
        title: "Operating days",
        type: "postback",
        payload: "sea_spray_pirate_days_operating_days"
      }]
    },{
      title: "What days does the Sunset cruise operate?",
      image_url: "http://tinyurl.com/y8cfqjla",
      buttons: [{
        title: "Operating days",
        type: "postback",
        payload: "sea_spray_sunset_cruise_operating_days"
      }]
     },{
        title: "What is your Bad weather policy?",
        image_url: "http://tinyurl.com/y8ykdh4g",
        buttons: [{
          title: "Bad Weather details",
          type: "postback",
          payload: "sea_spray_bad_weather"
       }]
     },{
        title: "Is Advance booking required?",
        image_url: "http://tinyurl.com/yd7oa8uj",
        buttons: [{
          title: "Our recommendation",
          type: "postback",
          payload: "sea_spray_advance_booking"
       }]
     },{
        title: "Which hotels do you transfer from?",
        image_url: "http://tinyurl.com/y942m5w5",
        buttons: [{
          title: "Hotel transfer",
          type: "postback",
          payload: "sea_spray_hotel_transfer"
       }]
    }]
  }));
  return messageList;
}

function location(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "We are located at Rodney Bay Marina",
      subtitle: "click to see us on google maps",
      image_url: "http://tinyurl.com/yd7oa8uj",
      default_action: {
        type: "web_url",
        webview_height_ratio: "full",
        url: "https://goo.gl/maps/oR9zuaicnX92"
      },
      buttons: [{
          title: "All tours",
          type: "postback",
          payload: "sea_spray_book_tour"
      }]
    }]
  });
}

SeaSprayHandler.prototype.testing_handleText = function(mesg, pageId, fbid) {
  const category = this.classifier.classify(mesg);
  const message = this.handleText(mesg, pageId, fbid);
  return {
    message: message,
    category: category
  };
}

module.exports = SeaSprayHandler;
