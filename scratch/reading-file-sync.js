'use strict';

const fs = require('fs');
const f = "/home/ec2-user/fbid-handler/fbid-test.txt";
// Read the file synchronously. It's fairly small, so it should not incur any penalty.
const json = fs.readFileSync(f, 'utf8');
logger.debug("******** FbidHandler: Printing ******");
