//
// hybridd - proc.js
// Main processing engine and scheduler

/* global DEBUG : true */
/* eslint no-new-func: "off" */
var Quartz = require('./quartz');
var quartz = new Quartz.Quartz();

/*
properties
- sessionID   The sessionID, 0 = no session, 1 = root
- data        The data with which the process is initialized (passed from parent, or POST API call)
- path        The full path used to execute the command for example : /asset/dummy/balance/_dummyaddress_ (in array form)
- command     The command part of the path for example : balance/_dummyaddress_ (in array form)
- recipe      The recipe of the associate asset, source, engine for example the JSON content of asset.dummy.json

- subprocesses (only from fire)
  */

var init = function init (processID, properties) {
  var sessionID = 0; // default to no session
  if (!properties) { properties = {}; } // this should not be the case

  if (typeof properties !== 'undefined') {
    if (typeof properties.sessionID !== 'undefined') {
      sessionID = properties.sessionID;
    }
    if (typeof properties.subprocesses !== 'undefined') {
      global.hybridd.procqueue[processID] = properties.subprocesses;
    }
  }
  if (processID === 0) {
    var suffix = `000${Math.random() * 999}`.slice(-3);
    processID = Date.now() + suffix.toString();
  }
  // initialize process variables
  var process = {};
  process.step = null;
  process.steps = null;
  process.subproc = null;
  process.progress = 0;
  process.autoprog = true;
  process.timeout = null;
  process.started = Date.now();
  process.stopped = null;

  if (properties.hasOwnProperty('data')) {
    process.data = properties.data;
  } else if (global.hybridd.proc.hasOwnProperty(processID) && global.hybridd.proc[processID].hasOwnProperty('data')) {
    process.data = global.hybridd.proc[processID].data; // if there's already data in the process keep it there
  } else {
    process.data = null;
  }

  if (properties.hasOwnProperty('path')) {
    process.path = properties.path;
  } else if (global.hybridd.proc.hasOwnProperty(processID) && global.hybridd.proc[processID].hasOwnProperty('path')) {
    process.path = global.hybridd.proc[processID].path; // if there's already data in the process keep it there
  } else {
    process.path = null;
  }

  if (properties.hasOwnProperty('command')) {
    process.command = properties.command;
  } else if (global.hybridd.proc.hasOwnProperty(processID) && global.hybridd.proc[processID].hasOwnProperty('command')) {
    process.command = global.hybridd.proc[processID].command; // if there's already data in the process keep it there
  } else {
    process.command = null;
  }

  if (properties.hasOwnProperty('recipe')) {
    process.recipe = properties.recipe;
  } else if (global.hybridd.proc.hasOwnProperty(processID) && global.hybridd.proc[processID].hasOwnProperty('recipe')) {
    process.recipe = global.hybridd.proc[processID].recipe; // if there's already data in the process keep it there
  } else {
    process.recipe = null;
  }

  // root parent only
  if (processID.indexOf('.', 15) === -1) {
    process.sid = sessionID;
    process.vars = {};
  }
  global.hybridd.proc[processID] = process;
  return processID;
};

var stop = function (processID, err, data, x) {
  if (!global.hybridd.proc.hasOwnProperty(processID)) {
    if (DEBUG) { console.log(` [D] process ${processID} no longer exists, or cannot be stopped`); }
  } else {
    var process = global.hybridd.proc[processID];

    if (process.stopped === null) {
      var now = Date.now();
      var errorNum = typeof err === 'undefined' ? 1 : err;

      // if processID = '1.2.3.4' then stop processes '1','1.2','1.2.3' and '1.2.3.4'
      var processIDSplit = processID.split('.');
      for (var i = 0; i < processIDSplit.length; ++i) {
        var parentProcessID = processIDSplit.slice(0, i + 1).join('.');
        if (!global.hybridd.proc.hasOwnProperty(parentProcessID)) {
          if (DEBUG) { console.log(` [D] process ${parentProcessID} no longer exists, or cannot be stopped`); }
        } else {
          var parentProcess = global.hybridd.proc[parentProcessID];
          parentProcess.data = data;
          if (errorNum !== 0 || parentProcessID === processID || x) { // On error all parent processes are also stopped
            parentProcess.busy = false;
            parentProcess.err = errorNum;
            if (errorNum === 0) { parentProcess.progress = 1; } // only set progress when without error, else keep progress info as error indication
            parentProcess.stopped = now;
            if (DEBUG) { console.log(' [D] (' + parentProcessID + ') stopped'); }
          }
          // if (i === 0 && errorNum === 0) {
          // TODO add result to cache? How to handle unspents which should never be cached?
          // }
        }
      }
    } else {
      if (DEBUG) { console.log(` [D] (${processID}) process was already stopped`); }
    }
  }
};

var error = function (processID, info) {
  stop(processID, 1, info);
};

/*
 parses a line of quartz code of the form "head(body)" = "head(param1,param2,...)" into an object containing, head, body and parameters. It parses default javascript with single and double quotes strings, object and array literals and parentheses notation.
This to ensure  "{a:1,b:2}" to be parsed as ["{a:1,b:2}"] and not as ["{a:1","b:2}"]
*/
var parse = function (line) {
  if (line.length < 6 || line.substr(4, 1) !== '(' || !line.endsWith(')')) {
    return {error: 'Expected statement of the form: head([parameter1],[parameter2],...)'};
  }
  // head(body)
  var head = line.substr(0, 4);
  var body = line.substr(5, line.length - 6);

  // head(param1,{param2:value},[1,2,3],"foo {} [] bar")
  var parameters = body === '' ? [] : [''];
  var parameterIndex = 0;

  var slashEscape = false; // to handle "\"" and "\\"
  var stringDouble = false; // to handle "foo,bar"
  var stringSingle = false; // to handle 'foo,bar'

  var objectDepth = 0; // to handle "{foo:1,bar:2}"
  var arrayDepth = 0; // to handle "[foo,bar]"
  var parenthesesDepth = 0; // to handle "f(1,2)"
  for (var i = 0; i < body.length; ++i) {
    var c = body[i];
    var skipCharacter = false;
    switch (c) {
      case '\\':
        if (stringDouble || stringSingle) { slashEscape = !slashEscape; }
        break;
      case '"':
        if (stringDouble && !slashEscape) { stringDouble = false; } else if (!stringDouble && !stringSingle && !slashEscape) { stringDouble = true; }
        break;
      case "'":
        if (stringSingle && !slashEscape) { stringSingle = false; } else if (!stringDouble && !stringSingle && !slashEscape) { stringSingle = true; }
        break;
      case '{':
        if (!stringDouble && !stringSingle) { ++objectDepth; }
        break;
      case '}':
        if (!stringDouble && !stringSingle) { --objectDepth; }
        break;
      case '[':
        if (!stringDouble && !stringSingle) { ++arrayDepth; }
        break;
      case ']':
        if (!stringDouble && !stringSingle) { --arrayDepth; }
        break;
      case '(':
        if (!stringDouble && !stringSingle) { ++parenthesesDepth; }
        break;
      case ')':
        if (!stringDouble && !stringSingle) { --parenthesesDepth; }
        break;
      case ',':
        if (!stringDouble && !stringSingle && objectDepth === 0 && arrayDepth === 0 && parenthesesDepth === 0) {
          ++parameterIndex;
          parameters.push('');
          skipCharacter = true;
          break;
        }
    }
    if (c !== '\\') {
      slashEscape = false;
    }
    if (!skipCharacter) {
      parameters[parameterIndex] += c;
    }
  }
  if (slashEscape) { return {error: 'Illegal open \\ character'}; }
  if (stringDouble) { return {error: 'Expected " character'}; }
  if (stringSingle) { return {error: "Expected ' character"}; }
  if (objectDepth > 0) { return {error: 'Expected } character'}; }
  if (objectDepth < 0) { return {error: 'Illegal } character'}; }
  if (arrayDepth > 0) { return {error: 'Expected ] character'}; }
  if (arrayDepth < 0) { return {error: 'Illegal ] character'}; }
  if (parenthesesDepth > 0) { return {error: 'Expected ) character'}; }
  if (parenthesesDepth < 0) { return {error: 'Illegal ) character'}; }
  return {head, body, parameters};
};

var next = function (processID) {
  if (!global.hybridd.proc.hasOwnProperty(processID)) { return false; } // indicate that the process was already stopped / is not valid

  var process = global.hybridd.proc[processID];

  if (process.stopped) { return false; } // indicate that the process was already stopped / is not valid

  var step = typeof process.step === 'undefined' ? 0 : process.step;

  var subprocessID = `${processID}.${step}`;
  var subprocess = global.hybridd.proc[subprocessID];

  var prevSubprocessID = process.subproc;
  var prevSubprocess = global.hybridd.proc[prevSubprocessID];

  if (!global.hybridd.proc.hasOwnProperty(subprocessID)) { return false; } // indicate that the process was already stopped / is not valid

  var data = null;
  var err = null;

  if (typeof prevSubprocess !== 'undefined') {
    err = typeof prevSubprocess.err !== 'undefined' ? prevSubprocess.err : 0;
    data = typeof prevSubprocess.data !== 'undefined' ? prevSubprocess.data : null;
  } else {
    err = process.hasOwnProperty('err') ? process.err : 0;
    data = process.hasOwnProperty('data') ? process.data : null;
  }

  // wait for subprocess step to finish
  if (process.busy === true) { //  || global.hybridd.proc[processID].step < step
    // check if the subprocess is already finished
    if (subprocess.progress === 1) { // && global.hybridd.proc[processID].progress < 1
      if (DEBUG) {
        console.log(` [D] (${processID}) finished step ${step + 1} of ${process.steps + 1}`);
      }
      if (process.autoprog === true) {
        process.progress = process.step / process.steps;
      }
      process.busy = false;
      // set time process has stopped
      if (process.progress === 1) {
        process.stopped = Date.now();
      } else {
        process.step++;
      }
      // if all steps have been done, stop to pass data to parent process
      if (step === process.steps) {
        stop(processID, err, data);
      }
    } else if (process.autoprog === true) {
      if (subprocess.steps > 0) {
        process.progress = (process.step - 1) / process.steps + 1 / process.steps * subprocess.progress;
      }
    }

    // initialize subprocess step
  } else if (process.busy !== true && process.stopped === null && process.step <= process.steps) {
    process.busy = true;

    global.hybridd.proc[subprocessID].data = data;

    if (DEBUG) { console.log(` [D] (${processID}) running step ${step + 1} of ${process.steps + 1}`); }

    // if base command is used, insert extra properties

    var subprocInsert = `{parentID:"${processID}",processID:"${subprocessID}"}`;
    var statement = subprocess.request.replace(/peek\(/g, `quartz.peek(${subprocInsert},`);

    var parsedStatement = parse(statement);
    if (!parsedStatement.hasOwnProperty('error')) {
      // For each parameter try to evaluate it
      for (var i = 0; i < parsedStatement.parameters.length; ++i) {
        var tmp;
        try {
          tmp = new Function('data', 'quartz', 'return ' + parsedStatement.parameters[i])(data, quartz);
        } catch (result) {
          console.log(` [!] (${processID}) parameter parse error: \n     ${parsedStatement.parameters[i]}\n     ${result || 'UNKNOWN ERROR!'}`);
          error(processID, 'Proc error.', data);
          return false;
        }

        parsedStatement.parameters[i] = tmp;
      }
      if (quartz.hasOwnProperty(parsedStatement.head)) {
        // set previous ID step to current subprocess ID
        process.subproc = subprocessID;
        // fire off the subprocess
        var procInsert = {
          'parentID': processID,
          'processID': `${processID}.${step}`
        };
        parsedStatement.parameters.unshift(procInsert); // Set  this argument to null, pass process
        try {
          quartz[parsedStatement.head].apply(quartz, parsedStatement.parameters); // head(p,param1,param2,...)
        } catch (result) {
          console.log(` [!] (${processID}) proc error: \n    ${statement}\n     ${result || 'UNKNOWN ERROR!'}`);
          error(processID, 'Proc error.', data);
          return false;
        }
      } else {
        console.log(` [!] (${processID}) Quartz does not have function "` + parsedStatement.head + '"');
        error(processID, 'Proc error.', data);
      }
    } else {
      console.log(` [!] (${processID}) parsing error: \n     ${statement}\n     ` + parsedStatement.error);
      error(processID, 'Proc error.', data);
      return false;
    }
  }
  return true; // indicate that the process has been updated
};

var start = function (processID, subprocesses) {
  var process = global.hybridd.proc[processID];

  process.step = 0;
  process.steps = subprocesses.length - 1;
  process.busy = false;

  if (DEBUG) { console.log(` [D] (${processID}) initializing sequence processing for ${process.steps + 1} steps...`); }
  // prepare stepping array
  for (var step = 0; step < subprocesses.length; step += 1) {
    var subprocessID = `${processID}.${step}`;

    init(subprocessID);
    subprocesses[step] = subprocesses[step].replace(`"processID":"${processID}"`, `"processID":"${subprocessID}"`);
    global.hybridd.proc[subprocessID].request = subprocesses[step];
  }
  if (subprocesses.length > 0) {
    var firstSubprocessID = `${processID}.0`;
    global.hybridd.proc[firstSubprocessID].data = process.data;
  }
};

function writeProperty (value) {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  } else if (typeof value === 'object' && value instanceof Array) {
    return value.join(',');
  } else {
    return 'undefined';
  }
}

// Preprocess quartz command
function preprocess (statement, recipe, command) {
  var re;
  var parsedStatement = statement;
  re = /[$]([_a-zA-Z][\w\-]*)::([_\w\-]*)/g; // Search for "$recipeId::propertyId"
  parsedStatement = parsedStatement.replace(re, function (full, recipeId, propertyId) {
    var otherRecipe;
    if (global.hybridd.asset.hasOwnProperty(recipeId)) {
      otherRecipe = global.hybridd.asset[recipeId];
    } else if (global.hybridd.source.hasOwnProperty(recipeId)) {
      otherRecipe = global.hybridd.source[recipeId];
    } else if (global.hybridd.engine.hasOwnProperty(recipeId)) {
      otherRecipe = global.hybridd.engine[recipeId];
    } else {
      console.log(` [!] Error: Recipe "${recipeId}" for "${full}" not found. Neither asset, engine or source.`);
      return full;
    }

    return writeProperty(otherRecipe[propertyId]);
  }); // Replace all "$recipeId::propertyId" with recipe["recipeId"]["propertyId"]

  re = /[$]([_a-zA-Z][\w\-_]*)/g; // Search for "$propertyId" and "$_propertyId-with_dashes--andNumbers1231"
  parsedStatement = parsedStatement.replace(re, (full, propertyId) => { return recipe ? writeProperty(recipe[propertyId]) : 'undefined'; }); // Replace all "$propertyId" with recipe["propertyId"]

  re = /[$][\d]+/g; // Search for $0, $1, ...
  parsedStatement = parsedStatement.replace(re, x => { return command ? command[x.substr(1)] : 'undefined'; }); // Replace all "$1" with path[1]
  return parsedStatement;
}

var fire = function (processID, subprocesses) {
  if (typeof subprocesses !== 'undefined') {
    if (subprocesses.length > -1) {
      var sessionID = 0; // if no session ID is provided then use 0 = least access
      var process = global.hybridd.proc[processID];

      for (var i = 0; i < subprocesses.length; ++i) {
        subprocesses[i] = preprocess(subprocesses[i], process.recipe, process.command);
      }

      if (DEBUG) {
        console.log(` [D] adding ${processID} to processing queue with ${subprocesses.length} steps.`);
      }

      if (typeof process !== 'undefined' && typeof process.sid !== 'undefined') {
        sessionID = process.sid;
      }

      var data = process.data;
      init(processID, {
        sessionID: sessionID,
        subprocesses: subprocesses,
        data: data
      });
    }
  }
};

var finish = function (processId, data) {
  return function (callbackArray) {
    require('../scheduler').stop(this.processId, 0, this.data);
    require('../functions').sequential(callbackArray);
  }.bind({processId, data});
};

var resultMessage = function (processID, request) {
  return {
    'error': 0,
    'info': 'Command process ID.',
    'id': 'id',
    'request': request,
    'data': processID
  };
};

exports.init = init; // initialize a new process
exports.stop = stop; // functionally stop a process
exports.start = start; // starts a process (moves it from queue to active processes)
exports.fire = fire; // adds a process to the queue
exports.next = next; // performs an update of the process
exports.error = error; // functionally stop a process with an error info message
exports.finish = finish; // creates a callback function that stops this process when finished
exports.result = resultMessage; // creates an API result message, a follow-up
