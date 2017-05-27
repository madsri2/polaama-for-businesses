'use strict';

const expect = require('chai').expect;
const fs = require('fs');

const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const TripData = require(`${baseDir}/trip-data`);
const sessions = require(`${baseDir}/sessions`).get();
logger.setTestConfig(); // indicate that we are logging for a test
const HotelReceiptManager = require('receipt-manager/app/hotel-receipt-manager');
const FbidHandler = require('fbid-handler/app/handler');

describe('HotelRentalDetails tests', function() {
  let fbid = "12345";
  let tripName = "Punta Arenas";

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

  function getHotelReceipt() {
    const trip = new TripData(tripName, fbid);
    const details = JSON.parse(fs.readFileSync(trip.hotelRentalReceiptFile(), 'utf8'));
    return {
      receipt: details.receipt,
      receipt_ext: details.receipt_ext,
      trip: trip
    };
  }

  const options = {
    recipient_name: "TestFirstName LastName",
    merchant_name: "Hotel Rey Don Felipe",
    order_number:"153053486434",
    payment_method: "Due at pick-up",
    currency:"USD",
    "order_url":"http://click.expediamail.com/?qs=105f88ab54fd8686d9295fab692d1410ad4e7b90fd6c16a7e1a0f582df8cb08e22dfacddf07393c2041daca53a17ee6b",
    total_price:88.94,
    currency:"USD",
    hotel_type: "Standard Double or Twin Room - Breakfast plan, non-smoking for 2 adults",
    "street_1":"Armando Sanhueza 965",
    "city":"Punta Arenas",
    "state":"Magallanes",
    "postal_code":"6200729",
    "country":"Chile",
    // for request.ext object
    check_in_date: "Jun 1 2017",
    check_out_date: "Jun 10 2017",
    phone: "1 (45) 45678"
  };

  function verifyExpectations() {
    const result = getHotelReceipt();
    expect(result.receipt.merchant_name).to.equal("Hotel Rey Don Felipe");
    expect(result.receipt.order_number).to.equal("153053486434");
    expect(result.receipt.summary.total_cost).to.equal(88.94);
    expect(result.receipt_ext.elements[0].subtitle).to.equal("CHECK-IN: Jun 1 2017; CHECK-OUT: Jun 10 2017");
    expect(result.receipt_ext.elements[0].title).to.equal("Phone: 1 (45) 45678");
  }

  function verifyTripInContext() {
    const session = sessions.find(fbid);
    const trip = getHotelReceipt().trip;
    expect(session.tripNameInContext).to.equal(trip.data.name);
  }

  it("hotel receipt new trip", function() {
    expect(new HotelReceiptManager(options, true /* testing */).handle()).to.be.ok; 
    verifyExpectations();
  });

  it("hotel receipt existing trip", function() {
    const trip = sessions.find(fbid).addTrip(tripName);
    trip.addTripDetailsAndPersist({startDate: "5/1/17", destination: tripName});
    trip.addPortOfEntry(tripName);
    expect(new HotelReceiptManager(options, true /* testing */).handle()).to.be.ok; 
    verifyExpectations();
    verifyTripInContext();
  });
});
