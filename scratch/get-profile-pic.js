'use strict';

const fs = require('fs');

const testJson = JSON.parse(fs.readFileSync("/home/ec2-user/fbid-handler/fbid-test.txt"));
const json = JSON.parse(fs.readFileSync("/home/ec2-user/fbid-handler/fbid.txt"));

const testIds = testJson["322170138147525"];
const ids = json["322170138147525"];

const newFile = {
  "322170138147525": {}
};

Object.keys(ids).forEach(fbid => {
  console.log(`handling fbid ${fbid}`);
  const testId = testIds[fbid];
  if(!testId) {
    console.log(`did not find ${fbid} in fbid-test.txt file`);
    newFile["322170138147525"][fbid] = ids[fbid];
    return;
  }
  if(testId.profile_pic) ids[fbid].profile_pic = testId.profile_pic;
  newFile["322170138147525"][fbid] = ids[fbid];
});

fs.writeFileSync("/home/ec2-user/fbid-handler/fbid-new.txt", JSON.stringify(newFile), 'utf8');
