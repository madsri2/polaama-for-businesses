'use strict';
const WeatherInfoProvider = require('./weather-info-provider');

function testGettingWeatherInfo() {
  const wip = new WeatherInfoProvider(null, "san francisco", "09/10/17");
  wip.getWeather(function(city, weatherDetails) {
    console.log(`Weather details for city ${city}: ${JSON.stringify(weatherDetails)}`);
  });
}

testGettingWeatherInfo();
