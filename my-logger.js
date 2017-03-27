// NOTE: this adds a filename and line number to winston's output
// Example output: 'info (routes/index.js:34) GET 200 /index'

const path = require('path')
const PROJECT_ROOT = path.join(__dirname, '..')

const Log = require('./logger');
let logger = (new Log("logger.conf")).init();

// this allows winston to handle output from express' morgan middleware
logger.stream = {
  write: function (message) {
    logger.info(message)
  }
}

// Use this if you want to send a different conf file. See ~/test-logger.js for example
module.exports.setTestConfig = function() {
  logger = (new Log("test-logger.conf")).init();
}

// A custom logger interface that wraps winston, making it easy to instrument
// code and still possible to replace winston in the future.

module.exports.debug = module.exports.log = function () {
  logger.debug.apply(logger, formatLogArguments(arguments))
}

module.exports.info = function () {
  logger.info.apply(logger, formatLogArguments(arguments))
}

module.exports.warn = function () {
  logger.warn.apply(logger, formatLogArguments(arguments))
}

module.exports.error = function () {
  logger.error.apply(logger, formatLogArguments(arguments))
}

module.exports.stream = logger.stream

/**
 * Attempts to add file and line number info to the given log arguments.
 */
function formatLogArguments (args) {
  args = Array.prototype.slice.call(args)

  var stackInfo = getStackInfo(1);

  if (stackInfo) {
    // get file path relative to project root
    var calleeStr = '[' + stackInfo.relativePath + ':' + stackInfo.line + ']';

    if (typeof (args[0]) === 'string') {
      args[0] = calleeStr + ' ' + args[0]
    } else {
      args.unshift(calleeStr)
    }
  }

  return args
}

/**
 * Parses and returns info about the call stack at the given index.
 */
function getStackInfo (stackIndex) {
  // get call stack, and analyze it
  // get all file, method, and line numbers
	Error.stackTraceLimit = 5;
  var stacklist = (new Error()).stack.split('\n').slice(3);

  // stack trace format:
  // http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
  // do not remove the regex expresses to outside of this method (due to a BUG in node.js)
  var stackReg = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/gi
  var stackReg2 = /at\s+()(.*):(\d*):(\d*)/gi

  var s = stacklist[stackIndex] || stacklist[0]
  var sp = stackReg.exec(s) || stackReg2.exec(s)

	// console.log(sp);
  if (sp && sp.length === 5) {
    return {
      method: sp[1],
      relativePath: path.relative(PROJECT_ROOT, sp[2]),
      line: sp[3],
      pos: sp[4],
      file: path.basename(sp[2]),
      stack: stacklist.join('\n')
    }
  }
}
