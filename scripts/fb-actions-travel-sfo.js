'use strict';

const request = require('request');
const SecretManager = require('/home/ec2-user/secret-manager/app/manager');
// https://www.npmjs.com/package/command-line-args
const cmdLineArgs = require('command-line-args');

const optionsDefn = [
  {name: 'persistent', alias: 'p', type: Boolean}, 
];
const args = cmdLineArgs(optionsDefn);
const manager = new SecretManager();
// let token;
// if(args.persistent) 
let token = manager.getTravelSfoPageAccessToken();

const url = `https://graph.facebook.com/v2.6/me/messages?access_token=${token}`;
const options = {  
    url: url,
    method: 'POST',
    headers: {
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8',
        'Content-Type': 'application/json'
    },
};

request.post({
    url,
    headers: {
      'Accept': 'application/json',
      'Accept-Charset': 'utf-8',
      'Content-Type': 'application/json'
    },
    json: {
      "persistent_menu": [{
        "locale": "default",
        "call_to_actions":[
          {
            "type":"postback",
            "title":"Talk to a human",
            "payload":"pmenu_travel_sfo_human"
          }
        ]
      }]
    }
  },
  function(err, res, body) {
    // console.log(res);
    // let json = JSON.parse(body);
    console.log(body);
});
