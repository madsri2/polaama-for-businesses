#!/bin/sh

cd /home/ec2-user/flight-details-parser/;
node app/handle-flight-itinerary.js --names "Madhuvanesh Parthasarathy" --pnr "JEL8FX" --flight_num "UA1994" --dep_code "SFO" --dep_city "San Francisco" --arr_code "AUS" --arr_city "Austin" --dep_time "10:45" --dep_date "5/18/2017" --boarding_time "10:10" -seats "3F" --total_price "500.45" --arrival_time "17:15"
