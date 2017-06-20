const spawnargs = require("spawn-args");
const spaceRegex = /[\s\t]+/;
function parser(cmd) {
  const [arg0, ...rest] = cmd.trim().split(spaceRegex);
  const args = spawnargs((rest || []).join(" "), { removequotes: "always" });
  return {
    arg0,
    args
  };
}

module.exports = parser;
