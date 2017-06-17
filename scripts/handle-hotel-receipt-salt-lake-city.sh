#!/bin/sh

cd /home/ec2-user/receipt-manager/
# Using airbnb.com in order_url causes messenger to stop!
node app/handle-hotel-receipt.js --recipient_name "Beth Whitman" --order_number "HM34ANBPJE" --merchant_name "Airbnb Martin" --payment_method "Unknown" --hotel_type "Big room, private bath, hot tub" --total_price "187.00" --street_1 "836 Harrison Avenue South" --city "Salt Lake City" --postal_code "84105" --state "UT" --country "USA" --phone "(801)558-8508" --check_in_date "Jul 26 2017 02:00 PM" --check_out_date "Jul 28 2017 12:00 PM" --currency "USD" --order_url "http://maps.google.com/maps?daddr=836+Harrison+Ave+S,+Salt+Lake+City,+UT+84105,+USA"
