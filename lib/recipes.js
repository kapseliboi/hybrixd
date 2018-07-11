// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybridd - recipes.js
// Scans for and loads recipes dynamically from files

// required standard libraries
var fs = require("fs");
var path = require("path");
var functions = require("./functions");

// required global configuration (TODO: encrypted storage option!)
var recipesdirectory = path.normalize(`${process.cwd()}/../recipes/`);

exports.init = init;

function importRecipeFile (filename) {
  if( path.extname(filename) === '.json' ){ // Ignore non json files
    if (fs.existsSync(path.join(recipesdirectory + filename))) {
      var entry;
      try {
        entry = JSON.parse(fs.readFileSync(path.join(recipesdirectory + filename), "utf8"));
      } catch(e){
        console.log(` [!] Error: Could not parse recipe ${filename}!`);
        return;
      }
      if (typeof entry.symbol !== "undefined") {
        global.hybridd.asset[entry.symbol.toLowerCase()] = entry;
        console.log(` [i] found asset recipe ${filename}`);
      }
      if (typeof entry.engine !== "undefined") {
        global.hybridd.engine[entry.engine.toLowerCase()] = entry;
        console.log(` [i] found engine recipe ${filename}`);
      }
      if (typeof entry.source !== "undefined") {
        global.hybridd.source[entry.source.toLowerCase()] = entry;
        console.log(` [i] found source recipe ${filename}`);
      }
    } else {
      console.log(` [!] Error: Cannot load recipe ${filename}!`);
    }
  }
}

function recolveRecipeImport(baseId,history,id){
  if(typeof baseId === "string"){
    var splitBaseId = baseId.split('::');
    switch(splitBaseId.length){
    case 1: return resolveRecipeInheritance(splitBaseId[0],(history||[]).concat(id)); // Handle complete import="foo"
    case 2: return {[splitBaseId[1]] : resolveRecipeInheritance(splitBaseId[0],(history||[]).concat(id))[splitBaseId[1]]};  // Handle specific import="foo::bar"
    default:
      console.log(` [!] Error: Recipe ${id} has ill-defined 'import' property. Expected "$BaseRecipe" or "$BaseRecipe::Property".`);
      return {};
    }
  }else{
    console.log(` [!] Error: Recipe ${id} has ill-defined 'import' property. Expected string or array of strings.`);
    return {};
  }
}

function resolveRecipeInheritance(id, history){

  if(history && history.indexOf(id)!==-1){  // Check for cyclic inherritance;
    console.log(` [!] Error: Cyclic inheritance found for ${id}.`);
    return {};
  }

  var list;
  if(global.hybridd.asset.hasOwnProperty(id)){ // asset
    list = global.hybridd.asset;
  }else if(global.hybridd.engine.hasOwnProperty(id)){ // engine
    list = global.hybridd.engine;
  }else if(global.hybridd.source.hasOwnProperty(id)){ // source
    list = global.hybridd.source;
  }else{
    console.log(` [!] Error: Recipe ${id} not found. Neither asset, engine or source.`);
    return null;
  }
  var recipe = list[id];

  if(recipe.hasOwnProperty("import")){
    var newRecipe = {};


    if(typeof recipe["import"] === 'object' && recipe["import"].isArray()){ //multi  inheritance

      for(var index=0, len = recipe["import"].length; index<len;++index){
        var baseRecipe = recolveRecipeImport(recipe["import"][index],history,id);
        if(baseRecipe){
          functions.uglyMerge(newRecipe,baseRecipe);
        }else{
          console.log(` [!] Error: Failed import of ${recipe["import"][index]} to ${id}..`);
          return null;
        }
      }

    }else{ //singular inheritance
      var baseRecipe = recolveRecipeImport(recipe["import"],history,id);
      if(baseRecipe){
        functions.uglyMerge(newRecipe,baseRecipe);
      }else{
        console.log(` [!] Error: Failed import of ${recipe["import"]} to ${id}.`);
        return null;
      }
    }

    if(recipe.hasOwnProperty("quartz")){
      if(!newRecipe.hasOwnProperty("quartz")){
        newRecipe.quartz = {};
      }
      functions.uglyMerge(newRecipe.quartz, recipe.quartz);
      delete recipe["quartz"];
    }
    functions.uglyMerge(newRecipe, recipe);
    // delete list[id];
    list[id] = newRecipe;
    return newRecipe;
  }else{ // No inheritance
    return recipe;
  }
}

// initialize all recipes
function init(callbackArray) {

  fs.readdir(recipesdirectory, function (err1, files) {

    if (err1) {

      console.log(` [!] warning: error when reading ${err1}`);

    } else {
      // clear recipe assets
      global.hybridd.asset={};
      global.hybridd.engine={};
      global.hybridd.source={};

      global.hybridd.routetree.engine={}; // Clear engine routing

      // scan recipes
      console.log(` [.] scanning recipes in ${recipesdirectory}`);
      files.sort().forEach(importRecipeFile);

      // resolve recipe inheritance
      Object.keys(global.hybridd.asset).forEach(function(id){
        if(!resolveRecipeInheritance(id)){ // If the reipe inheritance fails, remove the asset
          delete global.hybridd.asset[id];
          console.log(` [!] Error: Failed compiling recipe for ${id}.`);
        }
      });
      Object.keys(global.hybridd.engine).forEach(function(id){
        if(!resolveRecipeInheritance(id)){ // If the reipe inheritance fails, remove the engine
          delete global.hybridd.engine[id];
          console.log(` [!] Error: Failed compiling recipe for ${id}.`);
        }else{
          if(global.hybridd.engine[id].hasOwnProperty("router")){ // load router data for engines
            global.hybridd.routetree.engine[id] = global.hybridd.engine[id].router;
          }
        }
      });
      Object.keys(global.hybridd.source).forEach(function(id){
        if(!resolveRecipeInheritance(id)){ // If the reipe inheritance fails, remove the source
          delete global.hybridd.source[id];
          console.log(` [!] Error: Failed compiling recipe for ${id}.`);
        }else{
          if(global.hybridd.source[id].hasOwnProperty("router")){ // load router data for engines
            global.hybridd.routetree.source[id] = global.hybridd.source[id].router;
          }
        }
      });
    }

    functions.sequential(this.callbackArray);

  }.bind({callbackArray:callbackArray}));
}
