#!/usr/bin/perl -w
my $trip = "holland";
`cp trips/$trip.txt trips/.$trip.txt.orig` if -e "trips/$trip.txt";
`cp trips/$trip-data.txt trips/.$trip-data.txt.orig` if -e "trips/$trip-data.txt";
`cp trips/$trip-itinerary.txt trips/.$trip-itinerary.txt.orig` if -e "trips/$trip-itinerary.txt";
