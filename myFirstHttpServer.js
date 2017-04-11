'use strict';

const fs = require('fs');
const _ = require('lodash');
const WebhookPostHandler = require('./webhook-post-handler');
const WebpageHandler = require('./webpage-handler');
const TripData = require('./trip-data');
const logger = require('./my-logger');
const crypto = require('crypto');
const TripDataFormatter = require('./trip-data-formatter.js');
const passport = require('passport');
const fbStrategy = require('passport-facebook').Strategy;
const session = require('express-session');
// ----------------------------------------------------------------------------
// Set up a webserver

// For validation with facebook & verifying signature
const VALIDATION_TOKEN = "go-for-lake-powell";
const FB_APP_SECRET = "a26c4ad2358b5b61942227574532d174";
const FB_APP_ID = "1670120969968413";

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


let u;

// authentication
passport.use(new fbStrategy({
    clientID: FB_APP_ID,
    clientSecret: FB_APP_SECRET,
    callbackURL: "https://polaama.com/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // From https://scotch.io/tutorials/easy-node-authentication-facebook
    // This is to store the user profile in local database. For now, simply persist the access token corresponding to the user.
    logger.info(`login details: accessToken: ${accessToken}; profile: ${JSON.stringify(profile)}`);
    const user = {
      name: profile._json.name,
      id: profile._json.id
    };
    u = user;
    done(null, user);
  }
));

// used to serialize the user for the session
passport.serializeUser(function(user, done) {
  console.log(`serializeUser called with ${JSON.stringify(user)}`);
  done(null, user.id);
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
  console.log(`deserializeUser called with ${id}. Returning ${JSON.stringify(u)}`);
  done(null, u);
});

// configure
app.use(session({
  secret: 'polaama',
  resave: false,
  saveUninitialized: true
}));
// use passport session
app.use(passport.initialize());
app.use(passport.session());
// logger. create a write stream (in append mode) 
const accessLogStream = fs.createWriteStream('log/access.log', {flags: 'a'})
app.use(morgan('common', { stream: accessLogStream }));
// body parser
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
app.use(bodyParser.json({ verify: verifyRequestSignature }));

// Routes for authentication
// Redirect the user to Facebook for authentication.  When complete,
// Facebook will redirect the user back to the application at /auth/facebook/callback
app.get('/auth/facebook', passport.authenticate('facebook'));

// Facebook will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
app.get('/auth/facebook/callback',
  // Not using successRedirect here because ensureAuthentication handles that by setting req.session.redirect_to
  passport.authenticate('facebook', { successRedirect: '/index',
                                      failureRedirect: '/login',
                                      failureFlash: true,
                                      session: true}));

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

const server = https.createServer(options, app);  
server.listen(port, function() {
  logger.info("Listening on port " + port);
  const twoDaysInMsec = 1000*60*60*24*2;
  const tenSeconds = 1000*10; 
  // set a timer that will send reminder notifications about todo list every 2 days
  const intervalId = setInterval(sendTodoReminders, twoDaysInMsec);

  // set a timer that will send boarding pass and other details the day before a trip
  const oneDayInMsec = 1000*60*60*24*1;
  const thirtySeconds = 1000*60;
  setInterval(pushTripDetailsJustBeforeTrip, oneDayInMsec);
  
}); 

app.get('/index', function(req, res) {
  // return res.send("<meta name='B-verify' content='ee02308f7491f4aef923b2d1184072ccd1f6367a' /><body>Hello secure world</body>");
  return res.send(fs.readFileSync("html-templates/home.html", 'utf8'));
});

app.get('/', function(req, res) {
  res.redirect('/auth/facebook');
});

app.get('/login', function(req, res) {
  return res.send(fs.readFileSync("html-templates/login.html", 'utf8'));
});

// Simple middleware to ensure user is authenticated.
// Use this middleware on any resource that needs to be protected.
// If the request is authenticated (typically via a persistent login session),
// the request will proceed.  Otherwise, the user will be redirected to the
// login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    // req.user is available for use here
    logger.info(`ensureAuthenticated: request is authenticated`);
    return next(); 
  }
  // denied. redirect to login
  logger.info(`ensureAuthenticated: not authenticated. Redirecting to /auth/facebook`);
  req.session.redirect_to = req.path;
  res.redirect('/');
}

// var json2html = require('node-json2html');
app.get('/trips', ensureAuthenticated, function(req, res) {
  return res.send("This will eventually return a list of trips planned for this user.");
});

app.get('/favicon.ico', function(req, res) {
  res.type('image/x-icon');
  res.status(301);
  return res.end();
});

app.get('/:id/friends', function(req, res) {
  const handler = new WebpageHandler(req.params.id);
  return handler.sendFriendsList(res);
});

app.post('/:id/handle_trip_friends', function(req, res) {
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

app.get('/:id/:tripName/comments/activities', function(req, res) {
  const handler = new WebpageHandler(req.params.id, req.params.tripName);
  return handler.handleWebpage(res, handler.displayActivityDetails);
});

app.get('/:id/:tripName/comments/flight', function(req, res) {
  const handler = new WebpageHandler(req.params.id, req.params.tripName);
  return handler.handleWebpage(res, handler.displayFlightDetails);
});

app.get('/:id/:tripName/cities', function(req, res) {
  const handler = new WebpageHandler(req.params.id, req.params.tripName);
  return handler.handleWebpage(res, handler.displayCities);
});

app.get('/:id/:tripName/expense-report', function(req, res) {
  const handler = new WebpageHandler(req.params.id, req.params.tripName);
  return handler.handleWebpage(res, handler.displayExpenseReport);
});

app.post('/:id/:tripName/handle-city-choice', function(req, res) {
  const handler = new WebpageHandler(req.params.id, req.params.tripName);
  // The global postHandler could have a different session than the one on this page. so, create a new webhook handler using the session belonging to this page to start planning a trip.
  const myPostHandler = new WebhookPostHandler(handler.session);
  return handler.handleAddCityChoice(req, res, myPostHandler);
});

// Handling the addition of cities to existing trips
app.get('/:id/:tripName/add-cities', function(req, res) {
  const handler = new WebpageHandler(req.params.id, req.params.tripName);
  return handler.handleWebpage(res, handler.displayCitiesForExistingTrip);
});

app.get('/dynamic-city', function(req, res) {
  return res.send(fs.readFileSync("/home/ec2-user/html-templates/dynamic-cities.html",'utf8'));
});

app.get('/controlgroup', function(req, res) {
  return res.send(fs.readFileSync("/home/ec2-user/html-templates/controlgroup.html",'utf8'));
});

app.get('/grid', function(req, res) {
  return res.send(fs.readFileSync("/home/ec2-user/html-templates/grid.html",'utf8'));
});

app.get('/mobile-itin', function(req, res) {
  return res.send(fs.readFileSync("/home/ec2-user/html-templates/mobile-itinerary-view-1.html",'utf8'));
});

app.get('/jqmobile-itin', function(req, res) {
  return res.send(fs.readFileSync("/home/ec2-user/html-templates/jqmobile-itin.html",'utf8'));
});

app.get('/:id/:tripName/calendar', function(req, res) {
  const handler = new WebpageHandler(req.params.id, req.params.tripName);
  return handler.handleWebpage(res, handler.displayCalendar);
});

app.get('/handle-controlgroup', function(req, res) {
  return res.send("Successfully called handle-contrologroup");
});

// The filler "-" is needed here to disambiguate this route from "/:id/:tripName". If we don't use the filler here, that route will be chosen. TODO: FIX ME by chaining (see https://expressjs.com/en/guide/routing.html "Route handlers")
app.get('/-/images/boarding-pass', function(req, res) {
  return res.sendFile('/home/ec2-user/boardingPass.png');
});

app.post('/handle-controlgroup', function(req, res) {
  const handler = new WebpageHandler(null, null);
  return handler.handleControlGroup(req, res);
});

app.post('/:id/:tripName/handle-add-city-choice', function(req, res) {
  const handler = new WebpageHandler(req.params.id, req.params.tripName);
  // The global postHandler could have a different session than the one on this page. so, create a new webhook handler using the session belonging to this page to start planning a trip.
  const myPostHandler = new WebhookPostHandler(handler.session);
  return handler.handleAddCityChoice(req, res, myPostHandler, true /* existingTrip */);
});

app.post('/:id/:tripName/save-itin-update', function(req, res) {
  const handler = new WebpageHandler(req.params.id, req.params.tripName);
  return handler.saveItinUpdate(req, res);
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

function sendTodoReminders() {
  postHandler.sendReminderNotification();
}

function pushTripDetailsJustBeforeTrip() {
  postHandler.pushTripDetailsJustBeforeTrip();
}

