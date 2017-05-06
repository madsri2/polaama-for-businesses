'use strict';

const fs = require('fs');

const file = "/home/ec2-user/flights/SFOtoSEAon2017-05-11-cached.txt";
const ctime = (new Date(fs.statSync(file).ctime)).getTime();
const diffInMinutes = (Date.now()-ctime)/(1000*60);
console.log(`file was created ${diffInMinutes} minutes ago`);
