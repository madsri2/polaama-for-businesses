'use strict'
const Calculator = require('../app/calculator');
const expect = require('chai').expect;

describe("Expense Report calculator tests", function() {
  const families = {
    "fam-ma" : ["Madhu", "Aparna", "M", "A"],
    "fam-rj" : ["Reshma", "Jaideep", "J", "R"]
  };
  it("Simple test with two families and 3 comments", function() { 
    const calc = new Calculator();
    const comments = ["A paid 50 usd for lunch on 2/12","Reshma owes Aprna 20$"];
    const expectedResult = {
      'owesReport': {
        'fam-rj': [{
          'famOwed': 'fam-ma', 
          'amtOwed': 45
        }]
      },
      'spendSummary': {
        'fam-ma': 70
      }
    };
    expect(calc.calculate(comments, families)).to.deep.equals(expectedResult);
  });

  it("Test where both families paid for something", function() {
    const comments = ["A paid 50 usd for coffee", "Jaideep paid 100$ for dinner"];
    const calculator = new Calculator();
    const result = {
      'spendSummary': {
        'fam-ma': 50,
        'fam-rj': 100
      },
      'owesReport': {
        'fam-ma': [{
          'famOwed': 'fam-rj',
          'amtOwed': 25
        }]
      }
    };
    expect(calculator.calculate(comments, families)).to.deep.equals(result);
  });

  it("Test euros, multiple amounts and more commands", function() {
    const comments = ["Madhu paid 100$ for xyz", "A owes R 50 euros for yzf", "Madhu paid 50+10+20 euros for yzf", "Jaidep paid 105 euros for taxi"];
    const calculator = new Calculator();
    const result = {
      'owesReport': {
        'fam-ma': [{
          'famOwed': 'fam-rj',
          'amtOwed': 16.43
        }]
      },
      'spendSummary': {
        'fam-ma': 185.03,
        'fam-rj': 164.75
      }
    };
    expect(calculator.calculate(comments, families)).to.deep.equals(result);
  });

  it("Test all comments from portugal trip", function() {
    const comments = [
    "Jaideep owes Madhu $126 for Airbnb Stay at Lisbon (2/8 - 2/9)",
    "Jaideep owes Madhu $122.5 for Airbnb stay at Porto",
    "Jaideep owes Madhu $65 for Airbnb stay at Sintra",
    "jaideep paid 80 euros for dinner on 2/5",
    "jaideep paid 43 euros for lunch on 2/6",
    "madhu paid 41 euros for castilo ticket and bus trip cket on 2/6",
    "jaideep paid 52 euros for lunch on 2/7",
    "jaideep paid 45 euros for pena palace on 2/7",
    "madhu paid 12 euros for audio tour 2/7",
    "madhu paid 70 euros for dinner on 2/7",
    "madhu paid 13 euros for fruits and water on 2/8 morning",
    "jaideep paid 10+24+54+18 euros for breakfast, quinta tickets, lunch, coimbra ruins on 2/8 afternoon",
    "jaideep paid 110 euros for dinner on 2/8 ",
    "jaideep paid 86.50 euros for breakfast on 2/9",
    "Madhu owes jaideep 30 euros for porto walk",
    "madhu paid 47 euros for lunch on 2/9",
    "reshma owes aparna 10 euros for 2/10 dinner",
    "madhu paid 10 euros for car parking on 2/10",
    "madhu owes jaideep 12 euros for dinner on 2/10",
    "madhu paid 24 euros for breakfast on 2/10 at feira",
    "reshma paid 12 euros for castle on 2/10",
    "reshma owes a 4 euro for evora church",
    "jaideep owes madhu 30 euros for dinner on 2/10",
    "reshma owes aparna 13 euros for olive oil in evora",
    "madhu paid 72 euros for walking tour and bones church on 2/10",
    "aideep paid 151 euros for parking and gas on 2/13"
    ];
    const calculator = new Calculator();
    const result = {
      'owesReport': {
        'fam-rj': [{
          'famOwed': 'fam-ma',
          'amtOwed': 118.72
        }]
      },
      'spendSummary': {
        'fam-rj': 773.26,
        'fam-ma': 681.27
      }
    };
    expect(calculator.calculate(comments, families)).to.deep.equals(result);
  });

  it("Test comments from iceland trip", function() {
    const families = {
      "fam-ma" : ["Madhu", "Aparna"],
      "fam-aa" : ["Arpan", "Avani"],
      "fam-n" :  ["Nabeel"]
    };
    const comments = [
        "Madhu paid $5/- deposit for lambhus from 9/5 - 9/7",
        "Arpan paid $20.00 for Airbnb at Akureyri",
        "Madhu paid $5 for Blabjorg guesthouse",
    ];
    const result = {
			"owesReport": {
        "fam-n": [
         {
          "famOwed": "fam-ma",
          "amtOwed": 2
         },
         {
          "famOwed": "fam-aa",
          "amtOwed": 4
         }],
        "fam-ma": [
         {
          "famOwed": "fam-aa",
          "amtOwed": 4
         }]
      },
      'spendSummary': {
        'fam-ma': 10,
        'fam-aa': 20
      }
    };
    const calc = new Calculator();
    expect(calc.calculate(comments, families)).to.deep.equals(result);
    // console.log(JSON.stringify(calc.calculate(comments, families), null, ' '));
  });
});
