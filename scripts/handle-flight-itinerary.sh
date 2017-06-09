#!/bin/sh

cd /home/ec2-user/flight-details-parser/;
node app/handle-flight-itinerary.js --names "Madhuvanesh Parthasarathy" --pnr "XXXXX" --flight_num "UA90" --dep_code "EWR" --dep_city "Newark" --arr_code "TLV" --arr_city "Tel Aviv" --dep_time "23:10" --departure_time "2017-06-10T22:45" -seats "XX" --total_price "XXX.XX" --arrival_time "2017-06-11T16:20" --travel_class "economy" 
