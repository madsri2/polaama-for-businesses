#!/bin/sh

cd /home/ec2-user/receipt-manager/
# Using airbnb.com in order_url causes messenger to stop!
node app/handle-hotel-receipt.js --recipient_name "Madhuvanesh Parthasarathy" --order_number "1481660203/8206" --merchant_name "Hótel Fljótshlíd" --payment_method "Credit card" --hotel_type "Double or Twin room" --total_price "419.00" --street_1 "Smáratún, 861 Hlíðarendi" --city "Hvolsvöllur" --postal_code "000000" --state "South" --country "Iceland" --phone "+354 487 1416" --check_in_date "Sep 3 2017 03:00 p.m." --check_out_date "Sep 5 2017 12:00 p.m." --currency "USD" --order_url "http://tinyurl.com/yct4p9yf" --trip_name "keflavik"
