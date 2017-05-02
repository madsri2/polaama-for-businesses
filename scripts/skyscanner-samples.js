'use strict';

const request = require('request');
const Promise = require('promise');

const baseDir = "/home/ec2-user";
const SecretManager = require(`${baseDir}/secret-manager/app/manager`);

function makeRequest(uri) 
{
  return new Promise((fulfil, reject) => {
    request({
      uri: uri,
      headers: { Accept: "application/json" },
      qs: { apiKey: new SecretManager().getSkyscannerApiKey() }
    }, function(err, res, body) {
      if(err) { 
        console.log(`Error talking to skyscanner: ${err}`);
        return reject(err);
      }
      if(res.statusCode == "200") {
        return fulfil(body);
      }
      console.log(`getQuotesFromSkyscanner: skyscanner api returned a non-20X status code: res is ${JSON.stringify(res)}`);
      reject(new Error(`skyscanner api returned status code ${res.statusCode}. Link is ${res.href}`));
    });
  });
}

// browsequote
// const uri = "http://partners.api.skyscanner.net/apiservices/browsequotes/v1.0/US/USD/en-US/SFO/AUS/2017-05-14/2017-05-19";
// browseroute
const uri = "http://partners.api.skyscanner.net/apiservices/browseroutes/v1.0/US/USD/en-US/SFO/AUS/2017-05-14/2017-05-19";
// browsedate
// const uri = "http://partners.api.skyscanner.net/apiservices/browsedates/v1.0/US/USD/en-US/SFO/AUS/2017-05-14/2017-05-19";
// browse redirect
// const uri = "http://partners.api.skyscanner.net/apiservices/referral/v1.0/US/USD/en-US/SFO/AUS/2017-05-14/2017-05-19";

makeRequest(uri).done(
  function(body) {
    console.log(body);
  },
  function(err) {
    console.log(`error is ${err}`);
  }
);
