// We use these steps to load the "vanilla" js library into node
const fs = require("fs");
const path = require("path");
const bundle = fs.readFileSync(
  path.resolve(__dirname, "../dist/bundle.js"),
  "utf8"
);
eval(bundle);

module.exports = raji;
