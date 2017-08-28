
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
  const contents = /(first|next)\s*(?:activity)?\s*(?:for|on)?\s*(.*)/.exec("first on");
  if(!contents) return console.log("null");
  if(contents[1] !== "first" && contents[1] !== "next") return console.log("null");
  if(contents[2] == '') console.log(`${contents} `);
}

function dateCommand() {
  const command = "23 after";
  let contents = /^(\d+)(.*)$/.exec(command);
  console.log(contents);
  if(contents && (contents[2] === " " || contents[2] === '' || contents[2] === "th" || contents[2] === "rd" || contents[2] === "st")) console.log("valid"); else console.log("invalid");
}

function recoRegex() {
  // const payload = "monterosso activities";
  const payload = "rome walking tours";
  let contents = /^(.*)-(\d+)-recommendation_next_set/.exec(payload);  
  console.log(contents);
}

function colorRegex() {
    const contents = /^color: (.*)/.exec("color: red");
    if(contents) console.log(contents[1]);
}

function hotelPayloadRegex() {
  let hotel;
  const payload = "hotel details ";
  if(payload) {
    const contents = /hotel details (.*)/.exec(payload);
    if(contents) hotel = contents[1];
  }
  console.log(`hotelPayloadRegex: hotel is <${hotel}>`);
}

function eventRegex() {
  let payload = "pb arival";
  console.log(payload.split(" "));
}

function eventKey() {
  let payload = "oct 11";
  const contents = /^[A-Za-z][A-Za-z][A-Za-z] \d\d$/.exec(payload);
  console.log(contents);
}

function eventDetails() {
  let contents = /^(.*):(.*)/.exec("arival:demo");  
  console.log(contents);
}

eventDetails();
// eventKey();
// eventRegex();
// hotelPayloadRegex();
// colorRegex();
// recoRegex();
// dateCommand();
// activityRegex();
