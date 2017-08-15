const moment = require('moment');
const validator = require('node-validator');

const customValidator = {
    validate: validateStartDate
};

function validateStartDate(value, onError) {
  const now = moment();
  
  const check = validator.isObject()
    .withRequired('startDate', validator.isDate());

  var errCount = 0;
  var error = {};
  validator.run(check, { startDate: value}, function(ec, e) {
      errCount = ec;
      error = e;
  });
  if(errCount > 0) {
    return onError(error[0].message, error.parameter, error.value);
  }
  if(value.match(/\d+\/\d+/)) {
    value = value.concat(`/${new Date().getFullYear()}`);
  }

  console.log(`Date: ${new Date(value).toISOString()}`);
  if(now.diff(moment(new Date(value).toISOString()),'days') >= 0) {
    return onError("Date is in the past","",value);
  }
  return null;
}

const sd = {
  startDate: "05/11",
  duration: parseInt("100"),
  destination: "India"
};

const customCheck = validator.isObject()
  .withRequired('duration', validator.isInteger({min: 1, max: 200}))
  .withRequired('startDate', customValidator)
  .withRequired('destination', validator.isString({regex: /^[A-Za-z]+$/}));

function testValidator() {
  validator.run(customCheck, sd, function(ec, e) {
    console.log(`error count: ${ec}, error: ${JSON.stringify(e)}`);
  });
}

function testFormatting() {
  console.log(moment().add(2, 'days').format("YYYY-MM-DDTHH:mm"));
  // console.log(`${moment("11/1/17","MM/D/YY")}`);
}

function dateDiff() {
  const start = moment(new Date("6/7/17").toISOString());
  const ret = moment("2017-06-15");
  const duration = ret.diff(start, 'days') + 1;
  console.log(`Duration: ${duration} days`);
}

function formats() {
  // console.log(new moment("7/1"));
  console.log(new moment("07/01/17"));
  console.log(new moment("2017-07-17"));
}

function patternMatch() {
  command = "4/12";
  const regex1 = /([a-zA-Z]+) (\d+)/;
  console.log(regex1.exec(command));
  const regex2 = /(\d+)\/(\d+)/;
  console.log(regex2.exec(command));
}

function compareHours() {
  const currTime = "01:30";
  const time = "01:30";
  const a = /(\d\d):(\d\d)/.exec(currTime);
  if(!a) throw new Error(`isBefore: currTime ${currTime} is not in expected format HH:mm`);
  const b = /(\d\d):(\d\d)/.exec(time);
  if(!b) throw new Error(`isBefore: Time ${time} is not in expected format HH:mm`);
  const a1 = moment().startOf('day').add(a[1], 'hours').add(a[2], 'minutes');
  const b1 = moment().startOf('day').add(b[1], 'hours').add(b[2], 'minutes');
  if(a1.isBefore(b1)) console.log("true");
  else console.log("false");
}

function compare() {
  const dateMoment = new moment(new Date("2017-6-22"));
  const sdMoment = new moment(new Date("2017-6-17"));
  const rdMoment = new moment(new Date("2017-6-25"));

  if(!dateMoment.isBetween(sdMoment, rdMoment) && !dateMoment.isSame(sdMoment) && !dateMoment.isSame(rdMoment)) {
    console.log(`isValidDate: ${dateMoment} is not between ${sdMoment} & ${rdMoment}`);
  }
}

function getDayMonthYear() {
  // const m = new moment(startDate);
  const sdMoment = new moment("2017-09-12");
  const startDate = sdMoment.date() < 10 ? `0${sdMoment.date()}` : sdMoment.date(); 
  const month = sdMoment.month() < 10 ? `0${sdMoment.month()}` : sdMoment.month(); 
  console.log(`getDayMonthYear: month ${month}; date ${startDate}; ${sdMoment.year()}`);
}

getDayMonthYear();

// compare();
// compareHours();
// patternMatch();

// formats();
// dateDiff();

// testFormatting();


