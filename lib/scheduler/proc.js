//
// hybrixd - proc.js
// Main processing engine and scheduler

/* global DEBUG : true */
/* eslint no-new-func: "off" */
let Quartz = require('./quartz');
let quartz = new Quartz.Quartz();
let functions = require('../functions');
let fs = require('fs');
let Decimal = require('../../common/crypto/decimal-light.js');

/*
  properties
  - sessionID   The sessionID, 0 = no session, 1 = root
  - data        The data with which the process is initialized (passed from parent, or POST API call)
  - path        The full path used to execute the command for example : /asset/dummy/balance/_dummyaddress_ (in array form)
  - command     The command part of the path for example : balance/_dummyaddress_ (in array form)
  - recipe      The recipe of the associate asset, source, engine for example the JSON content of asset.dummy.json
  - qrtz        The qrtz code for this step.

  - subprocesses (only from fire)
*/

/*
  TODO reorder properties,processID  =>  sessionID, path, command, recipe, [data], [processId]

  processID is only used by fire and quartz.fork
  spread out properties as seperate variables to underline importance
*/
let init = function init (processID, properties) {
  let sessionID = 0; // default to no session
  if (!properties) { properties = {}; } // this should not be the case
  let labels = {};
  if (typeof properties !== 'undefined') {
    if (typeof properties.sessionID !== 'undefined') {
      sessionID = properties.sessionID;
    }

    if (typeof properties.subprocesses !== 'undefined') {
      for (let i = 0; i < properties.subprocesses.length;) { // parse labels and remove comments
        let subprocess = properties.subprocesses[i];
        if (subprocess.trim().startsWith('@')) { // define labels
          labels[subprocess.substr(1)] = i;
          properties.subprocesses.splice(i, 1);
        } else if (subprocess.trim().startsWith('#')) { // remove comments
          properties.subprocesses.splice(i, 1);
        } else {
          ++i;
        }
      }

      global.hybrixd.procqueue[processID] = properties.subprocesses;
    }
  }
  if (processID === 0) { // create a new process
    let suffix = `000${Math.random() * 999}`.slice(-3);
    processID = Date.now() + suffix.toString();
  } else if (processID.endsWith('.')) {
    let requestPID;
    for (let i = 0; i < 1000; ++i) {
      requestPID = processID + i;
      if (!global.hybrixd.proc.hasOwnProperty(requestPID)) {
        break;
      }
    }
    processID = requestPID;
  } else if (global.hybrixd.proc.hasOwnProperty(processID) && global.hybrixd.proc[processID].hasOwnProperty('data') && global.hybrixd.proc[processID].stopped) {
    return processID; // Process was already initialized and stopped, so do not restart it again
  }
  // initialize process variables
  let process = {};
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
  process.hook = null; // determines on failure behaviour (for process errors and API queue time outs)
  process.timeHook = null; // determines on failure behaviour (for process time outs)
  process.vars = {}; // variables used by quartz.poke and quartz.peek

  //  process.offset : Does not need to be defined here but can be set by wchan
  //  process.length : Does not need to be defined here but can be set by wchan
  //  process.hash : Does not need to be defined here but can be set by wchan
  //  process.type : Does not need to be defined here but can be set for wchan

  if (properties.hasOwnProperty('data')) {
    process.data = properties.data;
  } else if (global.hybrixd.proc.hasOwnProperty(processID) && global.hybrixd.proc[processID].hasOwnProperty('data')) {
    process.data = global.hybrixd.proc[processID].data; // if there's already data in the process keep it there
  } else {
    process.data = null;
  }

  if (properties.hasOwnProperty('path')) {
    process.path = properties.path;
  } else if (global.hybrixd.proc.hasOwnProperty(processID) && global.hybrixd.proc[processID].hasOwnProperty('path')) {
    process.path = global.hybrixd.proc[processID].path; // if there's already data in the process keep it there
  } else {
    process.path = null;
  }

  if (properties.hasOwnProperty('command')) {
    process.command = properties.command;
  } else if (global.hybrixd.proc.hasOwnProperty(processID) && global.hybrixd.proc[processID].hasOwnProperty('command')) {
    process.command = global.hybrixd.proc[processID].command; // if there's already data in the process keep it there
  } else {
    process.command = null;
  }

  if (properties.hasOwnProperty('recipe')) {
    process.recipe = properties.recipe;
  } else if (global.hybrixd.proc.hasOwnProperty(processID) && global.hybrixd.proc[processID].hasOwnProperty('recipe')) {
    process.recipe = global.hybrixd.proc[processID].recipe; // if there's already data in the process keep it there
  } else {
    process.recipe = null;
  }

  global.hybrixd.proc[processID] = process;
  return processID;
};

// if a process is killed but it has a hook then it will cause a break to the "bubble up" of the error
let kill = function (processID, data, now, err) {
  if (processID && global.hybrixd.proc.hasOwnProperty(processID)) {
    let process = global.hybrixd.proc[processID];

    if (process.stopped === null) {
      process.busy = false;
      process.stopped = now;
      process.data = data;

      if (err && process.hook) {
        if (process.hook.hasOwnProperty('jump')) { // on error jump to the specified process
          // reset process

          if (process.hook.jump > process.steps) { // if the jump jumps beyon end of program, then set the error
            process.step = process.hook.jump;
            err = 1;
            data = 'hook: illegal out of bounds jump.';
          } else if (process.hook.jump === process.step - 1) {
            process.step = process.hook.jump;
            err = 1;
            data = 'hook: illegal zero jump.';
          } else if (process.hook.jump < 0) {
            process.step = process.hook.jump;
            err = 1;
            data = 'hook: illegal negative jump.';
          } else {
            process.busy = false;
            process.stopped = null;
            process.progress = 0;
            process.step = process.hook.jump;
            // find the process step to jump to
            let processStepID = processID + '.' + process.step;
            if (global.hybrixd.proc.hasOwnProperty(processStepID)) {
              let processStep = global.hybrixd.proc[processStepID];
              // reset the process step
              processStep.busy = false;
              processStep.stopped = null;
              processStep.progress = 0;
              processStep.err = 0;
            }
            return {break: true}; // break the bubbeling up
          }
          process.data = data;
        } else if (process.hook.hasOwnProperty('data')) { // on error stop the process with the provided data/messsage and error code
          if (process.hook.err) {
            process.data = process.hook.data;
            err = process.hook.err;
            data = process.hook.data;
          } else {
            delete process.type; // remove process type, we won't be using this.
            process.data = process.hook.data;
            process.progress = 1;
            return {break: true}; // break the bubbeling up
          }
        }
      }
      if (err) {
        process.err = err; // do not set progress, keep this as debug info
      } else {
        process.progress = 1;
        process.err = 0;
      }
    }
  }
  return {break: false, data: data};
};
let stop = function (processID, err, data) {
  let processIDSplit = processID.split('.');
  let now = Date.now();
  if (err) { // on error stop all parent processes and process steps
    if (processIDSplit.length % 2 === 1) { // processID is a process, seek it's active step so it can be stopped
      if (global.hybrixd.proc.hasOwnProperty(processID)) {
        const processStepID = processID + '.' + global.hybrixd.proc[processID].step;
        let k = kill(processStepID, data, now, err);
        if (k.break) { return; }
        data = k.data;
      }
    }
    for (let i = processIDSplit.length - 1; i >= 0; --i) {
      const parentID = processIDSplit.slice(0, i + 1).join('.');
      let k = kill(parentID, data, now, err);
      if (k.break) { return; }
      data = k.data;
    }
  } else {
    let processStepID;
    if (processIDSplit.length % 2 === 0) { // processID is a processStepID
      processStepID = processID;
      processID = processIDSplit.slice(0, processIDSplit.length - 1).join('.');
    } else { // processID is a process, seek it's active step so it can be stopped
      if (global.hybrixd.proc.hasOwnProperty(processID)) {
        processStepID = processID + '.' + global.hybrixd.proc[processID].step;
      }
    }
    kill(processID, data, now);
    kill(processStepID, data, now);
  }
};

let pass = function (processStepID, err, data) {
  if (processStepID && global.hybrixd.proc.hasOwnProperty(processStepID)) {
    let processStep = global.hybrixd.proc[processStepID];
    if (processStep.stopped === null) {
      processStep.busy = false;
      processStep.stopped = Date.now();
      processStep.data = data;
      processStep.progress = 1;
      processStep.err = typeof err === 'undefined' ? 1 : err;
    }
  }
};

// set the type for the data
let type = function (processID, newType) {
  let processStepID;
  let processIDSplit = processID.split('.');
  if (processIDSplit.length % 2 === 0) { // processID is a processStepID
    processStepID = processID;
    processID = processIDSplit.slice(0, processIDSplit.length - 1).join('.');
  }
  if (global.hybrixd.proc.hasOwnProperty(processID)) {
    let process = global.hybrixd.proc[processID];
    process.type = newType;
  }
  if (global.hybrixd.proc.hasOwnProperty(processStepID)) {
    let processStep = global.hybrixd.proc[processStepID];
    processStep.type = newType;
  }
};

// set the type for the data
let help = function (processID, newHelp) {
  let processStepID;
  let processIDSplit = processID.split('.');
  if (processIDSplit.length % 2 === 0) { // processID is a processStepID
    processStepID = processID;
    processID = processIDSplit.slice(0, processIDSplit.length - 1).join('.');
  }
  if (global.hybrixd.proc.hasOwnProperty(processID)) {
    let process = global.hybrixd.proc[processID];
    process.help = newHelp;
  }
  if (global.hybrixd.proc.hasOwnProperty(processStepID)) {
    let processStep = global.hybrixd.proc[processStepID];
    processStep.help = newHelp;
  }
};

let error = function (processID, info) {
  stop(processID, 1, info);
};

/*
  parses a line of quartz code of the form "head(body)" = "head(param1,param2,...)" or "head param1 parame2 ..." into an object containing, head, body and parameters. It parses default javascript with single and double quotes strings, object and array literals and parentheses notation.
  This to ensure  "{a:1,b:2}" to be parsed as ["{a:1,b:2}"] and not as ["{a:1","b:2}"]
*/
let parseParameter = function (line, labels, step) {
  let body;
  if (line.length === 4) { // head
    body = '';
  } else if (line.length >= 6 && line.substr(4, 1) === '(' && line.endsWith(')')) { // head() // head([parameter1],[parameter2],...)
    body = line.substr(5, line.length - 6);
  } else if (line.length > 4 && line.substr(4, 1) === ' ') { //  head [parameter1] [parameter2] ...
    body = line.substr(5, line.length - 5);
  } else {
    return { error: 'Expected statement of the form: head [parameter1] [parameter2] ... or head([parameter1],[parameter2],...)' };
  }

  // head(body)
  let head = line.substr(0, 4);

  // head(param1,{param2:value},[1,2,3],"foo {} [] bar")
  let parameters = body === '' ? [] : [''];
  let parameterIndex = 0;

  let slashEscape = false; // to handle "\"" and "\\"
  let stringDouble = false; // to handle "foo,bar"
  let stringSingle = false; // to handle 'foo,bar'

  let objectDepth = 0; // to handle "{foo:1,bar:2}"
  let arrayDepth = 0; // to handle "[foo,bar]"
  let parenthesesDepth = 0; // to handle "f(1,2)"
  for (let i = 0; i < body.length; ++i) {
    let c = body[i];
    let skipCharacter = false;
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

  for (let j = 0; j < parameters.length; ++j) {
    let re = /^@([_a-zA-Z][\w]*)$/g; // Search for @labelname
    parameters[j] = parameters[j].replace(re, (x, label) => { return (labels[label] - step); }); // Replace all "@label" with labels[label]-step (relative jump required to go to label
  }

  return {head, body, parameters};
};

function writeProperty (value, subproperties) {
  if (subproperties.length > 0) {
    if (typeof value === 'object' && value !== null) {
      return writeProperty(value[subproperties[0]], subproperties.slice(1));
    } else {
      console.log(` [!] error: Expected object: ${value}.${subproperties.join('.')}`);
      return 'undefined';
    }
  } else {
    if (typeof value === 'string') {
      value = value.replace(/[$]/g, () => '$$');
      value = value.replace(/[\\]/g, () => '\\\\');
      return value;
    } else if (typeof value === 'number') {
      return value;
    } else if (typeof value === 'object') {
      if (value instanceof Decimal || value.constructor.name === 'r') { // Handle mathimatical objects
        value = value.toString();
      } else {
        value = JSON.stringify(value);
      }
      value = value.replace(/[$]/g, () => '$$');
      value = value.replace(/[\\]/g, () => '\\\\');
      return value;
    } else {
      return 'undefined';
    }
  }
}

// [prefix::]name[postfix]
// scope::name.property[3].subproperty
function retrieveProperty (scopeId, name, command, data, recipe, vars, parentVars) {
  const properties = name.replace(/\]/g, '').replace(/\[/g, '.').split('.'); // replace ']' with '' and '[' with '.'
  const propertyId = properties[0];
  const subproperties = properties.slice(1);

  let value;
  if (/^\d+$/.test(propertyId)) { // $1 => command parameter
    value = command[Number(propertyId)];
  } else if (propertyId === '@') { // $@ => command parameter array
    value = command;
  } else if (propertyId === '' || propertyId === 'data') { // $ => data
    value = data;
  } else if (scopeId === '') { //   $propertyId => property
    if (recipe && recipe.hasOwnProperty(propertyId)) {
      value = recipe[propertyId];
    } else if (vars && vars.hasOwnProperty(propertyId)) {
      value = vars[propertyId];
    }
  } else if (scopeId === 'local') { // local::propertyId => property
    let filePath = '../var/recipes/' + this.recipe.filename;
    if (!this.recipe.hasOwnProperty('vars') && fs.existsSync(filePath)) { // retrieve data from file if not yet loaded into memory
      let content = fs.readFileSync(filePath).toString();
      try {
        this.recipe.vars = JSON.parse(content);
        value = this.recipe.vars[propertyId];
      } catch (e) {
        console.log(` [!] error: local var file corrupt for ${this.recipe.filename} ` + filePath);
      }
    }
  } else if (scopeId === 'proc') {
    if (typeof vars === 'object' && vars !== null) {
      value = vars[propertyId];
    }
  } else if (scopeId === 'parent') {
    if (typeof parentVars === 'object' && parentVars !== null) {
      value = parentVars[propertyId];
    }
  } else if (global.hybrixd.asset.hasOwnProperty(scopeId)) {
    value = global.hybrixd.asset[scopeId][propertyId];
  } else if (global.hybrixd.source.hasOwnProperty(scopeId)) {
    value = global.hybrixd.source[scopeId][propertyId];
  } else if (global.hybrixd.engine.hasOwnProperty(scopeId)) {
    value = global.hybrixd.engine[scopeId][propertyId];
  } else {
    console.log(` [!] error: scope "${scopeId}" for "${scopeId}::${propertyId}" not found.`);
  }
  return writeProperty(value, subproperties);
}

// Preprocess quartz command
function preprocess (statement, recipe, command, data, vars, parentVars) {
  let re;
  let parsedStatement = statement;

  re = /\$\@+/g; // Search for $@, replace with command parameter array
  parsedStatement = parsedStatement.replace(re, x => {
    return retrieveProperty('', '@', command, data, recipe, vars, parentVars);
  });

  re = /\$\{(::|([_a-zA-Z][\w]*)::)([a-zA-Z0-9_.[\]]*)\}/g; // Search for ${scopeId::propertyId.subproperty[4].subsubproperty}, replace with object
  parsedStatement = parsedStatement.replace(re, (full, noRecipeId, scopeId, propertyId) => {
    if (scopeId === '' || typeof scopeId === 'undefined') { scopeId = 'local'; }
    return retrieveProperty(scopeId, propertyId, command, data, recipe, vars, parentVars);
  });

  re = /\$\{([a-zA-Z0-9_.[\]]*)\}/g; // Search for ${propertyId.subproperty[4].subsubproperty}, replace with object
  parsedStatement = parsedStatement.replace(re, (full, propertyId) => {
    return retrieveProperty('', propertyId, command, data, recipe, vars, parentVars);
  });

  re = /([^$]|^)([$]data|[$])([^\w$]|$)/g; // Search for $data or a single $
  parsedStatement = parsedStatement.replace(re, (full, pre, dollarSign, post) => {
    return pre + retrieveProperty('', '', command, data, recipe, vars, parentVars) + post;
  });

  re = /[$](::|([_a-zA-Z][\w]*)::)([_\w-]+)/g; // Search for "$scopeId::propertyId"
  parsedStatement = parsedStatement.replace(re, function (full, noRecipeId, scopeId, propertyId) {
    if (scopeId === '' || typeof scopeId === 'undefined') { scopeId = 'local'; }
    retrieveProperty(scopeId, propertyId, command, data, recipe, vars, parentVars);
  });

  re = /[$](?!data[^a-zA-Z_\d:])([_a-zA-Z][\w\-_]+)/g; // Excluding $data, search for "$propertyId" and "$_propertyId-with_dashes--andNumbers1231"
  parsedStatement = parsedStatement.replace(re, (full, propertyId) => {
    return retrieveProperty('', propertyId, command, data, recipe, vars, parentVars);
  });

  re = /[$]([\d])+/g; // Search for $0, $1, ... replace with corresponding command parameter
  parsedStatement = parsedStatement.replace(re, (full, propertyNumber) => {
    return retrieveProperty('', propertyNumber, command, data, recipe, vars, parentVars);
  });

  parsedStatement = parsedStatement.replace('$$', '$'); // Replace all "$$" with single "$"
  return parsedStatement;
}

let next = function (processID) {
  if (!global.hybrixd.proc.hasOwnProperty(processID)) { return false; } // indicate that the process was already stopped / is not valid

  let process = global.hybrixd.proc[processID];

  if (process.stopped) { return false; } // indicate that the process was already stopped / is not valid

  let step = typeof process.step === 'undefined' ? 0 : process.step;

  let subprocessID = `${processID}.${step}`;
  let subprocess = global.hybrixd.proc[subprocessID];

  let prevSubprocessID = process.subproc;
  let prevSubprocess = global.hybrixd.proc[prevSubprocessID];

  if (!global.hybrixd.proc.hasOwnProperty(subprocessID)) { return false; } // indicate that the process was already stopped / is not valid

  let data = null;
  let err = null;

  if (typeof prevSubprocess !== 'undefined') {
    err = typeof prevSubprocess.err !== 'undefined' ? prevSubprocess.err : 0;
    data = typeof prevSubprocess.data !== 'undefined' ? prevSubprocess.data : null;
  } else {
    err = process.hasOwnProperty('err') ? process.err : 0;
    data = process.hasOwnProperty('data') ? process.data : null;
  }

  // wait for subprocess step to finish
  if (process.busy === true) { //  || global.hybrixd.proc[processID].step < step
    // check if the subprocess is already finished
    if (subprocess.progress === 1) { // && global.hybrixd.proc[processID].progress < 1
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
      if (process.steps > 0) {
        process.progress = (process.step / process.steps) + (subprocess.progress / process.steps);
      }
    }

    // initialize subprocess step
  } else if (process.busy !== true && process.stopped === null && process.step <= process.steps) {
    process.busy = true;

    global.hybrixd.proc[subprocessID].data = data;

    if (DEBUG) { console.log(` [D] (${processID}) running step ${step + 1} of ${process.steps + 1}`); }

    let processIDSplit = processID.split('.');
    let rootProcessID = processIDSplit[0];
    let rootProcess = global.hybrixd.proc[rootProcessID];
    let parentVars;
    if (processIDSplit.length > 2) {
      let parentProcessID = processIDSplit.slice(0, processIDSplit.length - 2).join('.');
      parentVars = global.hybrixd.proc[parentProcessID].vars;
    }

    let statement = subprocess.qrtz;
    if (statement) {
      let parsedStatement = parseParameter(statement, process.labels, step);
      if (!parsedStatement.hasOwnProperty('error')) {
        // For each parameter try to evaluate it
        for (let i = 0; i < parsedStatement.parameters.length; ++i) {
          let result;
          try {
            let parameter = preprocess(parsedStatement.parameters[i], rootProcess.recipe, process.command || rootProcess.command, data, process.vars, parentVars);
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
          let procInsert = {
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
    } else {
      console.log(` [!] (${processID}) parsing error: \n     Process seems empty!\n     `);
      error(processID, 'Proc error.', data);
      return false;
    }
  }
  return true; // indicate that the process has been updated
};

let start = function (processID, subprocesses) {
  let process = global.hybrixd.proc[processID];

  process.step = 0;
  process.steps = subprocesses.length - 1;
  process.busy = false;

  if (DEBUG) { console.log(` [D] (${processID}) initializing sequence processing for ${process.steps + 1} steps...`); }
  // prepare stepping array
  for (let step = 0; step < subprocesses.length; step += 1) {
    let subprocessID = `${processID}.${step}`;

    init(subprocessID);
    subprocesses[step] = subprocesses[step].replace(`"processID":"${processID}"`, `"processID":"${subprocessID}"`);
    global.hybrixd.proc[subprocessID].qrtz = subprocesses[step]; // Set the quartz code for the subprocess
  }
  if (subprocesses.length > 0) {
    let firstSubprocessID = `${processID}.0`;
    global.hybrixd.proc[firstSubprocessID].data = process.data;
  } else {
    stop(processID, 0, process.data);
  }
};

let fire = function (processID, subprocesses) {
  if (typeof subprocesses !== 'undefined') {
    if (subprocesses.length > -1) {
      let sessionID = 0; // if no session ID is provided then use 0 = least access
      //  if (global.hybrixd.proc.hasOwnProperty(processID)) {  // TODO check if process exists

      let process = global.hybrixd.proc[processID];

      if (DEBUG) {
        console.log(` [D] adding ${processID} to processing queue with ${subprocesses.length} steps.`);
      }

      if (typeof process !== 'undefined' && typeof process.sid !== 'undefined') {
        sessionID = process.sid;
      }

      let data = process.data;
      init(processID, {
        sessionID: sessionID,
        subprocesses: subprocesses,
        data: data
      });
    }
  }
};

let finish = function (processId, data) {
  return function (callbackArray) {
    require('../scheduler').stop(this.processId, 0, this.data);
    require('../functions').sequential(callbackArray);
  }.bind({processId, data});
};

let resultMessage = function (processID) {
  if (global.hybrixd.proc.hasOwnProperty(processID)) {
    let process = global.hybrixd.proc[processID];
    let path = process.path ? process.path.join('/') : undefined;
    return {
      'error': 0,
      'info': 'Command process ID.',
      'id': 'id',
      'path': path,
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
exports.help = help; // set the type of the process data
exports.pass = pass; // pass data to to a process step
exports.start = start; // starts a process (moves it from queue to active processes)
exports.fire = fire; // adds a process to the queue
exports.next = next; // performs an update of the process
exports.error = error; // functionally stop a process with an error info message
exports.finish = finish; // creates a callback function that stops this process when finished
exports.result = resultMessage; // creates an API result message, a follow-up
