'use strict';

const bayes = require('bayes');
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);

function NBClassifier() {
  this.classifier = bayes();
  trainGreeting.call(this);
  trainCruise.call(this);
  trainHotel.call(this);
  trainCruiseQuestions.call(this);
  trainCancelHotel.call(this);
  trainCruiseTimes.call(this);
  trainTalkToHuman.call(this);
}

NBClassifier.prototype.classify = function(description) {
  const category = this.classifier.categorize(description.toLowerCase());
  logger.debug(`NBClassifier.classify: categorized description "${description}" into category "${category}"`);
  return category;
}

function trainGreeting() {
  this.classifier.learn("hello", "greeting");
  this.classifier.learn("hi there", "greeting");
  this.classifier.learn("hi", "greeting");
  this.classifier.learn("hiya", "greeting");
  this.classifier.learn("hola", "greeting");
  this.classifier.learn("yo", "greeting");
  this.classifier.learn("good morning", "greeting");
}

function trainCruise() {
  this.classifier.learn("cruise", "cruise");
  this.classifier.learn("cruise tickets", "cruise");
  this.classifier.learn("i am looking for cruises in sfo", "cruise");
  this.classifier.learn("cruise options", "cruise");
  this.classifier.learn("what cruise options exist", "cruise");
}

function trainHotel() {
  this.classifier.learn("i am looking for hotels in sfo", "hotels");
  this.classifier.learn("hotel options", "hotels");
  this.classifier.learn("what hotel options exist", "hotels");
  this.classifier.learn("i want to reserve hotels in sfo", "hotels");
}

function trainCruiseQuestions() {
  this.classifier.learn("lunch served on cruise", "cruise-lunch");
  this.classifier.learn("food options for lunch  on cruise", "cruise-lunch");
  this.classifier.learn("lunch options on cruise", "cruise-lunch");
}

function trainCruiseTimes() {
  this.classifier.learn("cruise time", "cruise-time");
  this.classifier.learn("what time does the cruise start", "cruise-time");
  this.classifier.learn("cruise start time", "cruise-time");
  this.classifier.learn("what time does cruise start", "cruise-time");
}

function trainCancelHotel() {
  this.classifier.learn("i want to cancel my hotel", "cancel-hotel");
  this.classifier.learn("cancel my hotel", "cancel-hotel");
  this.classifier.learn("i would like to cancel my hotel reservation", "cancel-hotel");
}

function trainTalkToHuman() {
  this.classifier.learn("i want to talk to a human", "human");
  this.classifier.learn("other issue", "human");
  this.classifier.learn("another question", "human");
  this.classifier.learn("i don't want to talk to a bot", "human");
  this.classifier.learn("i do not want to talk to a bot", "human");
  this.classifier.learn("human", "human");
  this.classifier.learn("talk to a real human being", "human");
}

module.exports = NBClassifier;
