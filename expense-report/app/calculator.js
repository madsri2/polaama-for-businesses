'use strict';
const CommentParser = require('./comment-parser');
const logger = require('../../my-logger');
const _ = require('lodash');

function Calculator() {
  this.report = {};
}

// For each comment, figure out who owes whom how much and update the corresponding report accordingly.
Calculator.prototype.calculate = function(comments, families) {
  const parser = new CommentParser(families);
  comments.forEach(comment => { 
    const details = parser.parse(comment);
    // console.log(`comment ${comment} details: ${JSON.stringify(details, null, 2)}`);
    const fam1 = Object.keys(details)[0];
    const famList = Object.keys(details[fam1].owes);
    updateSpendSummary.call(this, details.spendSummary);
    famList.forEach(fam2 => {
      let famId;
      let famOwed;
      let amtOwed = details[fam1].owes[fam2];
      if(amtOwed > 0) {
        famId = fam1;
        famOwed = fam2;
      }
      else {
        famId = fam2;
        famOwed = fam1;
        amtOwed = 0 - amtOwed; // make this a positive number;
      }
      updateOwesReport.call(this, famId, famOwed, amtOwed);
    });
  });
  // console.log(`report before reducing: ${JSON.stringify(this.report, null, 2)}`);
  return reduceReport.call(this);
}

function updateOwesReport(fam, famOwed, amtOwed) {
  if(!this.report.owesReport) {
    this.report.owesReport = {};
  }
  if(!this.report.owesReport[fam]) {
    this.report.owesReport[fam] = [];
  }
  const famOwesReport = this.report.owesReport[fam];
  // find famOwed in fam's owesReport list
  let alreadyOwes = false;
  famOwesReport.forEach(entry => {
    if(entry.famOwed === famOwed) {
      alreadyOwes = true;
      entry.amtOwed += amtOwed;
      logger.debug(`fam ${fam} owes ${famOwed} ${entry.amtOwed} dollars. Amount from this comment is ${amtOwed}`);
      return;
    }
  });
  if(!alreadyOwes) {
    famOwesReport.push({
      'famOwed': famOwed,
      'amtOwed': amtOwed
    });
    logger.debug(`First amount owed: fam ${fam} owes ${famOwed} ${amtOwed} dollars. Amount from this comment is ${amtOwed}`);
  }
}

function updateSpendSummary(spendRecord) {
  const fam = spendRecord.family;
  const amt = spendRecord.amount;
  // console.log(`SpendSummary: ${fam} spent ${amt}`);
  if(!this.report.spendSummary) {
    this.report.spendSummary = {};
  }
  if(!this.report.spendSummary[fam]) {
    this.report.spendSummary[fam] = 0;
  }
  this.report.spendSummary[fam] += amt;
  this.report.spendSummary[fam] = +this.report.spendSummary[fam].toFixed(2);
}

// reduce the report by consolidating cases where family A owes family B and B owes A
function reduceReport() {
  // console.log(`Report: ${JSON.stringify(this.report)}`);
  const famOwesList = Object.keys(this.report.owesReport);
  famOwesList.forEach(famA => {
    const familiesOwedByFamA = this.report.owesReport[famA];
    if(!familiesOwedByFamA) {
      // this means that all of famA's entries were reduced below. Simply return;
      return;
    }
    // console.log(`famA is ${famA}`);
    familiesOwedByFamA.forEach(famAItem => {
      // famA owes famB amount amtOwedByFamA
      const famB = famAItem.famOwed;
      // console.log(`famB is ${famB}`);
      const amtOwedByFamA = famAItem.amtOwed;
      // see if famB owes any other family
      if(famOwesList.includes(famB)) {
        const familiesOwedByFamB = this.report.owesReport[famB];
        if(!familiesOwedByFamB) {
          // could have been deleted below. simply return;
          return;
        }
        // console.log(`families owed by famB: ${JSON.stringify(familiesOwedByFamB)}; famOwesList: ${JSON.stringify(famOwesList)}`);
        // and look for famA in that list.
        familiesOwedByFamB.forEach(famBItem => {
          if(famBItem.famOwed === famA) {
            // famB also owes famA, so reconcile.
            const amtOwedByFamB = famBItem.amtOwed;
            if(amtOwedByFamB > amtOwedByFamA) { // famB owes more than famA
              famBItem.amtOwed -= amtOwedByFamA;
              // delete famAItem from famA's owesReport
              // console.log(`amt owed by ${famB} is ${amtOwedByFamB}; amt owed by ${famA} is ${amtOwedByFamA}`);
              _.pull(familiesOwedByFamA, famAItem); 
            }
            else if(amtOwedByFamA > amtOwedByFamB) { //famA owes more than famB
              famAItem.amtOwed -= amtOwedByFamB;
              // delete famBItem from famB's owesReport
              _.pull(familiesOwedByFamB, famBItem);
              // console.log(`amt owed by ${famB} is ${amtOwedByFamB}; amt owed by ${famA} is ${amtOwedByFamA}`);
            }
            else {
              // famA and famB owe each other the same amount. Remove both records
              _.pull(familiesOwedByFamA, famAItem); 
              _.pull(familiesOwedByFamB, famBItem);
              // console.log(`amt owed by ${famB} is ${amtOwedByFamB}; amt owed by ${famA} is ${amtOwedByFamA}`);
            }
          }
        });
        if(familiesOwedByFamB.length === 0) {
          // famB does not owe anybody anything. 
          delete this.report.owesReport[famB];
        }
      }
    });
    if(familiesOwedByFamA.length === 0) {
      // famA does not owe anybody anything. 
      delete this.report.owesReport[famA];
    }
  });
  // set the amount precision to 2 decimal places
  Object.keys(this.report.owesReport).forEach(fam => {
    this.report.owesReport[fam].forEach(famOwedItem => {
      // toFixed returns a string. The prefix "+" converst that into a number.
      famOwedItem.amtOwed = +famOwedItem.amtOwed.toFixed(2);
    });
  });
  // console.log(JSON.stringify(this.report, null, 2));
  return this.report;
}

module.exports = Calculator;
