'use strict';
const NBClassifier = require('sea-spray-handler/app/nb-classifier');
const fs = require('fs');

function capitalize1stChar(str) {
  return str.replace(/^[a-z]/g, function(letter, index, string) {
    return index == 0 ? letter.toUpperCase() : letter;
  });
}

const entities = ["pirate", "tout bagay", "sunset"];

const classifier = new NBClassifier();
const details = classifier.commonClassifier.classifier.details;
Object.keys(details).forEach(category => {
  let contents = {};
  contents.name = capitalize1stChar(category);
  contents.auto = true;
  contents.responses = [];
  const action = category.replace(/ /g,'-');
  contents.responses.push({'action': action});
  contents.userSays = [];
  details[category].forEach(line => {
    let values = [];
    entities.forEach(entity => {
      const idx = line.search(entity);
      if(idx !== -1) {
        const prefix = line.substr(0,idx);
        if(prefix.length > 0) values.push(prefix);
        const entityLen = entity.length;
        values.push(line.substr(idx, entityLen));
        const postfix = line.substr(idx + entityLen, line.length);
        if(postfix) values.push(postfix);
      }
    });
    let data = [];
    if(!values.length) data.push({'text': line});
    else {
      values.forEach(item => {
        if(entities.includes(item)) data.push({
          'text': item,
          'alias': "tourName",
          'meta': "@tourName",
          'userDefined': true
        });
        else data.push({'text': item});
      });
    }
    contents.userSays.push({'data': data});
  });
  fs.writeFileSync(`/tmp/${action}.json`, JSON.stringify(contents));
});
