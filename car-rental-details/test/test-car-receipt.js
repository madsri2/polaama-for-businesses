'use strict';

const expect = require('chai').expect;
const fs = require('fs');

const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const TripData = require(`${baseDir}/trip-data`);
const sessions = require(`${baseDir}/sessions`).get();
logger.setTestConfig(); // indicate that we are logging for a test
const CarRentalManager = require('car-rental-details/app/itinerary-handler');
const FbidHandler = require('fbid-handler/app/handler');

describe('CarRentalDetails tests', function() {
  let fbid = "12345";
  let tripName = "San Jose";

  // set up
  beforeEach(function() {
    // create a test file and pass that to fbid-handler
    FbidHandler.get('fbid-test.txt').testing_add(fbid,{first_name: "TestFirstname", last_name: "Lastname"});
    sessions.findOrCreate(fbid);
  });

  // clean up
  afterEach(function() {
    logger.debug("Cleaning up after test");
    // not deleting fbid because it can be reused and we want to avoid creating a new encoded Fbid everytime.
    sessions.testing_delete(fbid);
    (new TripData(tripName, fbid)).testing_delete();
  });

  function getCarReceipt() {
    const trip = new TripData(tripName, fbid);
    const details = JSON.parse(fs.readFileSync(trip.rentalCarReceiptFile(), 'utf8'));
    return {
      receipt: details.receipt,
      receipt_ext: details.receipt_ext,
      trip: trip
    };
  }

  const options = {
    recipient_name: "TestFirstName LastName",
    merchant_name: "Thrifty car rental",
    order_number:"H17801074B0",
    payment_method: "Due at pick-up",
    currency:"USD",
    order_url:"https://www.priceline.com/receipt/?offer-token=4303D8F5B4969DCB89CDF946FB96DA5C6B9D8A60A4E0A6BE901D032F935D0328/#/accept/",
    total_price:88.94,
    currency:"USD",
    image_url:"https://s1.pclncdn.com/rc-static/vehicles/partner/zt/size134x72/zeusfdar999.jpg",
    car_type: "Full size car(Chevy Malibu or similar)",
    "street_1":"San Jose Intl Airport (SJC), 1659 Airport Blvd",
    "city":"San Jose",
    "postal_code":"95110",
    "state":"CA",
    "country":"US",
    // for request.ext object
    pick_up_date: "Jun 1 2017",
    drop_off_date: "Jun 10 2017",
    phone: "1 (45) 45678"
  };

  function verifyExpectations() {
    const result = getCarReceipt();
    expect(result.receipt.merchant_name).to.equal("Thrifty car rental");
    expect(result.receipt.order_number).to.equal("H17801074B0");
    expect(result.receipt.summary.total_cost).to.equal(88.94);
    expect(result.receipt_ext.elements[0].subtitle).to.equal("PICK-UP: Jun 1 2017; DROP-OFF: Jun 10 2017");
    expect(result.receipt_ext.elements[0].title).to.equal("Phone: 1 (45) 45678");
  }

  function verifyTripInContext() {
    const session = sessions.find(fbid);
    const trip = getCarReceipt().trip;
    expect(session.tripNameInContext).to.equal(trip.data.name);
  }

  it("car receipt new trip", function() {
    expect(new CarRentalManager(options, true /* testing */).handle()).to.be.ok; 
    verifyExpectations();
  });

  it("car receipt existing trip", function() {
    const trip = sessions.find(fbid).addTrip(tripName);
    trip.addTripDetailsAndPersist({startDate: "5/1/17", destination: tripName});
    trip.addPortOfEntry(tripName);
    expect(new CarRentalManager(options, true /* testing */).handle()).to.be.ok; 
    verifyExpectations();
    verifyTripInContext();
  });
});
