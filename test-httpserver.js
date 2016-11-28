const _ = require('lodash');
const Log = require('./logger');
const logger = (new Log()).init();

function formatListResponse(headers, list) {
  if(_.isUndefined(headers) || _.isUndefined(headers['user-agent'])) {
    logger.info("header or user-agent not defined. sending back json");
    return list;
  }
  if(headers['user-agent'].startsWith("Mozilla")) {
    logger.info("request call from browser. sending back html");
    var html = "<ol>";
    list.forEach(function(item) {
      const itemWords = item.split(' ');
      itemWords.forEach(function(word,i) {
        if(/^https?:\/\//.test(word)) {
          const wordUrl = "<a href=" + word + ">" + word + "</a>";
          itemWords[i] = wordUrl;
        }
      });
      item = itemWords.join(' ');
      html += "<li>" + item + "</li>";
    });
    html += "</ol>";
    return html;
  }
  logger.info("request call from something other than browser. sending back json");
  return list;
}

const headers = {
  'user-agent': "Mozilla"
};

const list = ["a","b","https://a.com"];
console.log(formatListResponse(headers, list));
