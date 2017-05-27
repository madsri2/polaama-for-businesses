#!/bin/sh

cd /home/ec2-user/car-rental-details/;
node app/handle-car-receipt.js --recipient_name "Madhuvanesh Parthasarathy" --order_number "AGUPED" --merchant_name "Thrifty" --payment_method "Visa card" --order_url "https://www.priceline.com/receipt/?offer-token=4303D8F5B4969DCB89CDF946FB96DA5C6B9D8A60A4E0A6BE901D032F935D0328/#/accept/" --car_type "Large car (Chevy Malibu or similar)" --total_price "108.25" --street_1 "SJC, 1659 Airport Blvd" --city "San Jose" --postal_code "95110" --state "CA" --country "USA" --phone "1 (45) 45678" --pick_up_date "June 1 2017" --drop_off_date "June 3 2017"
