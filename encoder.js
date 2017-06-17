'use strict';

function Encoder() {
}

Encoder.encode = function(name) {
  if(!name) throw new Error(`encode: name is undefined or null`);
  // remove spaces from the begining and end, convert to lower case and replace any space in the middle with "_" [as expected by wunderground]. The / /g regex will replace all occurrences
  return name.trim().toLowerCase().replace(/ /g,"_");
}

module.exports = Encoder;
