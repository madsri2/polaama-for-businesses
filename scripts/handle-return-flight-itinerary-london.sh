#!/bin/sh

cd /home/ec2-user/flight-details-parser/;
node app/handle-flight-itinerary.js --names "Aparna Rangarajan" --pnr "KLZ72D" --flight_num "BA279" --aircraft_type "Boeing 787-9" --dep_code "LHR" --dep_city "London" --arr_code "SJC" --arr_city "San Jose" --departure_time "2017-06-23T15:00" --arrival_time "2017-06-23T18:00" --travel_class "business" --total_price "10103.26"
