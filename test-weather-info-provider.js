'use strict';
const WeatherInfoProvider = require('./weather-info-provider');

function testGettingWeatherInfo() {
  const wip = new WeatherInfoProvider("israel", "jerusalem", "04/11/17");
  wip.getWeather(function(city, weatherDetails) {
    console.log(`Weather details for city ${city}: ${JSON.stringify(weatherDetails)}`);
  });
}

testGettingWeatherInfo();
