#!/bin/sh

cd /home/ec2-user/flight-details-parser/;
node app/handle-flight-itinerary.js --names "Van Par" --pnr "JEVQ1A" --flight_num "UA 495" --dep_code "SFO" --dep_city "San Francisco" --arr_code "SEA" --arr_city "Seattle" --dep_time "17:15" --dep_date "5/30/2017" -seats "25E" --total_price "349.30" --arrival_time "19:13"
