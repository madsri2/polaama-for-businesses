'use strict';
const WeatherInfoProvider = require('./weather-info-provider');

function testGettingWeatherInfo() {
  const wip = new WeatherInfoProvider("israel","02/11/17");
  wip.getWeather("jerusalem",function(weatherDetails) {
    console.log(`Weather details: ${JSON.stringify(weatherDetails)}`);
  });
}

testGettingWeatherInfo();
