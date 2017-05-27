'use strict';
// https://www.npmjs.com/package/command-line-args
const cmdLineArgs = require('command-line-args');
const CarReceiptManager = require('car-rental-details/app/itinerary-handler');

const optionsDefn = [
  {name: 'recipient_name'}, //default String
  {name: 'order_number'},
  {name: 'merchant_name'},
  {name: 'payment_method'},
  {name: 'currency', defaultValue: 'USD'},
  {name: 'order_url'},
  {name: 'car_type'},
  {name: 'total_price'},
  {name: 'street_1'},
  {name: 'city'},
  {name: 'state'},
  {name: 'country'},
  {name: 'postal_code'},
  {name: 'phone'},
  {name: 'pick_up_date'},
  {name: 'drop_off_date'},
];


// TODO: Start here and add departure time
const options = cmdLineArgs(optionsDefn);
console.log(`options: ${JSON.stringify(options)}`);
const receiptMgr = new CarReceiptManager(options);
receiptMgr.handle();
