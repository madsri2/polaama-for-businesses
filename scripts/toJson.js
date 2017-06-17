'use strict';

if(process.argv.length < 3) {
  console.log(`usage: node toJson.js <filename>`);
  return;
}

const file = process.argv[2];
console.log(`file ${file}`);
console.log(JSON.stringify(JSON.parse(require('fs').readFileSync(file,'utf8')), null, 2));
