#!/bin/bash

function call_google_cse {
  search=${1// /+}
  file=$2
  echo "calling google custom-search with search term <$search>. output will be in file <$file>"
  curl "https://www.googleapis.com/customsearch/v1?q=$search&cx=016727128883863036563%3Azuqchmgec0u&exactTerms=portugal&key=AIzaSyAKOhBJ0jUpku5AhKnclyBzCi0eoJLc0r0" > search-results/$file 
}

call_google_cse "$1" "$2"
echo ""
