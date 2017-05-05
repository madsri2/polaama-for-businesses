#!/bin/sh

cd /home/ec2-user/flight-details-parser/;
node app/handle-flight-bp-email.js --name "Hu Tha" --pnr "VPWMFR" --flight_num "VX222" --dep_code "SFO" --dep_city "San Francisco" --arr_code "SJC" --arr_city "San Jose" --dep_time "15:15" --dep_date "5/10/2017" --email madsri2@gmail.com --attachment "2017-05-04T21:29/mime-attachment.png"
