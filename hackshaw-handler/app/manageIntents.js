'use strict';

const IntentManager = require('dialogflow/app/intent-manager');
const TrainingData = require('hackshaw-handler/app/training-data');
const SecretManager = require('secret-manager/app/manager');

const entities = [
{
  "value": "Private charter",
    "synonyms": [
      "Private Charter",
    "private",
    "private boat",
    "private tour",
    "own charter",
    "private charters",
    "private boats",
    "private tours",
    "charter boat"
    ]
},
{
  "value": "Dolphin and Whale watching",
  "synonyms": [
    "Dolphin and Whale watching",
  "Dolphin watching",
  "Whale watching",
  "dolphins and whales",
  "dolphins, whales",
  "whale and dolphin watching",
  "dolphins & whales",
  "whales & dolphins",
  "dolphin and whale",
  "dolphin & whale",
  "whale watch",
  "dolphin watch",
  "dolphin tour",
  "dolphin trip",
  "whale tour",
  "whale trip",
  ]
},
{
  "value": "Group sports fishing",
  "synonyms": [
    "Group sports fishing",
  "sports fishing with group",
  "group fishing",
  "sport fishing",
  "group sports",
  "Deep sea sports fishing",
  "Deep sea fishing",
  "group sports fish",
  "sports fishing",
  "fishing as a group",
  "fishing in group",
  "group sport"
  ]
},
{
  "value": "Bottom fishing",
  "synonyms": [
    "Bottom fishing",
  "Bottom fishing bonanza",
  "bottom fishing",
  "Bottom Fishing",
  "bottom fish",
  "Bottom fish",
  "fishing trip",
  "fishing tour",
  ]
},
{
  "value": "Dash and splash",
  "synonyms": [
    "Dash and splash",
  "Dash n splash",
  "Dash Splash",
  "Dash, splash tours",
  "dash and splash half speed boat",
  "dash and splash speed boat",
  "dash splash half speed boat",
  "dash splash speed boat",
  "Dash & splash speed boat",
  "half speed boat",
  "speed boat"
  ]
}];

/*
const data = [
  "how many people can go on whale watching trip",
	"how many people can go on private charter trip",
	"capacity of private charter trip"
];
*/
// Format the training data in a form that dialogflow's PUT intent API likes
function formatIntentTrainingData(data) {
  const pcTrainingSet = [];
  data.forEach(line => {
      const l = line.toLowerCase();
      let added = false;
      entities.forEach(entityList => {
          if(added) return;
          entityList.synonyms.forEach(k => {
              const key = k.toLowerCase();
              if(added) return;
              let arr = [];
              let idx = l.indexOf(key);
              if(idx < 0) return;
              arr.push({
                text: l.substr(0,idx)
              });
              arr.push({
                alias: "tourName",
                meta: "@tourName",
                text: key
              });
              idx += key.length;
              arr.push({
                text: l.substr(idx, l.length),
                userDefined: "true"
              });
              // console.log(`<${JSON.stringify(arr)}>`);
              pcTrainingSet.push(arr);
              added = true;
          });
      });
      if(!added) pcTrainingSet.push([{
        text: line,
        userDefined: "true"
      }]);
  });
  return pcTrainingSet;
  // console.log(`<${JSON.stringify(pcTrainingSet, null, 2)}>`);
}

function processRequest(intentName, action) {
  const trainingData = new TrainingData();
  const intentList = {
    "Dolphin Whale success rate": {
      id: "cbefbd31-5861-4cc5-9070-c817f29fc8ac", // intent id
      data: trainingData.trainDolphinWhaleSuccessRate(),
      action: "dolphin-whale-success-rate",
    },
    "Location": {
      id: "98813d0b-5967-448e-9b2f-ec39cf16f8c6",
      data: trainingData.trainAdditionalLocationMessages(),
      action: "location",
    },
    "Passenger Count": {
      action: "passenger-count",
      id: "ab0cb727-22d7-42ab-bcb8-1231b13e65cd",
      data: trainingData.trainPassengerCount(),
    },
    "Operating Days": {
      action: "operating-days",
      id: "bf58b76c-90d2-46d6-a22a-1c13c85b3ae4",
      data: trainingData.trainOperatingDays(),
    }
  };
  if(!intentList[intentName]) {
    console.log(`intentName '${intentName}' does not exist in my intentList. Either add it and then call me or use a valid intentName`);
    return;
  }

  intentList[intentName].trainingSet = formatIntentTrainingData(intentList[intentName].data);
  const accessToken = new SecretManager().getHackshawDialogflowDeveloperAccessToken();
  const manager = new IntentManager("Hackshaw", accessToken);

  // console.log(intentList[intentName].data);
  if(action === "create") return manager.createIntent(intentName);
  if(action === "get") return manager.getIntent(intentName, intentList[intentName]);
  if(action === "update") return manager.updateIntent(intentName, intentList[intentName]);
}

if(process.argv.length < 4) {
  console.log(`usage: ${process.argv[1]} <name of intent> <update, create or get>`);
  process.exit();
}
if(process.argv[3] !== "update" && process.argv[3] !== "create" && process.argv[3] !== "get") {
  console.log(`only accepted values for the 2nd argument or 'create' and 'update'`);
  process.exit();
}
processRequest(process.argv[2], process.argv[3]);
