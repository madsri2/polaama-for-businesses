'use strict';
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
const FBTemplateCreator = require(`${baseDir}/fb-template-creator`);
const NBClassifier = require('sea-spray-handler/app/nb-classifier');
const moment = require('moment');

function SeaSprayHandler() {
  this.classifier = new NBClassifier();
}

SeaSprayHandler.pageId = "1510665378999204";

SeaSprayHandler.prototype.greeting = function(pageId, fbid) {
  if(pageId != SeaSprayHandler.pageId) return null;
  return FBTemplateCreator.generic({
    fbid: fbid,
    elements: [{
      title: "Welcome to Sea Spray cruises. How can I help you today?",
      subtitle: "I can answer questions about our awesome cruise at St.Lucia",
      image_url: "http://tinyurl.com/y8v9ral5"
    }]
  });
}

SeaSprayHandler.prototype.handleText = function(mesg, pageId, fbid) {
  const category = this.classifier.classify(mesg);
  if(category === "greeting") return this.greeting(pageId, fbid);
  if(category === "tout bagay days") return toutBagayDays(fbid);
  if(category === "sunset cruise days") return sunsetCruiseDays(fbid);
  if(category === "pirate days") return piratesDay(fbid);
}

SeaSprayHandler.prototype.handlePostback = function(payload, pageId, fbid) {
  if(pageId != SeaSprayHandler.pageId) return null;
  if(payload === "sea_spray_contact") return FBTemplateCreator.list({
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
  return null;
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
        title: "Open every Tuesday and Friday", 
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
        title: "Operates every Monday, Wednesday and Saturday",
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

module.exports = SeaSprayHandler;
