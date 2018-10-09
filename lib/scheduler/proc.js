//
// hybridd - proc.js
// Main processing engine and scheduler

/* global DEBUG : true */
/* eslint no-new-func: "off" */
var Quartz = require('./quartz');
var quartz = new Quartz.Quartz();
var functions = require('../functions');

/*
properties
- sessionID   The sessionID, 0 = no session, 1 = root
- data        The data with which the process is initialized (passed from parent, or POST API call)
- path        The full path used to execute the command for example : /asset/dummy/balance/_dummyaddress_ (in array form)
- command     The command part of the path for example : balance/_dummyaddress_ (in array form)
- recipe      The recipe of the associate asset, source, engine for example the JSON content of asset.dummy.json

- subprocesses (only from fire)
  */

/*
TODO reorder properties,processID  =>  sessionID, path, command, recipe, [data], [processId]

processID is only used by fire and quartz.fork
spread out properties as seperate variables to underline importance

  */
var init = function init (processID, properties) {
  var sessionID = 0; // default to no session
  if (!properties) { properties = {}; } // this should not be the case
  var labels = {};
  if (typeof properties !== 'undefined') {
    if (typeof properties.sessionID !== 'undefined') {
      sessionID = properties.sessionID;
    }

    if (typeof properties.subprocesses !== 'undefined') {
      for (var i = 0; i < properties.subprocesses.length;) { // parse labels and remove comments
        var subprocess = properties.subprocesses[i];
        if (subprocess.startsWith('@')) { // define labels TODO ignore whitespace
          labels[subprocess.substr(1)] = i;
          properties.subprocesses.splice(i, 1);
        } else if (subprocess.startsWith('#')) { // remove comments  TODO ignore whitespace
          properties.subprocesses.splice(i, 1);
        } else {
          ++i;
        }
      }

      global.hybridd.procqueue[processID] = properties.subprocesses;
    }
  }
  if (processID === 0) { // create a new process
    var suffix = `000${Math.random() * 999}`.slice(-3);
    processID = Date.now() + suffix.toString();
  } else if (global.hybridd.proc.hasOwnProperty(processID) && global.hybridd.proc[processID].hasOwnProperty('data') && global.hybridd.proc[processID].stopped) {
    return processID; // Process was already initialized and stopped, so do not restart it again
  }
  // initialize process variables
  var process = {};
  process.busy = false;
  process.step = null;
  process.steps = null;
  process.subproc = null;
  process.progress = 0;
  process.autoprog = true;
  process.timeout = null;
  process.started = Date.now();
  process.stopped = null;
  process.sid = sessionID;
  process.labels = labels;
  process.onFail = null; // determines on failure behaviour
  process.vars = {}; // variables used by quartz.poke and quartz.peek

  //  process.offset : Does not need to be defined here but can be set by wchan
  //  process.length : Does not need to be defined here but can be set by wchan
  //  process.hash : Does not need to be defined here but can be set by wchan
  //  process.type : Does not need to be defined here but can be set for wchan

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

  global.hybridd.proc[processID] = process;
  return processID;
};

var kill = function (processID, data, now, err) {
  if (processID && global.hybridd.proc.hasOwnProperty(processID)) {
    var process = global.hybridd.proc[processID];
    if (process.stopped === null) {
      process.busy = false;
      process.stopped = now;
      process.data = data;
      if (err) {
        process.err = err;
        // do not set progress, keep this as debug info
      } else {
        process.progress = 1;
        process.err = 0;
      }
    }
  }
};

var stop = function (processID, err, data) {
  var processIDSplit = processID.split('.');
  var now = Date.now();
  if (err || 0) { // on error stop all parent processes and process steps
    if (processIDSplit.length % 2 === 1) { // processID is a process, seek it's active step so it can be stopped
      if (global.hybridd.proc.hasOwnProperty(processID)) {
        var processStepID = processID + '.' + global.hybridd.proc[processID].step;
        kill(processStepID, data, now, err);
      }
    }
    for (var i = processIDSplit.length - 1; i >= 0; --i) {
      var parentID = processIDSplit.slice(0, i + 1).join('.');
      kill(parentID, data, now, err);
    }
  } else {
    var processStepID;
    if (processIDSplit.length % 2 === 0) { // processID is a processStep
      processStepID = processID;
      processID = processIDSplit.slice(0, processIDSplit.length - 1).join('.');
    } else { // processID is a process, seek it's active step so it can be stopped
      if (global.hybridd.proc.hasOwnProperty(processID)) {
        processStepID = processID + '.' + global.hybridd.proc[processID].step;
      }
    }
    kill(processID, data, now);
    kill(processStepID, data, now);
  }
};

var pass = function (processStepID, err, data) {
  if (processStepID && global.hybridd.proc.hasOwnProperty(processStepID)) {
    var processStep = global.hybridd.proc[processStepID];
    if (processStep.stopped === null) {
      processStep.busy = false;
      processStep.stopped = Date.now();
      processStep.data = data;
      processStep.progress = 1;
      processStep.err = err||0;
    }
  }
};

// set the type for the data TODO set to root process
var type = function (processID, type) {
  var processIDSplit = processID.split('.');
  for (var i = 0; i < processIDSplit.length; ++i) {
    var parentProcessID = processIDSplit.slice(0, i + 1).join('.');
    if (global.hybridd.proc.hasOwnProperty(parentProcessID)) {
      var parentProcess = global.hybridd.proc[parentProcessID];
      parentProcess.type = type;
    }
  }
};

var error = function (processID, info) {
  stop(processID, 1, info);
};

/*
 parses a line of quartz code of the form "head(body)" = "head(param1,param2,...)" or "head param1 parame2 ..." into an object containing, head, body and parameters. It parses default javascript with single and double quotes strings, object and array literals and parentheses notation.
This to ensure  "{a:1,b:2}" to be parsed as ["{a:1,b:2}"] and not as ["{a:1","b:2}"]
*/
var parseParameter = function (line, labels, step) {
  var body;
  if (line.length === 4) { // head
    body = '';
  } else if (line.length >= 6 && line.substr(4, 1) === '(' && line.endsWith(')')) { // head() // head([parameter1],[parameter2],...)
    body = line.substr(5, line.length - 6);
  } else if (line.length > 4 && line.substr(4, 1) === ' ') { //  head [parameter1] [parameter2] ...
    body = line.substr(5, line.length - 5);
  } else {
    return { error: 'Expected statement of the form: head [parameter1] [parameter2] ... or head([parameter1],[parameter2],...)' };
  }

  var re = /^@([_a-zA-Z][\w\-]*)$/g; // Search for @labelname
  body = body.replace(re, (x, label) => { return (labels[label] - step); }); // Replace all "#label" with labels[label]-step (relative jump required to go to label

  // head(body)
  var head = line.substr(0, 4);

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
      case ' ':
        if (!stringDouble && !stringSingle && objectDepth === 0 && arrayDepth === 0 && parenthesesDepth === 0) {
          if (parameters[parameterIndex] !== '') {
            ++parameterIndex;
            parameters.push('');
          }
          skipCharacter = true;
        }
        break;
      case ',':
        if (!stringDouble && !stringSingle && objectDepth === 0 && arrayDepth === 0 && parenthesesDepth === 0) {
          ++parameterIndex;
          parameters.push('');
          skipCharacter = true;
        }
        break;
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

function writeProperty (value) {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  } else if (typeof value === 'object') {
    return JSON.stringify(value);
  } else {
    return 'undefined';
  }
}

// Preprocess quartz command
function preprocess (statement, recipe, command, data, vars, parentVars) {
  var re;
  var parsedStatement = statement;

  re = /[$]([_a-zA-Z][\w\-]*)::([_\w\-]*)/g; // Search for "$recipeId::propertyId"
  parsedStatement = parsedStatement.replace(re, function (full, recipeId, propertyId) {
    var scope;
    if (recipeId === 'local' || recipeId === '') {
      if (this.recipe.hasOwnProperty('vars')) {
        scope = this.recipe.vars;
      } else {
        return 'undefined';// TODO error
      }
    } else if (recipeId === 'proc') {
      scope = vars;
    } else if (recipeId === 'parent') {
      if (parentVars) {
        scope = parentVars;
      } else {
        return 'undefined'; // TODO error
      }
    } else if (global.hybridd.asset.hasOwnProperty(recipeId)) {
      scope = global.hybridd.asset[recipeId];
    } else if (global.hybridd.source.hasOwnProperty(recipeId)) {
      scope = global.hybridd.source[recipeId];
    } else if (global.hybridd.engine.hasOwnProperty(recipeId)) {
      scope = global.hybridd.engine[recipeId];
    } else {
      console.log(` [!] Error: Recipe "${recipeId}" for "${full}" not found. Neither asset, engine or source.`);
      return 'undefined'; // TODO error
    }
    if (scope.hasOwnProperty(propertyId)) {
      return writeProperty(scope[propertyId]);
    } else {
      return 'undefined'; // TODO error
    }
  }.bind({recipe})); // Replace all "$recipeId::propertyId" with recipe["recipeId"]["propertyId"]

  re = /[$]([_a-zA-Z][\w\-_]*)/g; // Search for "$propertyId" and "$_propertyId-with_dashes--andNumbers1231"
  parsedStatement = parsedStatement.replace(re, (full, propertyId) => {
    if (recipe && recipe.hasOwnProperty(propertyId)) {
      return writeProperty(recipe[propertyId]);
    } else if (vars && vars.hasOwnProperty(propertyId)) {
      return writeProperty(vars[propertyId]);
    }
    return 'undefined'; // TODO error
  }); // Replace all "$propertyId" with recipe["propertyId"]

  re = /[$][\d]+/g; // Search for $0, $1, ... // TODO error if too large
  parsedStatement = parsedStatement.replace(re, x => { return command ? command[x.substr(1)] : 'undefined'; }); // Replace all "$1" with path[1]

  re = /([^$]|^)([$])([^$]|$)/; // Search for single $
  parsedStatement = parsedStatement.replace(re, (full, pre, dollarSign, post) => {
    return pre + writeProperty(data) + post;
  }); // Replace all "$" with data;

  parsedStatement = parsedStatement.replace('$$', '$'); // Replace all "$$" with single "$"

  return parsedStatement;
}

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

    var processIDSplit = processID.split('.');
    var rootProcessID = processIDSplit[0];
    var rootProcess = global.hybridd.proc[rootProcessID];
    var parentVars;
    if (processIDSplit.length > 2) {
      var parentProcessID = processIDSplit.slice(0, processIDSplit.length - 2).join('.');
      parentVars = global.hybridd.proc[parentProcessID].vars;
    }

    var statement = subprocess.request;
    var parsedStatement = parseParameter(statement, rootProcess.labels, step);
    if (!parsedStatement.hasOwnProperty('error')) {
      // For each parameter try to evaluate it
      for (var i = 0; i < parsedStatement.parameters.length; ++i) {
        var result;
        try {
          var parameter = preprocess(parsedStatement.parameters[i], rootProcess.recipe, rootProcess.command, data, process.vars, parentVars);
          result = new Function('data', 'quartz', 'functions', 'return ' + parameter)(data, quartz, functions);
        } catch (result) {
          console.log(` [!] (${processID}) parameter parse error: \n     ${parsedStatement.parameters[i]}\n     ${result || 'UNKNOWN ERROR!'}`);
          error(processID, 'Proc error.', data);
          return false;
        }

        parsedStatement.parameters[i] = result;
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
    global.hybridd.proc[subprocessID].request = subprocesses[step]; // Set the quartz code for the subprocess
  }
  if (subprocesses.length > 0) {
    var firstSubprocessID = `${processID}.0`;
    global.hybridd.proc[firstSubprocessID].data = process.data;
  }
};

var fire = function (processID, subprocesses) {
  if (typeof subprocesses !== 'undefined') {
    if (subprocesses.length > -1) {
      var sessionID = 0; // if no session ID is provided then use 0 = least access
      //  if (global.hybridd.proc.hasOwnProperty(processID)) {  // TODO check if process exists

      var process = global.hybridd.proc[processID];

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

var resultMessage = function (processID) {
  if (global.hybridd.proc.hasOwnProperty(processID)) {
    var process = global.hybridd.proc[processID];
    var request = process.path ? process.path.join('/') : undefined;
    return {
      'error': 0,
      'info': 'Command process ID.',
      'id': 'id',
      'request': request,
      'data': processID
    };
  } else {
    return {
      'error': 1,
      'info': 'Command process ID not found.'
    };
  }
};

exports.init = init; // initialize a new process
exports.stop = stop; // functionally stop a process and all its subprocesses
exports.type = type; // set the type of the process data
exports.pass = pass; // pass data to to a process step
exports.start = start; // starts a process (moves it from queue to active processes)
exports.fire = fire; // adds a process to the queue
exports.next = next; // performs an update of the process
exports.error = error; // functionally stop a process with an error info message
exports.finish = finish; // creates a callback function that stops this process when finished
exports.result = resultMessage; // creates an API result message, a follow-up
