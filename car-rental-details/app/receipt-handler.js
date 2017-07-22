'use strict';
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const TripFinder = require('flight-details-parser/app/trip-finder');

function ReceiptHandler(options, testing) {
  this.testing = testing;
  if(!options) throw new Error(`expected parameter options is missing`);
  validate.call(this, options);
  this.title = options.title;
  this.details = {};
  this.receipt = {
    template_type: "receipt",
    recipient_name: options.recipient_name,
    order_number: options.order_number,
    merchant_name: options.merchant_name,
    payment_method: options.payment_method,
    currency: options.currency,
    // timestamp: options.timestamp,
    elements: [{
      title: `Confirmation #:${options.order_number}`,
      subtitle: this.title,
      price: options.total_price,
      currency: options.currency
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
        title: this.title
      }],
      subtitle: options.metadata
    }]
  };
  if(options.image_url) this.receipt.elements[0].image_url = options.image_url;
  this.pick_up_date = options.pick_up_date;
  if(options.order_url && options.order_url !== "n/a") this.receipt.order_url = options.order_url;
  if(options.image_url) this.receipt.elements[0].image_url = options.image_url;
  if(options.street_2) this.receipt.address.street_2 = options.street_2;
  if(options.subtotal) this.receipt.summary.subtotal = options.subtotal;
  if(options.total_tax) this.receipt.summary.total_tax = options.total_tax;
  this.tripFinder = new TripFinder(this.receipt.recipient_name, this.testing);
  // if the trip name was sent, we use that to create the trip
  if(options.trip_name && options.trip_name !== '') {
    this.trip = this.tripFinder.getSession().getTrip(options.trip_name);
    if(!this.trip) throw new Error(`HotelReceiptManager: options.trip_name was set to ${options.trip_name}, but there is no such trip. Possible BUG!`);
  }
}

function validate(options) {
  const requiredFields = ['recipient_name', 'order_number', 'title', 'merchant_name', 'payment_method', 'currency', 'total_price', 'street_1', 'city', 'state', 'country', 'postal_code'];
  requiredFields.forEach(field => {
    if(!options[field]) throw new Error(`Required field ${field} missing in options`);
  });
}

ReceiptHandler.prototype.handle = function() {
  const tripFinder = this.tripFinder;
  if(!this.trip) this.trip = tripFinder.getTripForReceipt(this.pick_up_date, this.receipt.address.city);
  const file = this.trip.generalReceiptFile(this.title);
  this.trip.updateReceiptDetails(this.title);
  try {
    this.details.receipt = this.receipt;
    this.details.receipt_ext = this.receipt_ext;
    const json = JSON.stringify(this.details);
    require('fs').writeFileSync(file, json, 'utf8');
    // send a notification to the user that we have their details and will send them the boarding pass the day before the flight.
    logger.debug(`handle: wrote ${json.length} bytes to file ${file}`);
    // notify user that we have received a boarding pass.
    // TODO: Add a button to make it easy to see this.
    const messageList = [];
    const fbid = this.trip.fbid;
    const message = {
      recipient: {
        id: fbid
      },
      message: {
        attachment: {
          "type": "template",
          payload: {
            template_type: "button",
            "text": `Received ${this.title}'s receipt for your trip to ${this.trip.rawTripName}. Type 'get receipt' to see details at any time.`,
            "buttons": [{
              "type": "postback",
              "title": "Get receipt",
              "payload": `get_receipt ${this.title}`,
            }]
          }
        }
      }
    };
    logger.debug(`handle: About to send message to user: ${JSON.stringify(message)}`);
		const postHandler = tripFinder.getPostHandler();
    return postHandler.sendAnyMessage(message);
  }
  catch(e) {
    logger.error(`parse: Error writing to file ${file}. ${e.stack}`);
    throw e;
  }
  logger.debug(`handle: Stored receipt for ${this.title} and pushed notification`);
  return true;
}

module.exports = ReceiptHandler;
