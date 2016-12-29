'use strict';
const ActivityInfoProvider = require('./activity-info-provider');
const moment = require('moment');


function testSrFileName() {
  const month = "february";
  const activities = {
    "lonely-planet": {
      "search-term": `my-city+${month}+lonely+planet+things+to+do`,
      "filter": ["things-to-do", "attractions", "activities", `${month}`],
      "exact-term": `my-country my-city ${month}`
    },
    "trip-advisor": {
      "search-term": `my-city+${month}+attractions+trip+advisor`,
      "filter": ["attractions", `${month}`, `attraction_review`],
      "exact-term": `my-country my-city ${month}`
    }
  };
  return `my-city-${activities["trip-advisor"]["search-term"]}.txt`;
}

function testExtractingDetails() {
  const aip = new ActivityInfoProvider("portugal","lisbon","2/12/17");
  // const aip = new ActivityInfoProvider("my-country","my-city","2/12/17");
  aip.getActivities(linkArray => {
    console.log(linkArray);
  });
}

testExtractingDetails();
// console.log(testSrFileName());
