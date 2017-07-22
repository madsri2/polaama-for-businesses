#!/bin/sh

cd /home/ec2-user/car-rental-details
node app/handle-receipt.js --recipient_name "Divya Dinakar" --order_number "Y695NN" --merchant_name "Trenitalia" --payment_method "Unknown" --total_price "37.50" --street_1 "Monterosso al Mare SP" --city "Monterosso al Mare" --state "SP" --country "Italy" --postal_code "19016" --currency "EUR" --trip_name "milan" --title "Monterosso-Milan train" --order_url "https://polaama.com/aeXf/milan/-/receipts/monterosso-milan_train" --metadata "Leave Monterosso at 6.54 a.m. on 22nd. Arrive at Milan at 9:55 a.m." --phone "+89 20 21"
