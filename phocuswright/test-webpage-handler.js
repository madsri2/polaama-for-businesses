'use strict';

const WebpageHandler = require('/home/ec2-user/phocuswright/webpage-handler');
const handler = new WebpageHandler();

function categoryList() {
  console.log(handler.categoryList());
}

function categoriesHtml() {
  const promise = handler.categoryHtml("online travel agency");
  promise.done(
    function(html) {
      console.log(html);
    },
    function(err) {
      console.log(`err: ${err.stack}`);
    }
  );
}

function getAirlines() {
  const promise = handler.getAirlinesList();
  promise.done(
    function(html) {
      console.log(html);
    },
    function(err) {
      console.log(`err: ${err.stack}`);
    }
  );
}

// getAirlines();
categoriesHtml();
