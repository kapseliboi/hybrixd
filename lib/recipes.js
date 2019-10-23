// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd - recipes.js
// Scans for and loads recipes dynamically from files

// required standard libraries
let fs = require('fs');
let path = require('path');
let sequential = require('./util/sequential');

// required global configuration (TODO: encrypted storage option!)
let recipesDirectory = path.normalize(`${process.cwd()}/../recipes/`);
let modulesDirectory = path.normalize(`${process.cwd()}/../modules/`);
let recipesVarDirectory = path.normalize(`${process.cwd()}/../var/recipes/`);

function uglyClone (obj) { return JSON.parse(JSON.stringify(obj)); }

function uglyMerge (target, source) {
  for (let key in source) {
    target[key] = uglyClone(source[key]);
  }
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

function resolveRecipeInheritance (id, history) {
  if (history && history.indexOf(id) !== -1) { // Check for cyclic inherritance;
    console.log(` [!] error: cyclic inheritance found for ${id}.`);
    return {};
  }

  let list;
  if (global.hybrixd.asset.hasOwnProperty(id)) { // asset
    list = global.hybrixd.asset;
  } else if (global.hybrixd.engine.hasOwnProperty(id)) { // engine
    list = global.hybrixd.engine;
  } else if (global.hybrixd.source.hasOwnProperty(id)) { // source
    list = global.hybrixd.source;
  } else {
    console.log(` [!] error: recipe ${id} not found. Neither asset, engine or source.`);
    return null;
  }
  let recipe = list[id];

  if (recipe.hasOwnProperty('import')) {
    let newRecipe = {};

    if (typeof recipe['import'] === 'object' && recipe['import'].isArray()) { // multi  inheritance
      for (let index = 0, len = recipe['import'].length; index < len; ++index) {
        let baseRecipe = recolveRecipeImport(recipe['import'][index], history, id);
        if (baseRecipe) {
          uglyMerge(newRecipe, baseRecipe);
        } else {
          console.log(` [!] error: failed import of ${recipe['import'][index]} to ${id}..`);
          return null;
        }
      }
    } else { // singular inheritance
      let baseRecipe = recolveRecipeImport(recipe['import'], history, id);
      if (baseRecipe) {
        uglyMerge(newRecipe, baseRecipe);
      } else {
        console.log(` [!] error: failed import of ${recipe['import']} to ${id}.`);
        return null;
      }
    }

    if (recipe.hasOwnProperty('quartz')) {
      if (!newRecipe.hasOwnProperty('quartz')) {
        newRecipe.quartz = {};
      }
      uglyMerge(newRecipe.quartz, recipe.quartz);
      delete recipe['quartz'];
    }
    uglyMerge(newRecipe, recipe);
    // delete list[id];
    list[id] = newRecipe;
    return newRecipe;
  } else { // No inheritance
    return recipe;
  }
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
  const recipeFiles = fs.readdirSync(recipesDirectory)
    .map(getRecipeFile);

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

function getRecipeFile (fileName) {
  return recipesDirectory + fileName;
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
