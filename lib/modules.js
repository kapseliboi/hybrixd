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
exports.getsource = getsource;

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
      console.log(' [i] found module ' + element);
    } else {
      console.log(' [!] cannot load module ' + element + '!');
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
  let target;
  let processID;
  let mode;
  let factor;
  for (let asset in global.hybrixd.asset) {
    if (typeof global.hybrixd.asset[asset].module !== 'undefined' && global.hybrixd.asset[asset].module === modulename) {
      // check the status of the connection, and give init feedback
      target = global.hybrixd.asset[asset]; target.symbol = asset;
      processID = scheduler.init(0, {sessionID: 1, path: ['asset', asset].concat(command), command: command, recipe: target});
      mode = (typeof target.mode !== 'undefined' ? target.mode : null);
      factor = (typeof target.factor !== 'undefined' ? target.factor : 8);
      main = global.hybrixd.module[global.hybrixd.asset[target.symbol].module || 'quartz'].main;
    }
  }
  // this module can provide sources
  for (let source in global.hybrixd.source) {
    if (typeof global.hybrixd.source[source].module !== 'undefined' && global.hybrixd.source[source].module === modulename) {
      // check the status of the connection, and give init feedback
      target = global.hybrixd.source[source]; target.id = source; target.source = source;
      processID = scheduler.init(0, {sessionID: 1, path: ['source', source].concat(command), command: command, recipe: target});
      mode = (typeof target.mode !== 'undefined' ? target.mode : null);
      main = global.hybrixd.module[global.hybrixd.source[target.id].module || 'quartz'].main;
    }
  }
  // this module can provide engines
  for (let engine in global.hybrixd.engine) {
    if (typeof global.hybrixd.engine[engine].module !== 'undefined' && global.hybrixd.engine[engine].module === modulename) {
      // check the status of the connection, and give init feedback
      target = global.hybrixd.engine[engine]; target.id = engine; target.engine = engine;
      processID = scheduler.init(0, {sessionID: 1, path: ['engine', engine].concat(command), command: command, recipe: target});
      mode = (typeof target.mode !== 'undefined' ? target.mode : null);
      main = global.hybrixd.module[global.hybrixd.engine[target.id].module || 'quartz'].main;
    }
  }
  // TODO FIXME error if no main
  if (!main.hasOwnProperty('exec')) {
    main = global.hybrixd.module['quartz'].main;
  }
  if (target.hasOwnProperty('quartz') && target.quartz.hasOwnProperty(command[0])) {
    main = global.hybrixd.module['quartz'].main;
  }
  main.exec({processID: processID, target: target, mode: mode, factor: factor, command: command});
}

// find any available source with the correct mode
function getsource (mode) {
  mode = mode.split('.')[1];
  let targets = [];
  let targetscnt = 0;
  for (let key in global.hybrixd.source) {
    if (typeof global.hybrixd.source[key].mode !== 'undefined' && global.hybrixd.source[key].mode.split('.')[0] === mode) {
      targets.push(key);
      targetscnt += 1;
    }
  }
  let choice = targets[Math.floor(Math.random() * (targetscnt))];
  return (global.hybrixd.source[choice]);
}
