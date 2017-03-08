'use strict';
const CurrencyConverter = require('./currency-converter');
const _ = require('lodash');
const logger = require('../../my-logger');
const levenshtein = require('fast-levenshtein');

function CommentsParser(families) {
  if(families) {
    this.families = families; // ids of families in the trip
  }
}

// See test/test-parser.js to see what the return object structure is.
CommentsParser.prototype.parse = function(comment) {
  /* Acceptable formats
   * A paid 50 USD/euros/CAD/GBP/INR for xxxx 
        Implies A covered for every family 
   * B owes A 20$ for xxx 
        Simple transaction between B & A
   * C paid 50+20+30 euros for XXXX
        C paid for multiple transactions and covered for every family
  */
  const words = comment.toLowerCase().split(" ");
  const details = {};
  // The first word is always the name of a person.
  const famId = findFamilyId.call(this, words[0]);
  details[famId] = {
    'owes': {}
  };
  details.spendSummary = {
    'family': "",
    'amount': 0
  };
  // The second word can only be "paid" or "owes"
  if(words[1] === "paid") {
    const amt = parseAmount.call(this, words[2], words[3]);
    details.spendSummary.family = famId;
    details.spendSummary.amount = amt;
    // The families object includes the person who paid as well.
    const amtPerFam = +(amt / Object.keys(this.families).length).toFixed(3);
    Object.keys(this.families).forEach(fam => {
      if(fam !== famId) {
        // the personOfInterest (words[0]) paid, so his owes amount will be negative
        details[famId].owes[fam] = 0 - amtPerFam;
        // console.log(`${fam} owes ${famId} ${amtPerFam} dollars`);
      }
    });
    return details;
  }
  else if(words[1] === "owes") {
    const famOwed = findFamilyId.call(this, words[2]);
    const amt = parseAmount.call(this, words[3], words[4]);
    details.spendSummary.family = famOwed;
    details.spendSummary.amount = amt;
    details[famId].owes[famOwed] = amt;
    // console.log(`${famId} owes ${famOwed} ${amt} dollars`);
    return details;
  }
  throw new Error(`Second word in sentence needs to be "paid" or "owes", not ${words[1]}`);
} 

// if the comment looks like expense report detail, then validate. if not simply return true;
CommentsParser.prototype.validate = function(comment) {
  if(comment.contains("paid") || comment.contains("owes")) {
    try {
      const details = this.parse(comment);
      return true;
    }
    catch(err) {
      logger.error(err);
      return false;
    }
  }
  return true;
}

function findFamilyId(name) {
  const keys = Object.keys(this.families);
  for(let i = 0; i < keys.length; i++) {
    const id = keys[i];
    const members = this.families[id].map(function(val) { return val.toLowerCase(); });
    if(_.includes(members, name)) {
      // logger.info(`findFamilyId: Found match for ${name} in family ${id}`);
      return id;
    }
    // only do closest match check if the length of name is > 3. Otherwise, it might be a nick name and we don't want to wrongly match.
    if(name.length <= 3) {
      continue;
    }
    // if there was no direct match, try closest match using levenshtein distance
    let closestMatch;
    for(let j = 0; j < members.length; j++) {
      const dist = levenshtein.get(members[j], name);
      if(dist < 2) { // assume that 2 letters can be missing or off from a word. The reason I chose 2 is because choosing 3 would assume that Aparna and Arpan are the same people!
        logger.info(`findFamilyId: Assuming that user meant ${members[j]} when they typed ${name} since they differ by distance < 2. Returning family id ${id}`); 
        return id;
      }
    }
  }
  throw new Error(`findFamilyId: Could not find ${name} or any name resembling it in any family`);
}

function parseAmount(amount, currency) {
  // words[2] can be a single numeral ("50") or multiple ("50+20+30").
  let totalAmt = 0;
  const re = /\d+\.?\d*/g;
  let arr;
  while((arr = re.exec(amount)) != null) {
    totalAmt += +arr[0];
  }
  if(amount.startsWith("$") || amount.endsWith("$")) {
    // logger.info(`${totalAmt} starts or ends with a $. No conversion needed`);
    return totalAmt;
  }
  const converter = new CurrencyConverter(); // default currency toConvert is usd
  if(amount.includes("eur")) {
    return converter.convert(totalAmt, "euro");
  }
  // if we are here, words[3] should be a currency
  if(currency === "usd") {
    // logger.info(`${amount} is in USD. No conversion needed`);
    return totalAmt;
  }
  else if(currency.startsWith("euro")) {
    return converter.convert(totalAmt, "euro");
  }
  throw new Error(`Fourth word needs to be a currency (USD or euro), not ${currency}`);
}

module.exports = CommentsParser;
