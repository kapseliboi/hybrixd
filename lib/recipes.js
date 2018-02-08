// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybridd - recipes.js
// Scans for and loads recipes dynamically from files

// required standard libraries
var fs = require("fs");
var path = require("path");

// required global configuration (TODO: encrypted storage option!)
var recipesdirectory = path.normalize(`${process.cwd()}/../recipes/`);

exports.init = init;

// initialize all recipes
function init(callbackArray) {

  fs.readdir(recipesdirectory, function (err1, files) {

    if (err1) {

      console.log(` [!] warning: error when reading ${err1}`);

    } else {
      // clear recipe assets
      global.hybridd.asset

      // scan recipes
      console.log(` [.] scanning recipes in ${recipesdirectory}`);
      files.sort().forEach(function (filename) {
        if( path.extname(filename) === '.json' ){ // Ignore non json files
          if (fs.existsSync(path.join(recipesdirectory + filename))) {

            entry = JSON.parse(fs.readFileSync(path.join(recipesdirectory + filename), "utf8"));
            if (typeof entry.symbol !== "undefined") {

              global.hybridd.asset[entry.symbol.toLowerCase()] = entry;
              console.log(` [i] found asset recipe ${filename}`);

            }
            if (typeof entry.id !== "undefined") {

              global.hybridd.source[entry.id.toLowerCase()] = entry;
              console.log(` [i] found source recipe ${filename}`);

            }

          } else {

            console.log(` [!] cannot load recipe ${filename}!`);

          }
        }

      });
    }
    functions.sequential(callbackArray);
  }.bind({callbackArray}));
}
