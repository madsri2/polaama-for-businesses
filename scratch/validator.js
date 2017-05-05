'use strict';
const validator = require('node-validator');

const message = "city(3),city1(4),city(2)";
const arr = message.split(',');

const check = validator.isArray(validator.isString({regex: /^[A-Za-z]+\(\d+\)/, message: "It should be of the form 'city(2)'"}), {min: 1});
let error = null;
validator.run(check, arr, function(ec, e) {
  if(ec > 0) error = new Error(`Invalid value "${e[0].value}": ${e[0].message}`);
});
if(error) console.log(error.message);
