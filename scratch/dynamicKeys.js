'use strict';

const myObj = {};
  myObj.awaitingComment = true;
  myObj.awaitingTodoItem = true;
  myObj.awaitingPacklistItem = true;
  myObj.awaitingNewTripDetails = true;
  myObj.planningNewTrip = true;
  myObj.awaitingHometownInfo = true;
  myObj.awaitingCitiesForNewTrip = true;
  myObj.awaitingExpenseReport = true;
  myObj.awaitingUserConfirmation = true;
  myObj.notAwaiting = true;

  Object.keys(myObj).forEach(key => {
    if(key.startsWith("awaiting")) {
      myObj[key] = false;
    }
  });

console.log(JSON.stringify(myObj, null, 2));
