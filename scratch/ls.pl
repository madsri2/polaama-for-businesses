#!/usr/bin/perl -w

my $baseDir = "/home/ec2-user";
my $tripDir = "$baseDir/trips";
my @trip = `ls $tripDir/holland*`;
print @trip;
