#!/bin/sh

cd /home/ec2-user/flight-details-parser/;
node app/handle-flight-bp-email.js --name "Madhuvanesh Parthasarathy" --pnr "JEL8FX" --flight_num "UA1994" --dep_code "SFO" --dep_city "San Francisco" --arr_code "AUS" --arr_city "Austin" --dep_time "10:45" --dep_date "5/16/2017" --email madsri2@gmail.com --attachment "2017-05-11T06:26/images-019.ppm" --seat "3F" --boarding_time "10:10"
