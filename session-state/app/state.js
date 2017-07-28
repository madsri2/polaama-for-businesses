'use strict';

// States used by a session in webhook-post-handler. States are immutable. Separating this from Session object because the Session object gets reloaded on change and we don't want that to affect the session state. A session state exists for the lifetime of a WebhookPostHandler object.
function SessionState() {
}

SessionState.prototype.set = function(state) {
  this[state] = true;
}

SessionState.prototype.get = function(state) {
  return this[state];
}

SessionState.prototype.clear = function(state) {
  this[state] = false;
}

SessionState.prototype.clearAll = function() {
  Object.keys(this).forEach(key => {
    if(key.startsWith("awaiting")) {
      this[key] = false;
    }
  });
  this.planningNewTrip = false;
}

SessionState.prototype.dump = function() {
  let dump = "";
  Object.keys(this).forEach(key => {
    if(key.startsWith("awaiting")) dump = dump.concat(`${key}: ${this[key]}; `);
  });
  return dump.concat(`planningNewTrip: ${this.planningNewTrip}`);
}

module.exports = SessionState;
