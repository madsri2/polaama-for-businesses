'use strict';
const winston = require('winston');  
const util    = require('util');
const moment  = require('moment-timezone');

/**
 * A winston based profiler for express
 * @constructor
 */
function RequestProfiler() {

  /**
   * Tracks and profile all requests made to non static expressjs routes
   */
  const tsFormat = function() {
    return moment().tz('UTC').format("YYYY-MM-DD HH:mm:ss.SSS z");
  }
  const logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
				json: false, 
        colorize: true, 
        timestamp: tsFormat,
      }),
      new (winston.transports.File)({ 
        filename: '/home/ec2-user/log/profile.log',
        json: false, 
        colorize: true, 
        timestamp: tsFormat, 
      })
    ]
  });

  /**
   * An express middleware for profiling requests made to API
   * @returns {Function}
   */
  function profile() {
    return function(req, res, next) {
      req.profileInfo = util.format('%s %s', req.method, req.originalUrl);
      logger.profile(req.profileInfo);

      // Apply the detour to the express res.send function
      var sendFn = res.send;
      res.send = function() {
        sendFn.apply(res, arguments);
        logger.profile(req.profileInfo);
      };
      next();
    };
  }

  return {
    profile : profile
  };
}

module.exports = new RequestProfiler();
