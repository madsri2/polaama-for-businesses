#!/usr/bin/perl -w

use JSON;
use Data::Dumper;
use File::Path qw(make_path);
use File::Slurp;

my $baseDir = "/home/ec2-user";
my $rawFbid = read_file("${baseDir}/fbid-handler/fbid.txt");
my $pageFbids = eval { decode_json($rawFbid) };
# print Dumper($pageFbids);
my $a = {};
foreach my $id (keys %$pageFbids) {
  # print "Looking at id $id\n";
  my $thisPageFbids = $pageFbids->{$id};
  # print Dumper($thisPageFbids);
  @a{keys %$thisPageFbids} = values %$thisPageFbids;  
}

# print Dumper(\%a);
my $fbidText = \%a;
print $fbidText->{'1309200042526761'}->{'id'}."\n";
