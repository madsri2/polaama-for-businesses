const _ = require('lodash');

function tripFile(tripName) {
  // TODO: check parameters
  return _.template("trips/${name}.txt")({
    name: tripName
  });
}

console.log(tripFile("Hello"));
