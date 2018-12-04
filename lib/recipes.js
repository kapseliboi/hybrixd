// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd - recipes.js
// Scans for and loads recipes dynamically from files

// required standard libraries
var fs = require('fs');
var path = require('path');
var functions = require('./functions');

// required global configuration (TODO: encrypted storage option!)
var recipesDirectory = path.normalize(`${process.cwd()}/../recipes/`);
var modulesDirectory = path.normalize(`${process.cwd()}/../modules/`);
var recipesVarDirectory = path.normalize(`${process.cwd()}/../var/recipes/`);

exports.init = init;

function importRecipeFile (filePath) {
  if (path.extname(filePath) === '.json') { // Ignore non json files
    if (fs.existsSync(filePath)) {
      var filePathSplit = filePath.split('/');
      var fileName = filePathSplit[filePathSplit.length - 1];
      var entry;
      try {
        entry = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        console.log(` [!] error: Could not parse recipe ${fileName}!`);
        return;
      }
      /* if (fs.existsSync(path.join(recipesVarDirectory + filename))) {
        try {
        } catch (e) {
          console.log(` [!] error: Could not parse recipe variable file ${filename}!`);
        }
        entry.vars = JSON.parse(fs.readFileSync(path.join(recipesVarDirectory + filename), 'utf8'));
      } */

      entry.filename = fileName;
      if (typeof entry.symbol !== 'undefined') {
        global.hybrixd.asset[entry.symbol.toLowerCase()] = entry;
        console.log(` [i] found asset recipe ${fileName}`);
      }
      if (typeof entry.engine !== 'undefined') {
        global.hybrixd.engine[entry.engine.toLowerCase()] = entry;
        console.log(` [i] found engine recipe ${fileName}`);
      }
      if (typeof entry.source !== 'undefined') {
        global.hybrixd.source[entry.source.toLowerCase()] = entry;
        console.log(` [i] found source recipe ${fileName}`);
      }
    } else {
      console.log(` [!] error: Cannot load recipe ${fileName}!`);
    }
  }
}

function recolveRecipeImport (baseId, history, id) {
  if (typeof baseId === 'string') {
    var splitBaseId = baseId.split('::');
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

  var list;
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
  var recipe = list[id];

  if (recipe.hasOwnProperty('import')) {
    var newRecipe = {};

    if (typeof recipe['import'] === 'object' && recipe['import'].isArray()) { // multi  inheritance
      for (var index = 0, len = recipe['import'].length; index < len; ++index) {
        var baseRecipe = recolveRecipeImport(recipe['import'][index], history, id);
        if (baseRecipe) {
          functions.uglyMerge(newRecipe, baseRecipe);
        } else {
          console.log(` [!] error: failed import of ${recipe['import'][index]} to ${id}..`);
          return null;
        }
      }
    } else { // singular inheritance
      var baseRecipe = recolveRecipeImport(recipe['import'], history, id);
      if (baseRecipe) {
        functions.uglyMerge(newRecipe, baseRecipe);
      } else {
        console.log(` [!] error: failed import of ${recipe['import']} to ${id}.`);
        return null;
      }
    }

    if (recipe.hasOwnProperty('quartz')) {
      if (!newRecipe.hasOwnProperty('quartz')) {
        newRecipe.quartz = {};
      }
      functions.uglyMerge(newRecipe.quartz, recipe.quartz);
      delete recipe['quartz'];
    }
    functions.uglyMerge(newRecipe, recipe);
    // delete list[id];
    list[id] = newRecipe;
    return newRecipe;
  } else { // No inheritance
    return recipe;
  }
}

function resolveRecipeInheritances () {
  // resolve recipe inheritance
  Object.keys(global.hybrixd.asset).forEach(function (id) {
    if (!resolveRecipeInheritance(id)) { // If the reipe inheritance fails, remove the asset
      delete global.hybrixd.asset[id];
      console.log(` [!] error: failed compiling recipe for ${id}.`);
    }
  });
  Object.keys(global.hybrixd.engine).forEach(function (id) {
    if (!resolveRecipeInheritance(id)) { // If the reipe inheritance fails, remove the engine
      delete global.hybrixd.engine[id];
      console.log(` [!] error: failed compiling recipe for ${id}.`);
    } else {
      if (global.hybrixd.engine[id].hasOwnProperty('router')) { // load router data for engines
        global.hybrixd.routetree.engine[id] = global.hybrixd.engine[id].router;
      }
    }
  });
  Object.keys(global.hybrixd.source).forEach(function (id) {
    if (!resolveRecipeInheritance(id)) { // If the reipe inheritance fails, remove the source
      delete global.hybrixd.source[id];
      console.log(` [!] error: failed compiling recipe for ${id}.`);
    } else {
      if (global.hybrixd.source[id].hasOwnProperty('router')) { // load router data for engines
        global.hybrixd.routetree.source[id] = global.hybrixd.source[id].router;
      }
    }
  });
}

// initialize all recipes
function init (callbackArray) {
  if (!fs.existsSync('../var/recipes')) { // create folder for local recipe variables
    fs.mkdirSync('../var/recipes');
  }

  // clear recipe assets
  global.hybrixd.asset = {};
  global.hybrixd.engine = {};
  global.hybrixd.source = {};

  global.hybrixd.routetree.engine = {}; // Clear engine routing
  console.log(` [.] scanning recipes in ${recipesDirectory}`);
  var files = [];
  var recipeFiles = fs.readdirSync(recipesDirectory);

  recipeFiles.forEach(fileName => { files.push(recipesDirectory + fileName); });

  console.log(` [.] scanning recipes in ${modulesDirectory}`);
  var moduleDirectories = fs.readdirSync(modulesDirectory);
  moduleDirectories.forEach(moduleName => {
    if (fs.lstatSync(modulesDirectory + moduleName).isDirectory()) {
      var moduleRecipeFiles = fs.readdirSync(modulesDirectory + moduleName);

      moduleRecipeFiles.forEach(fileName => { files.push(modulesDirectory + moduleName + '/' + fileName); });
    }
  });

  files.sort().forEach(importRecipeFile);
  resolveRecipeInheritances();

  functions.sequential(callbackArray);
}
