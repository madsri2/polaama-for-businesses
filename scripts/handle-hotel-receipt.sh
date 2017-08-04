#!/bin/sh

cd /home/ec2-user/receipt-manager/
# Using airbnb.com in order_url causes messenger to stop!
node app/handle-hotel-receipt.js --recipient_name "Madhuvanesh Parthasarathy" --order_number "HMA34PSN52" --merchant_name "Sunna Airbnb at Akureyri" --payment_method "Credit card" --hotel_type "3 bedroom 1 bathroom apartment" --total_price "543.54" --street_1 "Brekkugata Ground floor" --city "Akureyri" --postal_code "600" --state "North" --country "Iceland" --phone "+354 848 7573" --check_in_date "Sep 8 2017 3:00 p.m." --check_out_date "Sep 10 2017 2:00 p.m." --currency "USD" --order_url "http://tinyurl.com/y9bgwda4" --trip_name "keflavik"

