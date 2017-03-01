'use strict';
const WeatherInfoProvider = require('./weather-info-provider');

function testGettingWeatherInfo() {
  const wip = new WeatherInfoProvider("india", "goa", "07/01/17");
  wip.getWeather(function(city, weatherDetails) {
    console.log(`Weather details for city ${city}: ${JSON.stringify(weatherDetails)}`);
  });
}

testGettingWeatherInfo();
