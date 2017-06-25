#!/bin/sh

cd /home/ec2-user/receipt-manager/
node app/handle-hotel-receipt.js --recipient_name "Van Par" --order_number "BB1706166422446" --merchant_name "Novotel Brisbane Airport" --payment_method "Unknown" --hotel_type "Standard room with full buffet breakfast" --total_price "333.00" --street_1 "6-8 The Circuit, Brisbane Airport" --city "Brisbane" --postal_code "4008" --state "QLD" --country "Australia" --phone "+61 7 3175 3100" --check_in_date "Aug 24 2017 02:00 PM" --check_out_date "Aug 25 2017 11:00 AM" --currency "AUD" --trip_name "port_moresby" --order_url "http://www.novotelbrisbaneairport.com.au/guest-rooms/standard-room/"
