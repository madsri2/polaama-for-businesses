function testObjectKey() {
  var a = {};
  a.b = 1;
  const d = 'c';
  a[d] = "Hello";
  console.log(a);
}

// at this point, we are only keeping 2 messages in history
const HISTORY_LENGTH = 4;

function updateHistoryAndCallResolve(message, context) {
  const sessionId = context.sessionId;
  var history = sessions[sessionId].botMesgHistory;
  // add this message to the sessions's previous messages.
  if(history.length == HISTORY_LENGTH) {
    history.forEach(function(element,i,array) {
      history[i] = history[i+1];
    });
    history[HISTORY_LENGTH - 1] = message;
  }
  else {
    history.push(message);
  }
}

var context = {};
var sessions = [];
sessions[1] = {};
sessions[1].botMesgHistory = [];
context.sessionId = 1;
updateHistoryAndCallResolve("A", context);
updateHistoryAndCallResolve("B", context);
updateHistoryAndCallResolve("C", context);
updateHistoryAndCallResolve("D", context);
updateHistoryAndCallResolve("E", context);
updateHistoryAndCallResolve("F", context);
updateHistoryAndCallResolve("G", context);
updateHistoryAndCallResolve("H", context);
console.log(sessions[1].botMesgHistory);

