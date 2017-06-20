#! /usr/bin/env node
const commander = require("commander");
const firebase = require("firebase");
const worker = require("../src/worker");
const superagent = require("superagent");
const hasbin = require("hasbin");
const version = require("../package.json").version;

//FIXME: Move to config.
const hostUrl = process.env.HACKER_BOX_HOST || "https://hacker-box.com";
const tokenUrl = `${hostUrl}/api/users/token`;
const fbConfig = {
  apiKey: "AIzaSyAn_heWvfa920SNfmJpqAV9ZJDSHCARtlI",
  authDomain: "hacker-box.firebaseapp.com",
  databaseURL: "https://hacker-box.firebaseio.com",
  storageBucket: "hacker-box.appspot.com",
  messagingSenderId: "625217304650"
};

function initFirebase(pin) {
  firebase.initializeApp(fbConfig);

  console.log("hacker-box-cli version ", version);

  superagent
    .post(tokenUrl)
    .type("json")
    .accept("json")
    .send({ passcode: pin, version })
    .then(res => {
      const { token, userId } = res.body;
      firebase.auth().signInWithCustomToken(token).then(() => {
        const queueRef = firebase.database().ref(`users/${userId}/queue`);
        worker(queueRef);
      });
    })
    .catch(err =>
      console.error(
        `${err.status || err.code}: ${err.response ? err.response.text : "Connection failed!"}\nLogin to ${hostUrl} to generate pin.`
      )
    );
}

var pin;
commander
  .version("0.0.1")
  .usage("<pin>")
  .arguments("<pin>")
  .action(function(inputPin) {
    pin = inputPin;
  })
  .parse(process.argv);

if (!pin) {
  console.error("");
  console.error(`  No pin specified! Login to ${hostUrl} to generate pin.`);
  commander.outputHelp();
  process.exit(1);
}

if (!hasbin.sync("git")) {
  console.error("");
  console.error(
    'Not able to find "git" in the path. Please install git to proceed'
  );
  console.error("");
  process.exit(1);
}

if (!hasbin.sync("yarn")) {
  console.error("");
  console.error(
    'Not able to find "yarn" in the path. Please install yarn to proceed. See https://yarnpkg.com/'
  );
  console.error("");
  process.exit(1);
}

initFirebase(pin);
