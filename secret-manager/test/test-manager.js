'use strict';

const SecretManager = require('secret-manager/app/manager');
const expect = require('chai').expect;

describe("testing secret manager", function() {
  it("test basic encrypt/decrypt", function() {
    const manager = new SecretManager();
    const encrypted = manager.encrypt("Hello World");
    expect(manager.decrypt(encrypted)).to.equal("Hello World");
  });
});
