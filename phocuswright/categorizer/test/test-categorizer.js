'use strict';

const Categorizer = require('categorizer');
const cat = new Categorizer();
const Promise = require('promise');
const expect = require('chai').expect;

describe("categorizer tests", function() {
  this.timeout(60000);
  it("basic", function(done) {
    const promises = [];
    // const category = "tour operators";
    // const category = "airlines";
    Categorizer.supported().forEach(category => {
    // ["lodging", "airlines", "tour operators", "online travel agency", "metasearch", "planning", "group travel", "business travel", "tmc", "airport", "iot", "mobile"].forEach(category => {
      const promise = cat.get(category);
      promises.push(promise.then(
        function(response) {
            console.log(`********** ${category} ******** `);
            // console.log(`response is ${JSON.stringify(response)}`);
            let numCategory = 0;
            let notCategory = 0;
            const search = Categorizer.search(category);
            response.forEach(company => {
              search.forEach(s => {
                if(company.description.includes(s)) numCategory++; else notCategory++;
              });
            });
            // console.log(`There were ${cat.numLinesConsidered} lines considered out of a total of ${cat.totalLines}`);
            console.log(`There were ${numCategory} descriptions with the search terms ${search} and ${notCategory} without across all companies`);
            console.log(`There are ${response.length} items in category ${category}`);
            // console.log(`response is ${JSON.stringify(response)}`);
            return true;
        },
        function(err) {
          console.log(`error: ${err.stack}`);
          done(err);
        })
      );
    });
    Promise.all(promises).done(
      function(res){
        res.forEach(r => {
          expect(r).to.be.true;
        });
        done();
      },
      function(err) {
        console.log(`error: ${err.stack}`);
        done(err);
      }
    );
  });

  it("iot", function(done) {
    const promise = cat.get("iot");
    promise.done(
      function(response) {
        console.log(`response is ${JSON.stringify(response)}`);
        done();
      },
      function(err) {
        console.log(`error: ${err.stack}`);
        done(err);
      }
    );
  });
});
