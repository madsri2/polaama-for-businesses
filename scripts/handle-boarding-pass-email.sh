#!/bin/sh

cd /home/ec2-user/flight-details-parser/;
node app/handle-flight-bp-email.js --name "Madhuvanesh Parthasarathy" --pnr "VPWMFR" --flight_num "Alaska 393" --dep_code "SJC" --dep_city "San Jose" --arr_code "SEA" --arr_city "Seattle" --dep_time "15:15" --dep_date "4/20/2017" --email madsri2@gmail.com
