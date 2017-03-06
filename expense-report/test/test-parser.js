'use strict';
const CommentsParser = require('../app/comment-parser');
const expect = require('chai').expect;

describe("Comment Parser tests", function() {
  const families = {
    "fam-A" : ["A", "B"],
    "fam-C" : ["C", "D"]
  };
  const parser = new CommentsParser(families);
  const expectedResult = {
    'fam-A': {
      'owes': {
      'fam-C': -25
      }
    }
  };

  it("Simple comment of the form \"A paid B 50 usd\"", function() {
    const comment = "A paid 50 usd for coffee on 12/2";
    expect(parser.parse(comment)).to.deep.equal(expectedResult);
  });

  // A paid 50$
  it("A paid 50$", function() {
    const comment = "A paid 50$ for tea";
    expect(parser.parse(comment)).to.deep.equal(expectedResult);
  });

  it("A paid $50", function() {
    const comment = "A paid $50 for tea";
    expect(parser.parse(comment)).to.deep.equal(expectedResult);
  });

  it("A paid $50/-", function() {
    const comment = "A paid $50/- for tea";
    expect(parser.parse(comment)).to.deep.equal(expectedResult);
  });

  it("A paid 50+30+40+20 euros", function() {
    const comment = "A paid 50+30+40+20 euros";
    const result = {
      'fam-A': {
        'owes': {
          'fam-C': -74.403
        }
      }
    };
    expect(parser.parse(comment)).to.deep.equal(result);
  });

  it("B owes A 4eur for blah", function() {
    const comment = "B owes A 4eur for blah";
    const result = {
      'fam-A': {
        'owes': {
          'fam-C': -4.252
        }
      }
    };
  });

  // A owes B
  it("A owes B 100$", function() {
    const comment = "A owes C 100$";
    const result = {
      'fam-A': {
        'owes': {
          'fam-C': 100
        }
      }
    };
    expect(parser.parse(comment)).to.deep.equal(result);
  });

  it("Test with non-integer dollar amount", function() {
    const comment = "A owes C $122.5 for Airbnb stay at Porto";
    const result = {
      'fam-A': {
        'owes': {
          'fam-C': 122.5
        }
      }
    };
    expect(parser.parse(comment)).to.deep.equal(result);
  });
});

describe("Test to match similar names", function() {
  const families = {
    "fam-A" : ["Aparna", "A"],
    "fam-C" : ["C", "D"]
  };
  const parser = new CommentsParser(families);
  const expectedResult = {
    'fam-A': {
      'owes': {
      'fam-C': -25
      }
    }
  };
  it("Matching Aprna and Aparna", function() {
    const comment = "Aprna paid 50 usd for coffee on 12/2";
    expect(parser.parse(comment)).to.deep.equal(expectedResult);
  });

  it("Not matching Aparna and Arpan", function() {
    const comment = "Arpan paid 50 usd for coffee on 12/2";
    expect(parser.parse.bind(parser, comment)).to.throw("findFamilyId: Could not find arpan or any name resembling it in any family");
  });
});


