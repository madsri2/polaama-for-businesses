'use strict';
const fs = require('fs');

const dontRespond = {};
dontRespond["1234-546"] = true;
fs.writeFileSync("/tmp/dont-record.txt", JSON.stringify(dontRespond));
const val = JSON.parse(fs.readFileSync("/tmp/dont-record.txt"));

if(dontRespond["1234-546"]) console.log("true");
