'use strict';

const Sessions = require('./sessions');
const ss = new Sessions();

const s1 = ss.findOrCreate("1","a");
// console.log(JSON.stringify(s1, null, 2));
console.log("========= Testing findTrip ========");
const trip = s1.findTrip("a");
// console.log(JSON.stringify(trip, null, 2));
console.log("========= Testing updateAiContext ========");
let aiC = s1.aiContext("a");
aiC.key = "value";
s1.updateAiContext("a",aiC);
console.log(JSON.stringify(s1.findTrip("a")));
console.log("========= Testing deleteAiContext ========");
s1.deleteAiContext("a");
console.log(JSON.stringify(s1.findTrip("a")));
console.log("========= Testing fbid ========");
console.log(s1.getFbid());
