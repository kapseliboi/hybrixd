// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybridd module - zcash/module.js
// Module to connect to zcash or any of its derivatives

// required libraries in this context
var fs = require('fs');
var Client = require('../../lib/rest').Client;
var functions = require('../../lib/functions');
var WebSocket = require('ws');
var Teletype = require('teletype');
var scheduler = require('../../lib/scheduler');
var modules = require('../../lib/modules');

// exports
exports.init = init;
exports.exec = exec;

// initialization function
function init () {
  modules.initexec('quartz', ['init']);
}

function addSubprocesses (subprocesses, commands, recipe, xpath) {
  for (var i = 0, len = commands.length; i < len; ++i) {
    subprocesses.push(commands[i]);
  }
  // Postprocess: Append formating of result for specific commands
  var command = xpath[0];
  if (command === 'balance' || command === 'fee') { // Append formatting of returned numbers
    subprocesses.push('form()');
    subprocesses.push('stop()');
  }
}

function connectionOptions (recipe) {
  var options = {};
  if (recipe.hasOwnProperty('pass')) {
    options.password = recipe.pass;
  }
  if (recipe.hasOwnProperty('user')) {
    options.user = recipe.user;
  }
  if (recipe.hasOwnProperty('proxy')) {
    options.proxy = recipe.proxy;
  }
  if (recipe.hasOwnProperty('connection')) {
    options.connection = recipe.connection;
  }
  if (recipe.hasOwnProperty('mimetypes')) {
    options.mimetypes = recipe.mimetypes;
  }
  if (recipe.hasOwnProperty('requestConfig')) {
    options.requestConfig = recipe.requestConfig;
  }
  if (recipe.hasOwnProperty('proxy')) {
    options.responseConfig = recipe.responseConfig;
  }
  options.rejectUnauthorized = false;
  return options;
}

// standard functions of an asset store results in a process superglobal -> global.hybridd.process[processID]
// child processes are waited on, and the parent process is then updated by the postprocess() function
function exec (properties) {
  // decode our serialized properties
  var processID = properties.processID;
  var recipe = properties.target; // The recipe object

  var id; // This variable will contain the recipe.id for sources or the recipe.symbol for assets
  var engine; // This variable will contain the recipe.id for sources or the recipe.symbol for assets
  var source; // This variable will contain the recipe.id for sources or the recipe.symbol for assets
  var list; // This variable will contain the global.hybridd.source for sources or global.hybridd.asset for assets
  var base; // This variable will contain the base part of the symbol (the part before the '.' ) for assets
  var token; // This variable will contain the token part of the symbol (the part after the '.' ) for assets

  if (recipe.hasOwnProperty('symbol')) { // If recipe defines an asset
    id = recipe.symbol;
    list = global.hybridd.asset;
    var symbolSplit = id.split('.');
    base = symbolSplit[0];
    if (symbolSplit.length > 0) {
      token = symbolSplit[1];
    }
  } else if (recipe.hasOwnProperty('source')) { // If recipe defines a source
    id = recipe.source;
    list = global.hybridd.source;
  } else if (recipe.hasOwnProperty('engine')) { // If recipe defines an engine
    id = recipe.engine;
    list = global.hybridd.engine;
  } else {
    console.log(' [i] Error: recipe file contains neither asset symbol nor engine or source id.');
  }

  global.hybridd.proc[processID].request = properties.command; // set request to what command we are performing

  var command = properties.command[0];
  if (command === 'init') {
    if (recipe.hasOwnProperty('host')) { // set up connection
      if (typeof recipe.host === 'string' && (recipe.host.substr(0, 5) === 'ws://' || recipe.host.substr(0, 6) === 'wss://')) { // Websocket connections ws://, wss://
        try {
          var ws = new WebSocket(recipe.host, {});

          ws.on('open', function open () {
            console.log(' [i] API queue: Websocket ' + recipe.host + ' opened');
          }).on('close', function close () {
            console.log(' [i] API queue: Websocket ' + recipe.host + ' closed');
          }).on('error', function error (code, description) {
            console.log(' [i] API queue: Websocket ' + recipe.host + ' : Error ' + code + ' ' + description);
          });

          list[id].link = ws;
        } catch (result) {
          console.log(` [!] Error initiating WebSocket -> ${result}`);
        }
      } else if ((typeof recipe.host === 'string' && recipe.host.substr(0, 6) === 'tcp://') || (Object.prototype.toString.call(recipe.host) === '[object Array]' && recipe.host[0].substr(0, 6) === 'tcp://')) { // TCP direct connections tcp://
        var tmp;
        if (typeof recipe.host === 'string') {
          recipe.host = [recipe.host];
        }
        for (var i = 0; i < recipe.host.length; i++) {
          var host = recipe.host[i].substr(6).split(':');
          var hostaddr = host[0];
          var hostport = (host[1] ? Number(host[1]) : 23);
          try {
            var tcp = Teletype(hostaddr, hostport);
            console.log(' [i] API queue: TCP link ' + hostaddr + ':' + hostport + ' opened');
            if (typeof list[id].link === 'undefined') { list[id].link = {}; }
            list[id].link[recipe.host[i]] = tcp;
          } catch (result) {
            console.log(' [!] API queue: Error initiating TCP connection -> ' + result);
          }
        }
      } else { // Http connection http:// https://
        list[id].link = new Client(connectionOptions(recipe));
        // Overkill in logging: console.log(' [i] HTTP ' + recipe.host + ' initialized.');
      }
    }
  }

  var subprocesses = [];
  if (recipe.hasOwnProperty('quartz') && recipe.quartz.hasOwnProperty(command)) {
    addSubprocesses(subprocesses, recipe.quartz[command], recipe, properties.command);
  } else {
    if (global.hybridd.defaultQuartz.hasOwnProperty('quartz') && global.hybridd.defaultQuartz.quartz.hasOwnProperty(command)) {
      addSubprocesses(subprocesses, global.hybridd.defaultQuartz.quartz[command], recipe, properties.command);
    } else {
      subprocesses.push('stop(1,"Recipe function \'' + command + '\' not supported for \'' + id + '\'.")');
    }
  }

  // fire the Qrtz-language program into the subprocess queue
  scheduler.fire(processID, subprocesses);
}
