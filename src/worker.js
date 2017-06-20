const defaultCwd = require("path");
const fbQueue = require("firebase-queue");
const createRunner = require("./runner");
const registerWorker = require("./register");
const commandParser = require("./parser");
const firebase = require("firebase");
const { chdir, writeFile, writeFileBulk } = require("./commands");
const stripAnsi = require("strip-ansi");
const hbox = require("./hbox");

let runners = {};

const killall = () => Object.keys(runners).forEach(id => runners[id].stop());

const logCreator = bufferRef => logLine => {
  bufferRef.child("log").push(logLine);
  process.stdout.write((logLine.msg || "").toString("utf8"));

  if (logLine.err) {
    process.stderr.write(logLine.err.toString());
  }
};

function updateRunners() {
  runners = Object.keys(runners).reduce(
    (runMap, id) =>
      (runners[id].ended
        ? runMap
        : Object.assign({}, runMap, { [id]: runners[id] })),
    {}
  );
}

function processCommands(cmd) {}

function runCommand(task, progress, resolve, reject, log) {
  const { id, appId, command, options } = task;

  const runner = createRunner();
  runner.id = id;
  runner
    .run(command, options)
    .data(msg => {
      const msgLine = msg || "";
      log({ action: "data", id, appId, msg: stripAnsi(msgLine) });
    })
    .err((err, msg, code) => {
      log({
        action: "error",
        id,
        appId,
        err: err || "",
        msg: msg || "",
        code: code || -1
      });
      resolve(err);
    })
    .end((err, msg, code) => {
      // log({ action: "end", id, appId, err, msg, code });
      updateRunners();
      resolve();
      //err || code !== 0 ? reject(err) : resolve();
    })
    .exit((code, signal) => {
      log({
        action: "exit",
        msg: "",
        id,
        appId,
        code: code || "",
        signal: signal || "NOSIGNAL"
      });
      updateRunners();
      //code !== 0 ? reject(`Exit code: ${code}`) : resolve();
      resolve();
    });

  runners[id] = runner;
  return runner;
}

const MAX_TRIES = 5;
function exitProcess(tryCnt) {
  const num = Object.keys(runners).length;
  console.log(`WORKER: Total ${num} of child process running. Try ${tryCnt}`);
  if (num === 0 || tryCnt > MAX_TRIES) {
    console.log("WORKER: Exiting process");
    return process.exit(1);
  }
  setTimeout(() => exitProcess(tryCnt++), 1000);
}

function handleTask(task, progress, resolve, reject) {
  const { id, appId, command, options, bufferUrl } = task;
  const bufferRef = firebase.database().refFromURL(bufferUrl);
  const log = logCreator(bufferRef);

  process.stdout.write(`$ ${command}\n`.toString("utf8"));
  task.command = commandParser(command);
  switch (task.command.arg0) {
    case "cd":
      chdir({ task, log, resolve, reject });
      break;

    case "killall":
      killall();
      resolve();
      break;

    case "writeFile":
      writeFile({ task, log, resolve, reject });
      break;

    case "writeFileBulk":
      writeFileBulk({ task, log, resolve, reject });
      break;

    case "stop":
      const taskId = task.command.args.shift();
      if (runners[taskId]) {
        log({ action: "exit", id, appId, msg: "Stopped!" });
        runners[taskId].stop();
      } else {
        log({ action: "exit", id, appId, msg: "Not found!" });
      }
      resolve();
      break;

    default:
      runCommand(task, progress, resolve, reject, log);
      break;
  }
}

function worker(queueRef) {
  const hboxJson = hbox.init();
  if (!hboxJson) {
    return exitProcess(0);
  }
  const queue = new fbQueue(
    queueRef,
    { numWorkers: 5, suppressStack: false },
    handleTask
  );

  registerWorker(queueRef, hboxJson);
  console.log("Initialized!");
  // graceful shutdown
  let tries = 0;
  process.on("SIGINT", () => {
    tries++;
    console.log("WORKER: Starting queue shutdown...");
    killall();
    console.log("WORKER: Starting queue shutdown...");
    if (tries > 2) {
      exitProcess(0);
    }
    queue.shutdown().then(() => {
      console.log("WORKER: Finished queue shutdown.");
      exitProcess(0);
    });
  });
}

module.exports = worker;
