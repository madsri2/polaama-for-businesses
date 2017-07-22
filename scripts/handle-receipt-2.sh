#!/bin/sh

cd /home/ec2-user/car-rental-details
node app/handle-receipt.js --recipient_name "Divya Dinakar" --order_number "663350206/663350208" --merchant_name "Trenitalia" --payment_method "Unknown" --total_price "16.80" --street_1 "Piazza della Stazione" --city "Pisa" --state "Tuscany" --country "Italy" --postal_code "56125" --currency "EUR" --trip_name "milan" --title "Pisa-Firenze train" --order_url "http://www.trenitalia.com/cms/v/index.jsp?vgnextoid=8111aae8de63c410VgnVCM1000008916f90aRCRD" --metadata "Leave Pisa at 10.32 a.m. on 21st. Arrive at Firenze Novalla at 11:32 a.m." --phone "+89 20 21"
