#!/bin/sh

cd /home/ec2-user/receipt-manager/;
node app/handle-hotel-receipt.js --recipient_name "Van Par" --order_number "H356702301ASDA" --merchant_name "Hotel Rey Don Felipe" --payment_method "Visa card ending in 4560" --order_url "https://www.priceline.com/receipt/?offer-token=4303D8F5B4969DCB89CDF946FB96DA5C6B9D8A60A4E0A6BE901D032F935D0328/#/accept/" --hotel_type "Standard Double or Twin Room - Breakfast plan, non-smoking for 2 adults" --total_price "108.25" --street_1 "Armando Sanhueza 965" --city "Santa Fe" --postal_code "62072" --state "NM" --country "USA" --phone "(459) 4562-2378" --check_in_date "May 31 2017 08:00 PM" --check_out_date "June 4 2017 11:00 PM"
