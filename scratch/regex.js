
function f1() {
  const regex = new RegExp("^expense(-report)?:?[ ]*","i"); // ignore case
  const messageText = "expense: Hello world";
// console.log(messageText.replace(regex,""));
/*
const item = "A Paid $50";
if(item.toLowerCase().match(/.*paid \$?\d+/)) {
  console.log("Matched");
}
*/
}

function http() {
  const str = "https://www.google.com";
  if(/^https?:\/\//.test(str)) console.log("ahref");
}

function activityRegex() {
  const contents = /(first|next)\s*(?:activity)?\s*(?:for)?\s*(.*)/.exec("net");
  if(!contents) return console.log("null");
  if(contents[1] !== "first" && contents[1] !== "next") return console.log("null");
  if(contents[2] == '') console.log(`${contents[0]} today`);
}

activityRegex();
