'use strict';

const o = {};
console.log(o.a);

// o.a = false;

if(o.a !== undefined) o.a = true;
// else console.log(`o.a is undefined`);

// console.log(`o.a is ${o.a}`);
  let message = {
    recipient: {
      id: 123
    }
  };
  console.log(JSON.stringify(message));
