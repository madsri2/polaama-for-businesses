'use strict';
const fs = require('fs');

function sendMultipleMessages(recipientId, messages) {
  if(messages.length === 0) return;
  fs.readFile("/tmp/blah", function(err, data) {
    console.log(`Message to be sent: ${messages[0]}`);
    // remove the first element in messages. Then call API again.
    messages = messages.slice(1, messages.length);
    sendMultipleMessages(recipientId, messages);
  });
}

// for each element in array

sendMultipleMessages(1234, ["1", "2"], 0);
