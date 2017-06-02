'use strict';

function TripReceiptManager() {
}

TripReceiptManager.prototype.handle = function() {
  return {
        "template_type":"receipt",
        "recipient_name":"Madhu Parthasarathy",
        "merchant_name": "Awesome divers",
        "order_number":"153053486434",
        "payment_method": "visa card",
        "currency":"USD",
        "order_url":"http://click.expediamail.com/?qs=105f88ab54fd8686d9295fab692d1410ad4e7b90fd6c16a7e1a0f582df8cb08e22dfacddf07393c2041daca53a17ee6b",
        "timestamp":"1428444852", 
        "elements":[
          {
            "title":"Confirmation #: 153053486434",
            "subtitle":"Diving for two at molokini crater",
            "price":232.26,
            "currency":"USD"
          },
        ],
        "address":{
          "street_1":"143 Dickenson St #100",
          "city":"Lahaina",
          "state":"Hawaii",
          "postal_code":"96761",
          "country":"USA"
        },
        "summary":{
          "subtotal":232.26,
          "total_tax":0,
          "total_cost":232.26
        }
  };
}

module.exports = TripReceiptManager;
