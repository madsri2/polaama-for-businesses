'use strict';

function Encoder() {
}

Encoder.encode = function(name) {
  // remove spaces from the begining and end, convert to lower case and replace any space in the middle with "_" [as expected by wunderground]
  return name.trim().toLowerCase().replace(" ","_");
}

module.exports = Encoder;
