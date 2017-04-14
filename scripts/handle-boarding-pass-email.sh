#!/bin/sh

cd ~/flight-details-parser/;
node app/handle-flight-bp-email.js --trip "india" --name "Madhu Parthasarathy" --pnr "VPWMFR" --flight_num "Alaska 393" --dep_code "SJC" --dep_city "San Jose" --arr_code "SEA" --arr_city "Seattle" --dep_time "15:15"
