'use strict';
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
const bayes = require('bayes');

function CommonClassifier() {
  this.classifier = bayes();
}

CommonClassifier.prototype.commonTraining = function() {
  trainGreeting.call(this);
  trainBadWeatherQuestion.call(this);
  trainBookingTour.call(this);
  trainDiscounts.call(this);
  trainHotelTransfers.call(this);
  trainAdvanceBooking.call(this);
  // trainPassengerCount.call(this);
  trainCustomerService.call(this);
  trainLocation.call(this);
  operatingSeason.call(this);
  return this.classifier;
}

CommonClassifier.prototype.classify = function(description) {
  const text = description.toLowerCase();
  let category = this.classifier.categorize(text);
  // see if this was wrongly classified. If so mark it unclassified.
  if(!isCorrectlyClassified.call(this, category, text)) category = "unclassified";
  logger.debug(`NBClassifier.classify: categorized description "${text}" into category "${category}"`);
  return category;
}

const operatingTimesTemplateList = [
  "what days does %s tour operate",
  "what days does %s tours operate",
  "what days does %s cruise operate",
  "what days does %s operate",
  "%s tour operating time",
  "%s cruise operating time",
  "%s tours operating time",
  "%s operating time",
  "do you only operate %s cruise tours on specific days",
  "when do you operate %s cruise tours",
  "%s cruise operating days",
  "%s operating days",
  "%s tour operating days",
  "%s tours operating days",
  "%s cruise tour operating days",
  "on what days do you operate the %s cruise tour",
  "on what days do you operate the %s tour",
  "on what days do you operate the %s tours",
  "on what days do you operate the %s cruise",
  "on what days do you operate %s",
  "do you operate %s cruise on all days",
  "do you operate %s tours on all days",
  "do you operate %s tour on all days",
  "do you operate %s on all days",
  "are you open on all days for the %s cruise",
  "are you open on all days for the %s cruise tour",
  "are you open on all days for the %s cruise tours",
  "are you open on all days for the %s tour",
  "are you open on all days for the %s tours",
  "you open on all days for %s cruise",
  "you open on all days for %s tour",
  "you open on all days for %s tours",
  "when is the %s tour",
  "when is the %s cruise",
  "when is the %s trip"
];

CommonClassifier.prototype.operatingTimesTemplate = function(replaceString) {
  const filled = [];
  operatingTimesTemplateList.forEach(line => {
    filled.push(line.replace("%s", replaceString));
  });
  return filled;
}


function trainGreeting() {
  this.classifier.learn("hello", "greeting");
  this.classifier.learn("hi there", "greeting");
  this.classifier.learn("hi how are you", "greeting");
  this.classifier.learn("hi how do you do", "greeting");
  this.classifier.learn("hi", "greeting");
  this.classifier.learn("hiya", "greeting");
  this.classifier.learn("hola", "greeting");
  this.classifier.learn("yo", "greeting");
  this.classifier.learn("good morning", "greeting");
}

const passengerCountTemplateList = [
  "how many passengers are allowed in %s tour",
  "how many passengers are allowed in %s tours",
  "maximum passengers per boat in %s tours",
  "maximum passengers per boat in %s tour",
  "%s boat max passengers",
  "what's the passenger count for %s tour",
  "count of passengers for %s tour",
  "how many people per boat in %s tour",
  "how many people are in each boat for %s tour",
  "maximum per boat for %s tour",
  "maximum per boat for %s tours",
  "%s tour capacity",
  "%s watching trip capacity",
  "%s capacity",
  "what is the capacity for %s trip",
  "what's the capacity for %s trip",
  "what is the capacity for %s tour",
  "how much capacity does %s trip hold",
  "how many people are on the boat for %s tour",
  "most passengers in %s",
  "how many passengers are in %s cruise",
  "how many passengers in %s",
  "most passengers in %s",
  "maximum people in %s",
];

CommonClassifier.prototype.passengerCountTemplate = function(replaceString) {
  const filled = [];
  passengerCountTemplateList.forEach(line => {
    filled.push(line.replace("%s", replaceString));
  });
  return filled;
}

/*
function trainPassengerCount() {
  const trainingData = [
    "how many people are on the boat for the tours",
    "most passengers in a boat",
    "how many passengers are in a boat",
    "how many passengers per boat",
    "most passengers per boat",
    "maximum people in a boat",
    "maximum people on a cruise",
    "maximum passengers in a boat",
    "maximum passengers per tour",
    "maximum passengers per cruise",
  ];
  trainingData.forEach(line => {
    this.classifier.learn(line, "passenger count");
  });
}
*/

function trainCustomerService() {
  const trainingData = [
    "customer service details",
    "i want to contact customer service",
    "contact details",
    "what are your contact details",
    "can i get your contact details",
    "what is your contact info",
    "what is your contact details",
    "your contact info",
    "your contact information",
    "what are your customer service details",
  ];
  trainingData.forEach(line => {
    this.classifier.learn(line, "customer service", ["customer", "contact", "service", "contacts"]);
  });
}

function trainLocation() {
  const trainingData = [
    "where are you located",
    "where you located",
    "what is your location in st.lucia",
    "what is your address",
    "your location",
    "where in st. lucia are you located",
    "what's your location in st.lucia",
  ];
  trainingData.forEach(line => {
    this.classifier.learn(line, "location");
  });
}

function trainDiscounts() {
  const trainingData = [
    "discounts for large groups",
    "large group discounts",
    "is there a discount for large groups or families",
    "do you offer discounts for large groups",
    "do you offer discounts for large families",
    "do you offer discount for large groups",
    "do you offer discount for large families",
    "discount offers for large groups",
    "discount offers for large families",
    "discount for large families",
    "discount for large groups",
    "large groups discount",
    "what discounts do you offer",
  ];
  trainingData.forEach(line => {
    this.classifier.learn(line, "large group discounts");
  });
}

function trainHotelTransfers() {
  const trainingData = [
    "do you offer transfer to all hotels",
    "do you pick up from all hotels",
    "what hotels do you transfer to",
    "which hotels do you pick up from",
    "what hotels do you pick up from",
    "hotel pickup options",
    "are there any hotels you do not pick up from",
    "which hotels do you offer pick up from"
  ];
  trainingData.forEach(line => {
    this.classifier.learn(line, "hotel transfers");
  });
}

function trainAdvanceBooking() {
  const trainingData = [
    "how far in advance to we have to book tours",
    "is advance booking required",
    "is advance booking of cruises required",
    "is advance booking of tours required",
    "do we have to book our tours in advance",
    "how many days before should we book tours",
    "how many days in advance should we book tours",
    "should we book in advance",
    "should we book the cruises in advance",
    "should we book cruise in advance",
    "how early should we book our tickets",
    "do you recommend booking in advance",
    "do you recommend booking cruises in advance",
    "do you recommend booking tours in advance",
    "should i book cruises in advance",
  ];
  trainingData.forEach(line => {
    this.classifier.learn(line, "advance booking");
  });
}

function trainBookingTour() {
  const trainingData = [
    "book tour",
    "book tours",
    "tour booking",
    "i want to book a tour",
    "tour booking options",
    "booking tour options",
    "how do i book a tour",
    "booking tour",
    "can i book a tour",
    "how can i book tours",
    "how do i book a tour",
  ];
  trainingData.forEach(line => {
    this.classifier.learn(line, "book tour");
  });
}

function trainBadWeatherQuestion() {
  logger.debug(`trainBadWeatherQuestion: ${this.constructor.name}`);
  const trainingData = [
    "what happens if the weather is bad",
    "bad weather situation",
    "what do you do if the weather is bad",
    "what do you do during bad weather",
    "bad weather plan",
    "refunds during bad weather",
    "do you offer refunds during bad weather",
    "cancellation during bad weather",
    "cancellation due to bad weather",
    "refunds due to bad weather",
    "bad weather refunds",
    "what if the weather is bad",
    "what if it rains during the cruise",
    "what if the winds are strong",
    "weather cruise cancellation",
    "bad weather refund",
  ];
  trainingData.forEach(line => {
    this.classifier.learn(line, "bad weather");
  });
}

function operatingSeason() {
  const trainingData = [
    "do you operate year round",
    "what seasons do you operate",
    "are you open all months in the year",
    "are you closed for any season",
    "which seasons in a year are you open",
    "you closed for any season",
    "operating seasons"
  ];
  trainingData.forEach(line => {
    this.classifier.learn(line, "operating season");
  });
}

function isCorrectlyClassified(category, description) {
  const text = description.toLowerCase();
  const wordFrequency = this.classifier.getWordFrequency(category);
  let found = false;
  const tokens = this.classifier.tokenizer(text);
  tokens.forEach(token => {
    if(found || !wordFrequency[token] || neutralWords.includes(token)) return;
    // logger.debug(`token "${token}" has frequency of ${wordFrequency[token]}. Dump: ${JSON.stringify(wordFrequency)}`);
    found = true;
  });
  return found;
}

const neutralWords = [
"to",
"the", "be", 
"and",
"am",
"of",
"a",
"in",
"that",
"have",
"i",
"it",
"for",
"not",
"on",
"with",
"he",
"as",
"you",
"do",
"at",
"this",
"but",
"his",
"by",
"we",
"say",
"her",
"she",
"or",
"an",
"will",
"my",
"one",
"all",
"what",
"so",
"up",
"out",
"if",
"who",
"get",
"which",
"go",
"me",
"when",
"make",
"can",
"like",
"no",
"just",
"him",
"know",
"into",
"them",
"see",
"than",
"then",
"now",
"only",
"its",
"also",
"use",
"two",
"how",
"our",
"way",
"want",
"any",
"these",
"give",
"most",
"us",
"are",
"were",
"was",
"is",
"where",
"too",
"what's",
"how's",
"where's",
"how",
];

module.exports = CommonClassifier;
