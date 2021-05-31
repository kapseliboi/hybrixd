// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd - recipes.js
// Scans for and loads recipes dynamically from files

// required standard libraries
const fs = require('fs');
const path = require('path');
const sequential = require('./util/sequential');
const quartz = require('./scheduler/quartz');

const QrtzFunction = require('./scheduler/function').QrtzFunction;

// required global configuration (TODO: encrypted storage option!)
const recipesDirectory = path.normalize(`${process.cwd()}/../recipes/`);
const modulesDirectory = path.normalize(`${process.cwd()}/../modules/`);

function uglyClone (obj) { return JSON.parse(JSON.stringify(obj)); }

function mergeQuartz (target, source) {
  if (!source.hasOwnProperty('quartz')) return;
  if (!target.hasOwnProperty('quartz')) {
    target.quartz = source.quartz;
    return;
  }

  for (const sourceFunctionSignature in source.quartz) {
    const sourceFunctionName = sourceFunctionSignature.split('/')[0];
    let functionFound = false;
    for (const targetFunctionSignature in target.quartz) {
      const targetFunctionName = targetFunctionSignature.split('/')[0];
      if (targetFunctionName === sourceFunctionName) functionFound = true;
    }
    if (!functionFound) target.quartz[sourceFunctionSignature] = source.quartz[sourceFunctionSignature];
  }
}

function mergeRecipe (target, source) {
  for (const key in source) {
    if (key === 'quartz') {
      mergeQuartz(target, source);
    } else if (typeof source[key] !== 'undefined') {
      if (target.hasOwnProperty(key)) {
        const targetIsObjectAndNotArray = typeof target[key] === 'object' && target[key] !== null && !(target[key] instanceof QrtzFunction);
        const sourceIsObjectAndNotArray = typeof source[key] === 'object' && source[key] !== null && !(source[key] instanceof QrtzFunction);
        if (targetIsObjectAndNotArray && sourceIsObjectAndNotArray) { // merge sub objects
          target[key] = mergeRecipe(target[key], source[key]);
        }
      } else if (source[key] instanceof QrtzFunction) {
        target[key] = source[key];
      } else {
        target[key] = uglyClone(source[key]);
      }
    }
  }
  return target;
}

function importRecipeFile (filePath) {
  if (path.extname(filePath) === '.json') { // Ignore non json files
    const filePathSplit = filePath.split('/');
    const fileName = filePathSplit[filePathSplit.length - 1];

    if (fs.existsSync(filePath)) parseRecipe(fileName, filePath);
    else global.hybrixd.logger(['error', 'recipes'], `Cannot load recipe ${fileName}!`);
  }
}

function overwriteLocalDelta (fileName, recipe) {
  const filePath = '../var/recipes/delta/' + fileName;
  if (fs.existsSync(filePath)) { // handle local recipe delta
    try {
      const delta = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      for (const key in delta) recipe[key] = delta[key]; // overwrite defaults with local property
    } catch (e) {
      global.hybrixd.logger(['error', 'recipes'], `Could not parse local recipe delta ${fileName}!`);
    }
  }
}

function parseRecipe (fileName, filePath) {
  if (typeof fileName !== 'string') return;
  const split = fileName.split('.');
  // used to filter out non recipe json files
  // recipes should be of form '$RECYPETYPE|token.[...].json'
  if (split.length < 3 || split[split.length - 1] !== 'json' || !['asset', 'token', 'engine', 'source'].includes(split[0])) return;

  let recipe;
  try {
    recipe = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    global.hybrixd.logger(['error', 'recipes'], `Could not parse recipe ${fileName}!`);
    return;
  }

  overwriteLocalDelta(fileName, recipe);

  let id, recipeType;
  if (recipe.hasOwnProperty('symbol')) {
    id = recipe.symbol;
    recipeType = 'asset';
  } else if (recipe.hasOwnProperty('engine')) {
    id = recipe.engine;
    recipeType = 'engine';
  } else if (recipe.hasOwnProperty('source')) {
    id = recipe.source;
    recipeType = 'source';
  } else {
    global.hybrixd.logger(['error', 'recipes'], `Missing recipe identifier for ${fileName}!`);
    return;
  }
  if (typeof id !== 'string') {
    global.hybrixd.logger(['error', 'recipes'], `Illegal non string id for ${fileName}!`);
    return;
  }

  recipe.id = id.toLowerCase();
  recipe.filename = fileName;

  global.hybrixd[recipeType][id] = recipe;
}

function resolveRecipeImport (baseId, history, id) {
  if (typeof baseId === 'string') {
    const splitBaseId = baseId.split('::');
    switch (splitBaseId.length) {
      case 1: return resolveRecipeInheritance(splitBaseId[0], (history || []).concat(id)); // Handle complete import="foo"
      case 2: return {[splitBaseId[1]]: resolveRecipeInheritance(splitBaseId[0], (history || []).concat(id))[splitBaseId[1]]}; // Handle specific import="foo::bar"
      default:
        global.hybrixd.logger(['error', 'recipes'], `Recipe ${id} has ill-defined 'import' property. Expected "$BaseRecipe" or "$BaseRecipe::Property".`);
        return {};
    }
  } else {
    global.hybrixd.logger(['error', 'recipes'], `Recipe ${id} has ill-defined 'import' property. Expected string or array of strings.`);
    return {};
  }
}

/* adds asset to import if not added yet */
function importDefaultAssetEngine (recipe) {
  if (recipe.hasOwnProperty('import')) {
    if (recipe.import instanceof Array) { // multi  inheritance
      if (!recipe.import.includes('asset')) recipe.import.push('asset');
    } else if (recipe.import !== 'asset') recipe.import = [recipe.import, 'asset'];
  } else recipe.import = ['asset'];
}

/* adds base asset if asset is a token (for example eth if symbol = eth.sometoken) */
function importBaseAssetIfToken (recipe) {
  if (recipe.symbol.hasOwnProperty('.')) { // e.g. is a token
    const baseSymbol = recipe.symbol.split('.')[0]; //  'base.token' -> 'base'
    if (!recipe.import.includes(baseSymbol)) recipe.import.push(baseSymbol);
  }
}

function resolveRecipeInheritance (id, history) {
  if (history && history.indexOf(id) !== -1) { // Check for cyclic inherritance;
    global.hybrixd.logger(['error', 'recipes'], `Cyclic inheritance found for ${id}.`);
    return null;
  }
  let list;
  if (global.hybrixd.asset.hasOwnProperty(id)) { // asset
    list = global.hybrixd.asset;
  } else if (global.hybrixd.engine.hasOwnProperty(id)) { // engine
    list = global.hybrixd.engine;
  } else if (global.hybrixd.source.hasOwnProperty(id)) { // source
    list = global.hybrixd.source;
  } else {
    global.hybrixd.logger(['error', 'recipes'], `Recipe ${id} not found. Neither asset, engine or source.`);
    return null;
  }
  const recipe = list[id];
  return handleImport(recipe, history, id);
}

function handleImport (recipe, history, id) {
  const isAsset = global.hybrixd.asset.hasOwnProperty(id);
  if (isAsset) {
    importDefaultAssetEngine(recipe);
    importBaseAssetIfToken(recipe);
  }

  if (recipe.hasOwnProperty('import')) {
    if (typeof recipe.import === 'string') { // convert string to array
      recipe.import = [recipe.import];
    }

    for (const baseId of recipe.import) {
      const baseRecipe = resolveRecipeImport(baseId, history, id);
      if (baseRecipe) {
        mergeRecipe(recipe, baseRecipe);
      } else {
        global.hybrixd.logger(['error', 'recipes'], `Failed import of ${baseId} to ${id}..`);
        return null;
      }
    }
  }
  return recipe;
}

function resolveRecipeInheritances () {
  const recipeTypes = ['asset', 'engine', 'source'];

  // resolve recipe inheritance
  recipeTypes.forEach(compileRecipes);
}

function compileRecipes (recipeType) {
  Object.keys(global.hybrixd[recipeType]).forEach(compileRecipe(recipeType));
  Object.keys(global.hybrixd[recipeType]).forEach(compileRecipeFunctions(recipeType));
}

function loadRecipeLocalVars (recipe) {
  const filePath = '../var/recipes/' + recipe.filename;
  if (!recipe.hasOwnProperty('vars')) { // retrieve data from file if not yet loaded into memory
    if (fs.existsSync(filePath)) { // try to load from file
      const content = fs.readFileSync(filePath).toString();
      try {
        recipe.vars = JSON.parse(content);
      } catch (e) {
        recipe.vars = {}; // Initialize to empty
        global.hybrixd.logger(['error', 'vars'], `local var file corrupt for ${recipe.filename}. Created backup ${recipe.filename}.corrupt`);
        try {
          fs.renameSync(filePath, filePath + '.corrupt');
          return {e: 1, v: 'peek/poke: local var file corrupt!'};
        } catch (e) {
          global.hybrixd.logger(['error', 'vars'], `creating backup ${recipe.filename}.corrupt`);
          return {e: 1, v: 'peek/poke: local var file corrupt!'};
        }
      }
    } else recipe.vars = {}; // Initialize to empty
  }
  return {e: 0};
}

const compileRecipe = recipeType => id => {
  if (!resolveRecipeInheritance(id)) { // If the recipe inheritance fails, remove the recipe
    delete global.hybrixd[recipeType][id];
    global.hybrixd.logger(['error', 'recipes'], `Failed compiling recipe for ${id}.`);
  } else {
    const recipe = global.hybrixd[recipeType][id];
    loadRecipeLocalVars(recipe);
  }
};

function compileRecipeFunctions (recipeType) {
  return function (id) {
    const recipe = global.hybrixd[recipeType][id];
    if (recipe.hasOwnProperty('quartz') && typeof recipe.quartz === 'object' && recipe.quartz !== null) {
      quartz.addDefaultPreAndPostAmbles(recipe.quartz, recipeType === 'asset');
      for (const functionSignature in recipe.quartz) {
        const linesOrQrtzFunction = recipe.quartz[functionSignature];
        delete recipe.quartz[functionSignature];
        const functionSignatureSplit = functionSignature.split('/');
        const functionName = functionSignatureSplit[0];

        const qrtzFunctionOrCompiledLines = linesOrQrtzFunction instanceof QrtzFunction ? linesOrQrtzFunction : new QrtzFunction(linesOrQrtzFunction, functionSignatureSplit);

        recipe.quartz[functionName] = qrtzFunctionOrCompiledLines;
      }
    }
  };
}

function collectRecipesRecursivelySync (dir) {
  const results = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.resolve(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const dirFiles = collectRecipesRecursivelySync(filePath);
      results.push(...dirFiles);
    } else if (path.extname(filePath) === '.json') { // Ignore non json files
      results.push(filePath);
    }
  }
  return results;
}

// initialize all recipes
function init (cbArr) {
  if (!fs.existsSync('../var/recipes')) { // create folder for local recipe variables
    fs.mkdirSync('../var/recipes');
  }

  // clear recipe assets
  global.hybrixd.asset = {};
  global.hybrixd.engine = {};
  global.hybrixd.source = {};

  global.hybrixd.logger(['info', 'recipes'], `Scanning recipes in ${recipesDirectory}`);
  const recipeFiles = collectRecipesRecursivelySync(recipesDirectory);

  global.hybrixd.logger(['info', 'recipes'], `Scanning recipes in ${modulesDirectory}`);
  const moduleDirectories = fs.readdirSync(modulesDirectory)
    .reduce(getModulesDirectory, []);

  recipeFiles
    .concat(moduleDirectories)
    .sort()
    .forEach(importRecipeFile);
  resolveRecipeInheritances();

  sequential.next(cbArr);
}

function getModulesDirectory (modules, moduleName) {
  if (fs.statSync(modulesDirectory + moduleName).isDirectory()) {
    const moduleRecipeFiles = fs.readdirSync(modulesDirectory + moduleName);
    const filesInDirectory = moduleRecipeFiles.map(fileName => modulesDirectory + moduleName + '/' + fileName);
    return modules.concat(filesInDirectory);
  } else {
    return modules;
  }
}

exports.init = init;
exports.handleImport = handleImport;
