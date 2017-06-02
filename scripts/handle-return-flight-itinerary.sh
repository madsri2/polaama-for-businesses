#!/bin/sh

cd /home/ec2-user/flight-details-parser/;
node app/handle-flight-itinerary.js --names "Madhuvanesh Parthasarathy" --pnr "JJXWQ8" --flight_num "DL 4499" --dep_code "ABQ" --dep_city "Albuquerque" --arr_code "SLC" --arr_city "Salt Lake City" --dep_time "18:05" --dep_date "6/05/2017" -seats "08D" --total_price "537.60" --arrival_time "19:45" --travel_class "economy" --flight_num "DL 916" --dep_code "SLC" --dep_city "Salt Lake City" --arr_code "SEA" --arr_city "Seattle" --dep_time "22:05" --dep_date "6/05/2017" -seats "13F" --arrival_time "23:10" --travel_class "economy"
