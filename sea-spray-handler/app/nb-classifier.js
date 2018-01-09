'use strict';

const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
const CommonClassifier = require('common-classifier');
let passengerCountTemplate;

function NBClassifier() {
  this.commonClassifier = new CommonClassifier();
  this.classifier = this.commonClassifier.commonTraining();
  passengerCountTemplate = this.commonClassifier.passengerCountTemplate;
  trainAdditionalLocationMessages.call(this);
  trainToutBagayOperatingDays.call(this);
  trainSunsetCruiseOperatingDays.call(this);
  trainPirateOperatingDays.call(this);
  trainPassengerCount.call(this);
}

NBClassifier.prototype.classify = function(description) {
  return this.commonClassifier.classify(description);
}

function trainSunsetCruiseOperatingDays() {
  let trainingSet = this.commonClassifier.operatingTimesTemplate("sunset");
  trainingSet.forEach(line => {
    this.classifier.learn(line.toLowerCase(), "sunset cruise days", ["sunset"]);
  });
}

function trainToutBagayOperatingDays() {
  let trainingSet = this.commonClassifier.operatingTimesTemplate("tout bagay");
  trainingSet.forEach(line => {
    this.classifier.learn(line.toLowerCase(), "tout bagay days", ["tout", "bagay"]);
  });
}

// TODO: Consider stemming to avoid training with tour, tours etc.
// https://stackoverflow.com/questions/3473612/ways-to-improve-the-accuracy-of-a-naive-bayes-classifier
function trainPirateOperatingDays() {
  let trainingSet = this.commonClassifier.operatingTimesTemplate("pirate's day adventure").
    concat(this.commonClassifier.operatingTimesTemplate("pirates' day")).
    concat(this.commonClassifier.operatingTimesTemplate("pirates")).
    concat(this.commonClassifier.operatingTimesTemplate("pirate"));
  trainingSet.forEach(line => {
    this.classifier.learn(line.toLowerCase(), "pirate days", ["pirate", "pirates"]);
  });
}

function trainPassengerCount() {
  let trainingSet = passengerCountTemplate("sunset cruise").
    concat(passengerCountTemplate("sunset")).
    concat(passengerCountTemplate("pirate's day")).
    concat(passengerCountTemplate("pirate's day adventure")).
    concat(passengerCountTemplate("tout bagay")).
    concat([
      "maximum people on a cruise",
      "maximum passengers in a boat",
      "maximum passengers per tour",
      "maximum passengers per cruise",
    ]);
  trainingSet.forEach(line => {
    this.classifier.learn(line, "passenger count");
  });
}

function trainAdditionalLocationMessages() {
  const trainingData = [
    "where is sea spray located",
    "where's sea spray located",
    "where is sea spray cruises located",
    "where is sea spray cruise located",
    "where is sea spray tour located",
    "where is sea spray tours located",
    "what's the location of sea spray",
    "what is the location of sea spray",
    "sea spray location"
  ];
  trainingData.forEach(line => {
    this.classifier.learn(line, "location");
  });
}

module.exports = NBClassifier;
