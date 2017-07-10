#!/bin/sh

cd /home/ec2-user/car-rental-details
node app/handle-receipt.js --recipient_name "Madhuvanesh Parthasarathy" --order_number "1MYKMPTY" --merchant_name "ColosseoForo/Palatino" --payment_method "Credit card" --total_price "28.00" --street_1 "Piazza del Colosseo, 1" --city "Rome" --state "Rome" --postal_code "00184" --country "Italy" --currency "EUR" --trip_name "milan" --title "Colosseum ticket" --image_url "http://tinyurl.com/y9j6l2nf"
