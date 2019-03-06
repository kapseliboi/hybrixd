// (C) 2015 Internet of Coins / hybrix / Joachim de Koning
// hybrixd module - voting/module.js
// Module to provide decentralized voting engine

// required libraries in this context
var route = require('../../lib/router');
let scheduler = require('../../lib/scheduler');
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
      if(command[3]) {
        let filePath = 'modules/'+target+'/redirect.html';
        if (fs.existsSync('../'+filePath)) {
          let data = fs.readFileSync('../'+filePath).toString('utf8')
              .replace('%PATH%','/engine/'+target+'/addAddress/'+command[1]+'/'+command[2])
              .replace('%SUCCESS%',command[2])
              .replace('%FAILURE%',command[3]);
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
