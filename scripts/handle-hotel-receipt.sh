#!/bin/sh

cd /home/ec2-user/receipt-manager/;
node app/handle-hotel-receipt.js --recipient_name "Madhuvanesh Parthasarathy" --order_number "AGUPED" --merchant_name "Hotel Rey Don Felipe" --payment_method "Visa card" --order_url "https://www.priceline.com/receipt/?offer-token=4303D8F5B4969DCB89CDF946FB96DA5C6B9D8A60A4E0A6BE901D032F935D0328/#/accept/" --hotel_type "Standard Double or Twin Room - Breakfast plan, non-smoking for 2 adults" --total_price "108.25" --street_1 "Armando Sanhueza 965" --city "Punta Arenas" --postal_code "6200729" --state "Magallanes" --country "Chile" --phone "1 (45) 45678" --check_in_date "June 1 2017" --check_out_date "June 3 2017"
