'use strict';

function capitalize1stChar(str) {
  return str.replace(/^[a-z]/g, function(letter, index, string) {
    return index == 0 ? letter.toUpperCase() : letter;
  });
}

const s = "abc de";
console.log(capitalize1stChar(s));
