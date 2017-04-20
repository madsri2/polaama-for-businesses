'use strict';
const fs = require('fs');

function renameFilesWithSimilarPrefix() {
  fs.readdirSync("/home/ec2-user/trips").forEach(file => {
    if(!file.includes("new_york")) return;
    console.log(`${file}`);
    const newfile = `/home/ec2-user/trips/oldFiles/${file}`;
    require('fs').renameSync(`/home/ec2-user/trips/${file}`, newfile);
  });
}

function copyFile() {
  fs.createReadStream("/home/ec2-user/emails/message-madsri2@gmail.com-attachment.png").pipe(fs.createWriteStream("/tmp/image.png"));
}

copyFile();

// renameFilesWithSimilarPrefix();
