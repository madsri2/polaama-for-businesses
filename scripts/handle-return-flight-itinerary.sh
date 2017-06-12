#!/bin/sh

cd /home/ec2-user/flight-details-parser/;
node app/handle-flight-itinerary.js --names "Gillian Morris" --pnr "XXXXX" --flight_num "UA91" --dep_code "TLV" --dep_city "Tel Aviv" --arr_code "EWR" --arr_city "Newark" --dep_time "23:10" --dep_date "06/18/2017" -seats "XX" --total_price "00.00" --arrival_time "2017-06-19T04:11" --travel_class "economy" 
