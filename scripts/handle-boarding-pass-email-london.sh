#!/bin/sh

cd /home/ec2-user/flight-details-parser/;
node app/handle-flight-bp-email.js --name "Aparna Rangarajan" --pnr "KLZ72D" --flight_num "BA0278" --dep_code "SJC" --dep_city "San Jose" --arr_code "LHR" --arr_city "London" --dep_time "20:15" --dep_date "6/17/2017" --email madsri2@gmail.com --attachment "2017-06-17T22:59/image.png" --seat "13D" --terminal "B" --gate "51B" --boarding_time "19:30" --group "B"
