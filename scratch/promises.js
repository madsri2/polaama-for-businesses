'use strict';


let promiseList = [];
promiseList = promiseList.concat(f1());
promiseList = promiseList.concat(f2());

const activities = Promise.denodeify(tip.getActivities.bind(tip));

function f1() {
  return new Promise(function(fulfil, reject) {
    if(true) fulfil("f1");
    else reject("f1 failed");
  });
}

function f2() {
  return new Promise(function(fulfil, reject) {
    if(false) fulfil("f2");
    else reject("f2 failed");
  });
}
