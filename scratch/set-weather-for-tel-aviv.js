'use strict';

const fs = require('fs');

const itinDetails = JSON.parse(fs.readFileSync("/home/ec2-user/trips/aeXf/tel_aviv-itinerary.txt", "utf8"));
/*
const weather = {};
weather.min_temp = "70";
weather.max_temp = "81";
weather.chanceofrain = "0";
weather.cloud_cover = "partly cloudy";
weather.city = "Tel Aviv";
itinDetails["6/11/2017"].weather = [];
itinDetails["6/11/2017"].weather.push(weather);
weather.min_temp = "70";
weather.max_temp = "81";
weather.chanceofrain = "0";
weather.cloud_cover = "partly cloudy";
weather.city = "Tel Aviv";
itinDetails["6/12/2017"].weather = [];
itinDetails["6/12/2017"].weather.push(weather);
*/

const details = JSON.parse(fs.readFileSync("/home/ec2-user/weather/tel_aviv-forecast.json", "utf8")).forecast.txt_forecast.forecastday;
const dayDetails = [];
let date = 10;
details.forEach(value => {
  if(value.title.includes("Night")) return;
  dayDetails.push(value.fcttext);
  // console.log(JSON.stringify(itinDetails[`6/${date}/2017`]));
  const key = `6/${date}/2017`;
  if(!itinDetails[key]) return;
  itinDetails[key].weatherText = value.fcttext;
  date++;
});

console.log(JSON.stringify(itinDetails));

