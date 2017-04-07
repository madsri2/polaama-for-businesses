'use strict';

const i = "5";
let numDays = Math.ceil(parseInt(i) / 2);
const remainingDays = i - numDays;
numDays--;
console.log(`${numDays} ${remainingDays}`);
for(let i = 0; i < numDays; i++) {
  console.log(`hello`);
}
console.log('*');
for(let i = 0; i < remainingDays; i++) {
  console.log(`hello`);
}
