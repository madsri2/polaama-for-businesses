#!/usr/bin/perl -w

use Getopt::Long;
use JSON;
use File::Slurp;
use Data::Dumper;
my $fbid;
GetOptions(
  "f=s" => \$fbid
);
my $baseDir = "/home/ec2-user";
die "usage: $0  -f <user-fbid>" if !$fbid;
print  "filename is ${fbid}.session\n";
my $fbidText = eval { decode_json(read_file("${baseDir}/fbid-handler/fbid.txt")) };
die "could not find details for fbid $fbid in fbid.txt file" if((!defined $fbidText) || (!defined $fbidText->{$fbid}));
my $encodedFbid = $fbidText->{$fbid}->{'id'};
print "encoded fbid $fbid is $encodedFbid\n";
my @t = `ls $baseDir/trips/$encodedFbid/`;
print "@t\n";
