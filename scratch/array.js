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
  const list = ["Already existing item", "item1 with words"];
  if(list.includes("item1 with words")) console.log("true");
  else console.log("false");
}

testIncludes();
