// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd - modules.js
// Scans for and loads modules dynamically from files

// required standard libraries
var fs = require('fs');
var path = require('path');
var scheduler = require('./scheduler');
var functions = require('./functions');

// wide scoped variables
var modulesdirectory = path.normalize(process.cwd() + '/../modules/');
var modulelist = [];
var module = [];// exports
exports.init = init;
exports.initexec = initexec;
exports.module = module;
exports.getsource = getsource;

// initialize all modules
function init (callbackArray) {
  // TODO check if modules are being used...

  // Clear modules
  module.length = 0;
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
        module[element] = [];

        // activate module
        module[element].main = require(modulesdirectory + element + '/module.js');

        if (module[element].hasOwnProperty('main') && module[element].main.hasOwnProperty('init')) {
          module[element].main.init();
        }
      });
    }
    functions.sequential(this.callbackArray);
  }.bind({callbackArray: callbackArray}));
  return 1;
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
  return 1;
}

// execute initialization asset and source functions for a module type
// modulename =~ "$SYMBOL"  (not quite but the module defined in the asset/source/engine recipe)
// command = ["$COMMAND1","$COMMAND2", ...]
// originalPath = ["asset","$SYMBOL","$COMMAND1","$COMMAND2", ...]
function initexec (modulename, command, originalPath) { // TODO rename target to recipe
  // this module can provide assets (wallet)
  for (var asset in global.hybrixd.asset) {
    if (typeof global.hybrixd.asset[asset].module !== 'undefined' && global.hybrixd.asset[asset].module === modulename) {
      // check the status of the connection, and give init feedback
      var target = global.hybrixd.asset[asset]; target.symbol = asset;
      var processID = scheduler.init(0, {sessionID: 1, path: ['asset', asset].concat(command), command: command, recipe: target});
      var mode = (typeof target.mode !== 'undefined' ? target.mode : null);
      var factor = (typeof target.factor !== 'undefined' ? target.factor : 8);
      module[global.hybrixd.asset[target.symbol].module].main.exec({processID: processID, target: target, mode: mode, factor: factor, command: command});
    }
  }
  // this module can provide sources (daemon)
  for (var source in global.hybrixd.source) {
    if (typeof global.hybrixd.source[source].module !== 'undefined' && global.hybrixd.source[source].module === modulename) {
      // check the status of the connection, and give init feedback
      var target = global.hybrixd.source[source]; target.id = source; target.source = source;
      var processID = scheduler.init(0, {sessionID: 1, path: ['source', source].concat(command), command: command, recipe: target});
      var mode = (typeof target.mode !== 'undefined' ? target.mode : null);
      module[global.hybrixd.source[target.id].module].main.exec({processID: processID, target: target, mode: mode, factor: factor, command: command});
    }
  }
  // this module can provide engines (daemon)
  for (var engine in global.hybrixd.engine) {
    if (typeof global.hybrixd.engine[engine].module !== 'undefined' && global.hybrixd.engine[engine].module === modulename) {
      // check the status of the connection, and give init feedback
      var target = global.hybrixd.engine[engine]; target.id = engine; target.engine = engine;
      var processID = scheduler.init(0, {sessionID: 1, path: ['engine', engine].concat(command), command: command, recipe: target});
      var mode = (typeof target.mode !== 'undefined' ? target.mode : null);
      module[global.hybrixd.engine[target.id].module].main.exec({processID: processID, target: target, mode: mode, factor: factor, command: command});
    }
  }
  return 1;
}

// find any available source with the correct mode
function getsource (mode) {
  mode = mode.split('.')[1];
  var targets = [];
  var targetscnt = 0;
  for (var key in global.hybrixd.source) {
    if (typeof global.hybrixd.source[key].mode !== 'undefined' && global.hybrixd.source[key].mode.split('.')[0] === mode) {
      targets.push(key);
      targetscnt += 1;
    }
  }
  var choice = targets[Math.floor(Math.random() * (targetscnt))];
  return (global.hybrixd.source[choice]);
}
