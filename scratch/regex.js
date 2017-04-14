const regex = new RegExp("^expense(-report)?:?[ ]*","i"); // ignore case
const messageText = "expense: Hello world";
// console.log(messageText.replace(regex,""));
/*
const item = "A Paid $50";
if(item.toLowerCase().match(/.*paid \$?\d+/)) {
  console.log("Matched");
}
*/

const str = "https://www.google.com";
if(/^https?:\/\//.test(str)) console.log("ahref");
