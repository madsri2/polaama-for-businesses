#!/bin/sh

cd /home/ec2-user/flight-details-parser/;
node app/handle-flight-itinerary.js --names "Madhuvanesh Parthasarathy" --pnr "GABWME" --flight_num "DL2022" --dep_code "SLC" --dep_city "Salt Lake City" --arr_code "SEA" --arr_city "Seattle" --dep_time "20:46" --departure_time "2017-07-28T20:46" -seats "XX" --total_price "322.40" --arrival_time "2017-07-28T21:54" --travel_class "economy" 
