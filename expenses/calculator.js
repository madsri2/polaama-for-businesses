'use strict';
use currNormalizer = require('currency-normalizer');
use parser = require('comments-parser');

function Calculator(comments) {
  this.rawDetails = parser.parse(comments);

}

/*
  * Create families (a group of people).
  * Parse expense messages. Obtain details of which family paid, which family owes and how much they owe. 
  * Normalize the amount into a common currency (USD, this should be passed into the calculator so we can obtain it later from user profile based on their portOfOrigin). To normalize, use a conversion rate for that week.
  * Store it in the following way: 
    [
      {
          id => fam-a,
          families => [fam-b, fam-c],
          amount => [10, 20, 30],
          exclude-self => true // false by default.
      },
      {
        id => fam-b,
          ...
      }
    ]
  * Calculate how much each spent and create an object of how much each family owes
    {
      fam-a => {
        // how much fam-a owes other families
        owes: {
          fam-b: 10,
          fam-c: ..
        },
        // how much each family owes fam-a
        owed: {
          fam-b: 20,
          fam-d: 10
        }
      },
      fam-b => {
        ...
      }
    }
  * Reduce the list into a final list of who owes how much.
*/
Calculator.prototype.calculate = function() {
  let report = {};
  this.rawDetails.forEach(famDetails => {
    const amtPerFam = perFamilyCalc.call(this, famDetails);
    famDetails.families.forEach(famId => {
    if(!report[famDetails.id]) {
      report[famDetails.id] = {};
    }
    report[famDetails.id][famId] = amtPerFam;
    });
  });
  this.finalReport = {};
  Object.keys(report).forEach(famId => {
    const rawDetails = report[famId];
    Object.keys(id.owes).forEach(owesId => {
      Object.keys(id.owed).forEach(id) {
        if(id === owesId) {
          // if owes > owed, then update owes, else update owed
          const amt = rawDetails.owes[id] - rawDetails.owed[id];
          if(amt > 0) {
            this.finalReport[famId].owes[id] = amt;
          }
          else {
            this.finalReport[famId].owed[id] = amt;
          }
        }
      }
    }
  });
}

Calculator.prototype.getExpenseReport = function(id) {
  return this.finalReport[id];
}

/*
 Given an object with details about how much a family paid, return how much each family owes that family
*/
function perFamilyCalc(famDetails) {
  let total = 0;
  famDetails.amount.forEach(amt => {
    total += amt;
  });
  let self = 1;
  if(famDetails.exclude-self) { self = 0; }
  const totalFamilies = famDetails.families.length + self; 
  const amtPerFam = total / totalFamilies;
  return amtPerFam;
}


module.exports = Calculator;
