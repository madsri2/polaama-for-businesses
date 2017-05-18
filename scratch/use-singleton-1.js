'use strict';

const baseDir = '/home/ec2-user';

function SingletonUser() {
  require(`${baseDir}/scratch/singleton`).get();
}

module.exports = SingletonUser;
