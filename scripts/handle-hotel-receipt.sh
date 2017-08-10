#!/bin/sh

cd /home/ec2-user/receipt-manager/
# Using airbnb.com in order_url causes messenger to stop!
node app/handle-hotel-receipt.js --recipient_name "Madhuvanesh Parthasarathy" --order_number "HMTSHB8PPR" --merchant_name "Jan's Airbnb at Akureyri" --payment_method "Credit card" --hotel_type "4 bedroom 2 bathroom apartment" --total_price "896.44" --street_1 "Hrafnagilsstræti" --city "Akureyri" --postal_code "23" --state "Northeast" --country "Iceland" --phone "+354 783 9679/692 0032" --check_in_date "Sep 8 2017 3:00 p.m." --check_out_date "Sep 10 2017 2:00 p.m." --currency "USD" --order_url "http://tinyurl.com/yb3rwajp" --trip_name "keflavik"

