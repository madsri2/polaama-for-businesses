'use strict';
// https://www.npmjs.com/package/command-line-args
const cmdLineArgs = require('command-line-args');
const ReceiptHandler = require('car-rental-details/app/receipt-handler');

const optionsDefn = [
  {name: 'title'},
  {name: 'image_url'},
  {name: 'trip_name', defaultOption: ''},
  {name: 'recipient_name'}, //default String
  {name: 'order_number'},
  {name: 'merchant_name'},
  {name: 'payment_method'},
  {name: 'currency', defaultValue: 'USD'},
  {name: 'order_url', defaultValue: "n/a"},
  {name: 'total_price'},
  {name: 'street_1'},
  {name: 'city'},
  {name: 'state'},
  {name: 'country'},
  {name: 'postal_code'},
  {name: 'metadata'},
  {name: 'phone'}
];


// TODO: Start here and add departure time
const options = cmdLineArgs(optionsDefn);
console.log(`options: ${JSON.stringify(options)}`);
const receiptMgr = new ReceiptHandler(options);
receiptMgr.handle();
