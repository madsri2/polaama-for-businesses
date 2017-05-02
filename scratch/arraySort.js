'use strict';

const arr = [
  { "MinPrice": 4 },
  { "MinPrice": 3 },
  { "MinPrice": 1 },
  { "MinPrice": 2 },
  { "MinPrice": 5 },
];

    const contents = [
      {
        "QuoteId": 1,
        "MinPrice": 438,
        "Direct": true,
        "OutboundLeg": {
          "CarrierIds": [
            1864
          ],
          "OriginId": 81727,
          "DestinationId": 40979,
          "DepartureDate": "2017-05-01T00:00:00"
        },
        "QuoteDateTime": "2017-04-27T06:19:00"
      },
      {
        "QuoteId": 2,
        "MinPrice": 438,
        "Direct": true,
        "OutboundLeg": {
          "CarrierIds": [
            1864
          ],
          "OriginId": 81727,
          "DestinationId": 40979,
          "DepartureDate": "2017-05-01T00:00:00"
        },
        "QuoteDateTime": "2017-04-27T22:26:00"
      },
      {
        "QuoteId": 3,
        "MinPrice": 347,
        "Direct": false,
        "OutboundLeg": {
          "CarrierIds": [
            1065
          ],
          "OriginId": 81727,
          "DestinationId": 40979,
          "DepartureDate": "2017-05-01T00:00:00"
        },
        "InboundLeg": {
          "CarrierIds": [
            1065
          ],
          "OriginId": 40979,
          "DestinationId": 81727,
          "DepartureDate": "2017-05-04T00:00:00"
        },
        "QuoteDateTime": "2017-04-21T22:23:00"
      },
      {
        "QuoteId": 4,
        "MinPrice": 345,
        "Direct": false,
        "OutboundLeg": {
          "CarrierIds": [
            1065
          ],
          "OriginId": 81727,
          "DestinationId": 40979,
          "DepartureDate": "2017-05-01T00:00:00"
        },
        "InboundLeg": {
          "CarrierIds": [
            1065
          ],
          "OriginId": 40979,
          "DestinationId": 81727,
          "DepartureDate": "2017-05-05T00:00:00"
        },
        "QuoteDateTime": "2017-04-24T20:55:00"
      },
      {
        "QuoteId": 5,
        "MinPrice": 316,
        "Direct": true,
        "OutboundLeg": {
          "CarrierIds": [
            851
          ],
          "OriginId": 81727,
          "DestinationId": 40979,
          "DepartureDate": "2017-05-01T00:00:00"
        },
        "InboundLeg": {
          "CarrierIds": [
            851
          ],
          "OriginId": 40979,
          "DestinationId": 81727,
          "DepartureDate": "2017-05-24T00:00:00"
        },
        "QuoteDateTime": "2017-04-25T03:49:00"
      },
      {
        "QuoteId": 6,
        "MinPrice": 290,
        "Direct": false,
        "OutboundLeg": {
          "CarrierIds": [
            1065
          ],
          "OriginId": 81727,
          "DestinationId": 40979,
          "DepartureDate": "2017-05-01T00:00:00"
        },
        "InboundLeg": {
          "CarrierIds": [
            851
          ],
          "OriginId": 40979,
          "DestinationId": 81727,
          "DepartureDate": "2017-05-24T00:00:00"
        },
        "QuoteDateTime": "2017-04-24T22:04:00"
      }
    ];

console.log(contents.sort(
  function(a,b) {
    return a.MinPrice - b.MinPrice;
  }
));
