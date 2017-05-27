#!/bin/sh

cd /home/ec2-user/flight-details-parser/;
node app/handle-flight-bp-email.js --name "Van Par" --pnr "AGUPED" --flight_num "VX0222" --dep_code "SFO" --dep_city "San Francisco" --arr_code "AUS" --arr_city "Austin" --dep_time "17:15" --dep_date "5/25/2017" --email madsri2@gmail.com --attachment "2017-05-19T00:49/madhu-pass.png" --seat "14B" --terminal "2" --gate "51B" --boarding_time "16:40" --group "B"
