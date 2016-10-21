var request = require('request');
const states = {
  "Lake Powell": "UT",
  "Honolulu": "HI",
};

function getWeatherInformation(timeRange,city) {
  if(!Object.keys(states).includes(city)) {
    console.warn("We don't yet support a trip to city: " + city);
    return;
  }
  // wundeground APIs do not accept spaces in city names. They need to be converted into _
  const uri = 'http://api.wunderground.com/api/16f4fdcdf70aa630/planner_' + timeRange + '/q/' + states[city] + '/' + city.replace(/ /g,"_") + '.json';
  request({
    // uri: 'http://api.wunderground.com/api/16f4fdcdf70aa630/planner_11051110/q/UT/Lake_Powell.json',
    uri: uri,
    method: 'GET',
  }, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var response = JSON.parse(body);
      console.log("the forecast for " + city + " is ",response.trip.cloud_cover.cond);
    } else {
      console.log("Unable to send message.");
      console.log(response);
      console.log(error);
    }
  });
}

getWeatherInformation("11051110","Honolulu");
