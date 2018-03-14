// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybridd module - zcash/module.js
// Module to connect to zcash or any of its derivatives

// required libraries in this context
var fs = require('fs');
var Client = require('../../lib/rest').Client;
var functions = require('../../lib/functions');

// exports
exports.init = init;
exports.exec = exec;

// initialization function
function init() {
  modules.initexec('quartz',['init']);
}

// Preprocess quartz command
function preprocess(command,recipe,xpath){
  var re;
  var parsedCommand = command;
  re = /[$]([_a-zA-Z][\w\-]*)::([_\w\-]*)/g; // Search for "$recipeId::propertyId"
  parsedCommand =  parsedCommand.replace(re, function(full,recipeId,propertyId) {
    var recipe;

    if(global.hybridd.asset.hasOwnProperty(recipeId)){
      recipe = global.hybridd.asset[recipeId];
    }else if(global.hybridd.source.hasOwnProperty(recipeId)){
      recipe = global.hybridd.source[recipeId];
    }else{
      console.log(` [!] Error: Recipe "${recipeId}" for "${full}" not found. Neither asset nor source.`);
      return full;
    }

    return recipe[propertyId];

  }); // Replace all "$recipeId::propertyId" with recipe["recipeId"]["propertyId"]

  re = /[$]([_a-zA-Z][\w\-_]*)/g; // Search for "$propertyId" and "$_propertyId-with_dashes--andNumbers1231"
  parsedCommand = parsedCommand.replace(re, function(full,propertyId) {return recipe[propertyId];}); // Replace all "$propertyId" with recipe["propertyId"]

  re = /[$][\d]+/g; // Search for $0, $1, ...
  parsedCommand = parsedCommand.replace(re, function(x) {return xpath[x.substr(1)];}); // Replace all "$1" with xpath[1]
  return parsedCommand;
}

// preprocess quartz code
function addSubprocesses(subprocesses,commands,recipe,xpath) {

  for(var i=0,len=commands.length;i<len;++i){
    subprocesses.push(preprocess(commands[i],recipe,xpath));
  }

  // Postprocess: Append formating of result for specific commands
  var command = xpath[0];
  if(command === "balance" || command === "fee"){ // Append formatting of returned numbers
    subprocesses.push(preprocess('form(data,$factor)',recipe,xpath));
  }

}

function connectionOptions(recipe){
  var options = {};
  if(recipe.hasOwnProperty("pass")) {
    options.password = recipe.pass;
  }
  if(recipe.hasOwnProperty("user")) {
    options.user = recipe.user;
  }
  if(recipe.hasOwnProperty("proxy")) {
    options.proxy = recipe.proxy;
  }
  if(recipe.hasOwnProperty("connection")) {
    options.connection = recipe.connection;
  }
  if(recipe.hasOwnProperty("mimetypes")) {
    options.mimetypes = recipe.mimetypes;
  }
  if(recipe.hasOwnProperty("requestConfig")) {
    options.requestConfig = recipe.requestConfig;
  }
  if(recipe.hasOwnProperty("proxy")) {
    options.responseConfig = recipe.responseConfig;
  }
  return options;
}

// standard functions of an asset store results in a process superglobal -> global.hybridd.process[processID]
// child processes are waited on, and the parent process is then updated by the postprocess() function
function exec(properties) {
  // decode our serialized properties
  var processID = properties.processID;
  var recipe = properties.target; // The recipe object

  var id; // This variable will contain the recipe.id for sources or the recipe.symbol for assets
  var list; // This variable will contain the global.hybridd.source for sources or global.hybridd.asset for assets
  var base; // This variable will contain the base part of the symbol (the part before the '.' ) for assets
  var token;  // This variable will contain the token part of the symbol (the part after the '.' ) for assets
  if(recipe.hasOwnProperty("symbol")){ // If recipe defines an asset
    id = recipe.symbol;
    list = global.hybridd.asset;
    var symbolSplit = id.split('.');
    base = symbolSplit[0];
    if(symbolSplit.length>0){
      token = symbolSplit[1];
    }
  }else if(recipe.hasOwnProperty("id")){ // If recipe defines a source
    id = recipe.id;
    list = global.hybridd.source;
  }else{
    console.log(' [i] Error: recipe file contains neither asset symbol nor source id.');
  }


  global.hybridd.proc[processID].request = properties.command;   // set request to what command we are performing

  var command = properties.command[0];
  if(command=='init'){

    if(recipe.hasOwnProperty("host")){  // set up REST API connection
      list[id].link = new Client(connectionOptions(recipe));
    }

    // initialize deterministic code for smart contract calls if mode is defined
    if(recipe.hasOwnProperty('module-deterministic')){
      var dcode = String(fs.readFileSync('../modules/deterministic/'+recipe['module-deterministic']+'/deterministic.js.lzma'));
      list[id].dcode = functions.activate( LZString.decompressFromEncodedURIComponent(dcode) );
    }
  }

  console.log(">>"+id+" : "+recipe.fee+" "+JSON.stringify(recipe.quartz.fee));

  var subprocesses = [];
  if(typeof recipe.quartz!=='undefined' && recipe.quartz.hasOwnProperty(command)){

    addSubprocesses(subprocesses,recipe.quartz[command],recipe,properties.command);
/*
  } else if(base && token){ // use implicit inheritance from base class for tokens

    var baseRecipe = list[base];
    if(baseRecipe.quartz.hasOwnProperty(command)){
      // merge the base and token recipe to be passed


      var newRecipe = Object.assign({}, recipe, baseRecipe);

      if(typeof newRecipe['quartz-override']!=='undefined' && newRecipe['quartz-override'].hasOwnProperty(command)) {
        newRecipe.quartz[command] = newRecipe['quartz-override'][command];
      }

      addSubprocesses(subprocesses,newRecipe.quartz[command],newRecipe,properties.command);

    } else {
      subprocesses.push('stop(1,"Recipe function \''+command+'\' not supported for \''+id+'\' nor for base  \''+base+'\'.")');
    }*/

  } else {
    subprocesses.push('stop(1,"Recipe function \''+command+'\' not supported for \''+id+'\'.")');
  }

  // fire the Qrtz-language program into the subprocess queue
  scheduler.fire(processID,subprocesses);
}
