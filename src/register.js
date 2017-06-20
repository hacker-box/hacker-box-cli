const firebase = require("firebase");
const os = require("os");
const { write } = require("./hbox");

function register(queueRef, hbox) {
  firebase.database().ref(".info/connected").on("value", function(snapshot) {
    if (snapshot.val()) {
      var workerRef = queueRef.child("workers").push({
        hostname: os.hostname(),
        cwd: process.cwd(),
        hbox
      });
      workerRef.child("hbox").on("value", snap => {
        write(snap.val());
      });
      workerRef.onDisconnect().remove(err => err && console.error(err));
    }
  });
}

module.exports = register;
