#!/bin/sh

cd /home/ec2-user/car-rental-details/;
node app/handle-car-receipt.js --recipient_name "Madhuvanesh Parthasarathy" --order_number "1240243908" --merchant_name "Alamo" --payment_method "Unknown" --order_url "https://www.alamo.com/en_US/car-rental/reservation/viewReservation.html?firstName=ELIZABETH&lastName=WHITMAN&confirmationNumber=1240243908&cm_mmc=MessagingFramework-_-Reminder-_-Itinerary-_-ConfirmationNumber" --car_type "Unknown" --total_price "00.00" --street_1 "ABQ, 3400 UNIVERSITY BLVD SEBLDG K" --city "Albuquerque" --postal_code "87106" --state "NM" --country "USA" --phone "(844) 366-0504" --pick_up_date "May 30 2017 11:30 AM" --drop_off_date "June 5 2017 5:00 PM"
