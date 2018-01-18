'use strict';

const TrainingData = require('hackshaw-handler/app/training-data');
const trainingData = new TrainingData();

/*
trainingData.trainPassengerCountPrivateCharter();
trainingData.trainPassengerCountWhaleWatch();
trainingData.trainPassengerCountGroupSports();
trainingData.trainPassengerCountDashSplash();
trainingData.trainPassengerCountBottomFishing();
*/

// trainingData.trainQuestionAboutFish();

// trainingData.trainDolphinWhalesTypes();

console.log(trainingData.trainAdditionalLocationMessages());
