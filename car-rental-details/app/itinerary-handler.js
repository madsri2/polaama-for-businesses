'use strict';
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const TripFinder = require('flight-details-parser/app/trip-finder');

function CarItineraryHandler(options, testing) {
  this.testing = testing;
  if(!options) throw new Error(`expected parameter options is missing`);
  validate.call(this, options);
  this.details = {};
  this.receipt = {
    template_type: "receipt",
    recipient_name: options.recipient_name,
    order_number: options.order_number,
    merchant_name: options.merchant_name,
    payment_method: options.payment_method,
    currency: options.currency,
    order_url: options.order_url,
    // timestamp: options.timestamp,
    elements: [{
      title: `Confirmation #:${options.order_number}`,
      subtitle: options.car_type,
      price: options.total_price,
      currency: options.currency,
    }],
    address: {
      street_1: options.street_1,
      city: options.city,
      state: options.state,
      country: options.country,
      postal_code: options.postal_code
    },
    summary: {
      total_cost: options.total_price
    }
  };
  this.receipt_ext = {
    template_type: 'generic',
    elements: [{
      title: `Phone: ${options.phone}`,
      buttons: [{
        type: "web_url",
        url: options.order_url,
        title: "Car rental"
      }],
      subtitle: `PICK-UP: ${options.pick_up_date}; DROP-OFF: ${options.drop_off_date}`
    }]
  };
  this.pick_up_date = options.pick_up_date;
  if(options.image_url) this.receipt.elements[0].image_url = options.image_url;
  if(options.street_2) this.receipt.address.street_2 = options.street_2;
  if(options.subtotal) this.receipt.summary.subtotal = options.subtotal;
  if(options.total_tax) this.receipt.summary.total_tax = options.total_tax;
}

function validate(options) {
  const requiredFields = ['recipient_name', 'order_number', 'merchant_name', 'payment_method', 'currency', 'order_url', 'pick_up_date', 'drop_off_date', 'phone', 'car_type', 'total_price', 'street_1', 'city', 'state', 'country', 'postal_code'];
  requiredFields.forEach(field => {
    if(!options[field]) throw new Error(`Required field ${field} missing in options`);
  });
}

CarItineraryHandler.prototype.handle = function() {
  const tripFinder = new TripFinder(this.receipt.recipient_name, this.testing);
  this.trip = tripFinder.getTripForReceipt(this.pick_up_date, this.receipt.address.city);
  const file = this.trip.rentalCarReceiptFile();
  try {
    this.details.receipt = this.receipt;
    this.details.receipt_ext = this.receipt_ext;
    const json = JSON.stringify(this.details);
    require('fs').writeFileSync(file, json, 'utf8');
    // send a notification to the user that we have their details and will send them the boarding pass the day before the flight.
    logger.debug(`handle: wrote ${json.length} bytes to file ${file}`);
    // notify user that we have received a boarding pass.
    const message = `Received rental car receipt for your trip to ${this.trip.getPortOfEntry()}. Type 'get car details' to see details`;
    logger.debug(`handle: About to send message to user: ${message}`);
		const postHandler = tripFinder.getPostHandler();
    postHandler.notifyUser(message);
  }
  catch(e) {
    logger.error(`parse: Error writing to file ${file}. ${e.stack}`);
    throw e;
  }
  logger.debug(`handle: Stored rental car details and pushed notification`);
  return true;
}

CarItineraryHandler.prototype.handle1 = function() {
  const itinerary = {
				"template_type":"receipt",
        "recipient_name":"Madhu Parthasarathy",
        "order_number":"H17801074B0",
				"payment_method": "Due at pick-up",
        "currency":"USD",
        "order_url":"https://www.priceline.com/receipt/?offer-token=4303D8F5B4969DCB89CDF946FB96DA5C6B9D8A60A4E0A6BE901D032F935D0328/#/accept/",
        "timestamp":"1428444852", 
        "elements":[
          {
            "title":"Thrifty Car rental",
            "subtitle":"Full size car (Chevy Malibu or similar) for 3 days and 2 hours",
            "price":88.94,
            "currency":"USD",
            "image_url":"https://s1.pclncdn.com/rc-static/vehicles/partner/zt/size134x72/zeusfdar999.jpg",
          }],
        "address":{
          "street_1":"Norman Y. Mineta San Jose Intl Airport (SJC)",
          "street_2":"1659 Airport Blvd",
          "city":"San Jose",
          "postal_code":"95110",
          "state":"CA",
          "country":"US"
        },
        "summary":{
          "subtotal":42.68,
          "total_tax":46.68,
          "total_cost":88.94,
        },
        "adjustments":[
          {
            "name":"Daily rate",
            "amount":12.78
          },
          {
            "name":"Hourly rate",
            "amount":2.17
          }
        ]
  };
	require('fs').writeFileSync("/tmp/rental-car-itinerary.txt", JSON.stringify(itinerary), 'utf8');
}

function sendActivityList(messageText) {
	const itinerary = {
          template_type: "generic",
          elements: [{
            title: "Confirmation number: H17801074B0",
            buttons: [{
              type: "web_url",
        			url:"https://www.priceline.com/receipt/?offer-token=4303D8F5B4969DCB89CDF946FB96DA5C6B9D8A60A4E0A6BE901D032F935D0328/#/accept/",
              title: "Car rental"
            }],
            subtitle: "pick-up: 01/12/17, 12:00 PM, drop-off: 01/15/17, 2.00 PM; Phone: 425-6470908"
          }]
  };
	require('fs').writeFileSync("/tmp/rental-car-itinerary.txt", JSON.stringify(itinerary), 'utf8');
}

module.exports = CarItineraryHandler;
