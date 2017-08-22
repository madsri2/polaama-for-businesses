'use strict';

function hashCode(str) {
  let hash = 0, chr;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    let chr = str.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    // console.log(`${chr}: ${hash}`);
    // hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

const name = "Salt Lake City";
// console.log(name.trim().toLowerCase().replace(/ /g,"_"));
const profilePic = "https:\/\/scontent.xx.fbcdn.net\/v\/t31.0-1\/p960x960\/416136_10151101037035141_1635951042_o.jpg?oh=04b8577076c642ac843d41d066b381c2&oe=592206DD";
console.log(hashCode(profilePic));
