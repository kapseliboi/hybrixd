// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd - modules.js
// Scans for and loads modules dynamically from files

// required standard libraries
let fs = require('fs');
let path = require('path');
let scheduler = require('./scheduler');
let functions = require('./functions');
require('./globals');

// wide scoped variables
const modulesdirectory = path.normalize(process.cwd() + '/../modules/');
const modulelist = [];
global.hybrixd.module = [];// exports

exports.init = init;
exports.initexec = initexec;
exports.module = global.hybrixd.module;

// initialize all modules
function init (callbackArray) {
  // TODO check if modules are being used...

  // Clear modules
  global.hybrixd.module.length = 0;
  // Clear modulelist
  modulelist.length = 0;
  //                                ;

  // scan and load modules
  fs.readdir(modulesdirectory, function (err1, files) {
    if (err1) {
      console.log(' [!] warning: error when reading ' + err1);
    } else {
      // scan modules
      console.log(' [.] scanning modules in ' + modulesdirectory);
      files.sort().forEach(scanmodules);
      // load modules    // DEBUG: console.log('     - moduleslist: ' + moduleslist);
      modulelist.forEach((element, index, array) => {
        console.log(' [.] loading module ' + element);
        global.hybrixd.module[element] = [];

        // activate module
        global.hybrixd.module[element].main = require(modulesdirectory + element + '/module.js');

        if (global.hybrixd.module[element].hasOwnProperty('main') && global.hybrixd.module[element].main.hasOwnProperty('init')) {
          global.hybrixd.module[element].main.init();
        }
      });
    }
    functions.sequential(this.callbackArray);
  }.bind({callbackArray: callbackArray}));
}

// scan modules
function scanmodules (element, index, array) {
  if (fs.statSync(path.join(modulesdirectory + element)).isDirectory()) {
    if (fs.existsSync(path.join(modulesdirectory + element + '/module.js'))) {
      modulelist.push(element);
      console.log(' [i] found module ' + element + ' (javascript)');
    }
  }
}

// execute initialization asset and source functions for a module type
// modulename =~ "$SYMBOL"  (not quite but the module defined in the asset/source/engine recipe)
// command = ["$COMMAND1","$COMMAND2", ...]
// originalPath = ["asset","$SYMBOL","$COMMAND1","$COMMAND2", ...]
function initexec (modulename, command, originalPath) { // TODO rename target to recipe
  // this module can provide assets
  let main;
  let recipe;
  let processID;
  let mode;
  let factor;
  for (let asset in global.hybrixd.asset) {
    if (typeof global.hybrixd.asset[asset].module !== 'undefined' && global.hybrixd.asset[asset].module === modulename) {
      // check the status of the connection, and give init feedback
      recipe = global.hybrixd.asset[asset];
      processID = scheduler.init(0, {sessionID: 1, path: ['asset', asset].concat(command), command: command, recipe});
      mode = (typeof recipe.mode !== 'undefined' ? recipe.mode : null);
      factor = (typeof recipe.factor !== 'undefined' ? recipe.factor : 8);
      main = global.hybrixd.module[recipe.module || 'quartz'].main;
    }
  }
  // this module can provide sources
  for (let source in global.hybrixd.source) {
    if (typeof global.hybrixd.source[source].module !== 'undefined' && global.hybrixd.source[source].module === modulename) {
      // check the status of the connection, and give init feedback
      recipe = global.hybrixd.source[source];
      processID = scheduler.init(0, {sessionID: 1, path: ['source', source].concat(command), command: command, recipe});
      mode = (typeof recipe.mode !== 'undefined' ? recipe.mode : null);
      main = global.hybrixd.module[recipe.module || 'quartz'].main;
    }
  }
  // this module can provide engines
  for (let engine in global.hybrixd.engine) {
    if (typeof global.hybrixd.engine[engine].module !== 'undefined' && global.hybrixd.engine[engine].module === modulename) {
      // check the status of the connection, and give init feedback
      recipe = global.hybrixd.engine[engine];
      processID = scheduler.init(0, {sessionID: 1, path: ['engine', engine].concat(command), command: command, recipe});
      mode = (typeof recipe.mode !== 'undefined' ? recipe.mode : null);
      main = global.hybrixd.module[recipe.module || 'quartz'].main;
    }
  }
  if (main) {
    if (!main.hasOwnProperty('exec')) {
      main = global.hybrixd.module['quartz'].main;
    }
    if (recipe.hasOwnProperty('quartz') && recipe.quartz.hasOwnProperty(command[0])) {
      main = global.hybrixd.module['quartz'].main;
    }
    main.exec({processID: processID, target: recipe, mode: mode, factor: factor, command: command});
  } else {
    console.log(' [!] recipe ' + recipe.id + ' contains errors!');
  }
}
