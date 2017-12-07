'use strict';


const templates = [
  "what days are %s open?",
  "%s operating hours",
  "%s operating season",
  "what season does %s operate?",
  "which season does %s operate?",
];

const tourNames = [
  "pirate days cruise", "pirates cruise", "pirate's day", "pirate day adventure cruise", "pirates tour", "pirate days tour", "sunset cruise", "sunset tour", "sunset", "tout bagay", "tout bagay cruise", "tout bagay tours", "tout bagay trip"
];


tourNames.forEach(name => {
  templates.forEach(template => {
    console.log(template.replace("%s",name));
  });
});
