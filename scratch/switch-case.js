'use strict';

const p = ["1", "2"];

function f1(a) {
  switch(a) {
    case p[0]: console.log(p[0]); break;
    case p[1]: console.log(p[1]); break;
  }
}

f1("2");
