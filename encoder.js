'use strict';

function Encoder() {
}

Encoder.encode = function(name) {
  if(!name) throw new Error(`encode: name is undefined or null`);
  // remove spaces from the begining and end, convert to lower case and replace any space in the middle with "_" [as expected by wunderground]. The / /g regex will replace all occurrences
  return name.trim().toLowerCase().replace(/ /g,"_");
}

Encoder.decode = function(name) {
  if(!name) throw new Error(`decode: name is undefined or null`);
  return capitalize1stChar(name).replace(/_/g," "); 
}

function capitalize1stChar(str) {
  return str.replace(/^[a-z]/g, function(letter, index, string) {
    return index == 0 ? letter.toUpperCase() : letter;
  });
}

module.exports = Encoder;
