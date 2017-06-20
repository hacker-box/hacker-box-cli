function chdir({ task, log, resolve, reject }) {
  const { id, command, appId } = task;
  try {
    const dir = command.args.shift();
    process.chdir(dir);
    log({
      action: "exit",
      id,
      appId,
      msg: process.cwd().toString("utf8") + "\n"
    });
    resolve();
  } catch (err) {
    log({ action: "error", id, appId, err: err.toString("utf8") });
    resolve();
  }
}

module.exports = chdir;
