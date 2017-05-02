#!/bin/sh

cd /home/ec2-user/flight-details-parser/;
node app/handle-flight-bp-email.js --name "Madhuvanesh Parthasarathy" --pnr "AGUPED" --flight_num "VX222" --dep_code "SFO" --dep_city "San Francisco" --arr_code "AUS" --arr_city "Austin" --dep_time "17:15" --dep_date "5/19/2017" --email madsri2@gmail.com --attachment "2017-04-20T08:18/attachment.png"
