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

function uglyMerge (target, source) {
  for (let key in source) {
    if (typeof source[key] !== 'undefined') {
      if (target.hasOwnProperty(key)) {
        const targetIsObjectAndNotArray = typeof target[key] === 'object' && target[key] !== null && !(target[key] instanceof Array);
        const sourceIsObjectAndNotArray = typeof source[key] === 'object' && source[key] !== null && !(source[key] instanceof Array);
        if (targetIsObjectAndNotArray && sourceIsObjectAndNotArray) { // merge sub objects
          target[key] = uglyMerge(target[key], source[key]);
        }
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

    if (fs.existsSync(filePath)) {
      parseRecipe(fileName, filePath);
    } else {
      global.hybrixd.logger(['error', 'recipes'], `Cannot load recipe ${fileName}!`);
    }
  }
}

function parseRecipe (fileName, filePath) {
  const recipes = ['symbol', 'engine', 'source'];
  let entry;
  try {
    entry = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    global.hybrixd.logger(['error', 'recipes'], `Could not parse recipe ${fileName}!`);
    return;
  }

  entry.filename = fileName;
  recipes.forEach(updateEntry(entry, fileName));
}

function updateEntry (entry, fileName) {
  return function (recipe) {
    const assetOrDefault = recipe === 'symbol' ? 'asset' : recipe;
    if (typeof entry[recipe] !== 'undefined') {
      entry.id = entry[recipe];
      global.hybrixd[assetOrDefault][entry[recipe].toLowerCase()] = entry;
      global.hybrixd.logger(['info', 'recipes'], `Found ${assetOrDefault} recipe ${fileName}`);
    }
  };
}

function recolveRecipeImport (baseId, history, id) {
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
      if (!recipe.import.includes('asset')) {
        recipe.import.push('asset');
      }
    } else if (recipe.import !== 'asset') {
      recipe.import = [recipe.import, 'asset'];
    }
  } else {
    recipe.import = 'asset';
  }
}

function resolveRecipeInheritance (id, history) {
  if (history && history.indexOf(id) !== -1) { // Check for cyclic inherritance;
    global.hybrixd.logger(['error', 'recipes'], `Cyclic inheritance found for ${id}.`);
    return null;
  }

  const isAsset = global.hybrixd.asset.hasOwnProperty(id);

  let list;
  if (isAsset) { // asset
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

  if (isAsset) {
    importDefaultAssetEngine(recipe);
  }

  if (recipe.hasOwnProperty('import')) {
    if (typeof recipe.import === 'string') { // convert string to array
      recipe.import = [recipe.import];
    }

    for (let baseId of recipe.import) {
      const baseRecipe = recolveRecipeImport(baseId, history, id);
      if (baseRecipe) {
        uglyMerge(recipe, baseRecipe);
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

function compileRecipe (recipeType) {
  return function (id) {
    if (!resolveRecipeInheritance(id)) { // If the recipe inheritance fails, remove the recipe
      delete global.hybrixd[recipeType][id];
      global.hybrixd.logger(['error', 'recipes'], `Failed compiling recipe for ${id}.`);
    }
  };
}

function compileRecipeFunctions (recipeType) {
  return function (id) {
    const recipe = global.hybrixd[recipeType][id];
    if (recipe.hasOwnProperty('quartz') && typeof recipe.quartz === 'object' && recipe.quartz !== null) {
      quartz.addDefaultPreAndPostAmbles(recipe.quartz, recipeType === 'asset');
      for (let functionSignature in recipe.quartz) {
        const linesOrQrtzFunction = recipe.quartz[functionSignature];
        delete recipe.quartz[functionSignature];
        const functionSignatureSplit = functionSignature.split('/');
        const functionName = functionSignatureSplit[0];
        const qrtzFunction = linesOrQrtzFunction instanceof QrtzFunction ? linesOrQrtzFunction : new QrtzFunction(linesOrQrtzFunction, functionSignatureSplit);
        recipe.quartz[functionName] = qrtzFunction;
      }
    }
  };
}

function collectRecipesRecursivelySync (dir) {
  const results = [];
  const files = fs.readdirSync(dir);
  for (let file of files) {
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
