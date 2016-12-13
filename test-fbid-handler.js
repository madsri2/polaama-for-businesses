'use strict';
const FbidHandler = require('./fbid-handler.js');

const handler = new FbidHandler("1120615267993271");
const friends = handler.getFriends();
console.log(friends);
let cbox = "";
friends.forEach(id => {
  const name = handler.getName(id);
  cbox += `<input type="checkbox" name="${name}" value="${name}">First checkbox<br>`;
});
console.log(cbox);
