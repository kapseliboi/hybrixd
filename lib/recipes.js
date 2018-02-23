// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybridd - recipes.js
// Scans for and loads recipes dynamically from files

// required standard libraries
var fs = require("fs");
var path = require("path");

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
    case 1: return resolveRecipeInheritance(baseId[0],(history||[]).concat(id)); // Handle complete import="foo"
    case 2: return {[baseId[1]] : resolveRecipeInheritance(baseId[0],(history||[]).concat(id))[baseId[1]]};  // Handle specific import="foo::bar"
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
  }else if(global.hybridd.source.hasOwnProperty(id)){ // source
    list = global.hybridd.source;
  }else{
    console.log(` [!] Error: Recipe ${id} not found. Neither asset nor source.`);
    return null;
  }
  var recipe = list[id];

  if(recipe.hasOwnProperty("import")){
    var newRecipe = {};
    if(recipe["import"].isArray()){ //multi  inheritance

      recipe["import"].forEach(function(index){
        Object.assign(newRecipe, Object.assign(newRecipe, recolveRecipeImport(recipe["import"][index],history,id)));
      }.bind({recipe,newRecipe,history,id}));

    }else{ //singular inheritance
      Object.assign(newRecipe, recolveRecipeImport(recipe["import"],history,id));
    }
    Object.assign(newRecipe, recipe);
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

      // scan recipes
      console.log(` [.] scanning recipes in ${recipesdirectory}`);
      files.sort().forEach(importRecipeFile);

      // resolve recipe inheritance
      Object.keys(global.hybridd.asset).forEach(function(id){resolveRecipeInheritance(id)});
      Object.keys(global.hybridd.source).forEach(function(id){resolveRecipeInheritance(id)});

    }

    functions.sequential(callbackArray);

  }.bind({callbackArray}));
}
