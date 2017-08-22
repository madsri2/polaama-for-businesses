#!/bin/sh

cd /home/ec2-user/car-rental-details/;
node app/handle-car-receipt.js --recipient_name "Madhuvanesh Parthasarathy" --order_number "UDUS0769" --merchant_name "Cars Iceland" --payment_method "Deposit via Discover" --order_url "https://drive.google.com/open?id=0B_RXMLC_yaZWTjl6VVBmSHBtSjlrVVJONlJOV2x6SzNSN3BR" --car_type "Dacia Duster 4x4 DIESEL (Manual)" --total_price "870.62" --street_1 "235 Keflavík Airport" --city "Keflavik" --postal_code "000" --state "Reykjanesbær" --country "Iceland" --phone "+354 773 7070" --pick_up_date "Sep 3 2017 7:30 AM" --drop_off_date "Sep 11 2017 12:30 PM" --trip "keflavik" --image_url "http://tinyurl.com/yblfyt2w"
