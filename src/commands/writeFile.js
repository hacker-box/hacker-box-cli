const mkdirp = require("mkdirp");
const fs = require("fs");
const prettier = require("prettier");
const path = require("path");

const dotJs = /\.js$/;
const prettierConfig = {
  printWidth: 80
};

function prettyJs(filePath, content) {
  try {
    return prettier.format(content, prettierConfig);
  } catch (err) {
    if (dotJs.test(filePath)) {
      console.error(err);
    }
    // ignore
  }
  return content;
}

function writeFile({ task, log, resolve, reject }) {
  const { id, command, appId, content } = task;
  const filePath = command.args.shift();
  mkdirp(path.dirname(filePath), function(err) {
    if (err) {
      log({ action: "error", id, appId, err: err.toString("utf8") });
      return reject();
    }
    fs.writeFile(filePath, prettyJs(filePath, content), err => {
      if (err) {
        log({ action: "error", id, appId, err: err.toString("utf8") });
        return reject();
      }
      log({
        action: "exit",
        id,
        appId,
        msg: filePath.toString("utf8") + "\n"
      });
      resolve();
    });
  });
}

function writeFileBulk({ task, log, resolve, reject }) {
  const { id, command, appId, content } = task;
  const root = command.args.shift();
  if (!content || !Array.isArray(content) || content.length === 0) {
    console.error("writeFileBulk: Content not found!", content);
    log({ action: "exit", id, appId, msg: "No Content" });
    return resolve();
  }
  let writeError;
  let cnt = 0;
  content.forEach((file, idx) => {
    const filePath = `${root}${path.sep}${file.path}`;
    if (writeError) {
      return;
    }
    mkdirp(path.dirname(filePath), function(err) {
      if (err) {
        writeError = err.toString("utf8");
        log({ action: "error", id, appId, err: writeError });
        return reject();
      }
      fs.writeFile(filePath, prettyJs(filePath, file.code), err => {
        if (err) {
          writeError = err.toString("utf8");
          log({ action: "error", id, appId, err: writeError });
          return reject();
        }
        cnt++;
        if (cnt === content.length) {
          log({
            action: "exit",
            id,
            appId,
            msg: content.map(f => f.path).join("\n")
          });
          return resolve();
        }
      });
    });
  });
}

module.exports = {
  writeFile,
  writeFileBulk
};
