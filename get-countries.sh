#!/bin/bash

file="countries/countries.json"
echo "Getting country list from restcountries.eu and storing it in $file"
`curl -X GET "https://restcountries.eu/rest/v1/all" > $file`
