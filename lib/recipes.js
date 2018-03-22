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

      var entry = JSON.parse(fs.readFileSync(path.join(recipesdirectory + filename), "utf8"));
      if (typeof entry.symbol !== "undefined") {
        global.hybridd.asset[entry.symbol.toLowerCase()] = entry;
        console.log(` [i] found asset recipe ${filename}`);
      }
      if (typeof entry.id !== "undefined") {
        global.hybridd.source[entry.id.toLowerCase()] = entry;
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

function uglyClone(obj){return JSON.parse(JSON.stringify(obj));}

function uglyMerge(target,source){
  for(var key in source){
    target[key]=uglyClone(source[key])
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
  }else if(global.hybridd.source.hasOwnProperty(id)){ // source
    list = global.hybridd.source;
  }else{
    console.log(` [!] Error: Recipe ${id} not found. Neither asset nor source.`);
    return null;
  }
  var recipe = list[id];

  if(recipe.hasOwnProperty("import")){
    var newRecipe = {};


    if(typeof recipe["import"] === 'object' && recipe["import"].isArray()){ //multi  inheritance

      recipe["import"].forEach(function(index){
        functions.uglyMerge(newRecipe, recolveRecipeImport(recipe["import"],history,id));
      }.bind({recipe,newRecipe,history,id}));

    }else{ //singular inheritance
      functions.uglyMerge(newRecipe, recolveRecipeImport(recipe["import"],history,id));
    }

    functions.uglyMerge(newRecipe.quartz, recipe.quartz);
    if(recipe.hasOwnProperty("quartz")){
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
      global.hybridd.asset.length=0;
      global.hybridd.source.length=0;

      // initialize (hardcoded) storage source
      global.hybridd.source['storage']={id:'storage',module:'storage'};

      // scan recipes
      console.log(` [.] scanning recipes in ${recipesdirectory}`);
      files.sort().forEach(importRecipeFile);

      // resolve recipe inheritance
      Object.keys(global.hybridd.asset).forEach(function(id){resolveRecipeInheritance(id)});
      Object.keys(global.hybridd.source).forEach(function(id){resolveRecipeInheritance(id)});

    }

    functions.sequential(this.callbackArray);

  }.bind({callbackArray:callbackArray}));
}
