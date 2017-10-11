'use strict';

// We need this to build our post string
const querystring = require('querystring');
const https = require('https');
const request = require('request');
const fs = require('fs');

function getAlbum(sessionId) {
  let response = "";
  console.log(`using session id ${sessionId}`);
  const uri = `https://api.smugmug.com/hack/rest/2.0/?method=smugmug.login.withHash&APIKey=CsQpt2vZZ6VpddS9jrR83ZNvK3GrLLML&SessionID=${sessionId}`
  return https.get(uri, (res) => {
    console.log(`status is ${res.statusCode}`);
    res.on('data', (d) => {
      response += d;
    });
    res.on('end', function() {
      console.log(response);
    });
  });
}

function getSession() {
  const hashId = "0f7ce13a7957dfcac256f657a93a3a834b4fb1a272dec20550dee9aef2dcb283";
  const userId = "240209";
  let response = "";
  // curl 'https://api.smugmug.com/hack/rest/2.0/?method=smugmug.login.withHash&APIKey=CsQpt2vZZ6VpddS9jrR83ZNvK3GrLLML&UserID=240209&PasswordHash=0f7ce13a7957dfcac256f657a93a3a834b4fb1a272dec20550dee9aef2dcb283'
  // An object of options to indicate where to post to
  const options = {
    headers: {
      'Accept' : 'application/json',
    },
    host: 'api.smugmug.com',
    path: '/hack/rest/2.0/?method=smugmug.login.withHash&APIKey=CsQpt2vZZ6VpddS9jrR83ZNvK3GrLLML&UserID=240209&PasswordHash=0f7ce13a7957dfcac256f657a93a3a834b4fb1a272dec20550dee9aef2dcb283&_accept=application%2Fjson'
  };
  // return https.get('https://api.smugmug.com/hack/rest/2.0/?method=smugmug.login.withHash&APIKey=CsQpt2vZZ6VpddS9jrR83ZNvK3GrLLML&UserID=240209&PasswordHash=0f7ce13a7957dfcac256f657a93a3a834b4fb1a272dec20550dee9aef2dcb283&_accept=application%2Fjson', (res) => {
  return https.get(options, (res) => {
    console.log(`status is ${res.statusCode}`);
    res.on('data', (d) => {
      response += d;
    });
    res.on('end', function() {
      if(response.includes("Session")) console.log("SessionId present");
      else console.log("SessionID not present");
      // console.log(response);
      const contents = response.split("\n");
      contents.forEach(line => {
        if(!line.includes("SessionID")) return;
        // console.log(`line matched: ${line}`);
        const items = / *<SessionID>(.*)<\/SessionID.*/.exec(line);
        getAlbum(items[1]);
        // console.log(`items are ${items}`);
      });
    });
  });

  /*
  request({
    headers: {
    }
  */
}

function PostCode(codestring) {
  // Build the post string from an object
  var post_data = querystring.stringify({
      'compilation_level' : 'ADVANCED_OPTIMIZATIONS',
      'output_format': 'json',
      'output_info': 'compiled_code',
        'warning_level' : 'QUIET',
        'js_code' : codestring
  });

  // An object of options to indicate where to post to
  var post_options = {
      host: 'upload.smugmug.com',
      port: '443',
      method: 'POST',
      headers: {
        'X-Smug-Version': 'v2',
        // 'X-Smug-SessionID": ''
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(post_data)
      }
  };

  // Set up the request
  var post_req = http.request(post_options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          console.log('Response: ' + chunk);
      });
  });

  // post the data
  post_req.write(post_data);
  post_req.end();
}

/*
// This is an async file read
fs.readFile('LinkedList.js', 'utf-8', function (err, data) {
  if (err) {
    // If this were just a small part of the application, you would
    // want to handle this differently, maybe throwing an exception
    // for the caller to handle. Since the file is absolutely essential
    // to the program's functionality, we're going to exit with a fatal
    // error instead.
    console.log("FATAL An error occurred trying to read in the file: " + err);
    process.exit(-2);
  }
  // Make sure there's data before we post it
  if(data) {
    PostCode(data);
  }
  else {
    console.log("No data to post");
    process.exit(-1);
  }
});
*/

getSession();
