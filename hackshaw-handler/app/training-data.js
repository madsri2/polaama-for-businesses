'use strict';

const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
const CommonClassifier = require('common-classifier');
let operatingDaysTemplate;
let passengerCountTemplate;

function TrainingData() {
  this.commonClassifier = new CommonClassifier();
  operatingDaysTemplate = this.commonClassifier.operatingTimesTemplate;
  passengerCountTemplate = this.commonClassifier.passengerCountTemplate;
}

TrainingData.prototype.classify = function(description) {
  return this.commonClassifier.classify(description);
}

TrainingData.prototype.trainAdditionalLocationMessages = function() {
  let trainingData = this.commonClassifier.trainLocation();
  trainingData = trainingData.concat([
    "where is hackshaw located",
    "where's hackshaw located",
    "where is hackshaw cruises located",
    "where is hackshaw cruise located",
    "where is hackshaw tour located",
    "where is hackshaw tours located",
    "what's the location of hackshaw",
    "what is the location of hackshaw",
    "hackshaw location"
  ]);
  return trainingData;
}

TrainingData.prototype.trainDolphinWhalesOperatingDays = function() {
  return operatingDaysTemplate("dolphins & whales").
   concat(operatingDaysTemplate("dolphins and whales")).
   concat(operatingDaysTemplate("dolphin & whale")).
   concat(operatingDaysTemplate("dolphin and whales"));
}

TrainingData.prototype.trainGroupSportsFishingOperatingDays = function() {
  return operatingDaysTemplate("group sports fishing").
    concat(operatingDaysTemplate("group sports fish")).
    concat(operatingDaysTemplate("group fishing"));
}

TrainingData.prototype.trainBottomFishingOperatingDays = function() {
  return operatingDaysTemplate("bottom fishing").
    concat(operatingDaysTemplate("bottom fish"));
}

TrainingData.prototype.trainPrivateCharterOperatingDays = function() {
  return operatingDaysTemplate("private charters").
    concat(operatingDaysTemplate("private charter"));
}

TrainingData.prototype.trainDashSplashOperatingDays = function() {
  return operatingDaysTemplate("dash and splash").
    concat(operatingDaysTemplate("dash and splash half speed boat")).
    concat(operatingDaysTemplate("dash and splash speed boat")).
    concat(operatingDaysTemplate("dash splash half speed boat")).
    concat(operatingDaysTemplate("dash splash speed boat"));
}

TrainingData.prototype.trainOperatingDays = function() {
  return this.trainDolphinWhalesOperatingDays().
    concat(this.trainBottomFishingOperatingDays()).
    concat(this.trainPrivateCharterOperatingDays()).
    concat(this.trainDashSplashOperatingDays()).
    concat(this.trainGroupSportsFishingOperatingDays());
}

TrainingData.prototype.trainPassengerCountWhaleWatch = function() {
  let trainingSet = passengerCountTemplate("whale watch tours").
    concat(passengerCountTemplate("whale watching")).
    concat(passengerCountTemplate("whale watch")).
    concat(passengerCountTemplate("dolphin watch")).
    concat(passengerCountTemplate("dolphin & whale watch")).
    concat(passengerCountTemplate("dolphin and whale watch"));
  return trainingSet;
}

TrainingData.prototype.trainPassengerCountGroupSports = function() {
  let trainingSet = passengerCountTemplate("group sport fishing").
    concat(passengerCountTemplate("group sports"));
  return trainingSet;
}

TrainingData.prototype.trainPassengerCountBottomFishing = function() {
  let trainingSet = passengerCountTemplate("bottom fishing").
    concat(passengerCountTemplate("Bottom fishing boat")).
    concat(passengerCountTemplate("fishing tour"));
   return trainingSet;
}

TrainingData.prototype.trainPassengerCountDashSplash = function() {
  let trainingSet = passengerCountTemplate("dash splash speed boat").
    concat(passengerCountTemplate("dash and splash half day speed boat")).
    concat(passengerCountTemplate("dash & splash boat")).
    concat(passengerCountTemplate("dash & splash half day speed boat"));
   return trainingSet;
}

TrainingData.prototype.trainPassengerCountPrivateCharter = function() {
  let trainingSet = passengerCountTemplate("private charter").
    concat(passengerCountTemplate("private")).
    concat(passengerCountTemplate("charter boat")).
    concat(passengerCountTemplate("private boat"));
   return trainingSet;
}

TrainingData.prototype.trainPassengerCount = function() {
  return this.trainPassengerCountWhaleWatch().
    concat(this.trainPassengerCountBottomFishing()).
    concat(this.trainPassengerCountPrivateCharter()).
    concat(this.trainPassengerCountDashSplash()).
    concat(this.trainPassengerCountGroupSports());
}

TrainingData.prototype.trainQuestionAboutFish = function() {
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
    console.log(line);
   });
}

TrainingData.prototype.trainDolphinWhalesTypes = function() {
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
    console.log(line);
   });
}

TrainingData.prototype.trainDolphinWhaleSuccessRate = function() {
  let trainingSet = [
    "what is the success rate on the dolphin and whale watching trip",
    "how much success do you typically have on dolphin whale watching trips",
    "do you guarantee sightings in the dolphin whale watching trip",
    "how often do we actually see dolphins and whales on the trip",
    "success rate on dolphin whale watching trip",
    "success rate on dolphin whale watch trip",
  ];
  return trainingSet;
}

module.exports = TrainingData;
