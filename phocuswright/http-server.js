'use strict';

const Categorizer = require('categorizer');
const WebpageHandler = require('/home/ec2-user/phocuswright/webpage-handler');

// A secure webserver
const express = require('express');  
const morgan = require('morgan');
const port = 8081;

/*
const https = require('https');
const sslPath = '/etc/letsencrypt/live/polaama.com/';
const options = {  
  key: fs.readFileSync(sslPath + 'privkey.pem'),
  cert: fs.readFileSync(sslPath + 'fullchain.pem')
};
*/

const http = require('http');
const app = express();
http.createServer(app).listen(port, function() {
  console.log(`Listening on port ${port} to handle phocuswright requests`);  
});

const webpageHandler = new WebpageHandler();

app.get('/', function(req, res) {
  return res.send(webpageHandler.categoryList());
});

/*
app.get('/categories/airlines', function(req, res) {
  const promise = webpageHandler.getAirlinesList("airlines");
  promise.done(
    function(html) {
      res.send(html);
    },
    function(err) {
      console.log(`Error: ${err.stack}`);
      res.send("Sorry! Something went wrong and we are looking into it.");
    }
  );
});
*/

app.get('/categories/:category', function(req, res) {
  const category = req.params.category.toLowerCase().replace(/_/g," ");
  const supportedCategories = Categorizer.supported();
  if(!supportedCategories.includes(category)) return res.send(`Category "${category}" is currently not supported. Supported list: "${supportedCategories}"`);
  const promise = webpageHandler.categoryHtml(category);
  promise.done(
    function(html) {
      res.send(html);
    },
    function(err) {
      console.log(`Error: ${err.stack}`);
      res.send("Sorry! Something went wrong and we are looking into it.");
    }
  );
});


