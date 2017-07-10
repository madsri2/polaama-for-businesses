#!/bin/sh

cd /home/ec2-user/car-rental-details/;
node app/handle-car-receipt.js --recipient_name "Beth Whitman" --order_number "288763378" --merchant_name "Enterprise" --payment_method "Due at counter" --order_url "http://tinyurl.com/y868vzg8" --car_type "Nissan Versa or similar" --total_price "150.81" --street_1 "776 N Terminal Dr" --city "Salt Lake City" --postal_code "84122" --state "UT" --country "USA" --phone "(801)7151617" --pick_up_date "July 26 2017 11:00 AM" --drop_off_date "July 28 2017 7:00 PM" --trip "salt_lake_city" --image_url "https://www.enterprisecarsales.com/Media/Default/SEO/SEO%20Page%20Images/Nissan/Nissan%20Versa.jpg"
