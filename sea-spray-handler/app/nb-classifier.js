'use strict';

const bayes = require('bayes');
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
const CommonClassifier = require('common-classifier');

function NBClassifier() {
  this.classifier = bayes();
  this.commonClassifier = new CommonClassifier(this.classifier);
  this.commonClassifier.trainGreeting();
  trainToutBagayOperatingDays.call(this);
  trainSunsetCruiseOperatingDays.call(this);
  trainPirateOperatingDays.call(this);
  trainBadWeatherQuestion.call(this);
}

NBClassifier.prototype.classify = function(description) {
  const category = this.classifier.categorize(description.toLowerCase());
  logger.debug(`NBClassifier.classify: categorized description "${description}" into category "${category}"`);
  return category;
}

function trainSunsetCruiseOperatingDays() {
  this.classifier.learn("what days does the sunset cruise tour operate", "sunset cruise days");
  this.classifier.learn("do you only operate sunset cruise tours on specific days", "sunset cruise days");
  this.classifier.learn("when do you operate sunset cruise tours", "sunset cruise days");
  this.classifier.learn("sunset cruise tour operating days", "sunset cruise days");
  this.classifier.learn("sunset cruise operating days", "sunset cruise days");
  this.classifier.learn("how many days do you operate the sunset cruise tour", "sunset cruise days");
  this.classifier.learn("how many days do you operate sunset cruise", "sunset cruise days");
  this.classifier.learn("do you operate sunset cruise on all days", "sunset cruise days");
  this.classifier.learn("Are you open on all days for the sunset cruise", "sunset cruise days");
  this.classifier.learn("You open on all days for sunset cruise", "sunset cruise days");
}

function trainToutBagayOperatingDays() {
  this.classifier.learn("what days does the tout bagay tour operate", "tout bagay days");
  this.classifier.learn("do you only operate tout bagay on specific days", "tout bagay days");
  this.classifier.learn("when do you operate tout bagay tours", "tout bagay days");
  this.classifier.learn("tout bagay tour operating days", "tout bagay days");
  this.classifier.learn("how many days do you operate the tout bagay tour", "tout bagay days");
  this.classifier.learn("how many days do you operate tout bagay", "tout bagay days");
  this.classifier.learn("do you operate tout bagay on all days", "tout bagay days");
  this.classifier.learn("Are you open for tout bagay on all days", "tout bagay days");
  this.classifier.learn("Do you run tout bagay on all days", "tout bagay days");
  this.classifier.learn("Do you run tout bagay tour on all days", "tout bagay days");
  this.classifier.learn("Do you run tout bagay tours on all days", "tout bagay days");
}

function trainPirateOperatingDays() {
  this.classifier.learn("what days does the pirate's day adventures operate", "pirate days");
  this.classifier.learn("what days does the pirate's day operate", "pirate days");
  this.classifier.learn("what days does the pirate's tour operate", "pirate days");
  this.classifier.learn("pirate's day tour operating hours", "pirate days");
  this.classifier.learn("pirate's day adventure operating hours", "pirate days");
  this.classifier.learn("pirate's day adventure tour operating hours", "pirate days");
  this.classifier.learn("do you only operate pirate tours on specific days", "pirate days");
  this.classifier.learn("when do you operate pirate tours", "pirate days");
  this.classifier.learn("when do you operate pirate day tours", "pirate days");
  this.classifier.learn("pirate operating days", "pirate days");
  this.classifier.learn("how many days do you operate the pirate tours", "pirate days");
  this.classifier.learn("how many days do you operate pirate day's tours", "pirate days");
  this.classifier.learn("do you operate pirate day's tours on all days", "pirate days");
  this.classifier.learn("Are you open for pirate day tours on all days", "pirate days");
  this.classifier.learn("Do you run pirate tours on all days", "pirate days");
  this.classifier.learn("Do you run pirate day's tour on all days", "pirate days");
  this.classifier.learn("Do you run pirates tours on all days", "pirate days");
}

function trainBadWeatherQuestion() {
  const trainingDay = [
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
  trainingDay.forEach(line => {
    this.classifier.learn(line, "bad weather");
  });
}

module.exports = NBClassifier;
