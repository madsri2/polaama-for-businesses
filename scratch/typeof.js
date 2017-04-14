'use strict';

function UserException() {
  this.message = "Works";
  this.name = "UserException";
}

const e = new UserException();
console.log(typeof e);
