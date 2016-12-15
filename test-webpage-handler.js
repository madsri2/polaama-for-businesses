'use strict';
const WebpageHandler = require('./webpage-handler');
const Sessions = require('./sessions');
const ss = new Sessions();

function Response() {
}

Response.prototype.send = function(html) {
  console.log(html);
}

const headers = {
  'user-agent': 'Mozilla test'
};

function testDisplayTrip() {
  const s2 = ss.findOrCreate("2");
  s2.addTrip("a");
  const handler = new WebpageHandler("aaaa","a");
  const res = new Response();
  handler.displayTrip(res);
}
// testDisplayTrip();

function testDisplayComments() {
  const s2 = ss.findOrCreate("2");
  s2.addTrip("b");
  const tripData = s2.tripData();
  tripData.storeFreeFormText("2", "testing comments");
  const handler = new WebpageHandler("aaaa","b");
  const res = new Response();
  // handler.handleWebpage(res, handler.displayComments);
  handler.handleWebpage(res, handler.displayRawComments, [headers]);
}
testDisplayComments();
