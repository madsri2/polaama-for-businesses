'use strict';
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
const FBTemplateCreator = require(`${baseDir}/fb-template-creator`);
const DialogflowHackshawAgent = require('dialogflow/app/hackshaw-agent');
const moment = require('moment');
const PageHandler = require('fbid-handler/app/page-handler');

const year = moment().year();
const month = moment().month() + 1;

function HackshawHandler(testing) {
  this.classifier = new DialogflowHackshawAgent();
  this.name = "Hackshaw boats";
  this.adminIds = [this.madhusPageScopedFbid()];
  this.businessPageId = null; // to be filled when the bot goes live for the hackshaw page
  this.testing = testing;
}

HackshawHandler.prototype.handleBusinessSpecificCategories = function(fbid, category, tourName) {
  if(category === "available-tours") return bookTours(fbid);
  if(category === "customer-service") return customerService(fbid);
  if(category === "bad-weather") return badWeatherPolicy(fbid);
  if(category === "book-tour") return bookTours(fbid);
  if(category === "large-group-discounts") return largeGroupDiscounts(fbid);
  if(category === "hotel-transfers") return hotelTransfer(fbid);
  if(category === "advance-booking") return advanceBooking(fbid);
  if(category === "location") return location(fbid);
  if(category === "fish-catch") return fishCatch(fbid);
  if(category === "dolphin-whale-types") return dolphinWhaleTypes(fbid);
  if(category === "dolphin-whale-success-rate") return dolphinWhaleSuccessRate(fbid);
  if(category === "kids-allowed") return kidsAllowed(fbid);
  if(category === "operating-hours") return operatingHours(fbid);
  if(category === "cost-of-tour") return costOfTour(fbid);
  return tourSpecificResponses(tourName, category, fbid);
}

function tourSpecificResponses(tour, category, fbid) {
  const functions = {
    "private_charter": {
      "cruise-details": privateCharterDetails,
      "operating-days": privateCharterDays,
      "passenger-count": privateCharterPassengerCount,
      'things-to-do-and-see': privateCharterDetails,
      'entity-name': privateCharterDetails,
    },
    "dolphin_whale_watching": {
      "cruise-details": dolphinAndWhalesDetails,
      "operating-days": dolphinAndWhalesDays,
      "passenger-count": whaleWatchPassengerCount,
      'things-to-do-and-see': dolphinAndWhalesDetails,
      'entity-name': dolphinAndWhalesDetails,
    },
    "group_sports_fishing": {
      "cruise-details": groupSportsFishingDetails,
      "operating-days": groupSportsFishingDays,
      "passenger-count": groupSportsPassengerCount,
      'things-to-do-and-see': groupSportsFishingDetails,
      'entity-name': groupSportsFishingDetails,
    },
    "bottom_fishing": {
      "cruise-details": bottomFishingDetails,
      "operating-days": bottomFishingDays,
      "passenger-count": bottomFishingPassengerCount,
      'things-to-do-and-see': bottomFishingDetails,
      'entity-name': bottomFishingDetails,
    },
    "dash_and_splash": {
      "cruise-details": dashSplashDetails,
      "operating-days": dashSplashDays,
      "passenger-count": dashSplashPassengerCount,
      'things-to-do-and-see': dashSplashDetails,
      'entity-name': dashSplashDetails,
    }
  };
  functions["Private charter"] = functions.private_charter;
  functions["Dolphin and Whale watching"] = functions.dolphin_whale_watching;
  functions["Group sports fishing"] = functions.group_sports_fishing;
  functions["Bottom fishing"] = functions.bottom_fishing;
  functions["Dash and splash"] = functions.dash_and_splash;

  // if no tour was provided, ask for that information.
  if(!tour || tour.length === 0) {
    // this might be because of two reasons. Either the user did not enter the right entity for a given category or we don't yet support that category. If it's the latter, return null.
    const categoryKeys = Object.keys(functions.private_charter); // We assume that Tout Bagay will always be a super-set for the categories
    if(categoryKeys.includes(category)) return chooseTours(fbid, category);
    return null;
  }
  if(tour.includes(":")) {
    // this is passed from handlePostback. Assert invariants before proceeding.
    if(category) throw new Error(`tourSpecificResponses: Potential BUG: tour contains a ":" (${tour}), but category is also present (${category}). Confused!`);
    const list = tour.split(":");
    if(!list || list.length !== 3) throw new Error(`tourSpecificResponses: invalid tour name passed. Expected it to be a real tour name passed by dialog flow or of the form <tourName>:<category>. But the value is <${tour}>`);
    tour = list[1]; // list[0] is "select_tour"
    category = list[2];
  }
  if(tour && category && functions[tour][category]) return functions[tour][category](fbid);
  // The base-handler class will correctly handle this error and send an appropriate message to the customer. 
  throw new Error(`tourSpecificResponses: Potential BUG: Cannot find the right function to call for tour '${tour}' & category <${category}>`);
}

HackshawHandler.prototype.greeting = function(fbid) {
  let messageList = [];
  messageList.push(FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "Welcome to Hackshaw boats. How can I help you today?",
      subtitle: "I am a chat bot who can answer questions about our awesome tours at St.Lucia",
      image_url: "http://tinyurl.com/y9kco9pc"
    }]
  }));
  messageList = messageList.concat(commonQuestionsButtons(fbid));
  return messageList;
}

HackshawHandler.prototype.pageDetails = function() {
  return {
    title: "Response from Hackshaw",
    image_url: "http://tinyurl.com/y9kco9pc",
    buttons: [{
      title: "Contact details",
      type: "postback",
      payload: "hackshaw_contact"
    }]
  };
}

// TODO: Will be filled when we are building a bot to support the hackshaw facebook page
HackshawHandler.prototype.madhusPageScopedFbid = function() {
  return null;
}

HackshawHandler.prototype.handleBusinessSpecificPayload = function(payload, fbid) {
  if(payload === "hackshaw_contact") return customerService(fbid);
  if(payload === "hackshaw_book_tour") return bookTours(fbid);
  if(payload === "hackshaw_dolphin_whale_operating_days") return dolphinAndWhalesDays(fbid);
  if(payload === "hackshaw_group_fishing_operating_days") return groupSportsFishingDays(fbid);
  if(payload === "hackshaw_bottom_fishing_operating_days") return bottomFishingDays(fbid);
  if(payload === "hackshaw_private_charter_operating_days") return privateCharterDays(fbid);
  if(payload === "hackshaw_bad_weather") return badWeatherPolicy(fbid);
  if(payload === "hackshaw_advance_booking") return advanceBooking(fbid);
  if(payload === "hackshaw_group_discount") return largeGroupDiscounts(fbid);
  if(payload === "hackshaw_hotel_transfer") return hotelTransfer(fbid);
  if(payload === "hackshaw_common_questions") return commonQuestionsButtons(fbid);
  if(payload === "hackshaw_fleets") return hackshawFleets.call(this, fbid);
  if(payload === "hackshaw_fishing_trips") return fishingTrips.call(this, fbid);
  if(payload.startsWith("select_tour")) return tourSpecificResponses(payload, null, fbid);
  // no business logic to handle this payload.
  return null;
}

function costOfTour(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "Please call or email us for cost details",
      subtitle: "and to make a reservation",
      image_url: "http://tinyurl.com/y8vzzsbt",
      buttons: [{
        title: "Contact us",
        type: "postback",
        payload: "hackshaw_contact"
      }]
    }]
  });
}

function chooseTours(fbid, category) {
  const list = [];
  list.push(FBTemplateCreator.text({
    fbid: fbid,
    text: "Which tour are you referring to?"
  }));
  list.push(FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "Dolphins and Whale watching",
      subtitle: "Enjoy watching dolphins and whales frolicking in our beautiful waters",
      image_url: "http://tinyurl.com/y8vzzsbt",
      buttons: [{
        title: "Dolphin & Whale watching",
        type: "postback",
        payload: `select_tour:dolphin_whale_watching:${category}`
      }]
    }, {
      title: "Private charter",
      subtitle: "Enjoy a bit of excitement & exhilaration, or a relaxing boat ride along the beautiful west coast on our ideal speed boat",
      image_url: "http://tinyurl.com/ya9563pl",
      buttons: [{
        title: "Private charter",
        type: "postback",
        payload: `select_tour:private_charter:${category}`
      }]
    }, {
      title: "Dash and Splash speed boat",
      subtitle: "Enjoy a bit of excitement & exhilaration, or a relaxing boat ride along the beautiful west coast on our ideal speed boat",
      image_url: "http://tinyurl.com/ya9563pl",
      buttons: [{
        title: "Dash and Splash",
        type: "postback",
        payload: `select_tour:dash_and_splash:${category}`,
      }]
    }, {
      title: "Bottom fishing",
      subtitle: "Experience the 3 hour fishing trip in the shallow reefs of our beautiful island",
      image_url: "http://tinyurl.com/yd2z6s48",
      buttons: [{
        title: "Bottom fishing",
        type: "postback",
        payload: `select_tour:bottom_fishing:${category}`,
      }]
    }, {
      title: "Deep Sea Sports fishing",
      subtitle: "Enjoy a day out fishing our waters with abundant variety of big game fish such as Blue Marlin, Sail fish etc.",
      image_url: "http://tinyurl.com/yaor2y69",
      buttons: [{
        title: "Deep sea fishing",
        type: "postback",
        payload: `select_tour:group_sports_fishing:${category}`,
      }]
    }]
  }));
  return list;
}

function dolphinAndWhalesDetails(fbid) {
  return dolphinAndWhalesDays(fbid);
}

function dolphinAndWhalesDays(fbid) {
  return FBTemplateCreator.list({
    fbid: fbid,
    elements: [{
      title: "Dolphins and Whale watching",
      subtitle: "Enjoy watching dolphins and whales frolicking in our beautiful waters",
      image_url: "http://tinyurl.com/y8vzzsbt",
    }, {
      title: "Operates every Tuesday and Thursday",
      subtitle: "Email us. We sometimes add extra days",
    },{
      title: "Hotel pickup times vary",
      subtitle: "When booking, tell us your stay details"
    }],
    buttons: [{
      title: "Book Trip",
      type: "web_url",
      webview_height_ratio: "full",
      url: `http://www.hackshaws.com/dolphin-and-whale-watching`
    }]
  });
}

function bottomFishingDetails(fbid) {
  return bottomFishingDays(fbid);
}

function bottomFishingDays(fbid) {
  const title = "Bottom Fishing";
    return FBTemplateCreator.list({
      fbid: fbid,
      elements: [{
        title: title,
        subtitle: "Experience the 3 hour fishing trip in the shallow reefs of our beautiful island",
        image_url: "http://tinyurl.com/yd2z6s48",
      }, {
        title: "Operates every Thursday at 1 p.m.",
        subtitle: "Email us. We sometimes add extra days",
      },{
        title: "Hotel pickup times vary",
        subtitle: "When booking, tell us your stay details"
      }],
      buttons: [{
        title: `Book ${title}`,
        type: "web_url",
        webview_height_ratio: "full",
        url: `http://www.hackshaws.com/bottom-fishing-bonanza-st-lucia`
      }]
    });
}

function bottomFishingPassengerCount(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "The actual number varies depending on the size of boat used",
      image_url: "http://tinyurl.com/yd2z6s48",
      buttons: [{
        title: "Book trip",
        type: "web_url",
        webview_height_ratio: "full",
        url: `http://www.hackshaws.com/bottom-fishing-bonanza-st-lucia`
      }]
    }],
  });
}

function groupSportsFishingDetails(fbid) {
  return groupSportsFishingDays(fbid);
}

function groupSportsFishingDays(fbid) {
  const title = "Deep Sea Sports Fishing";
    return FBTemplateCreator.list({
      fbid: fbid,
      elements: [{
        title: title,
        subtitle: "Enjoy a day out fishing our waters with abundant variety of big game fish such as Blue Marlin, Sail fish etc.",
        image_url: "http://tinyurl.com/yaor2y69",
      }, {
        title: "Operates every Tuesday and Thursday",
        subtitle: "Email us. We sometimes add extra days",
      },{
        title: "Hotel pickup times vary",
        subtitle: "When booking, tell us your stay details"
      }],
      buttons: [{
        title: `Book ${title}`,
        type: "web_url",
        webview_height_ratio: "full",
        url: `http://www.hackshaws.com/deep-sea-sports-fishing`
      }]
    });
}

function dashSplashDetails(fbid) {
  return dashSplashDays(fbid);
}

function dashSplashDays(fbid) {
  const title = "Dash and Splash Speed boat";
    return FBTemplateCreator.list({
      fbid: fbid,
      elements: [{
        title: title,
      subtitle: "Enjoy a bit of excitement & exhilaration, or a relaxing boat ride along the beautiful west coast on our ideal speed boat",
      image_url: "http://tinyurl.com/ya9563pl",
      }, {
        title: "Operates every Monday and Friday",
        subtitle: "Email us. We sometimes add extra days",
      },{
        title: "Hotel pickup times vary",
        subtitle: "When booking, tell us your stay details"
      }],
      buttons: [{
        title: `Book ${title}`,
        type: "web_url",
        webview_height_ratio: "full",
        url: `http://www.hackshaws.com/bandit-speed-boat-tours`
      }]
    });
}

function privateCharterDetails(fbid) {
  return privateCharterDays(fbid);
}

function privateCharterDays(fbid) {
  const title = "Private charter";
    return FBTemplateCreator.list({
      fbid: fbid,
      elements: [{
        title: title,
        subtitle: "Enjoy a bit of excitement & exhilaration, or a relaxing boat ride along the beautiful west coast on our ideal speed boat",
        image_url: "http://tinyurl.com/ya9563pl",
      }, {
        title: "Operates everyday based on availability ",
        subtitle: "Email us. We sometimes add extra days",
      },{
        title: "Hotel pickup times vary",
        subtitle: "When booking, tell us your stay details"
      }],
      buttons: [{
        title: `Book ${title}`,
        type: "web_url",
        webview_height_ratio: "full",
        url: `http://www.hackshaws.com/private-boat-charters`
      }]
    });
}

function customerService(fbid) {
  return FBTemplateCreator.list({
    fbid: fbid,
    elements: [{
      title: "Hackshaw's boats",
      subtitle: "Contact details",
      image_url: "http://tinyurl.com/y9kco9pc"
    }, {
      title: "Our phone numbers: +1-758-453-0553",
      buttons: [{
          type: "phone_number",
          title: "Call us",
          payload: "+17584530553"
      }]
    }, {
      title: "Email",
      subtitle: "sales@hackshaws.com"
    }]
  });
}

function largeGroupDiscounts(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "Each situation is different, so email or call us",
      subtitle: "We will do our best to meet your requests",
      image_url: "http://tinyurl.com/y9kco9pc",
      buttons: [{
        title: "Contact details",
        type: "postback",
        payload: "hackshaw_contact"
      }]
    }],
  });
}

function hotelTransfer(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "We offer transfers for all hotels in the NORTH of the island",
      image_url: "http://tinyurl.com/y9kco9pc",
      buttons: [{
        title: "Book tours",
        type: "postback",
        payload: "hackshaw_book_tour"
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
      image_url: "http://tinyurl.com/y9kco9pc",
      buttons: [{
        title: "Book tours",
        type: "postback",
        payload: "hackshaw_book_tour"
      }]
    }],
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
        title: "Book tours",
        type: "postback",
        payload: "hackshaw_book_tour"
      }]
    }]
  });
}

// Bottom Fishing, Deep sea sports fishing, Dolphin and Whale watching, The Piton adventure, Bandit speed boat tours
function bookTours(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "Bottom Fishing",
      subtitle: "Experience the 3 hour fishing trip in the shallow reefs of our beautiful island",
      image_url: "http://tinyurl.com/yd2z6s48",
      buttons: [{
        title: "Details / Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: `http://www.hackshaws.com/bottom-fishing-bonanza-st-lucia`
      }]
    }, {
      title: "Deep sea sports fishing",
      subtitle: "Enjoy a day out fishing our waters with abundant variety of big game fish such as Blue Marlin, Sail fish etc.",
      image_url: "http://tinyurl.com/yaor2y69",
      buttons: [{
        title: "Details / Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: `http://www.hackshaws.com/deep-sea-sports-fishing`
      }]
    }, {
      title: "Dolphin and Whale watching",
      subtitle: "Don't miss the exhilirating experience of seeing dolphins and whales frolicking in our beautiful waters",
      image_url: "http://tinyurl.com/y8vzzsbt",
      buttons: [{
        title: "Details / Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: `http://www.hackshaws.com/dolphin-and-whale-watching`
      }]
    }, {
      title: "Bandit speed boat tours",
      subtitle: "Enjoy a bit of excitement & exhilaration, or a relaxing boat ride along the beautiful west coast on our ideal speed boat",
      image_url: "http://tinyurl.com/ya9563pl",
      buttons: [{
        title: "Details / Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: `http://www.hackshaws.com/bandit-speed-boat-tours`
      }]
    }, {
      title: "Private charter",
      subtitle: "Enjoy our beautiful coastline in the privacy of your own charter with friends or family",
      image_url: "http://tinyurl.com/y9kco9pc",
      buttons: [{
        title: "Details / Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: `http://www.hackshaws.com/private-boat-charters`
      }]
    }]
  });
}

function commonQuestionsButtons(fbid) {
  const messageList = [];
  messageList.push(FBTemplateCreator.text({
    fbid: fbid,
    text: "Here is a list of some commonly asked questions"
  }));
  messageList.push(FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "What tours do you operate?",
      image_url: "http://tinyurl.com/y7csebng",
      buttons: [{
        title: "Tour options",
        type: "postback",
        payload: "hackshaw_book_tour",
      }]
    },{
      title: "What days does the Dolphin/Whale watch safari operate?",
      image_url: "http://tinyurl.com/y7ugprbr",
      buttons: [{
        title: "Operating days",
        type: "postback",
        payload: "hackshaw_dolphin_whale_operating_days"
      }]
    },{
      title: "What days does the Group sports fishing tour operate?",
      image_url: "http://tinyurl.com/y7pf3ohk",
      buttons: [{
        title: "Operating days",
        type: "postback",
        payload: "hackshaw_group_fishing_operating_days"
      }]
    },{
      title: "What days does the Bottom fishing operate?",
      image_url: "http://tinyurl.com/ybss4bdg",
      buttons: [{
        title: "Operating days",
        type: "postback",
        payload: "hackshaw_bottom_fishing_operating_days"
      }]
     },{
        title: "What is your Bad weather policy?",
        image_url: "http://tinyurl.com/y8ykdh4g",
        buttons: [{
          title: "Bad Weather details",
          type: "postback",
          payload: "hackshaw_bad_weather"
       }]
     },{
        title: "Is Advance booking required?",
        image_url: "http://tinyurl.com/y8l2lgdu",
        buttons: [{
          title: "Our recommendation",
          type: "postback",
          payload: "hackshaw_advance_booking"
       }]
     },{
        title: "Which hotels do you transfer from?",
        image_url: "http://tinyurl.com/y942m5w5",
        buttons: [{
          title: "Hotel transfer",
          type: "postback",
          payload: "hackshaw_hotel_transfer"
       }]
    }]
  }));
  return messageList;
}

function whaleWatchPassengerCount(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "On average, we have 40 passengers on a trip",
      subtitle: "The actual number varies depending on the time of year",
      image_url: "http://tinyurl.com/y8vzzsbt",
      buttons: [{
        title: "Book tour",
        type: "web_url",
        webview_height_ratio: "full",
        url: `http://www.hackshaws.com/dolphin-and-whale-watching`
      }]
    }],
  });
}

function dashSplashPassengerCount(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "Speed boats have a capacity of 20 passengers",
      image_url: "http://tinyurl.com/ya9563pl",
      buttons: [{
        title: "Book speed-boat",
        type: "web_url",
        webview_height_ratio: "full",
        url: `http://www.hackshaws.com/bandit-speed-boat-tours`
      }]
    }],
  });
}

function groupSportsPassengerCount(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "On average, we have 7 to 9 passengers on a boat",
      subtitle: "The actual number varies depending on the size of boat used",
      image_url: "http://tinyurl.com/yaor2y69",
      buttons: [{
        title: "Book trip",
        type: "web_url",
        webview_height_ratio: "full",
        url: `http://www.hackshaws.com/deep-sea-sports-fishing`
      }]
    }],
  });
}

function privateCharterPassengerCount(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "The actual number varies depending on the type of boat requested",
      image_url: "http://tinyurl.com/y9kco9pc",
      buttons: [{
        title: "Our fleet",
        type: "postback",
        payload: "hackshaw_fleets"
      }]
    }],
  });
}

function hackshawFleets(fbid) {
  return FBTemplateCreator.list({
    fbid: fbid,
    elements: [{
      title: "Party Hack. Model 64′ Double Deck Power Catamaran",
      subtitle: "Tours: Whale Watching, Snorkeling, Private Cruises, Bottom Fishing, Weddings, Party Cruises, Bottom Fishing",
      image_url: "http://tinyurl.com/yc3xf75t",
      buttons: [{
        title: "Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: "http://www.hackshaws.com/party-hack-st-lucia",
      }]
    }, {
      title: "Limited Edition: Model 47′ Custom Buddy Davis",
      subtitle: "Tours: Whale Watching, Snorkeling, Deep Sea Fishing, Private Cruises, Bottom Fishing, Interisland Tours, Weekend Getaways",
      image_url: "http://tinyurl.com/y9fjvk45",
      buttons: [{
        title: "Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: "http://www.hackshaws.com/Limited-Edition",
      }]
    },{
      title: "Blue Boy: Model 31’ Bertram Bahia Mar Custom",
      subtitle: "Tours: Deep Sea Fishing, Whale Watching, Snorkeling, Private Cruises, Bottom Fishing",
      image_url: "http://tinyurl.com/y94emtoy",
      buttons: [{
        title: "Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: "http://www.hackshaws.com/blue-boy",
      }]
    },{
      title: "Bandit: Model 31’ Speed Boat",
      subtitle: "Cruising",
      image_url: "http://tinyurl.com/y8s3t87k",
      buttons: [{
        title: "Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: "http://www.hackshaws.com/bandit",
      }]
    }],
  });
}

function location(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "We are located in the Vigie marina in Castries",
      subtitle: "click to see us on google maps",
      image_url: "http://tinyurl.com/y942m5w5",
      default_action: {
        type: "web_url",
        webview_height_ratio: "full",
        url: "https://goo.gl/maps/D45cEGFbvjN2"
      },
      buttons: [{
          title: "All tours",
          type: "postback",
          payload: "hackshaw_book_tour"
      }]
    }]
  });
}

function fishCatch(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "All fish are the property of the boat",
      subtitle: "BUT we will gladly share the fish with guests",
      image_url: "http://tinyurl.com/yd2z6s48",
      buttons: [{
          title: "Book fishing trip",
          type: "postback",
          payload: "hackshaw_fishing_trips"
      }]
    }]
  });
}

function fishingTrips(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "Bottom Fishing",
      subtitle: "Experience the 3 hour fishing trip in the shallow reefs of our beautiful island",
      image_url: "http://tinyurl.com/yd2z6s48",
      buttons: [{
        title: "Details / Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: `http://www.hackshaws.com/bottom-fishing-bonanza-st-lucia`
      }]
    }, {
      title: "Deep sea sports fishing",
      subtitle: "Enjoy a day out fishing our waters with abundant variety of big game fish such as Blue Marlin, Sail fish etc.",
      image_url: "http://tinyurl.com/yaor2y69",
      buttons: [{
        title: "Details / Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: `http://www.hackshaws.com/deep-sea-sports-fishing`
      }]
    }]
  });
}

function dolphinWhaleTypes(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "We have resident pods of Sperm whales (with calves) and Pilot whales",
      subtitle: "We also have many different species of Dolphins",
      image_url: "http://tinyurl.com/yd2z6s48",
      buttons: [{
        title: "Book trip",
        type: "web_url",
        webview_height_ratio: "full",
        url: `http://www.hackshaws.com/dolphin-and-whale-watching`
      }]
    }]
  });
}

function dolphinWhaleSuccessRate(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "We give an 85% chance of Dolphin & Whale sightings in the Dolphin & Whale watching tour",
      image_url: "http://tinyurl.com/y8vzzsbt",
      buttons: [{
        title: "Book trip",
        type: "web_url",
        webview_height_ratio: "full",
        url: `http://www.hackshaws.com/dolphin-and-whale-watching`
      }]
    }]
  });
}

function kidsAllowed(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "We welcome kids of all ages on our trips",
      subtitle: "However, we don't recommend kids under 5 years for Sports Fishing trips",
      buttons: [{
        title: "Book tours",
        type: "postback",
        payload: "hackshaw_book_tour"
      }]
    }],
  });
}

function operatingHours(fbid) {
  return FBTemplateCreator.list({
    fbid: fbid,
    compact_top_element_style: true,
    elements: [{
      title: "We are located in the Vigie marina in Castries",
      subtitle: "click to see us on google maps",
      image_url: "http://tinyurl.com/y942m5w5",
      default_action: {
        type: "web_url",
        webview_height_ratio: "full",
        url: "https://goo.gl/maps/D45cEGFbvjN2"
      },
    }, {
      title: "Email: sales@hackshaws.com",
      subtitle: "Email us if you have any questions",
    }, {
      title: "Our phone numbers: +1-758-453-0553",
      buttons: [{
          type: "phone_number",
          title: "Call us",
          payload: "+17584530553",
      }]
    }],
    buttons:[{
      title: "Available tours",
      type: "postback",
      payload: "hackshaw_book_tour"
    }]
  });
}

/*
- What Days does your Dolphin and Whale watch Safari opperate?
Answer - Every Tuesday and Thursday. Hotel pickups vary so please let us know where you are staying when booking. (please inquire if interested in other dates as we do sometimes add extra days)
 
- What Days does your Group Sports Fishing Operate?
Answer - Every Tuesday and Thursday. Hotel pickups vary so please let us know where you are staying when booking. (please inquire if interested in other dates as we do sometimes add extra days)
 
- What days does your Bottom Fishing Operate?
Answer - Every Thursday at 1pm. Hotel pickups vary so please let us know where you are staying when booking. (please inquire if interested in other dates as we do sometimes add extra days)

- What Days does your Dash and Splash Half Speed Boat Tour Operate?
Answer - Every Monday and Friday Hotel pickups vary so please let us know where you are staying when booking. (please inquire if interested in other dates as we do sometimes add extra days)

- What Days does your Private Charters Operate?
Answer - Everyday based on availability Hotel pickups vary so please let us know where you are staying when booking. 
 
- What happens if the weather is bad?
Answer - If the weather doesn't permit the tour to operate we offer the option to reschedule or cancel at not charge.
 
- Is there a discount for large groups or families?
Answer - Please inquire directly so that the Hackshaw Boat Charters team can do their best to meet your requests
 
- Do you offer transfers for all Hotels?
Answer - We offer transfers for most Hotels in the North of the Island.
 
- How far in advance do guests have to book tours?
Answer - All tours are sold on a first come first serve basis, so we recommend guests to book as early as they can.
 
- How many people are on the Whale Watch Tours tours?
Answer - The number of guests varies depending on the time of year, but on average we have 40 passengers on a trip.

- How many people are on the Group Sport Fishing Tours tours?
Answer - The number of guests varies depending on the size of boat used, it can be between 7 to 9 passengers on a  boat.

- How many people are on the Dash and Splash Half day Speed Boat tours?
Answer - each speed boat has a capacity of 20 passengers

- How many people are on the Private Charters  Tours tours?
Answer - The number of guests varies depending on the boat requested

- Are guests allowed to keep the fish that are caught
Answer - All fish are the property of the boat but we have no problem with sharing out fish with guests.
 
- What type of Whales and Dolphin are seen?
Answer We have resident pods of Sperm Whales and their calves along with Pilot Whales and many species of Dolphin.

- What is the success rate on the Dolphin and Whale Watch trips?
Answer - we give an 85% chance of siightings

-  Where are you located ?
Answer - Our office is in the Vigie marina in Castries. 
*/

module.exports = HackshawHandler;
