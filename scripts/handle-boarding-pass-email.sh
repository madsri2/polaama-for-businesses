#!/bin/sh

cd /home/ec2-user/flight-details-parser/;
node app/handle-flight-bp-email.js --name "Madhuvanesh Parthasarathy" --pnr "BABWHC" --flight_num "Alaska 393" --dep_code "SJC" --dep_city "San Jose" --arr_code "SEA" --arr_city "Seattle" --dep_time "15:15" --dep_date "4/22/2017" --email madsri2@gmail.com --attachment "2017-04-20T08:18/attachment.png"
