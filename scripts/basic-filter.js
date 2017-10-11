'use strict';

const baseFilter = ["airlines","tour","travel","tourism","tours","tourism","transportation","lodging", "leisure", "hotel", "lodges", "hotels", "bus", "rental", "flights", "flight", "airline", "activity", "activities", "taxi", "cruise", "cruises", "boat", "boats", "sail", "sailing", "diving", "adventure", "in-flight", "accomodation", "vacation", "sharing economy", "ride sharing", "resort", "resorts", "rental", "renting", "packages", "packaging", "events", "conferences", "exhibitions", "mice"];

// defaultTokenizer from naive_bayes.js (see node_modules in my-classifier module)
var defaultTokenizer = function (text) {
  //remove punctuation from text - remove anything that isn't a word char or a space
  let rgxPunctuation = /[^(a-zA-ZA-Яa-я0-9_)+\s]/g
  let sanitized = text.replace(rgxPunctuation, ' ')
  return sanitized.split(/\s+/)
}

const tokens = defaultTokenizer("crown packaging is the provider of industrial packaging products and equipments.");
const match = tokens.some(function(element, index, array) {
  console.log(`token: ${element}`);
    return baseFilter.includes(element);
});
console.log(`match: ${match}`);
