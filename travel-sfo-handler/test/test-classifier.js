'use strict';

const NBClassifier = require('travel-sfo-handler/app/nb-classifier');

describe("travel-sfo-handler tests", function() {
  it('greeting', function() {
    const classifier = new NBClassifier();
    // console.log(`category: ${classifier.classify("How do I cancel my hotel reservation?")}`);
    console.log(`category: ${classifier.classify("talk to human")}`);
  });
});
