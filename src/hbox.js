const os = require("os");
const fs = require("fs");
const path = require("path");
const { O_RDWR } = require("constants");

let fileJson = {};

function init() {
  const hboxPath = `${os.homedir()}${path.sep}.hacker-box.json`;
  try {
    fileJson = fs.readFileSync(hboxPath, { flag: O_RDWR });
    return JSON.parse(fileJson);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.log(`Creating ${hboxPath}`);
      fileJson.path = hboxPath;
      fs.writeFileSync(hboxPath, JSON.stringify(fileJson, null, 2));
      return fileJson;
    }

    if (err.name === "SyntaxError") {
      console.error(`\n SyntaxError in file ${hboxPath}\n\n`, err);
      return;
    }

    console.error(
      `\nNot able to write to ${hboxPath}. Pl. check permissions!\n\n`,
      err
    );
  }
}

function write(hbox) {
  if (!hbox) {
    return;
  }
  try {
    const hboxStr = JSON.stringify(hbox, null, 2);
    fs.writeFileSync(hbox.path, hboxStr);
  } catch (err) {
    console.error(
      "Invalid .hacker-box.json received from browser. Not saved!",
      hbox
    );
  }
}

module.exports = {
  init,
  write
};
