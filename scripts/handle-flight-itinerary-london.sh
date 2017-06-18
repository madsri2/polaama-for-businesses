#!/bin/sh

cd /home/ec2-user/flight-details-parser/;
node app/handle-flight-itinerary.js --names "Aparna Rangarajan" --pnr "KLZ72D" --flight_num "BA" --dep_code "SEA" --dep_city "Seattle" --arr_code "SLC" --arr_city "Salt Lake City" --dep_time "07:24" --departure_time "2017-07-26T07:24" -seats "XX" --total_price "322.40" --arrival_time "2017-07-26T10:26" --travel_class "economy" 
