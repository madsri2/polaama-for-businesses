'use strict';
const baseDir = '/home/ec2-user';
require(`${baseDir}/scratch/singleton`).get();
require(`${baseDir}/scratch/singleton`).get();

const SingletonUser = require(`${baseDir}/scratch/use-singleton-1`);
new SingletonUser();
