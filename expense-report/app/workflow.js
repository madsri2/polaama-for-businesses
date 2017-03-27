'use strict';
const CommentParser = require('./comment-parser');
const logger = require('../..//my-logger');

function ExpenseReportWorkflow(session) {
  this.done = false;
  this.session = session;
  this.firstFamilyNameMessage = "Enter names of the first family traveling with you as a comma separated list";
  this.familyNameMessage = "Enter names of the next family traveling with you as a comma separated list";
  this.familyCountMessage = "Including you, how many families are traveling on this trip?";
  this.enterExpenseComment = `Enter your expense related comment. Accepted formats are "A paid $xx for an activity", "A owes B $xx for ...", "A paid xx usd/euro/currencyName for ..."`;
  this.invalidExpenseComment = `Invalid format. Accepted formats are "A paid $xx for an activity", "A owes B $xx for ...", "A paid xx usd/euro/currencyName for ..."`;
}

ExpenseReportWorkflow.prototype.startWork = function() {
  const trip = this.session.tripData();
  if(!trip.data.travelers) { // if we don't have family information get that first.
    this.awaitingFamilyCount = true;
    let quick_replies = [];
    for(let i = 1; i < 4; i++) {
      quick_replies.push({
        content_type: "text",
        title: i.toString(),
        payload: i.toString()
      });
    }
    // TODO: Enable this for cases where there are more than 3 families traveling
    /*
    quick_replies.push({
      content_type: "text",
      title: ">4",
      payload: "qr_>4",
    });
    */
    logger.info(`doWork: Sending quick_reply to find out family count`);
    return {
      recipient: {
        id: this.session.fbid
      },
      message: {
        text: this.familyCountMessage,
        quick_replies: quick_replies
      }
    };
  }
  // we have the family names. Just ask for comment
  return askForExpenseComment.call(this);
}

ExpenseReportWorkflow.prototype.doWork = function(mesgEvent) {
  const trip = this.session.tripData();

  if(this.awaitingFamilyCount) {
    // get family count
    this.familyCount = parseInt(mesgEvent.quick_reply.payload);
    this.awaitingFamilyCount = false;
    this.awaitingFamilyNames = true;
    trip.data.travelers = {};
    return textMessageRecord.call(this, this.firstFamilyNameMessage);
  }

  const message = mesgEvent.text;
  if(this.awaitingFamilyNames) {
    // get the names of the first family
    const names = message.split(",");
    trip.data.travelers[names[0]] = names;
    trip.persistUpdatedTrip();
		this.session.invalidateTripData();
    if(Object.keys(trip.data.travelers).length < this.familyCount) {
      return textMessageRecord.call(this, this.familyNameMessage);
    }
    // done with getting family names
    this.awaitingFamilyNames = false;
    return askForExpenseComment.call(this);
  }

  if(this.awaitingExpenseComment) {
    // extract expense report comment, validate and if it's right, persist it.
    const parser = new CommentParser(trip.data.travelers);
    if(!parser.validate(message)) {
      return textMessageRecord.call(this, this.invalidExpenseComment);
    }
    this.done = true;
    // TODO: validate that the members in the comment belong to the traveler's list
    return textMessageRecord.call(this, trip.storeExpenseEntry(this.session.fbid, message));
  }
}

function askForExpenseComment() {
  this.awaitingExpenseComment = true;
  return textMessageRecord.call(this, this.enterExpenseComment); 
}

function textMessageRecord(message) {
  return {
    recipient: {
      id: this.session.fbid
    },
    message: {
      text: message,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };
}

module.exports = ExpenseReportWorkflow;
