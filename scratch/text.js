'use strict';
const fs = require('fs');
const text = "---------- Forwarded message ----------\nFrom: Alaska Airlines <MobileWebBoardingPass@alaskaair.com>\nDate: Tue, Nov 29, 2016 at 11:34 PM\nSubject: Alaska Airlines boarding passes for SEA - KOA on 11/30/2016\nTo: MADSRI2@gmail.com\n\n\nThis is an auto-generated email. Please do not reply. The email address is\nunmonitored.\n*Boarding pass*\n\n*Madhuvanesh Parthasarathy*\n\n****6915\nConfirmation code: RCJDBK\n\n[image: Boarding pass barcode 0]\n*INF*\n\nK class\nAlaska 875\nSEA - KOA 11/30/2016\nBoarding at\n\n5:50 pm Seat\n\n26C Gate\n\n-- \n------------------------------\n*Boarding pass*\n\n*Aparna Rangarajan*\n\n*****4862\nConfirmation code: RCJDBK\n\n[image: Boarding pass barcode 1]\n\nK class\nAlaska 875\nSEA - KOA 11/30/2016\nBoarding at\n\n5:50 pm Seat\n\n26B Gate\n\n-- \n------------------------------\n";

const baseDir = "/home/ec2-user";
const emailId = "aparnara@gmail.com";
const textFileName =  `${baseDir}/emails/text-${emailId}.json`;
const newtext = text.split("\\n").join("\n");
console.log(`writeText: Writing text to file ${textFileName}`);
fs.writeFileSync(textFileName, newtext);
