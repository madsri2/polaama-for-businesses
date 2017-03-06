'use strict'
const levenshtein = require('fast-levenshtein');

let name1 = "Aparna";
let name2 = "aparna";
console.log(`${name1} & ${name2} distance: ${levenshtein.get(name1, name2)}`);
name1 = "aparna"; name2 = "aprn";
console.log(`${name1} & ${name2} distance: ${levenshtein.get(name1, name2)}`);
name1 = "aparna"; name2 = "arpan";
console.log(`${name1} & ${name2} distance: ${levenshtein.get(name1, name2)}`);
