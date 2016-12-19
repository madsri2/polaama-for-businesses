'use strict';

const fs = require('fs');
const _ = require('lodash');
const WebhookPostHandler = require('./webhook-post-handler');
const WebpageHandler = require('./webpage-handler');
const TripData = require('./trip-data');
const logger = require('./my-logger');
const crypto = require('crypto');
const TripDataFormatter = require('./trip-data-formatter.js');
// ----------------------------------------------------------------------------
// Set up a webserver

// For validation with facebook & verifying signature
const VALIDATION_TOKEN = "go-for-lake-powell";
const FB_APP_SECRET = "a26c4ad2358b5b61942227574532d174";

// Polaama related handler
const postHandler = new WebhookPostHandler();

// A secure webserver
const util = require('util');
const express = require('express');  
const morgan = require('morgan');
const app = express();
const https = require('https');
const sslPath = '/etc/letsencrypt/live/polaama.com/';
const port = 443
const options = {  
    key: fs.readFileSync(sslPath + 'privkey.pem'),
    cert: fs.readFileSync(sslPath + 'fullchain.pem')
};

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    let elements = signature.split('=');
    let method = elements[0];
    let signatureHash = elements[1];

    let expectedHash = crypto.createHmac('sha1', FB_APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

// get weather info for later use
const server = https.createServer(options, app);  
server.listen(port, function() {
  logger.info("Listening on port " + port);
  const twoDaysInMsec = 1000*60*60*24*2; // 2 days
  const tenSeconds = 1000*10; 
  const intervalId = setInterval(sendTodoReminders, twoDaysInMsec);
}); 

// create a write stream (in append mode) 
const accessLogStream = fs.createWriteStream('log/access.log', {flags: 'a'})
app.use(morgan('common', 'immediate', { stream: accessLogStream }));

const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
app.use(bodyParser.json({ verify: verifyRequestSignature }));

app.get('/', function(req, res) {
  return res.send("<meta name='B-verify' content='ee02308f7491f4aef923b2d1184072ccd1f6367a' /><body>Hello secure world</body>");
});

// var json2html = require('node-json2html');
app.get('/trips', function(req, res) {
  return res.send("This will eventually return a list of trips planned for this user.");
});

app.get('/favicon.ico', function(req, res) {
  res.type('image/x-icon');
  res.status(301);
  return res.end();
});

app.get('/:id/new_trip', function(req, res) {
  const handler = new WebpageHandler(req.params.id);
  return handler.sendFriendsList(res);
});

app.post('/:id/handle_new_trip_companions', function(req, res) {
  const handler = new WebpageHandler(req.params.id);
  return handler.handleTravelersForNewTrip(req, res);
	// TODO: close this page and then send the "help" message to the session in order to make forward progress.
});

app.get('/:id/:tripName', function(req, res) {
  const handler = new WebpageHandler(req.params.id, req.params.tripName);
  return handler.handleWebpage(res, handler.displayTrip);
});

app.get('/:id/:tripName/pack-list', function(req, res) {
  const handler = new WebpageHandler(req.params.id, req.params.tripName);
  return handler.handleWebpage(res, handler.displayPackList, [req.headers]);
});

app.get('/:id/:tripName/todo', function(req, res) {
  const handler = new WebpageHandler(req.params.id, req.params.tripName);
  return handler.handleWebpage(res, handler.displayTodoList, [req.headers]);
});

app.get('/:id/:tripName/raw-comments', function(req, res) {
  const handler = new WebpageHandler(req.params.id, req.params.tripName);
  return handler.handleWebpage(res, handler.displayRawComments, [req.headers]);
});

app.get('/:id/:tripName/comments', function(req, res) {
  const handler = new WebpageHandler(req.params.id, req.params.tripName);
  return handler.handleWebpage(res, handler.displayComments);
});

app.get('/:id/:tripName/comments/weather', function(req, res) {
  const handler = new WebpageHandler(req.params.id, req.params.tripName);
  return handler.handleWebpage(res, handler.displayWeatherDetails);
});

app.get('/:id/:tripName/comments/flight', function(req, res) {
  const handler = new WebpageHandler(req.params.id, req.params.tripName);
  return handler.handleWebpage(res, handler.displayFlightDetails);
});

// handling webhook
app.get('/webhook', function(req, res) {
  logger.info("called /webhook");
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    logger.info("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    logger.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }  
});

app.post('/webhook', jsonParser, function(req, res) {
  postHandler.handle(req, res);
});

// set a timer that will send reminder notifications about todo list every 2 days
function sendTodoReminders() {
  console.log("sendTodoReminders: called");
  postHandler.sendReminderNotification();
}
