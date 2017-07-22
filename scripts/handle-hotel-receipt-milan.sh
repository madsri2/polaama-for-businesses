#!/bin/sh

cd /home/ec2-user/receipt-manager/
# Using airbnb.com in order_url causes messenger to stop!
node app/handle-hotel-receipt.js --recipient_name "Divya Dinakar" --order_number "HMKE3Z3DZH" --merchant_name "Airbnb, Casa Fiammetta" --payment_method "Visa xx5259" --hotel_type "Entire Apt with kitchen, 2 rooms and terrace" --total_price "650.00" --street_1 "Via della Scrofa, 95, Lazio" --city "Rome" --postal_code "00186" --state "Rome" --country "Italy" --phone "(801)558-8508" --check_in_date "Jul 15 2017 02:00 PM" --check_out_date "Jul 19 2017 12:00 PM" --currency "USD" --order_url "http://tinyurl.com/yazklhnz" --image_url "https://a0.muscache.com/im/pictures/6b8a84b9-c73e-4412-ab52-07d86c55bd58.jpg?aki_policy=x_large" --trip_name "milan"
