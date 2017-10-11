'use strict';

const bayes = require('bayes');

function Classifier() {
  this.classifier = bayes();
  trainAirlinesCategory.call(this);
  trainTravelAgentsCategory.call(this);
  trainNonTravelCategory.call(this);
  trainIotCategory.call(this);
  trainToursAndActivitiesCategory.call(this);
  trainGroundTransportationCategory.call(this);
  trainInOtherCategories.call(this);
}

Classifier.prototype.classify = function(description) {
  return this.classifier.categorize(description.toLowerCase());
}

function trainTravelAgentsCategory() {
  const classifier = this.classifier;
  classifier.learn("travel agency providing airlines service", "online travel agency");
  classifier.learn("helps travelers fly cheap with flights on over 450 airlines","online travel agency");
  classifier.learn("agents for over 250 airlines","online travel agency");
  classifier.learn("find and book airplane tickets","online travel agency");
  classifier.learn("travel like hotels, airlines etc.","online travel agency");
  classifier.learn("hotels, airlines, theaters, etc.","online travel agency");
  classifier.learn("travel agency providing airlines service","online travel agency");
  classifier.learn("online airline ticketing services","online travel agency");
  classifier.learn("airlines, hotels and travel operators","online travel agency");
  classifier.learn("fly cheap with flights on hundreds of airlines","online travel agency");
  classifier.learn("cheap flights from over numerous airlines","online travel agency");
  classifier.learn("travel agent website", "online travel agency");
  classifier.learn("travel agency", "online travel agency");
}

function trainAirlinesCategory() {
  const classifier = this.classifier;
  classifier.learn("an airlines that offers", "airlines");
  classifier.learn("Virgin Express Airlines","airlines");
  classifier.learn("privately held airline service", "airlines");
  classifier.learn("flagship carrier airlines", "airlines");
  classifier.learn("eighth-largest U.S. airline based on passenger traffic","airlines");
  classifier.learn("leisure airline based at Vilnius Airport","airlines");
  classifier.learn("Odyssey Airlines will begin offering","airlines");
  classifier.learn("official airlines of","airlines");

}

function trainNonTravelCategory() {
  const classifier = this.classifier;
  classifier.learn("expertise for smart technologies that partners with leading telecom, government, banks and airlines.","non-travel");
  classifier.learn("airlines, casinos, internet, retail and video games for institutional investors","non-travel");
  classifier.learn("service solutions for financial services, airlines and telecommunications industries","non-travel");
  classifier.learn("AerSale Holdings provides aftermarket aircraft, engines and component parts to airlines, leasing companies and OEM/MRO service providers.", "non-travel");
  classifier.learn("demand forecasting for airlines","non-travel");
  classifier.learn("work with airlines worldwide","non-travel");
  classifier.learn("catering company providing airline catering meals","non-travel");
  classifier.learn("airlines parking", "non-travel");
  classifier.learn("airport parking", "non-travel");
  classifier.learn("data science startup","non-travel");
  classifier.learn("technology solutions company","non-travel");
  classifier.learn("game that lets you create your airline","non-travel");
  classifier.learn("business intelligence company", "non-travel");
}

function trainIotCategory() {
  const classifier = this.classifier;
  classifier.learn("internet of things travel", "iot");
  classifier.learn("iot travel", "iot");
}

function trainToursAndActivitiesCategory() {
  this.classifier.learn("tours and other activities", "tours and activities");
  this.classifier.learn("tours, activities", "tours and activities");
}

function trainGroundTransportationCategory() {
  this.classifier.learn("ground transportation", "ground transportation");
}

function trainInOtherCategories() {
  this.classifier.learn("enforce claims against airlines for delayed or cancelled flights","airport");
  this.classifier.learn("makes upgrades effortless for airlines and passengers","airport");
  this.classifier.learn("cruises, airlines", "deals");
  this.classifier.learn("booking and distribution tool","reservation systems");
  this.classifier.learn("advance check-in services on US airlines","software development");
  this.classifier.learn("travel search engine aggregating information","metasearch");
  this.classifier.learn("Mobile solutions for the travel industry: tour operators, travel agencies, tourism boards, DMO, travel publishers, airlines", "mobile");
  this.classifier.learn("meta search travel engine","metasearch");
  this.classifier.learn("personalized destination products for airlines, IFE companies, and travel brands", "planning");
  this.classifier.learn("get compensation from airlines when their flight gets cancelled","airport");
  this.classifier.learn("information technology services company offering the latest in airlines and airline companies","IT services");
  this.classifier.learn("mobile application that allows airlines to make profit","mobile");
  this.classifier.learn("airbnb","lodging");
  this.classifier.learn("PR services for tourism boards, airlines, cruise lines, tour operators","tour operator");
}

Classifier.prototype.test = function() {
  console.log(this.classifier.categorize("2threads is a fashion-focused social network based in Sydney, Australia.".toLowerCase()));
  // console.log(this.classifier.categorize("Air India is the flagship carrier airline of India, Operates passenger and cargo airlines.".toLowerCase()));
  // console.log(this.classifier.categorize("Everbread offers a pricing and shopping engine for airlines, online travel agencies and travel consortia.".toLowerCase()));
  // console.log(this.classifier.categorize("kayak is a meta search for airlines, hotels and cars".toLowerCase()));
  // console.log(classifier.categorize("Startappz is a specialized house of expertise for smart technologies that partners with leading telecom, government, banks and airlines."));
  // console.log(classifier.categorize("airline tickets agency"));
  // console.log(classifier.categorize("Destygo is a A.I platform to build, deploy and train smart assistants (Chatbots) for travel companies (airlines, hotels, airports etc.)"));
  // console.log(classifier.categorize("Eastern Airlines, Inc is a airline business specializing in eastern United States flights."));
  // console.log(classifier.categorize("Airlines Technology helps Airlines, Travel Agents and third party vendors drive more revenue out of business.".toLowerCase()));
}

module.exports = Classifier;
