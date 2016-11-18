'use strict';

const fs = require('fs');
const _ = require('lodash');
const WebhookPostHandler = require('./webhook-post-handler');
const postHandler = new WebhookPostHandler();
const TripData = require('./trip-data');
const tripData = new TripData();
const Log = require('./logger');
const logger = (new Log()).init();
// ----------------------------------------------------------------------------
// Set up a webserver

// For validation with facebook & verifying signature
const VALIDATION_TOKEN = "go-for-lake-powell";
const FB_APP_SECRET = "a26c4ad2358b5b61942227574532d174";

// A secure webserver
const util = require('util');
const express = require('express');  
const app = express();
const https = require('https');
const sslPath = '/etc/letsencrypt/live/polaama.com/';
const port = 443
const options = {  
    key: fs.readFileSync(sslPath + 'privkey.pem'),
    cert: fs.readFileSync(sslPath + 'fullchain.pem')
};

const crypto = require('crypto');
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
}); 

// log every response
app.use(({method, url}, rsp, next) => {
  rsp.on('finish', () => {
    logger.info(`${rsp.statusCode} ${method} ${url}`);
  });
  next();
});
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


function formatListResponse(headers, list) {
  if(_.isUndefined(headers) || _.isUndefined(headers['user-agent'])) {
    logger.info("header or user-agent not defined. sending back json");
    return list;
  }
  if(headers['user-agent'].startsWith("Mozilla")) {
    logger.info("request call from browser. sending back html");
    var html = "<ol>";
    list.forEach(function(item) {
      html += "<li>" + item + "</li>";
    });
    html += "</ol>";
    return html;
  }
  logger.info("request call from something other than browser. sending back json");
  return list;
}

app.get('/:tripName/pack-list', function(req, res) {
  const packList = tripData.getInfoFromTrip(req, "packList");
  // logger.info("req value is " + util.inspect(req, {showHidden: true, color: true, depth: 5}));
  if(_.isUndefined(packList)) {
    return res.send("Could not find pack list for trip " + req.params.tripName);
  }
  return res.send(formatListResponse(req.headers, packList));
});

app.get('/:tripName/todo', function(req, res) {
  const todoList = tripData.getInfoFromTrip(req, "todoList");
  if(_.isUndefined(todoList)) {
    return res.send("Could not find todo list for trip " + req.params.tripName);
  }
  return res.send(formatListResponse(req.headers, todoList));
});

app.get('/:tripName/comments', function(req, res) {
  const comments = tripData.getInfoFromTrip(req, "comments");
  if(_.isUndefined(comments)) {
    return res.send("Could not find todo list for trip " + req.params.tripName);
  }
  return res.send(formatListResponse(req.headers, comments));
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
  logger.info("In post webhook");
  postHandler.handle(req, res);
});

