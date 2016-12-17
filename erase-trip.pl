#!/usr/bin/perl -w

use Getopt::Std;
use JSON;
use File::Slurp;
use Data::Dumper;

# A script used for testing. Meant to be used only by me.
my %options = ();
getopts("t:",\%options);
die "usage: $0 -t <trip name>" if !defined ($options{t});

print "Are you sure? [y/n]: ";
while(<>) {
  chomp;
  exit if($_ ne "y");
  last;
}
my $trip = lc $options{t};
$trip =~ s/ /_/g;

# Delete from all sessions.
my $sessionDir = "sessions";
opendir(DIR,$sessionDir) || die $!;
while(my $file = readdir DIR) {
  # ignore files starting with "."
  next if($file =~ /^\./); 
  $sessionFile = "$sessionDir/$file";
  my $content = decode_json(read_file("$sessionFile"));
  my $trips = $content->{'trips'};

  my $contentUpdated = 0;
  if(defined $trips->{$trip}) {
    delete $trips->{$trip};
    $contentUpdated = 1;
  }
  if(defined($content->{'tripNameInContext'}) && ($content->{'tripNameInContext'} eq $trip)) {
    print "Deleting trip name in context from file $sessionFile\n";
    delete $content->{'tripNameInContext'};
    delete $content->{'rawTripNameInContext'};
    $contentUpdated = 1;
  }
  next if (!$contentUpdated);
  # copy file to orig, just to be safe.
  write_file("$sessionDir/.$file.orig",read_file("$sessionFile")) || die $!;
  print "Removing trip $trip from file $sessionFile\n";
  # Now write the updated content into file
  write_file($sessionFile, encode_json($content)) || die $!;
}

# Finally, delete the trip file from "trips" directory
print "Removing trip file trips/$trip.txt\n";
`mv trips/$trip.txt trips/.$trip.txt.orig`;
