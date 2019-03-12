// (C) 2015 Internet of Coins / hybrix / Joachim de Koning
// hybrixd module - voting/module.js
// Module to provide decentralized voting engine

// required libraries in this context
var route = require('../../lib/router');
let scheduler = require('../../lib/scheduler');
let functions = require('../../lib/functions');
let fs = require('fs');

// initialization function
function init () {}

// exec
function exec (properties) {
  let target = properties.target.module;
  let command = properties.command;
  let processID = properties.processID;

  switch (command[0]) {
    case 'http':
    case 'https':
      if(command[1] && command[2]) {
        let protocol = command[0];
        let redirectJSON = command[1];
        // adjust for forward slashes in the command path
        let commandSlice;
        for(let i=1;i<command.length-2;i++) {
          if(command[i].substr(-1,1)==='}') {
            commandSlice = i+1;
            i=command.length;
          } else {
            redirectJSON = redirectJSON+'/'+command[i+1];
          }
        }
        let commandPath = '/'+command.slice(commandSlice).join('/');
        let redirectObj = JSON.parse( functions.JSONfix(redirectJSON) );
        if(!(redirectObj.success && redirectObj.failure)) {
          return {error: 1, data: 'Redirection JSON object must contain success and failure keys!', command: command, path: ['engine', target].concat(command)};
        }
        let filePath = 'modules/'+target+'/redirect.html';
        if (fs.existsSync('../'+filePath)) {
          let data = fs.readFileSync('../'+filePath).toString('utf8')
              .replace(/%PATH%/g,commandPath)
              .replace(/%PROTOCOL%/g,protocol)            // replace two occurrences of protocol
              .replace(/%SUCCESS%/g,redirectObj.success)
              .replace(/%FAILURE%/g,redirectObj.failure);
          return {error: 0, data: data, type: 'blob'};
        } else {
          return {error: 1, data: 'File redirect.html not found!', command: command, path: ['engine', target].concat(command)};
        }
      } else {
        return {error: 1, data: 'Please specify redirection target!', command: command, path: ['engine', target].concat(command)};
      }
      break;
  }
}

// standard function for postprocessing the data of a sequential set of instructions
function post (properties, result) {
  let target = properties.target.module;
  let command = properties.command;
  let processID = properties.processID;


}

function readData (p, processIDs, millisecs, callback) {
  // check if process has finished:
  let finished = 0;
  let progress = 0;
  if(global.hybrixd.proc[processIDs]) {
    finished = (global.hybrixd.proc[processIDs].progress >= 1 || global.hybrixd.proc[processIDs].stopped) ? 1 : 0;
  }
  if (finished) {
    let result = {data: global.hybrixd.proc[processIDs].data, err: global.hybrixd.proc[processIDs].err, type: global.hybrixd.proc[processIDs].type};
    callback(p, result);
  } else {
    setTimeout(function (processIDs, millisecs) {
      readData(p, processIDs, millisecs, callback);
    }, millisecs || 500, p, processIDs, millisecs || 500, this);
  }
}

// exports
exports.init = init;
exports.exec = exec;
