'use strict';
const expect = require('chai').expect;
const AdminMessageSender = require('business-pages-handler');
const Promise = require('promise');

describe("basic tests", function() {
  const adminFbid = "12345";
  const myFbid = "6789";
  const mesg = "hello world";
  it("sendMessageToAdmin", function(done) {
    const adminSender = new AdminMessageSender([adminFbid], true /* testing */);
    const promise = adminSender.sendMessageToAdmin(myFbid, mesg);
    promise.then(
      (response) => {
        const messageList = response.message;
        expect(messageList).to.not.be.undefined;
        expect(messageList[0].message.text).to.include("have asked one of our crew");
        return adminSender.stateManager.get(["messageSentToAdmin", myFbid, mesg]);
      },
      (err) => {
        done(err);
    }).done(
    (value) => {
      expect(value).to.be.true;
      done();
    },
    (err) => {
      done(err);
    });
  });

  it("handleWaitingForAdminResponse", function(done) {
    const adminSender = new AdminMessageSender([adminFbid], true /* testing */);
    const promise = adminSender.sendMessageToAdmin(myFbid, mesg);
    promise.then(
      (response) => {
        return adminSender.handleWaitingForAdminResponse(adminFbid, `respond_to_customer_${myFbid}-_${mesg}`);
      },
      (err) => {
        done(err);
    }).then(
      (respondMessage) => {
        expect(respondMessage).to.not.be.undefined;
        expect(respondMessage.message.text).to.include("Enter your response");
        return adminSender.stateManager.get(["messageSentToAdmin", myFbid, mesg]);
      },
      (err) => {
        done(err);
    }).then(
      (value) => {
        expect(value).to.be.true;
        return adminSender.stateManager.get(["awaitingResponseFromAdmin", adminFbid]);
      },
      (err) => {
        return Promise.reject(err);
    }).done(
      (value) => {
        expect(value).to.not.be.undefined;
        expect(value.fbid).to.equal(myFbid);
        expect(value.question).to.equal(mesg);
        done();
      },
      (err) => {
        done(err);
    });
  });

  it("multiple admins", function(done) {
    const secondAdmin = "7890";
    const adminSender = new AdminMessageSender([adminFbid, secondAdmin], true /* testing */);
    const promise = adminSender.sendMessageToAdmin(myFbid, mesg);
    promise.then(
      (response) => {
        return adminSender.handleWaitingForAdminResponse(adminFbid, `respond_to_customer_${myFbid}-_${mesg}`);
      },
      (err) => {
        done(err);
    }).then(
      (respondMessage) => {
        expect(respondMessage).to.not.be.undefined;
        expect(respondMessage.message.text).to.include("Enter your response");
        return adminSender.handleWaitingForAdminResponse(secondAdmin, `respond_to_customer_${myFbid}-_${mesg}`);
      },
      (err) => {
        done(err);
    }).then(
      (message) => {
        expect(message).to.not.be.undefined;
        expect(message.message.text).to.include("Another admin");
        return adminSender.stateManager.get(["awaitingResponseFromAdmin", adminFbid]);
      },
      (err) => {
        return Promise.reject(err);
    }).done(
      (value) => {
        expect(value).to.not.be.undefined;
        expect(value.fbid).to.equal(myFbid);
        expect(value.question).to.equal(mesg);
        done();
      },
      (err) => {
        done(err);
    });
  });

  it("handleResponseFromAdmin", function(done) {
    const adminSender = new AdminMessageSender([adminFbid], true /* testing */);
    const promise = adminSender.sendMessageToAdmin(myFbid, mesg);
    promise.then(
      (response) => {
        return adminSender.handleWaitingForAdminResponse(adminFbid, `respond_to_customer_${myFbid}-_${mesg}`);
      },
      (err) => {
        return Promise.reject(err);
    }).then(
      (message) => {
        const pageDetails = {
          title: "Response from Sea Spray",
          image_url: "http://tinyurl.com/y8v9ral5",
          /*
          buttons: [{
            title: "Contact details",
            type: "postback",
            payload: "sea_spray_contact"
          }]
          */
        };
        return adminSender.handleResponseFromAdmin(adminFbid, mesg, pageDetails);
      },
      (err) => {
        return Promise.reject(err);
    }).then(
      (mesgList) => {
        try {
          expect(mesgList[1].message.text).to.include("Successfully sent your response");
          return adminSender.stateManager.get(["messageSentToAdmin", myFbid, mesg]);
        }
        catch(e) {
          return Promise.reject(e);
        }
      },
      (err) => {
        return Promise.reject(e);
    }).then(
      (value) => {
        expect(value).to.be.undefined;
        return adminSender.stateManager.get(["awaitingResponseFromAdmin", adminFbid]);
      },
      (err) => {
        return Promise.reject(e);
    }).done(
      (value) => {
        expect(value).to.be.undefined;
        done();
      },
      (err) => {
        done(err);
    });
  });

  it("test admin clicking on 2 different response buttons", function() {
  });
});
