const request = require('request');
const fs = require('fs');

// https://support.business.skyscanner.net/hc/en-us/articles/211308489-Flights-Live-Pricing?_ga=1.158124153.234443051.1483127005
function skyScanner() {
  const uri = `http://partners.api.skyscanner.net/apiservices/pricing/v1.0`;
  request.post({
    uri: uri,
    headers: {
      Accept: "application/json"
    },
    form: {
      apiKey: "prtl6749387986743898559646983194",
      // apiKey: "ma592384304502739139844422016106",
      country: "US",
      currency: "USD",
      locale: "en-US",
      originplace: "SEA-sky",
      destinationplace: "BOM-sky",
      outbounddate: "2017-05-03",
      inbounddate: "2017-05-16",
      adults: "2"
    }
  }, function(err, res, body) {
    console.log(`err is ${err}`);
    console.log(`res is ${JSON.stringify(res)}`);
    console.log(`body is ${body}`);
    return;
  });
}

// http://partners.api.skyscanner.net/apiservices/browseroutes/v1.0/{market}/{currency}/{locale}/{originPlace}/{destinationPlace}/{outboundPartialDate}/{inboundPartialDate}?apiKey={apiKey}

// http://business.skyscanner.net/portal/en-GB/Documentation/FlightsBrowseCacheRoutes
function browseRouteService() {
  const uri = `http://partners.api.skyscanner.net/apiservices/browseroutes/v1.0/US/USD/en-US/SEA-sky/LIS-sky/2017-03-03/2017-03-17?apiKey=prtl6749387986743898559646983194`;
  request({
    uri: uri,
    method: 'GET'
  }, function(err, res, body) {
    console.log(`err is ${err}`);
    console.log(`res is ${res.statusCode}, content length: ${res.headers["content-length"]} bytes`);
    // console.log(`body is ${body}`);
    fs.writeFileSync("/tmp/browse-route.json", body);
  });
}

function qpx() {
}

browseRouteService();
// skyScanner();
// const json = JSON.parse(fs.readFileSync('/tmp/sky-scanner','utf8'));
// console.log(JSON.stringify(json, null, 2));
