// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd - modules.js
// Scans for and loads modules dynamically from files

// required standard libraries
const fs = require('fs');
const path = require('path');
const scheduler = require('./scheduler/scheduler');
const functions = require('./functions');
require('./globals');

// wide scoped variables
const modulesdirectory = path.normalize(process.cwd() + '/../modules/');
const modulelist = [];
global.hybrixd.module = [];

const DEFAULT_ASSET_FACTOR = 8;

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

function loadModule (id, index, array) {
  console.log(' [.] loading module ' + id);
  global.hybrixd.module[id] = [];

  // activate module
  global.hybrixd.module[id].main = require(modulesdirectory + id + '/module.js');

  if (global.hybrixd.module[id].hasOwnProperty('main') && global.hybrixd.module[id].main.hasOwnProperty('init')) {
    global.hybrixd.module[id].main.init();
  }
}

// scan modules
function scanModules (id, index, array) {
  const directoryAndFileExist = fs.statSync(path.join(modulesdirectory + id)).isDirectory() &&
        fs.existsSync(path.join(modulesdirectory + id + '/module.js'));

  if (directoryAndFileExist) {
    modulelist.push(id);
    console.log(' [i] found module ' + id + ' (javascript)');
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
  } else if (!init.recipe) {
    console.log(' [!] No recipe found for module ' + moduleName + '!');
  } else {
    console.log(' [!] recipe ' + recipe.id + ' contains errors!');
  }
}

function setMain (main, recipe, command) {
  return (!main.hasOwnProperty('exec') ||
          (recipe.hasOwnProperty('quartz') && recipe.quartz.hasOwnProperty(command[0])))
    ? global.hybrixd.module['quartz'].main
    : main;
}

function initializeModules (command, moduleName) {
  // this module can provide assets
  let main;
  let recipe;
  let processID;
  let mode;
  let factor;

  const recipeTypes = ['asset', 'source', 'engine'];

  function initializeStatus (recipeType) {
    for (let id in global.hybrixd[recipeType]) {
      if (typeof global.hybrixd[recipeType][id].module !== 'undefined' && global.hybrixd[recipeType][id].module === moduleName) {
        // check the status of the connection, and give init feedback
        recipe = global.hybrixd[recipeType][id];

        processID = scheduler.init(0, {sessionID: 1, path: [recipeType, id].concat(command), command: command, recipe});
        mode = (typeof recipe.mode !== 'undefined' ? recipe.mode : null);
        main = global.hybrixd.module[recipe.module || 'quartz'].main;

        if (recipeType === 'asset') {
          factor = (typeof recipe.factor !== 'undefined' ? recipe.factor : DEFAULT_ASSET_FACTOR);
        }
      }
    }
  }

  recipeTypes.forEach(initializeStatus);

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
