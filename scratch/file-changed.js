'use strict';

const watch = require('watch');
const Sessions = require('/home/ec2-user/sessions');
const sessions = Sessions.get();

console.log(`session: ${JSON.stringify(sessions.find("2"))}`);
watch.createMonitor("/home/ec2-user/sessions", { ignoreDotFiles: true }, function(monitor) {
  monitor.on('changed', function(f, curr, prev) {
    console.log(`file ${f} changed`);
    const s = JSON.parse(require('fs').readFileSync(f, 'utf8'));
    sessions.reloadSession(s.sessionId);
    console.log(`session: ${JSON.stringify(sessions.find("2"))}`);
  });
});
