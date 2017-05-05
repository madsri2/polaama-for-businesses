'use strict';

const input = ["orlando(3)","key west(4)","fort lauderdale(5)"];
const reg = /^[A-Z a-z]+\((\d+)\)/;
let cities = [];
let numberOfDays = [];
input.forEach(item => {
  cities.push(item.split('(')[0]);
  console.log(`item: ${item}`);
  numberOfDays.push(item.match(reg)[1]);
});

console.log(`cities: ${cities}`);
console.log(`numberOfDays: ${numberOfDays}`);
