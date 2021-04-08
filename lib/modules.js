// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd - modules.js
// Scans for and loads modules dynamically from files

// required standard libraries
const fs = require('fs');
const path = require('path');
const scheduler = require('./scheduler/scheduler');
const sequential = require('./util/sequential');

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
    global.hybrixd.logger(['error', 'modules'], 'Error when reading ' + e);
  } else {
    global.hybrixd.logger(['info', 'modules'], 'Scanning modules in ' + modulesdirectory);
    files.sort().forEach(scanModules);
    modulelist.forEach(loadModule);
  }
  sequential.next(this.cb);
}

function loadModule (id, index, array) {
  global.hybrixd.module[id] = [];

  // activate module
  let module;
  try {
    module = require(modulesdirectory + id + '/module.js');
  } catch (error) {
    global.hybrixd.logger(['error', 'modules'], 'Failed to load module ' + id, error);
    delete global.hybrixd.module[id];
    return;
  }
  global.hybrixd.module[id].main = module;
}

// scan modules
function scanModules (id, index, array) {
  const directoryAndFileExist = fs.statSync(path.join(modulesdirectory + id)).isDirectory() &&
        fs.existsSync(path.join(modulesdirectory + id + '/module.js'));

  if (directoryAndFileExist) modulelist.push(id);
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
    global.hybrixd.logger(['error', 'modules'], 'No recipe found for module ' + moduleName + '!');
  } else {
    global.hybrixd.logger(['error', 'modules'], 'Recipe ' + recipe.id + ' contains errors!');
  }
}

function setMain (main, recipe, command) {
  return (!main.hasOwnProperty('exec') ||
          (recipe.hasOwnProperty('quartz') && recipe.quartz.hasOwnProperty(command[0])))
    ? global.hybrixd.module.quartz.main
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
    for (const id in global.hybrixd[recipeType]) {
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
