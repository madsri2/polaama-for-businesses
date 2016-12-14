'use strict';
const FbidHandler = require('./fbid-handler.js');

const handler = new FbidHandler();
const friends = handler.getFriends("1120615267993271");
console.log(`1120615267993271's friends: ${friends}`);
let cbox = "";
friends.forEach(id => {
  const name = handler.getName(id);
  console.log(`Name: ${name} for id <${id}>`);
  cbox += `<input type="checkbox" name="${name}" value="${name}">${name}<br>`;
});
// console.log(cbox);

console.log(handler.encode("1120615267993271"));
