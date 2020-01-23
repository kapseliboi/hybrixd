// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd - recipes.js
// Scans for and loads recipes dynamically from files

// required standard libraries
const fs = require('fs');
const path = require('path');
const sequential = require('./util/sequential');
const quartz = require('./scheduler/quartz');

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
      console.log(` [!] error: Cannot load recipe ${fileName}!`);
    }
  }
}

function parseRecipe (fileName, filePath) {
  const recipes = ['symbol', 'engine', 'source'];
  let entry;

  /* if (fs.existsSync(path.join(recipesVarDirectory + filename))) {
        try {
        } catch (e) {
          console.log(` [!] error: Could not parse recipe variable file ${filename}!`);
        }
        entry.vars = JSON.parse(fs.readFileSync(path.join(recipesVarDirectory + filename), 'utf8'));
        } */

  try {
    entry = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.log(` [!] error: Could not parse recipe ${fileName}!`);
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
      console.log(` [i] found ${assetOrDefault} recipe ${fileName}`);
    }
  };
}

function recolveRecipeImport (baseId, history, id) {
  if (typeof baseId === 'string') {
    let splitBaseId = baseId.split('::');
    switch (splitBaseId.length) {
      case 1: return resolveRecipeInheritance(splitBaseId[0], (history || []).concat(id)); // Handle complete import="foo"
      case 2: return {[splitBaseId[1]]: resolveRecipeInheritance(splitBaseId[0], (history || []).concat(id))[splitBaseId[1]]}; // Handle specific import="foo::bar"
      default:
        console.log(` [!] error: recipe ${id} has ill-defined 'import' property. Expected "$BaseRecipe" or "$BaseRecipe::Property".`);
        return {};
    }
  } else {
    console.log(` [!] error: recipe ${id} has ill-defined 'import' property. Expected string or array of strings.`);
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
      recipe.import = [ recipe.import, 'asset'];
    }
  } else {
    recipe.import = 'asset';
  }
}

function resolveRecipeInheritance (id, history) {
  if (history && history.indexOf(id) !== -1) { // Check for cyclic inherritance;
    console.log(` [!] error: cyclic inheritance found for ${id}.`);
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
    console.log(` [!] error: recipe ${id} not found. Neither asset, engine or source.`);
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
        console.log(` [!] error: failed import of ${baseId} to ${id}..`);
        return null;
      }
    }
  }

  if (!history && recipe.quartz) {
    quartz.addDefaultPreAndPostAmbles(recipe.quartz, isAsset);
  }

  return recipe;
}

function resolveRecipeInheritances () {
  const recipes = ['asset', 'engine', 'source'];

  // resolve recipe inheritance
  recipes.forEach(compileRecipes);
}

function compileRecipes (recipe) {
  Object.keys(global.hybrixd[recipe]).forEach(compileRecipe(recipe));
}

function compileRecipe (recipe) {
  return function (id) {
    if (!resolveRecipeInheritance(id)) { // If the recipe inheritance fails, remove the recipe
      delete global.hybrixd[recipe][id];
      console.log(` [!] error: failed compiling recipe for ${id}.`);
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

  console.log(` [.] scanning recipes in ${recipesDirectory}`);
  const recipeFiles = collectRecipesRecursivelySync(recipesDirectory);

  console.log(` [.] scanning recipes in ${modulesDirectory}`);
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
