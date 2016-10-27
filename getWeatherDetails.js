var request = require('request');
const months = ["11011130","12011230","01010130","02010228","03010330","04010430","05010530","06010630","07010730","08010830","09010930","10011030"];
const states = {
  "Lake Powell": "UT",
  "Honolulu": "HI",
};
const numCities = Object.keys(states).length;
var weatherDetails = {};
var retry = 0;

function persistWeatherConditions() {
  console.log("Obtained weather condition for all cities and months. persisting ",JSON.stringify(weatherDetails));
  var fs = require('fs');
  fs.writeFile("weatherInformation", JSON.stringify(weatherDetails), 
    function(err) {
      if(err) {
        console.log("Could not write to file: " + err);
      }
      console.log("The file was saved");
    }
  );
}

function extractWeatherCondition(body,city,timeRange) {
  var response = JSON.parse(body);
  if((typeof response.trip !== undefined && response.trip) && 
     (typeof response.trip.cloud_cover != undefined && response.trip.cloud_cover) && 
     (typeof response.trip.cloud_cover.cond != undefined && response.trip.cloud_cover.cond)) {
     const condition = response.trip.cloud_cover.cond;
     weatherDetails[city][timeRange] = condition;
     console.log("the forecast for " + city + " for time range " + timeRange + " is ",condition);
     if((timeRange === months[months.length -1]) && (Object.keys(weatherDetails).length == numCities)) { 
        persistWeatherConditions();
     }
   }
   else {
      // retry 3 times.
      if(retry++ < 3) {
          console.log("weather condition undefined. retrying..");
          getWeatherInformation(timeRange,city);
        }
      else {
          console.error("retry failed. cannot obtain weather condition for " + city + " and time range " + timeRange);
        }
   }
}

function getWeatherInformation(timeRange,city) {
  if(!Object.keys(states).includes(city)) {
    console.warn("We don't yet support a trip to city: " + city);
    return;
  }
  // wundeground APIs do not accept spaces in city names. They need to be converted into _
  // uri structure: 'http://api.wunderground.com/api/16f4fdcdf70aa630/planner_11051110/q/UT/Lake_Powell.json',
  console.log("getting details for city " + city + " and timeRange " + timeRange);
  const uri = 'http://api.wunderground.com/api/16f4fdcdf70aa630/planner_' + timeRange + '/q/' + states[city] + '/' + city.replace(/ /g,"_") + '.json';
  request({
    uri: uri,
    method: 'GET',
  }, function(error, res, body) {
    if (!error && res.statusCode == 200) {
      extractWeatherCondition(body,city,timeRange);
    } else {
      console.error("Unable to send message: Response: ",res,"; Error: ",error);
    }
  });
}

var sleep = require('sleep');
// get information for the next 12 months for supported cities
Object.keys(states).forEach(function(city) {
  weatherDetails[city] = {};
  months.forEach(function(month) {
    // getWeatherInformation(month,city);
    // wait 20 seconds between every call. We only have a limit of 10 calls per minute.
    var date = new Date();
    console.log("Calling weather information function for ",city, month, date.toTimeString());
    getWeatherInformation(month,city);
    sleep.sleep(20);
  });
});

