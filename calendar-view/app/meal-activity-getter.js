'use strict';

const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);

function MealActivityGetter(dayItin) {
  this.dayItin = dayItin;
}

MealActivityGetter.prototype.getMealIndex = function(meal) {
  for(let idx = 0; idx < this.dayItin.length; idx++) {
    const activity = this.dayItin[idx];
    // logger.debug(`getMealIndex: looking at title ${activity.title} and subtitle ${activity.subtitle}. Looking for ${meal}. index is ${idx}`);
    if(activity.title && activity.title.toLowerCase().includes(meal)) return idx;
    if(activity.subtitle && activity.subtitle.toLowerCase().includes(meal)) return idx;
  }
  return -1;
}

module.exports = MealActivityGetter;
