'use strict';
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
const FBTemplateCreator = require(`${baseDir}/fb-template-creator`);
const NBClassifier = require('travel-sfo-handler/app/nb-classifier');
const adminId = "1652003184850840";

function TravelSfoHandler() {
  this.greetings = ["hi", "hello", "hiya", "hi there"];
  this.sentMessageToAdmin = {};
  this.awaitingResponseFromAdmin = {};
  this.awaitingHotelName = {};
  this.awaitingHotelDetails = {};
  this.waitingToBookHotel = {};
  this.waitingToBookCruise = {};
  this.questions = {};
  this.awaitingLocation = {};
  this.classifier = new NBClassifier();
}

TravelSfoHandler.pageId = "118953662103163";

TravelSfoHandler.prototype.greeting = function(pageId, fbid) {
  if(pageId != TravelSfoHandler.pageId) return null;
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "Welcome to Travel SFO. How can I help you today?",
      subtitle: "I can answer questions about SFO, your reservations or anything else.",
      image_url: "http://tinyurl.com/y9gh2xdm"
    }]
  });
}

TravelSfoHandler.prototype.mountainQueenExpeditions = function(rawMesg, fbid) {
  if(rawMesg.startsWith("welcome")) return FBTemplateCreator.generic({
      fbid: fbid,
      elements: [{
        title: "Welcome to Mountain Queen Expeditions. How can I help you today?",
        subtitle: "I am a bot that can answer any questions about our tours, price, hours etc.",
        image_url: "https://polaama.com/images/mq-image"
      }]
  });
  if(rawMesg.startsWith("is there a minimum number of customers required per event")) return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "Yes. For backpacking, we require a minimum of 4 customers.",
      subtitle: "For hiking, we require a minimum of 2 customers."
    }]
  });
  if(rawMesg.startsWith("is transportation included")) return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "Unless mentioned, transportation is NOT included for any of our trips.",
      subtitle: "If needed, we can arrange transportation at an additional cost."
    }]
  });
  return null;
}

TravelSfoHandler.prototype.sanJoseBrewBike = function(rawMesg, fbid) {
  if(rawMesg.startsWith("welcome")) return FBTemplateCreator.generic({
      fbid: fbid,
      elements: [{
        title: "Welcome to San Jose Brew bike. How can I help you today?",
        subtitle: "I am a bot that can answer any questions about our tours, price, hours etc.",
        image_url: "http://tinyurl.com/y7ry6nlz",
      }]
  });
  if(rawMesg.startsWith("can i drink on the bus")) return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
        title: "Unfortunately, No",
        subtitle: "The City of San Jose does not allow alcohol aboard the Brew Bike at this time.",
    }]
  });
  if(rawMesg.startsWith("what is the age requirement")) return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
        title: "You must be atleast 21 years old to ride on the brewpub tour.",
        subtitle: "Private tours may be booked (atleast 16 years old) for city (non-brewery) tours.",
        buttons: [{
          type: "phone_number",
          title: "Call us",
          payload: "+16692342927"
        }]
    }]
  });
  return null;
}

TravelSfoHandler.prototype.royalCoachResponse = function(rawMesg, fbid) {
  if(rawMesg.startsWith("welcome")) return FBTemplateCreator.generic({
      fbid: fbid,
      elements: [{
        title: "Welcome to Royal Coach Tours. How can I help you today?",
        subtitle: "I am a bot that can answer any questions about our tours, price, hours etc.",
        image_url: "http://tinyurl.com/yc6xne4c",
      }]
  });
  if(rawMesg.startsWith("bus meeting point at sfo airport")) return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "We will pick you up at courtyard 4",
      subtitle: "click for map",
      default_action: {
        url: "https://goo.gl/maps/dgcik7uFNe92",
        type: "web_url",
        webview_height_ratio: "full"
      },
      buttons: [{
        title: "Get a quote",
        webview_height_ratio: "full",
        url: "http://www.royal-coach.com/quote.php",
        type: "web_url",
      }]
    }]
  });
  if(rawMesg.startsWith("operating hours")) return FBTemplateCreator.list({
    fbid: fbid,
    compact_top_element_style: true,
    elements: [{
      title: "Our main office is open (M-F) 8.00 am - 5.00 pm",
      image_url: "http://tinyurl.com/yc6xne4c",
      subtitle: "Phone: 408-279-4801"
    },
    {
      title: "Dispatchers are available (M-F) 5.00 am - 7.30 pm",
      subtitle: "Phone: 408-477-2020",
    },
    {
      title: "Oncall manager is available nights (M-F) 7.30 pm - 5.00 am and 24/7 on weekends",
      subtitle: "Phone: 408-640-6248",
    }]
  });
  return null;
}

TravelSfoHandler.prototype.handleText = function(rawMesg, pageId, fbid, event) {
  const mesg = rawMesg.toLowerCase();
  if(pageId != TravelSfoHandler.pageId) return null;
  if(!fbid) throw new Error(`handleText: required parameter fbid missing`);
  
  if(event && event.message.quick_reply) {
    const payload = event.message.quick_reply.payload;
    if(!payload.startsWith("qr_travel_sfo_review_")) return null;
    if(payload.includes("yes")) return FBTemplateCreator.list({
      fbid: fbid,
      elements: [{
        title: "Great! We are glad you enjoyed it",
        subtitle: "Can you write a quick review for us? We would greatly appreciate it!",
      },
      {
        title: "Trip Advisor",
        image_url: "https://static.tacdn.com/img2/branding/rebrand/TA_brand_logo.png",
        buttons: [{
          title: "Write a review",
          webview_height_ratio: "full",
          url: "http://www.citypass.com/san-francisco/plan-your-visit-san-francisco",
          type: "web_url",
        }]
      },{
        title: "Yelp",
        image_url: "https://is1-ssl.mzstatic.com/image/thumb/Purple118/v4/64/9d/aa/649daa0e-c33d-fc63-9100-40183b3990c9/source/1200x630bb.jpg",
        buttons: [{
          title: "Write a review",
          webview_height_ratio: "full",
          url: "http://www.citypass.com/san-francisco/plan-your-visit-san-francisco",
          type: "web_url",
        }]
      }]
    });
    return null;
  }

  let message = { recipient: { id: fbid } };
  if(mesg.includes("citypass") && mesg.includes("transport")) return sendCityPassTransportationDetails.call(this, fbid);
  if(mesg.includes("customer service")) return customerServiceDetails.call(this, fbid);
  if(mesg.includes("cancel") && (mesg.includes("activity") || mesg.includes("attraction") || mesg.includes("tour"))) {
    return FBTemplateCreator.generic({
      fbid: fbid,
      elements: [{
        title: "Sorry, activity reservations are non-refundable",
        subtitle: "Please call us at 1-800-637-5196 to discuss your specific case"
      }]
    });
  }
  if(mesg.includes("attractions")) {
    this.awaitingLocation[fbid] = true;
    return locationQuickReply.call(this, fbid);
  }
  // if(mesg.includes("lunch served")) return sendResponseToLunchQuestion.call(this, fbid);
  // if(mesg.includes("cruise")) return sendCruiseDetails.call(this, fbid);
  if(mesg.includes("eco tour")) return sendEcoTourDetails.call(this, fbid);
  if(mesg.includes("city pass")) {
    message.message = {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: elements
        }
      }
    };
    return message;
  }
  
  const responseFromAdmin = handleResponseFromAdmin.call(this, mesg, fbid);
  if(responseFromAdmin) return responseFromAdmin;

  const cancelHotelMesg = handleCancelHotel.call(this, mesg, fbid);
  if(cancelHotelMesg) return cancelHotelMesg;

  const hotelDetails = handleHotelDetails.call(this, fbid);
  if(hotelDetails) return hotelDetails;

  // See if our classifier understands what is being asked.

  const category = this.classifier.classify(mesg);
  // if(mesg.includes("cancel") && mesg.includes("hotel")) {
  if(category === "human") return sendMessageToAdmin.call(this, fbid, mesg);
  if(category === "cancel-hotel") {
    this.awaitingHotelName[fbid] = true;
    return FBTemplateCreator.generic({
      fbid: fbid,
      elements: [{
        title: "Please enter the name of the hotel you would like to cancel",
        subtitle: "We will let you know if there is a cancellation charge"
      }]
    });
  }
  // if(this.greetings.includes(mesg)) return this.greeting(pageId, fbid);
  if(category === "greeting") return this.greeting(pageId, fbid);
  if(category === "cruise") return sendCruiseDetails.call(this, fbid);
  if(category === "cruise-lunch") return sendResponseToLunchQuestion.call(this, fbid);
  // if(mesg.includes("hotels")) {
  if(category === "hotels") {
    this.awaitingHotelDetails[fbid] = true;
    return FBTemplateCreator.generic({
      fbid: fbid,
      elements: [{
        title: "Please provide details about your SFO trip",
        subtitle: "When do you need the hotel, for how many people and for how long?"
      }]
    });
  }

  return sendMessageToAdmin.call(this, fbid, mesg);
}

TravelSfoHandler.prototype.sendReviewRequest = function(fbid) {
  return FBTemplateCreator.quickReply({
    fbid: fbid,
    text: "Hi, Did you enjoy the cruise?",
    elements: [{
       content_type: "text",
       title: "Yes",
       image_url: "http://icons.iconarchive.com/icons/oxygen-icons.org/oxygen/24/Emotes-face-smile-icon.png",
       payload: "qr_travel_sfo_review_yes",
     },
     {
       content_type: "text",
       title: "No",
       image_url: "http://icons.iconarchive.com/icons/icojam/onebit/24/smiley-sad-icon.png",
       payload: "qr_travel_sfo_review_no",
    }]
  });
}

function sendResponseToLunchQuestion(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: `Lunch is not served, but light snacks will be offered on the cruise`,
      subtitle: "You can also buy additional items on the cruise or bring your own food aborad",
      buttons: [{
        webview_height_ratio: "full",
        title: "Snacks for purchase",
        url: "http://www.citypass.com/san-francisco/plan-your-visit-san-francisco",
        type: "web_url",
      }]
    }]
  });
}

function handleCancelHotel(mesg, fbid) {
  if(!this.awaitingHotelName[fbid]) return null;
  this.awaitingHotelName[fbid] = false;
  if(mesg.includes("ram")) return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: `Good news! There is no cancellation charge for hotel ${mesg}`,
      subtitle: "Call us to cancel this hotel. Please have your AON number ready",
      buttons: [{
        type: "phone_number",
        title: "Call us",
        payload: "+18006375196"
      }]
    }]
  });
  if(mesg.includes("casa")) return FBTemplateCreator.list({
    fbid: fbid,
    elements: [{
      title: "The hotel will charge you for one night + tax to cancel",
      subtitle: "since it is less than 72 hours to the start date"
    },
    {
      title: "There is also a $25/- cancellation fee since this was a specially negotiated rate",
      subtitle: "It will be waived if you rebook immediately with equal or greater number of nights"
    },
    {
      title: "Call us if you would still like to cancel or rebook",
      subtitle: "Please have your AON number ready when you call",
      buttons: [{
        type: "phone_number",
        title: "Call us",
        payload: "+18006375196"
      }]
    }]
  });
}

function sendCityPassTransportationDetails(fbid) {
  return FBTemplateCreator.list({
    fbid: fbid,
    elements: [{
      title: "You can use Muni and Cable cars with the citypass",
      subtitle: "REMEMBER to exchange your vouchers for a booklet before riding",
    },
    {
      title: "Exchange at Bay & Taylor kiosk, Hyde & Beach kiosk or SFO visitor center",
      subtitle: "Macy's SFO Visitor center open from 10am-9pm Mon-Fri and 11am-7pm Sun",
      buttons: [{
        title: "Additional details",
        type: "web_url",
        url: "http://www.citypass.com/san-francisco/plan-your-visit-san-francisco",
        webview_height_ratio: "full"
      }]
    },
    {
      title: "Avoid lines at Powell & Market cable car turn-around by boarding four blocks above turn-around",
      subtitle: "California Street cable car line is least crowded",
      buttons:[{
        title: "Route map/Schedule",
        type: "web_url",
        url: "http://www.sfmta.com/cms/home/sfmta.php",
        webview_height_ratio: "full"
      }]
    }]
  });
}

TravelSfoHandler.prototype.handleSendingAttractionsNearMeVegas = function(message, pageId, fbid) {
  if(pageId != TravelSfoHandler.pageId) return null;
  if(!message || !message.attachments[0]) return null;
  const type = message.attachments[0].type;
  if(!type || type !== "location") return null;
  if(!this.awaitingLocation[fbid]) return null;
  this.awaitingLocation[fbid] = false;
  return FBTemplateCreator.list({
    fbid: fbid,
    elements: [{
      title: "High Roller",
      subtitle: "From $35. Experience the Strip from the top of a 550-foot tall, 520-foot diameter giant Ferris wheel",
      image_url: "http://tinyurl.com/y9sa39um",
      buttons:[{
        title: "Book",
        type: "web_url",
        url: "https://jackcolton.com/wp-content/uploads/2014/10/High-Roller-3.jpg",
        webview_height_ratio: "full"
      }]
    },{
      title: "Madame Tussauds Vegas",
      subtitle: "From $25. Visit one of the best things to do in Las Vegas and snap pictures with your favorite celebrities, heroes and more.",
      image_url: "http://tinyurl.com/ybf8mvm2",
      buttons:[{
        title: "Book",
        type: "web_url",
        url: "http://tickets.sftravel.com/attraction/single/797/1408",
        webview_height_ratio: "full"
      }]
    },{
      title: "Eiffel tower experience",
      subtitle: "From $20. San Francisco's only waterfront aquarium",
      image_url: "https://www.lasvegaspass.com/images_lib/1553971789_VegasEiffelTowerExperience_2_resized.jpg",
      buttons:[{
        title: "Book",
        type: "web_url",
        url: "https://www.vegas.com/attractions/on-the-strip/paris-las-vegas-eiffel-tower/",
        webview_height_ratio: "full"
      }]
    }]
  });
}

TravelSfoHandler.prototype.handleSendingAttractionsNearMe = function(message, pageId, fbid) {
  if(pageId != TravelSfoHandler.pageId) return null;
  if(!message || !message.attachments[0]) return null;
  const type = message.attachments[0].type;
  if(!type || type !== "location") return null;
  if(!this.awaitingLocation[fbid]) return null;
  this.awaitingLocation[fbid] = false;
  return FBTemplateCreator.list({
    fbid: fbid,
    elements: [{
      title: "San Francisco Museum of Modern Art",
      subtitle: "From $19. The first West Coast museum devoted to modern and contemporary art",
      image_url: "https://d2nnkgzicf828r.cloudfront.net/description-00e6e975d0ee49cdeeaa39f05f26bfd1",
      buttons:[{
        title: "Book",
        type: "web_url",
        url: "http://tickets.sftravel.com/attraction/single/797/1667",
        webview_height_ratio: "full"
      }]
    },{
      title: "Madame Tussauds SF",
      subtitle: "From $17. We have brought our unique blend of glitz and glamour to the brand new Madame Tussauds ",
      image_url: "http://tinyurl.com/ybnbfstq",
      buttons:[{
        title: "Book",
        type: "web_url",
        url: "http://tickets.sftravel.com/attraction/single/797/1408",
        webview_height_ratio: "full"
      }]
    },{
      title: "Aquarium of the bay",
      subtitle: "From $10. San Francisco's only waterfront aquarium",
      image_url: "http://tinyurl.com/y77ewll9",
      buttons:[{
        title: "Book",
        type: "web_url",
        url: "http://tickets.sftravel.com/attraction/single/797/842",
        webview_height_ratio: "full"
      }]
    }]
  });
}

function locationQuickReply(fbid) {
  const message = {
    recipient: {
      id: fbid
    },
    message: {
      text: "Can you share your location so that we can give you relevant attraction recommendations?",
      quick_replies:[{
        content_type: "location",
      }]
    }
  };
  return message;
}

function handleHotelDetails(fbid) {
  if(!this.awaitingHotelDetails[fbid]) return null;
  this.awaitingHotelDetails[fbid] = false;
  this.waitingToBookHotel[fbid] = true;
  return sendHotelChoices.call(this, fbid);
}

// Oct 10 - 12
function sendHotelChoices(fbid) {
  return FBTemplateCreator.list({
    fbid: fbid,
    elements: [{
      title: "Casa Loma Hotel",
      subtitle: "Twin room with 2 twin beds, shared bathroom from $236.30 for 2 nights",
      image_url: "http://s-ec.bstatic.com/images/hotel/max1024x768/245/24503109.jpg",
      buttons: [{
        title: "Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: "http://tinyurl.com/y7dmp7gl"
      }]
    },
    {
      title: "Ram's Hotel",
      subtitle: "Basic queen room with shared bathroom, city view from $253.30 for 2 nights",
      image_url: "http://t-ec.bstatic.com/images/hotel/max1024x768/546/54664197.jpg",
      buttons: [{
        title: "Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: "http://tinyurl.com/y7wj7gyt"
      }]
    },
    {
      title: "Post Hotel",
      subtitle: "Double room with shared bathroom from $270 for 2 nights",
      image_url: "http://t-ec.bstatic.com/images/hotel/max1024x768/228/22852109.jpg",
      buttons: [{
        title: "Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: "http://tinyurl.com/y9hfs2dr"
      }]
    },
    {
      title: "The Urban",
      subtitle: "Double room with shared bathroom from $298 for 2 nights",
      image_url: "http://t-ec.bstatic.com/images/hotel/max1024x768/764/76434518.jpg",
      buttons: [{
        title: "Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: "http://tinyurl.com/ycayzfqt"
      }]
    }],
    buttons:[{
      title: "See all hotels",
      type: "web_url",
      webview_height_ratio: "full",
      url: "http://tinyurl.com/y93zhxdj"
    }]
  });
}

function sendEcoTourDetails(fbid) {
  return FBTemplateCreator.list({
    fbid: fbid,
    elements: [{
      title: "Incredible Adventures",
      subtitle: "San Francisco's Greenest Tour Company offers the following tours",
      image_url: "https://d2nnkgzicf828r.cloudfront.net/description-d2266132b6299954049eaf3657e178cc",
      buttons: [{
        title: "Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: "http://tickets.sftravel.com/attraction/single/797/152"
      }]
    },
    {
      title: "Muir Woods and Wine Country | Save 10%",
      subtitle: "See Muir Woods and the Sonoma Wine Country in one great tour.",
      image_url: "http://tinyurl.com/yb2ryvjk",
      buttons:[{
        title: "Book",
        "type": "web_url",
        "webview_height_ratio": "full",
        url: "http://tickets.sftravel.com/attraction/single/797/152"
      }]
    },
    {
      title: "Whitewater Rafting and wine tasting",
      subtitle: "raft in the South Fork of the American River and try local California wine",
      image_url: "http://tinyurl.com/y7obbs5p",
      buttons:[{
        title: "Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: "http://tickets.sftravel.com/attraction/single/797/152"
      }]
    },
    {
      title: "Yosemite - 1 Day trip",
      subtitle: "Our Yosemite Day Tour allows you to spend 5-6 hours in this amazing park.",
      image_url: "https://www.nationalparks.org/sites/default/files/styles/wide_1x/public/yosemite_16281.JPG?itok=c4Hs901l",
      buttons:[{
        title: "Book",
        "type": "web_url",
        "webview_height_ratio": "full",
        url: "http://tickets.sftravel.com/attraction/single/797/152"
      }]
    }],
    buttons: [{
      title: "See all tours",
      type: "web_url",
      webview_height_ratio: "full",
      url: "http://tickets.sftravel.com/attraction/single/797/152"
    }]
  });
}

function sendCruiseDetails(fbid) {
  this.waitingToBookCruise[fbid] = true;
  // at any given point, we can either be booking a cruise or a hotel, but not both. This is so when user clicks the "like" button, we know what to show them.
  this.waitingToBookHotel[fbid] = false;
  return FBTemplateCreator.list({
    fbid: fbid,
    elements: [{
      title: "Hornblower Cruises & Events",
      subtitle: "See the arresting skyline of the \"City by the Bay\". From $55",
      image_url: "http://tinyurl.com/yc7q9mzh",
      buttons: [{
        title: "Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: "http://tickets.sftravel.com/attraction/single/797/114"
      }]
    },
    {
      title: "Blue and Gold fleet",
      subtitle: "Ride under the golden gate with Blue and Gold fleet. From $25",
      image_url: "http://tinyurl.com/ycp3c4g7",
      buttons: [{
        title: "Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: "http://tickets.sftravel.com/attraction/single/797/118"
      }]
    },
    {
      title: "Red and White fleet",
      subtitle: "Red and White Fleet is the oiginal sightseeing adventure and only multilingual bay cruise! From $20",
      image_url: "http://tinyurl.com/yakb7j66",
      buttons: [{
        title: "Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: "http://tickets.sftravel.com/attraction/single/797/151"
      }]
    }]
  });
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function handleResponseFromAdmin(mesg, adminFbid) {
  const keys = Object.keys(this.awaitingResponseFromAdmin);
  if(keys.length === 0) return null;
  // if(keys.length > 1) throw new Error("More than 1 customer waiting for response. This is currently unhandled");
  // Just respond to the first customer if we have more than 1 customer waiting. TODO: Fix me!
  const fbid = keys[0];
  const messageList = [];
  messageList.push(FBTemplateCreator.list({
    fbid: fbid,
    elements: [
      {
        title: "Response from Travel SFO",
        "image_url": "http://tinyurl.com/y9gh2xdm"
      },
      {
        title: capitalizeFirstLetter(mesg),
        subtitle: `Original question: ${this.questions[fbid]}`,
        buttons: [{
          type: "phone_number",
          title: "Call us",
          payload: "+18004347894"
        }]
      }
    ]
  }));
  messageList.push(FBTemplateCreator.text({
    fbid: adminFbid,
    text: `Successfully sent your response to customer ${fbid}`
  }));
  this.sentMessageToAdmin[fbid] = false;
  delete this.awaitingResponseFromAdmin[fbid];
  this.questions[fbid] = null;
  return messageList;
}

function sendMessageToAdmin(fbid, mesg) {
  const messageList = [];
  let message = { recipient: { id: fbid } };
  message.message = {
    title: "We have notified our team, who will get back to you shortly",
    metadata: "DEVELOPER_DEFINED_METADATA"
  };
  messageList.push(message);
  messageList.push(FBTemplateCreator.list({
    fbid: adminId,
    elements: [
      {
        title: "ACTION REQD",
        subtitle: `Question from customer ${fbid}`
      },
      {
        title: mesg,
        subtitle: "is the question"
      }
    ],
    buttons:[{
      title: "Respond",
      type: "postback",
      payload: `respond_to_customer_${fbid}`
    }]
  }));
  this.sentMessageToAdmin[fbid] = true;
  this.questions[fbid] = mesg;
  /* 
    Keep state that you are awaiting a message for a particular user. As soon as message is received by user and they respond, if the state is set, then send this message to the original user and clear the state. 
  */
  return messageList;
}

TravelSfoHandler.prototype.handleLikeButton = function(pageId, fbid) {
  if(this.waitingToBookCruise[fbid]) return this.handleLikeButtonShowWaterRecommendations(pageId, fbid);
  if(this.waitingToBookHotel[fbid]) return this.handleLikeButtonShowRecommendations(pageId, fbid);
  return null;
}

TravelSfoHandler.prototype.handleLikeButtonShowWaterRecommendations = function(pageId, fbid) {
  if(pageId != TravelSfoHandler.pageId) return null;
  if(!this.waitingToBookCruise[fbid]) return null;
  this.waitingToBookCruise[fbid] = false;
  const messageList = [];
  messageList.push(FBTemplateCreator.text({
    fbid: fbid,
    text: "Thanks for booking! Save even more on these water attractions after your cruise"
  }));
  messageList.push(FBTemplateCreator.list({
    fbid: fbid,
    elements:[{
      title: "Save 15% on Aquarium of the bay tickets",
      subtitle: "Catch a glimpse of the local aquatic animals from the San Francisco bay",
      image_url: "http://www.sftravelcoupons.com/wp-content/uploads/2014/11/Shark-tunnel_0179.jpg",
      buttons:[{
        title: "Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: "http://tickets.sftravel.com/attraction/single/797/1720"
      }]
    },{
      title: "Save 10% on Alcatraz tours",
      subtitle: "Visit the notorious prison of Alcatraz and learn more about it",
      image_url: "http://tinyurl.com/y8vjom43",
      buttons:[{
        title: "Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: "http://tinyurl.com/y9jp8e3y"
      }]
    }]
  }));
  return messageList;
}

TravelSfoHandler.prototype.handleLikeButtonShowRecommendations = function(pageId, fbid) {
  if(pageId != TravelSfoHandler.pageId) return null;
  if(!this.waitingToBookHotel[fbid]) return null;
  this.waitingToBookHotel[fbid] = false;
  const messageList = [];
  messageList.push(FBTemplateCreator.text({
    fbid: fbid,
    text: "Thanks for booking! Now, save even more from these attractions near your hotel"
  }));
  messageList.push(FBTemplateCreator.list({
    fbid: fbid,
    elements:[{
      title: "Save over $38/- with the wharf pass",
      subtitle: "See 5 iconic attractions including Aquarium of the bay, Madame Tussads etc.",
      image_url: "https://d2nnkgzicf828r.cloudfront.net/description-2e530421286dec2e014ee92559ef2aa0",
      buttons:[{
        title: "See Details/Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: "http://tickets.sftravel.com/attraction/single/797/1720"
      }]
    },{
      title: "Save 42% with the SFO CityPASS program",
      subtitle: "Includes MUNI/cable car 3-day passport plus 4 attractions like Blue & Gold Fleet Bay Cruise Adventure, Aquarium of the bay etc.",
      image_url: "http://tinyurl.com/yckvx5zp",
      buttons:[{
        title: "See Details/Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: "http://tickets.sftravel.com/attraction/single/797/129"
      }]
    },{
      title: "Save 50% with the San Francisco Explorer pass",
      subtitle: "Includes 4 attractions including California academy of science, Bay Cruise, Hop-on Hop-off tours etc.",
      image_url: "https://d2nnkgzicf828r.cloudfront.net/description-e10c31cc27ae6f940e2347d47ac2b9dc",
      buttons:[{
        title: "See Details/Book",
        type: "web_url",
        webview_height_ratio: "full",
        url: "http://tickets.sftravel.com/attraction/single/797/1388"
      }]
    }]
  }));
  return messageList;
}

function customerServiceDetails(fbid) {
  return FBTemplateCreator.list({
    fbid: fbid,
    elements: [
      {
        "title": "Customer service details",
        "image_url": "http://tinyurl.com/y9gh2xdm"
      },
      {
        title: "Our phone number is 1-800-434-7894",
        subtitle: "International: 00+1-858-300-8692",
        buttons: [{
          type: "phone_number",
          title: "Call us",
          payload: "+18004347894"
        }]
      },
      {
        "title": "Hours (in PST)",
        "subtitle": "Mon-Fri: 6.00 a.m-11 p.m., Sat: 7.00 a.m.-10.00 p.m., Sunday: 8.00 a.m.-9.00 p.m"
      },
      {
        "title": "Email",
        "subtitle": "customerservice@arestravelinc.com"
      }
    ]
  });
}

function callUsDetails(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [
      {
        title: "Our phone number is 1-800-434-7894",
        subtitle: "International: 00+1-858-300-8692",
        buttons: [{
          type: "phone_number",
          title: "Call us",
          payload: "+18004347894"
        }]
      },
    ]
  });
}

function cancelRam(fbid) {
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: `Good news! There is no cancellation charge for your hotel Ram reservation`,
      subtitle: "Call us to cancel this hotel. Please have your AON number ready",
      buttons: [{
        type: "phone_number",
        title: "Call us",
        payload: "+18006375196"
      }]
    }]
  });
}

TravelSfoHandler.prototype.handlePostback = function(payload, pageId, passedFbid) {
  if(pageId != TravelSfoHandler.pageId) return null;
  if(payload === "pmenu_travel_sfo_existing_reservation") return cancelRam.call(this, passedFbid);
  if(payload === "pmenu_travel_sfo_customer_service") return customerServiceDetails.call(this, passedFbid);
  if(payload === "pmenu_travel_sfo_call_us") return callUsDetails.call(this, passedFbid);
  const adminFbid = passedFbid;
  const contents = /respond_to_customer_(\d*)/.exec(payload);
  if(!contents || (contents.length != 2)) throw new Error(`payload is not in expected format respond_to_customer_<fbid>. Value is ${payload}`);
  const fbid = contents[1];
  if(!this.sentMessageToAdmin[fbid]) throw new Error(`expected sentMessageToAdmin for fbid ${fbid} to be true. But its not. Dump of sentMessageToAdmin: ${JSON.stringify(this.sentMessageToAdmin)}`);
  // Ask admin to send response
  if(!this.awaitingResponseFromAdmin[fbid]) {
    this.awaitingResponseFromAdmin[fbid] = true; 
    return FBTemplateCreator.text({
      fbid: adminFbid, 
      text: `Enter your response for customer ${fbid}`
    });
  }
  logger.error(`Do not know how to handle postback payload ${payload} from fbid ${fbid} for "travel sfo" bot`);
  // we need to respond one way or another here. TODO: See if there is a bettter way to handle this.
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "We have notified our team, who will get back to you shortly",
      image_url: "http://tinyurl.com/y8v9ral5",
    }],
  });
}

module.exports = TravelSfoHandler;
