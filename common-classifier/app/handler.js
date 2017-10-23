'use strict';

function CommonClassifier(classifier) {
  this.classifier = classifier;
}

CommonClassifier.prototype.trainGreeting = function() {
  this.classifier.learn("hello", "greeting");
  this.classifier.learn("hi there", "greeting");
  this.classifier.learn("hi", "greeting");
  this.classifier.learn("hiya", "greeting");
  this.classifier.learn("hola", "greeting");
  this.classifier.learn("yo", "greeting");
  this.classifier.learn("good morning", "greeting");
}

module.exports = CommonClassifier;
