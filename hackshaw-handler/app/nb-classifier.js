'use strict';

const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
const CommonClassifier = require('common-classifier');
let operatingTimesTemplate;
let passengerCountTemplate;

function NBClassifier() {
  this.commonClassifier = new CommonClassifier();
  this.classifier = this.commonClassifier.commonTraining();
  operatingTimesTemplate = this.commonClassifier.operatingTimesTemplate;
  passengerCountTemplate = this.commonClassifier.passengerCountTemplate;
  trainAdditionalLocationMessages.call(this);
  trainDolphinWhalesOperatingTimes.call(this);
  trainPrivateCharterOperatingTimes.call(this);
  trainBottomFishingOperatingTimes.call(this);
  trainGroupSportsFishingOperatingTimes.call(this);
  trainDashSplashOperatingTimes.call(this);
  trainPassengerCountPrivateCharter.call(this);
  trainPassengerCountDashSplash.call(this);
  trainPassengerCountGroupSports.call(this);
  trainPassengerCountWhaleWatch.call(this);
  trainQuestionAboutFish.call(this);
  trainDolphinWhalesTypes.call(this);
  trainDolphinWhaleSuccessRate.call(this);
}

NBClassifier.prototype.classify = function(description) {
  return this.commonClassifier.classify(description);
}

function trainAdditionalLocationMessages() {
  const trainingData = [
    "where is hackshaw located",
    "where's hackshaw located",
    "where is hackshaw cruises located",
    "where is hackshaw cruise located",
    "where is hackshaw tour located",
    "where is hackshaw tours located",
    "what's the location of hackshaw",
    "what is the location of hackshaw",
    "hackshaw location"
  ];
  trainingData.forEach(line => {
    this.classifier.learn(line, "location");
  });
}

function trainDolphinWhalesOperatingTimes() {
  let trainingSet = operatingTimesTemplate("dolphins & whales").
   concat(operatingTimesTemplate("dolphins and whales")).
   concat(operatingTimesTemplate("dolphin & whale")).
   concat(operatingTimesTemplate("dolphin and whales"));
  trainingSet.forEach(line => {
    this.classifier.learn(line, "dolphin whales days", ["dolphin","whale","dolphins","whales"]);
  });
}

function trainGroupSportsFishingOperatingTimes() {
  let trainingSet = operatingTimesTemplate("group sports fishing").
    concat(operatingTimesTemplate("group sports fish")).
    concat(operatingTimesTemplate("group fishing"));
  trainingSet.forEach(line => {
    this.classifier.learn(line, "group sports fishing days", ["fishing", "fish", "group", "sports"]);
  });
}

function trainBottomFishingOperatingTimes() {
  let trainingSet = operatingTimesTemplate("bottom fishing").
    concat(operatingTimesTemplate("bottom fish"));
  trainingSet.forEach(line => {
    this.classifier.learn(line, "bottom fishing days", ["bottom"]);
  });
}

function trainPrivateCharterOperatingTimes() {
  let trainingSet = operatingTimesTemplate("private charters").
    concat(operatingTimesTemplate("private charter"));
  trainingSet.forEach(line => {
    this.classifier.learn(line, "private charter days", ["private", "charter"]);
  });
}

function trainDashSplashOperatingTimes() {
  let trainingSet = operatingTimesTemplate("dash and splash").
    concat(operatingTimesTemplate("dash and splash half speed boat")).
    concat(operatingTimesTemplate("dash and splash speed boat")).
    concat(operatingTimesTemplate("dash splash half speed boat")).
    concat(operatingTimesTemplate("dash splash speed boat"));
  trainingSet.forEach(line => {
    this.classifier.learn(line, "dash splash days", ["dash", "splash", "speed", "boat"]);
  });
}

function trainPassengerCountWhaleWatch() {
  let trainingSet = passengerCountTemplate("whale watch tours").
    concat(passengerCountTemplate("whale watching")).
    concat(passengerCountTemplate("whale watch")).
    concat(passengerCountTemplate("whale")).
    concat(passengerCountTemplate("dolphin watch")).
    concat(passengerCountTemplate("dolphin")).
    concat(passengerCountTemplate("dolphin & whale watch")).
    concat(passengerCountTemplate("dolphin and whale watch"));
  trainingSet.forEach(line => {
    this.classifier.learn(line, "whale watch passengers", ["whale", "dolphin"]);
  });
}

function trainPassengerCountGroupSports() {
  let trainingSet = passengerCountTemplate("group sport fishing").
    concat(passengerCountTemplate("group sports"));
    trainingSet.forEach(line => {
      this.classifier.learn(line, "group sport passengers", ["sport", "sports", "fishing"]);
    });
}

function trainPassengerCountDashSplash() {
  let trainingSet = passengerCountTemplate("dash splash speed boat").
    concat(passengerCountTemplate("dash and splash half day speed boat")).
    concat(passengerCountTemplate("dash & splash boat")).
    concat(passengerCountTemplate("dash & splash half day speed boat"));
   trainingSet.forEach(line => {
     this.classifier.learn(line, "dash splash passengers", ["dash", "splash", "speed", "boat"]);
   });
}

function trainPassengerCountPrivateCharter() {
  let trainingSet = passengerCountTemplate("private charter").
    concat(passengerCountTemplate("private")).
    concat(passengerCountTemplate("charter boat")).
    concat(passengerCountTemplate("private boat"));
   trainingSet.forEach(line => {
     this.classifier.learn(line, "private charter passengers", ["private", "charter"]);
   });
}

function trainQuestionAboutFish() {
  let trainingSet = [
    "are guests allowed to keep the fish that are caught",
    "what's the fish catch policy",
    "what is the fish catch policy",
    "can we keep the fish we catch",
    "can we keep the fishes we catch",
    "fish catch policy",
    "do we get to keep the fish we caught",
    "can we keep caught fish",
    "what do you do with fish we catch",
    "what do you do with caught fish",
  ];
   trainingSet.forEach(line => {
     this.classifier.learn(line, "fish catch", ["fish", "fishes"]);
   });
}

function trainDolphinWhalesTypes() {
  let trainingSet = [
    "what types of dolphins will we see",
    "what types of whales will we see",
    "what types of dolphin will we see",
    "what types of whale will we see",
    "what type of dolphins and whales are seen",
    "what type of dolphins are seen",
    "what type of whales are seen",
    "dolphin types seen",
    "whale types seen",
    "dolphin type seen",
    "whale type seen",
    "what dolphin or whale types should we expect to see",
    "what dolphin type should we expect to use",
    "what whale type should we expect to use",
    "what should we expect to see in the dolphin whale watching trips",
    "what do people typically see in the dolphin and whale watching trip",
  ];
   trainingSet.forEach(line => {
     this.classifier.learn(line, "dolphin whale types", ["dolphin", "whale", "dolphins", "whales"]);
   });
}

function trainDolphinWhaleSuccessRate() {
  let trainingSet = [
    "what is the success rate on the dolphin and whale watching trip",
    "how much success do you typically have on dolphin whale watching trips",
    "do you guarantee sightings in the dolphin whale watching trip",
    "how often do we actually see dolphins and whales on the trip",
    "success rate on dolphin whale watching trip",
    "success rate on dolphin whale watch trip",
  ];
  trainingSet.forEach(line => {
    this.classifier.learn(line, "dolphin whale success rate", ["dolphin", "whale", "dolphins", "whales"]);
  });
}

module.exports = NBClassifier;
