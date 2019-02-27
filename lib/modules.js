// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd - modules.js
// Scans for and loads modules dynamically from files

// required standard libraries
const fs = require('fs');
const path = require('path');
const scheduler = require('./scheduler');
const functions = require('./functions');
require('./globals');

// wide scoped variables
const modulesdirectory = path.normalize(process.cwd() + '/../modules/');
const modulelist = [];
global.hybrixd.module = [];

// initialize all modules
function init (cb) {
  // TODO check if modules are being used...

  global.hybrixd.module.length = 0; // Clear modules
  modulelist.length = 0; // Clear modulelist
  fs.readdir(modulesdirectory, handleModules.bind({cb})); // scan and load modules
}

function handleModules (e, files) {
  if (e) {
    console.log(' [!] warning: error when reading ' + e);
  } else {
    console.log(' [.] scanning modules in ' + modulesdirectory);
    files.sort().forEach(scanModules);
    // DEBUG: console.log('     - moduleslist: ' + moduleslist);
    modulelist.forEach(loadModule);
  }
  functions.sequential(this.cb);
}

function loadModule (element, index, array) {
  console.log(' [.] loading module ' + element);
  global.hybrixd.module[element] = [];

  // activate module
  global.hybrixd.module[element].main = require(modulesdirectory + element + '/module.js');

  if (global.hybrixd.module[element].hasOwnProperty('main') && global.hybrixd.module[element].main.hasOwnProperty('init')) {
    global.hybrixd.module[element].main.init();
  }
}

// scan modules
function scanModules (element, index, array) {
  const directoryAndFileExist = fs.statSync(path.join(modulesdirectory + element)).isDirectory() &&
        fs.existsSync(path.join(modulesdirectory + element + '/module.js'));

  if (directoryAndFileExist) {
    modulelist.push(element);
    console.log(' [i] found module ' + element + ' (javascript)');
  }
}

// execute initialization asset and source functions for a module type
// modulename =~ "$SYMBOL"  (not quite but the module defined in the asset/source/engine recipe)
// command = ["$COMMAND1","$COMMAND2", ...]
// originalPath = ["asset","$SYMBOL","$COMMAND1","$COMMAND2", ...]
function initExec (moduleName, command, originalPath) { // TODO rename target to recipe
  const init = initializeModules(command, moduleName);
  const main = init.main;
  const recipe = init.recipe;

  if (init.main) {
    const initializedMain = setMain(main, init.recipe, command);
    initializedMain.exec({processID: init.processID, target: recipe, mode: init.mode, factor: init.factor, command});
  } else {
    console.log(' [!] recipe ' + recipe.id + ' contains errors!');
  }
}

function setMain (main, recipe, command) {
  if (!main.hasOwnProperty('exec')) {
    main = global.hybrixd.module['quartz'].main;
  }
  if (recipe.hasOwnProperty('quartz') && recipe.quartz.hasOwnProperty(command[0])) {
    main = global.hybrixd.module['quartz'].main;
  }
  return main;
}

function initializeModules (command, moduleName) {
  // this module can provide assets
  let main;
  let recipe;
  let processID;
  let mode;
  let factor;

  const modules = ['asset', 'source', 'engine'];

  modules.forEach(initializeStatus);

  function initializeStatus (module) {
    for (let x in global.hybrixd[module]) {
      if (typeof global.hybrixd[module][x].module !== 'undefined' && global.hybrixd[module][x].module === moduleName) {
        // check the status of the connection, and give init feedback
        recipe = global.hybrixd[module][x];
        processID = scheduler.init(0, {sessionID: 1, path: [module, x].concat(command), command: command, recipe});
        mode = (typeof recipe.mode !== 'undefined' ? recipe.mode : null);
        main = global.hybrixd.module[recipe.module || 'quartz'].main;

        if (module === 'asset') {
          factor = (typeof recipe.factor !== 'undefined' ? recipe.factor : 8);
        }
      }
    }
  }

  return {
    main,
    recipe,
    factor,
    processID,
    mode
  };
}

exports.init = init;
exports.initexec = initExec;
exports.module = global.hybrixd.module;
