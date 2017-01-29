function testObjectKey() {
  var a = {};
  a.b = 1;
  const d = 'c';
  a[d] = "Hello";
  console.log(a);
}

// at this point, we are only keeping 2 messages in history
const HISTORY_LENGTH = 4;
function updateHistoryAndCallResolve(message, context) {
  const sessionId = context.sessionId;
  var history = sessions[sessionId].botMesgHistory;
  // add this message to the sessions's previous messages.
  if(history.length == HISTORY_LENGTH) {
    history.forEach(function(element,i,array) {
      history[i] = history[i+1];
    });
    history[HISTORY_LENGTH - 1] = message;
  }
  else {
    history.push(message);
  }
}

function testUpdateHistoryAndCallResolve() {
  var context = {};
  var sessions = [];
  sessions[1] = {};
  sessions[1].botMesgHistory = [];
  context.sessionId = 1;
  updateHistoryAndCallResolve("A", context);
  updateHistoryAndCallResolve("B", context);
  updateHistoryAndCallResolve("C", context);
  updateHistoryAndCallResolve("D", context);
  updateHistoryAndCallResolve("E", context);
  updateHistoryAndCallResolve("F", context);
  updateHistoryAndCallResolve("G", context);
  updateHistoryAndCallResolve("H", context);
  console.log(sessions[1].botMesgHistory);
}

function testEncoding() {
  var str = "Big Island";
  console.log(str.toLowerCase().replace(" ","-"));
}

var _ = require('lodash');

function retrieveTrip(tripName) {
  return retrieveTrips()[tripName];
}

function retrieveTrips() {
  return JSON.parse("{\"big_island\":{\"name\":\"big_island\"},\"israel\": {\"name\": \"israel\"}}");
}

function testUndefined() {
  var trip = retrieveTrip("israel");
  console.log("Value is " + _.isUndefined(trip) + ". Trip is " + JSON.stringify(trip));
}

function testRegex() {
 const messageText = "pack: Hello,World";
 const items = messageText.replace(/pack[:]*[ ]*/,"").split(',');
 console.log(items);
 return items;
}

function testNonexistentKey() {
  var a = {};
  a.k1 = "k1";
  a.k2 = "k2";
  a.k3 = ["a"];
  if(!("k3" in a)) {
    a.k3 = [];
  }
  a.k3 = a.k3.concat(testRegex());
  console.log(JSON.stringify(a));
}

function storeList(senderId, messageText, regex) {
  const tripName = "big island";
  // retrieve text
  const items = messageText.replace(regex,"").split(',');
  console.log("successfully stored item " + items + " in list");
  return;
}

function overload(a) {
  console.log(a);
}

function prettyPrint(file) {
    const fs = require('fs');
    try {
      const trip = JSON.parse(fs.readFileSync(file, 'utf8')); 
      console.log(JSON.stringify(trip, null, 4)); // another option is util.inspect
    }
    catch(err) {
      console.error("error reading from ",file, err.stack);
      return null;
    }
}

function overload(a, b) {
  console.log(`${a} - ${b}`);
}

function testReplace() {
  const a = "1 2";
  const b = a.replace("1","3")
             .replace("2","4");
  return b;
}

// console.log(testReplace());
// var reg = new RegExp("todo[:]*[ ]*","i");
// storeList("", "todo: a", reg);
// prettyPrint('trips/big_island.txt');

function testUndefinedMemberInObject(key) {
  const s = {
    a: "a"
  };
  if(s[key]) {
    console.log(`${key} is present in object s`);
  }
  else {
    console.log(`${key} is absent in object s`);
  }
}

// testUndefinedMemberInObject("a");
// testUndefinedMemberInObject("b");

function lonelyPlanetEncodeTest(country) {
  return country.replace(/ /g,'-').replace(/_/g,'-').toLowerCase();
}

const walkSync = require('walk-sync');
function testWalkSync() {
/*
const options = {
  followLinks: false,
  directories: false
  listeners: {
    file: function(root, fileStats, next) {
      if(fileStats.name === "lisbon.txt") {
        console.log(`found lisbon.txt: ${JSON.stringify(fileStats, null, 2)}`);
      }
    }
  }
};
walk.walkSync("countries", options);
*/
const files = walkSync("countries", {directories: false});
files.forEach(file => {
  if(file.indexOf("lisbon.txt") > -1) {
    console.log(file);
  }
});
}

const IataCode = require('iatacodes');
const ic = new IataCode('4a8368c8-4369-4ed3-90ab-f5c46ce34e54');
function testIataCode() {
  city = "seattle";
  ic.api('autocomplete', { query: `${city}`}, function(e, r) {
    r.cities.forEach(city => {
      if(city.name.toLowerCase() === "seattle") {
        console.log(`response from iatacode.org: ${city.code}`);
      }
    });
  });
}

function testUndefinedVsFalse() {
  const a = {
    v1: "v1",
    v2: true
  };
  if(!a.v2) {
    console.log("a.v2 is undefined");
  }
}

function f1(et) {
  if(et) {
    console.log("ET");
  }
  else {
    console.log("No ET");
  }
}

f1();
console.log("***");
f1(true);

// testUndefinedVsFalse();

// testIataCode();

// console.log(lonelyPlanetEncodeTest("Canary_Islands"));
