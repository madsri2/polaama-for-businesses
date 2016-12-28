'use strict';

function Encoder() {
}

Encoder.encode = function(name) {
  return name.toLowerCase().replace(" ","_");
}

module.exports = Encoder;
