'use strict';

function testSplice() {
  let arr = [];
  arr.push("Flight tickets");
  arr.push("Place to stay");
  arr.push("Rental car");
  arr.push("[US Citizens only] Enroll in STEP (https://step.state.gov/step/) to get travel alerts and warnings.");
  const i = arr.indexOf("Flight tickets");
  arr.splice(i, 1);
  console.log(`length of arr ${arr.length} [${arr}]`);
}

function testIncludes() {
  if(["Already existing item", "item1 with words"].includes("item1 with words")) console.log("true");
  else console.log("false");
}

function testPush() {
  let arr = [];
  arr.push(1,2);
  const a1 = [3,4];
  // Array.prototype.push.apply(arr, a1);
  arr = arr.concat(4);
  console.log(`arr: ${arr}; length is ${arr.length}`);
}

testPush();

// testIncludes();
