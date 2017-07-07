'use strict';
const expect = require('chai').expect;
const fs = require('fs');
const mv = require('mv');
const rimraf = require('rimraf');
const getFileName = require('flight-details-parser/app/email-parser').testingGetFileName;
const spam = require('flight-details-parser/app/email-parser').testingSpam;
const dir = require('flight-details-parser/app/email-parser').dir;

describe('EmailParser tests: basic tests', function() {
  let emailId;

  before(function(done) {
    rimraf(`${dir}/oldFiles`, done);
  });

  // clean up
  afterEach(function(done) {
    mv(`${dir}/${emailId}`, `${dir}/oldFiles/${emailId}`, {mkdirp:true}, done);
  });

  it('Testing folder creation', function() {
    emailId = "test-madsri@gmail.com";
    const file = getFileName(emailId);
    expect(fs.existsSync(file)).to.be.ok;
  });

  it('Testing returning file', function() {
    emailId = "test1-madsri2@gmail.com";
    const file = getFileName(emailId,'file');
    expect(file).to.include(emailId);
    expect(file).to.include('file');
  });
});

describe('EmailParser tests: Spam tests', function() {
  it('spam score', function() {
    const msg = {
      from: [{ 
        address: "madsri@hotmail.com"
      }],
      spamScore: 99
    };
    expect(spam(msg)).to.be.ok;
    // not spam
    msg.spamScore = 4;
    expect(spam(msg)).to.not.be.ok;
    delete msg.spamScore;
    expect(spam(msg)).to.not.be.ok;
  });

  it('spam drop message without source email', function() {
    const msg = {
      spamScore: 4,
      randomDetails: "blah"
    };
    expect(spam(msg)).to.be.ok;
  });

  it('blacklisted email', function() {
    const msg = {
      from: [{ 
        address: "spameri@tiscali.it"
      }],
    };
    expect(spam(msg)).to.be.ok;
    msg.from[0].address = "madsri@hotmail.com";
    expect(spam(msg)).to.not.be.ok;
  });

  it('partial blacklist email', function() {
    const msg = {
      from: [{
        address: "spam1@ec2-54-167-220-143.compute-1.amazonaws.com"
      }]
    };
    expect(spam(msg)).to.be.ok;
    msg.from[0].address = "madsri@amazonaws.com";
    expect(spam(msg)).to.be.ok;
    msg.from[0].address = "madsri@gmail.com";
    expect(spam(msg)).to.not.be.ok;
  });
});
