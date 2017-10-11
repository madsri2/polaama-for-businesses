'use strict';
const Promise = require('promise');
const fs = require('fs');
const Classifier = require('my-classifier');
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
logger.setConfigFile("pw-log.conf", true /* delete */); 

function Categorizer() {
  this.file = "/home/ec2-user/phocuswright/companies.dat";
  this.filterFile = `${baseDir}/phocuswright/companies-filtered.dat`; 
  if(fs.existsSync(this.filterFile)) this.file = this.filterFile;
  else this.createFilterFile = true;
  this.categories = {};
  this.classifier = new Classifier();
  Categorizer.supported().forEach(cat => {
    this.categories[cat] = [];
  });
  
  const self = this;
  this.numLinesConsidered = 0;
  this.totalLines = 0;
  this.promise = require('readline-promise').createInterface({
    input: fs.createReadStream(self.file)
  }).each(function(line) {
      const getStringWithinQuotesRegex = /"(.*?)"/g;
      const contents = [];
      let item;
      while(item = getStringWithinQuotesRegex.exec(line)) contents.push(item[1]);
      const description = contents[contents.length -1].toLowerCase();
      if(drop.call(this, description)) return;
      // TODO: This might be inefficient if the number of supported categories increases (essentially, it is n^2 runtime). Fix ME.
      self.totalLines++;
      // don't call isMatch if companies-filtered.dat is present. the createFilterFile bool is an indicator that the filter file is not present.
      const tokens = defaultTokenizer(description);
      if(self.createFilterFile) if(!isMatch(tokens)) return;
      self.numLinesConsidered++;
      if(self.createFilterFile) fs.appendFileSync(self.filterFile,`${line}\n`);
      Categorizer.supported().forEach(cat => {
        if(!matchSpecificFilter(tokens, cat)) return;
        if(self.classifier.classify(description) === cat) self.categories[cat].push({
            name: contents[3],
            homepage: contents[6],
            linkedIn: (contents[10] === '') ? "-" : contents[10],
            location: contents[14],
            description: description
         });
      });
  }).caught(function(err) {
    console.log(`error: ${err.stack}`);
    throw err;
  });
}

function drop(description) {
  const keywords = [
    "red light", "strip club", "adults club", "strip-club", "gay bars", "gay travelers"
  ];
  for(let idx = 0; idx < keywords.length; idx++) {
    if(description.includes(keywords[idx])) {
      logger.info(`Dropping company ${description} that matches ${keywords[idx]}`);
      return true;
    }
  }
  return false;
}

// defaultTokenizer from naive_bayes.js (see node_modules in my-classifier module)
let defaultTokenizer = function (text) {
  //remove punctuation from text - remove anything that isn't a word char or a space
  let rgxPunctuation = /[^(a-zA-ZA-Яa-я0-9_)+\s]/g;
  let sanitized = text.replace(rgxPunctuation, ' ');
  return sanitized.split(/\s+/);
}

Categorizer.baseFilter = ["airlines", "airline", "tour","travel","tourism","tours","tourism","transportation","lodging", "leisure", "hotel", "lodges", "hotels", "bus", "rental", "flights", "flight", "airline", "activity", "activities", "taxi", "cruise", "cruises", "boat", "boats", "sail", "sailing", "diving", "adventure", "in-flight", "accomodation", "vacation", "sharing economy", "ride sharing", "resort", "resorts", "rental", "renting", "packages", "packaging", "events", "conferences", "exhibitions", "mice", "traveling", "travellers", "travelling", "traveler", "travelers"];

// TODO: Might be inefficient (worst case n^2. FIX ME)
// function isMatch(desc) {
function isMatch(tokens) {
  // const tokens = defaultTokenizer(desc);
  return tokens.some(function(element, index, array) {
    return Categorizer.baseFilter.includes(element);
  });
}

function matchSpecificFilter(tokens, cat) {
  return tokens.some(function(element, index, array) {
    return Categorizer.supportedCategories[cat].search.includes(element);
  });
}

/*
function isMatch(d, cat) {
  const desc = d.toLowerCase();
  if(!desc.includes(cat)) return false;
  if(this.classifier.classify(desc) === cat) return true;
  return false;
}
*/

Categorizer.prototype.get = function(category) {
  if(!Categorizer.supported().includes(category.toLowerCase())) return null;
  const self = this;
  return this.promise.then(
  function(response) {
    logger.debug(`get: There are ${self.categories[category].length} items in category ${category}`);
    return self.categories[category];
  },
  function(err) {
    return Promise.reject(err);
  });
}

Categorizer.supportedCategories = {
  "airlines": { title: "Airlines", search: ["airlines", "airline", "flight"] },
  "tour operators": {title: "Tour operators", search: ["tours", "tour", "operators", "operator", "activities"] },
  "online travel agency": {title: "Travel Agency - Online", search: ["travel agency", "ticketing", "airline tickets", "flights", "hotels"] },
  "metasearch": { title: "Metasearch", search: ["meta", "metasearch", "search", "aggregator", "aggregates", "tickets"] },
  "planning": { title: "Travel planning", search: ["plan", "planning", "travel plans"] },
  // "lodging": { title: "Lodging", search: ["hotel", "lodges", "lodging", "hotels", "lodge"] },
  "lodging": { title: "Lodging", search: ["hotel", "lodges", "lodging", "hotels"] },
  "mobile": {title: "Mobile", search: ["mobile"] },
  /*
  "iot": { title: "Internet of Things", search: ["iot", "internet of things"] },
  "group travel": { title: "Group Travel", search: ["group"] },
  "tmc": {title: "TMC", search: ["tmc"] },
  "business travel": {title: "Business Travel", search: ["business travel"] },
  "airport": {title: "Airport", search: ["airport"] },
  "mobile": {title: "Mobile", search: ["mobile"] },
  */
  // "nontravel": {title: "Not Travel", search: ["rent", "medical", "finance", "search engine"]}
};

Categorizer.search = function(cat) {
  return Categorizer.supportedCategories[cat].search;
}

/*
  "ground transportation": "Ground Transportation",
  "tour operator": "Tour operators",
  "tours and activities": "Tours & activities",
  "online travel agency": "Travel Agency - Online",
  "iot": "Internet of Things (Travel)",
  "non-travel": "non-travel",
  "metasearch": "Meta search",
  "medical tourism": "Medical tourism",
  "planning": "Travel planning",
  "lodging": "Lodging",
  "group travel": "Group travel",
  "mice": "MICE",
  "tmc": "TMC"
};
*/

Categorizer.supported = function() {
  return Object.keys(Categorizer.supportedCategories);
}

Categorizer.getTitle = function(cat) {
  return Categorizer.supportedCategories[cat].title;
}

module.exports = Categorizer;
