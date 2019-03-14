let fs = require('fs');
let router = require('../router');
let modules = require('../modules');
let scheduler = require('../scheduler');
let functions = require('../functions'); // only required for   JSONfix & procinfo[0] = functions.implode('.', pieces);
let APIqueue = require('../APIqueue');
let Decimal = require('../../common/crypto/decimal-light.js');
let baseCode = require('../../common/basecode');

let Hybrix = require('../../interface/hybrix-lib.nodejs');
let hybrix = new Hybrix.Interface({http: require('http')});

// process ID decomposition
let procpart = function procpart (processID) {
  let procsplit = processID.split('.');
  let pieces = {};
  let procinfo = [];
  procinfo[0] = '';
  // store parent in first element
  for (let i = 0; i < procsplit.length - 1; i += 1) {
    pieces[i] = procsplit[i];
  }
  procinfo[0] = functions.implode('.', pieces);
  // store child in next element
  procinfo[1] = procsplit[procsplit.length - 1];
  // store previous child in next element
  if (procinfo[1] - 1 > -1) {
    procinfo[2] = procinfo[0] + '.' + (procinfo[1] - 1);
  } else {
    procinfo[2] = procinfo[0];
  }
  return procinfo;
};

function readData (p, processIDs, millisecs, callback) {
  // check permissions for processes
  let permission;
  if (typeof processIDs === 'string') { // single
    permission = global.hybrixd.proc[p.processID].sessionID === 1 || global.hybrixd.proc[p.processID].sessionID === global.hybrixd.proc[processIDs].sessionID;
  } else if (processIDs instanceof Array) { // array
    permission = processIDs.reduce(function (permission, processID) {
      return permission && global.hybrixd.proc.hasOwnProperty(processID) && (global.hybrixd.proc[this.mainProcessID].sessionID === 1 || global.hybrixd.proc[this.mainProcessID].sessionID === global.hybrixd.proc[processID].sessionID);
    }.bind({mainProcessID: p.processID}), true);
  } else { // dictionary
    permission = true;
    for (let key in processIDs) {
      let processID = processIDs[key];
      if (!global.hybrixd.proc.hasOwnProperty(processID) || (global.hybrixd.proc[p.processID].sessionID !== 1 && global.hybrixd.proc[p.processID].sessionID !== global.hybrixd.proc[processID].sessionID)) {
        permission = false;
        break;
      }
    }
  }

  if (permission) {
    // check if processes have finished:
    let finished = 0;
    let progress = 0;
    if (typeof processIDs === 'string') { // single
      finished = (global.hybrixd.proc[processIDs].progress >= 1 || global.hybrixd.proc[processIDs].stopped) ? 1 : 0;
      global.hybrixd.proc[p.processID].progress = global.hybrixd.proc[processIDs].progress;
    } else if (processIDs instanceof Array) { // array
      for (let i = 0; i < processIDs.length; i++) {
        progress += global.hybrixd.proc[processIDs[i]].progress;
        finished += (global.hybrixd.proc[processIDs[i]].progress >= 1 || global.hybrixd.proc[processIDs[i]].stopped) ? 1 : 0;
      }
      finished = finished === processIDs.length;
      global.hybrixd.proc[p.processID].progress = progress / processIDs.length;
    } else { // dictionary
      for (let key in processIDs) {
        const processID = processIDs[key];
        progress += global.hybrixd.proc[processID].progress;
        finished += (global.hybrixd.proc[processID].progress >= 1 || global.hybrixd.proc[processID].stopped) ? 1 : 0;
      }
      finished = finished === Object.keys(processIDs).length;
      global.hybrixd.proc[p.processID].progress = progress / Object.keys(processIDs).length;
    }

    if (finished) {
      let result;
      if (typeof processIDs === 'string') { // single
        result = {data: global.hybrixd.proc[processIDs].data, err: global.hybrixd.proc[processIDs].err, type: global.hybrixd.proc[processIDs].type};
      } else if (processIDs instanceof Array) { // array
        result = {data: [], err: 0};
        for (let i = 0; i < processIDs.length; i++) {
          result.data.push(global.hybrixd.proc[processIDs[i]].data);
          result.err = Math.max(result.err, global.hybrixd.proc[processIDs[i]].err);
        }
        global.hybrixd.proc[p.processID].progress = 1;
      } else { // dictionary
        result = {data: {}, err: 0};
        for (let key in processIDs) {
          const processID = processIDs[key];
          result.data[key] = global.hybrixd.proc[processID].data;
          result.err = Math.max(global.hybrixd.proc[processID].err, result.err);
        }
        global.hybrixd.proc[p.processID].progress = 1;
      }
      scheduler.type(p.processID, result.type);
      callback(p, result.err, result.data);
    } else {
      setTimeout(function (p, processIDs, millisecs) {
        readData(p, processIDs, millisecs, callback);
        // DEPRECATED: quartz.read(p, processIDs, millisecs);
      }, millisecs || 500, p, processIDs, millisecs || 500, this);
    }
  } else {
    callback(p, 1, 'read: Insufficient permissions to access processes ' + processIDs + '.');
  }
}

function tranOperator (p, expression, data, lhs) {
  expression = expression.trim();
  if (expression.startsWith('+')) { // use + to add numbers
    if (!lhs.valid) { return lhs; }
    let rhs = tranExpression(p, expression.substr(1), data);
    if (rhs.valid) {
      return {valid: true, data: Number(lhs.data) + Number(rhs.data)};
    } else {
      return {valid: false, data: data};
    }
  } else if (expression.startsWith('/')) { // use + to add numbers
    if (!lhs.valid) { return lhs; }
    let rhs = tranExpression(p, expression.substr(1), data);
    if (rhs.valid) {
      return {valid: true, data: Number(lhs.data) / Number(rhs.data)};
    } else {
      return {valid: false, data: data};
    }
  } else if (expression.startsWith('*')) { // use * to multiply numbers
    if (!lhs.valid) { return lhs; }
    let rhs = tranExpression(p, expression.substr(1), data);
    if (rhs.valid) {
      return {valid: true, data: Number(lhs.data) * Number(rhs.data)};
    } else {
      return {valid: false, data: data};
    }
  } else if (expression.startsWith('-')) { // use - to deduct numbers
    if (!lhs.valid) { return lhs; }
    let rhs = tranExpression(p, expression.substr(1), data);
    if (rhs.valid) {
      return {valid: true, data: Number(lhs.data) - Number(rhs.data)};
    } else {
      return {valid: false, data: data};
    }
  } else if (expression.startsWith('|')) { // use | for fall back values
    if (lhs.valid && lhs.data) { return lhs; }
    let rhs = tranExpression(p, expression.substr(1), data);
    return rhs.valid ? rhs : lhs;
  } else {
    return {valid: false, data: data};
  }
}

function tranExpression (p, expression, data) {
  expression = expression.trim();
  let lhs;
  let value;
  let c = expression.substr(0, 1);
  let valid = true;
  if (c === '.') { // .123 or .property
    if ('0123456789'.indexOf(expression.substr(1, 1)) !== -1) { // Number  .123
      lhs = /\.\d+/.exec(expression)[0];
      value = Number(lhs);
    } else { // Property
      lhs = /\.[\w-.]+/.exec(expression)[0];
      let property = chckString(p, lhs, data);
      valid = property.valid;
      value = property.data;
    }
  } else if (c === '"') { // " String
    lhs = String(/"[^"\\]|\\."/.exec(expression)[0]);
    value = lhs;
  } else if (c === "'") { // ' String
    lhs = String(/'[^'\\]|\\.'/.exec(expression)[0]);
    value = lhs;
  } else if ('0123456789'.indexOf(c) !== -1) { // Number 123.232
    lhs = /\d+\.?\d*/.exec(expression)[0];
    value = Number(lhs);
  } else {
    let match = /[a-zA-Z_]+\w*/.exec(expression);
    if (match.length > 0) {
      lhs = match[0];
      value = lhs;
    } else {
      // TODO error
      // TODO array []
      // TODO object {}
      return {valid: false, data: data};
    }
  }
  if (lhs === expression) {
    return {valid: valid, data: (valid ? value : data)};
  } else {
    return tranOperator(p, expression.substr(lhs.length), data, {valid, data: (valid ? value : data)});
  }
}

function tranPropertyPath (p, path, data) { //  path: ["a","1"], data: {a:[1,2]}  => 2
  let iterator = data;
  for (let i = 0, len = path.length; i < len; ++i) {
    if (iterator !== null && typeof iterator === 'object') {
      if (iterator.constructor === Array) { // Array object
        if (path[i] === '') { // []  operator     [{a:1},{a:2}]  '[].a' => [1,2]
          let resultArray = [];
          let subPath = path.slice(i + 1);
          for (let index = 0; index < iterator.length; ++index) {
            let r = tranPropertyPath(p, subPath, iterator[index]);
            if (!r.valid) { return {valid: false, data: data}; }
            resultArray.push(r.data);
          }
          return {valid: true, data: resultArray}; // return, the rest of the path is taken care of by the loop
        } else {
          let index = Number(path[i]);
          if (index >= 0 && index < iterator.length) {
            iterator = iterator[index];
          } else {
            return {valid: false, data: data};
          }
        }
      } else { // Dictionary object
        if (iterator.hasOwnProperty(path[i])) {
          iterator = iterator[path[i]];
        } else {
          return {valid: false, data: data};
        }
      }
    } else {
      return {valid: false, data: data};
    }
  }
  return {valid: true, data: iterator};
}

function chckString (p, property, data) {
  if (property.substr(0, 1) === '=') { // "=1+1" -> 2 evaluated expression
    return tranExpression(p, property.substr(1), data);
  }
  if (property.substr(0, 1) !== '.' && property.substr(0, 1) !== '[') { return {valid: true, data: property}; } // "foo" -> "foo"
  let path = property.substr(1).replace(/\]/g, '').replace(/\[/g, '.').split('.'); // ".foo.bar[3][5].x" -> ["foo","bar","3","5","x"]
  return tranPropertyPath(p, path, data);
}

function chckVar (p, property, data) {
  if (typeof property === 'string') { // If String
    return chckString(p, property, data);
  } else if (typeof property === 'number' || typeof property === 'boolean' || typeof property === 'undefined') { // If Explicit Number, Boolean or Undefined
    return {valid: true, property};
  } else if (typeof property === 'object') { // If Object
    if (property === null) { // If Null
      return {valid: true, data: null};
    } else if (property.constructor === Array) { // If Array
      let newData = [];
      for (let index, len = property.length; index < len; ++index) {
        let chckIndex = chckVar(p, property[index], data);
        if (!chckIndex.valid) { return {valid: false, data: data}; }
        newData[index] = chckIndex.data;
      }
      return {valid: true, data: newData};
    } else { // If Dictionary
      let newData = {};
      for (let key in property) {
        let chckKey = chckVar(p, property[key], data);
        if (!chckKey.valid) { return {valid: false, data: data}; }
        newData[key] = chckKey.data;
      }
      return {valid: true, data: newData};
    }
  } else {
    return {valid: false, data: data};
  }
}

function stricteval (equation) { return eval(equation); }

function mathCalc (equation, operator, data) {
  if (equation.length > 0) {
    equation = '(new Decimal(' + String(equation)
    // regex parking
      .replace(/\(\)/g, '_OC_')
    // brackets
      .replace(/\(/g, 'new Decimal(')
    // comparison
      .replace(/>=/g, ').greaterThanOrEqualTo(')
      .replace(/<=/g, ').lessThanOrEqualTo(')
      .replace(/>/g, ').greaterThan(')
      .replace(/</g, ').lessThan(')
      .replace(/=/g, ').equals(')
    // arithmetic
      .replace(/\^/g, ').toPower(')
      .replace(/\*/g, ').times(')
      .replace(/\//g, ').dividedBy(')
      .replace(/\+-/g, ').minus(')
      .replace(/\+/g, ').plus(')
      .replace(/-/g, ').minus(')
    // regex undo parking
      .replace(/_OC_/g, '()')
    // functions
      .replace(/\.floor/g, ').toDecimalPlaces(Decimal.ROUND_UP,Decimal.ROUND_DOWN') // note: first Decimal.ROUND_UP as alias of 0, as numbers get replaced below
      .replace(/\.ceil/g, ').toDecimalPlaces(Decimal.ROUND_UP,Decimal.ROUND_UP') // note: first Decimal.ROUND_UP as alias of 0, as numbers get replaced below
      .replace(/\.round/g, ').toInteger(') +
      // complete equation
      ').toString());';

    // add quotes to all numbers
    equation = equation.replace(/[+-]?([0-9]*[.])?[0-9]+/g, function (str) {
      return "'" + str + "'";
    });

    // make sure equation does not reference itself
    equation = equation.replace('equation', '0');
    return stricteval(equation);
  } else { return '0'; }
}

function pokeVar (p, key, qdata) {
  let keySplit = key.split('::');
  let scope;
  let subKey;
  let process = global.hybrixd.proc[p.parentID];
  let rootID = p.processID.split('.')[0];
  let rootProcess = global.hybrixd.proc[rootID];
  if (keySplit.length === 2) {
    scope = keySplit[0];
    subKey = keySplit[1];
    if (isNaN(subKey)) {
      if (scope === 'proc') { // proc::key
        process.vars[subKey] = qdata;
      } else if (scope === 'local' || scope === '') { // local::key
        if (typeof rootProcess.recipe.vars !== 'object') {
          rootProcess.recipe.vars = {};
        }
        rootProcess.recipe.vars[subKey] = qdata;
        fs.writeFileSync('../var/recipes/' + rootProcess.recipe.filename, JSON.stringify(rootProcess.recipe.vars));
      } else if (scope === 'parent') {
        return {e: 1, v: 'poke error: Not allowed to write to parent scope from a subprocess!'};
      } else if (scope === 'root') {
        return {e: 1, v: 'poke error: Not allowed to write to root scope from a subprocess!'};
      } else { // otherRecipe::key
        return {e: 1, v: 'poke error: Not allowed to write to another recipe scope!'};
      }
      return {e: 0, v: qdata};
    } else {
      return {e: 1, v: 'poke error: Not allowed to write to a numeral argument property!'};
    }
  } else if (keySplit.length === 3) {
    return {e: 1, v: 'poke error: Not allowed to write to local variable of another recipe!'};
  } else if (typeof key === 'number') { // 0,1,2,3,   or fee
    return {e: 1, v: 'poke error: Not allowed to write to a numeral argument property!'};
  } else {
    if (!rootProcess.recipe.hasOwnProperty(key)) {
      process.vars[key] = qdata;
      return {e: 0, v: qdata};
    } else {
      return {e: 1, v: 'poke error: Not allowed to write to a read-only recipe property!'};
    }
  }
}

function peekVar (p, key) {
  if (typeof key === 'string') {
    var pdata;
    let keySplit = key.split('::');

    let processStepIdSplit = p.processID.split('.');
    let rootID = processStepIdSplit[0];

    let rootProcess = global.hybrixd.proc[rootID];
    let process = global.hybrixd.proc[p.parentID];

    if (keySplit.length === 2) {
      let scope = keySplit[0];
      let subKey = keySplit[1];
      if (scope === 'proc') { // proc::key
        if (isNaN(subKey)) {
          if (process.hasOwnProperty('vars')) {
            pdata = process.vars[subKey];
          } else {
            pdata = undefined;
          }
        } else {
          pdata = process.command ? process.command[subKey] : undefined;
        }
      } else if (scope === 'local' || scope === '') { // local::key
        let filePath = '../var/recipes/' + rootProcess.recipe.filename;
        if (!rootProcess.recipe.hasOwnProperty('vars') && fs.existsSync(filePath)) { // retrieve data from file if not yet loaded into memory
          let content = fs.readFileSync(filePath).toString();
          try {
            rootProcess.recipe.vars = JSON.parse(content);
          } catch (e) {
            console.log(` [!] error: local var file corrupt for ${rootProcess.recipe.filename}`);
            return {e: 1, v: 'peek error: local var file corrupt!'};
          }
        }
        if (rootProcess.recipe.hasOwnProperty('vars')) {
          pdata = rootProcess.recipe.vars[subKey];
        } else {
          pdata = undefined;
        }
      } else if (scope === 'parent') { // parent::key
        let processID = p.parentID;

        if (processStepIdSplit.length > 3) {
          let parentProcessID = processStepIdSplit.slice(0, processStepIdSplit.length - 3).join('.');
          let parentProcess = global.hybrixd.proc[parentProcessID];
          // TODO check if parent exists
          if (isNaN(subKey)) {
            if (parentProcess.vars.hasOwnProperty(subKey)) {
              pdata = parentProcess.vars[subKey];
            } else {
              pdata = undefined;
            }
          } else {
            pdata = parentProcess.command ? parentProcess.command[subKey] : undefined;
          }
        } else if (scope === 'root') { // root::key
          if (isNaN(subKey)) {
            if (rootProcess.hasOwnProperty('vars')) {
              pdata = rootProcess.vars[subKey];
            } else {
              pdata = undefined;
            }
          } else {
            pdata = rootProcess.command ? rootProcess.command[subKey] : undefined;
          }
        } else {
          return {e: 1, v: "peek error: Parent does not exist for 'parent::" + subKey + "'!"};
        }
      } else { // otherRecipe::key
        if (global.hybrixd.asset.hasOwnProperty(scope) && global.hybrixd.asset[scope].hasOwnProperty(subKey)) {
          pdata = global.hybrixd.asset[scope][subKey];
        } else if (global.hybrixd.source.hasOwnProperty(scope) && global.hybrixd.source[scope].hasOwnProperty(subKey)) {
          pdata = global.hybrixd.source[scope][subKey];
        } else if (global.hybrixd.engine.hasOwnProperty(scope) && global.hybrixd.engine[scope].hasOwnProperty(subKey)) {
          pdata = global.hybrixd.engine[scope][subKey];
        } else {
          return {e: 1, v: "peek error: '" + scope + '::' + subKey + "' not defined!"};
        }
      }
    } else if (keySplit.length === 3) {
      let scope = keySplit[0];
      let subScope = keySplit[1];
      let subKey = keySplit[2];
      if (subScope === 'local') {
        if (global.hybrixd.asset.hasOwnProperty(scope) && global.hybrixd.asset[scope].hasOwnProperty('vars') && global.hybrixd.asset[scope].vars.hasOwnProperty(subKey)) {
          pdata = global.hybrixd.asset[scope].vars[subKey];
        } else if (global.hybrixd.source.hasOwnProperty(scope) && global.hybrixd.source[scope].hasOwnProperty('vars') && global.hybrixd.source[scope].vars.hasOwnProperty(subKey)) {
          pdata = global.hybrixd.source[scope].vars[subKey];
        } else if (global.hybrixd.engine.hasOwnProperty(scope) && global.hybrixd.engine[scope].hasOwnProperty('vars') && global.hybrixd.engine[scope].vars.hasOwnProperty(subKey)) {
          pdata = global.hybrixd.engine[scope].vars[subKey];
        }
      } else {
        return {e: 1, v: "peek error: Unrecognized scope '" + subScope + "' for '" + key + "'!"};
      }
    } else if (!isNaN(key)) { // 0,1,2,3
      pdata = rootProcess.command ? rootProcess.command[key] : undefined;
    } else if (rootProcess.recipe.hasOwnProperty(key)) { // fee
      pdata = rootProcess.recipe[key];
    } else if (process.vars.hasOwnProperty(key)) {
      pdata = process.vars[key];
    } else {
      return {e: 1, v: "peek error: '" + key + "' not defined!"};
    }
  } else {
    return {e: 1, v: 'peek error: Expected string!'};
  }
  return {e: 0, v: pdata};
}

function excludeEntries (input, value) {
  let found = 0;
  let entries;
  let result = [];
  if (value instanceof Array) {
    for (let key = 0; key < input.length; key++) {
      if (value.indexOf(input[key]) === -1) {
        result.push(input[key]);
        found += 1;
      }
    }
  } else {
    for (let key = 0; key < input.length; key++) {
      if (input[key] === value) {
        found += 1;
      } else {
        result.push(input[key]);
      }
    }
  }
  return {n: found, v: result};
}

function filterThese (input, value) {
  let output = [];
  for (let i = 0; i < input.length; i++) {
    if (value.constructor === Array) {
      for (let j = 0; j < value.length; j++) {
        if (input[i] === value[j]) {
          output.push(input[i]);
        }
      }
    } else {
      if (input[i] === value) {
        output.push(input[i]);
      }
    }
  }
  return output;
}

function appendProgram (program, label, steps) {
  if (label === '') { // [...] => [..., step1, step2, ...]
    return program.concat(steps);
  } else if (program.length < 2 || program[program.length - 1] !== 'parallel') {
    program = program.concat([{}, 'parallel']); // [...] => [..., {},'parellel']
  }
  // [..., {x: {..}, [label]: * }, 'parallel']
  let subLabels = label.split('.');
  let subLabel = subLabels[0];
  let subProgram = program[program.length - 2];
  if (!subProgram.hasOwnProperty(subLabel)) { // [..., {},'parellel'] => [..., {[subLabel]:{data:[],step:'sequential'}},'parellel']
    subProgram[subLabel] = {data: [], step: 'sequential'};
  } else if (subProgram[subLabel].step !== 'sequential') {
    // [..., {[subLabel]:{data:$DATA,step:'$STEP'}},'parellel'] => [..., {[subLabel]:{data:[$DATA,$STEP],step:'sequential'}},'parellel']
    let data = subProgram[subLabel].data;
    let step = subProgram[subLabel].step;
    subProgram[subLabel].data = [data, step];
    subProgram[subLabel].step = 'sequential';
  }
  subProgram[subLabel].data = appendProgram(subProgram[subLabel].data, subLabels.slice(1, subLabels.length).join('.'), steps);
  return program;
  // [..., {[subLabel]:{data:[...],step:'sequential'}},'parellel'] => [..., {[subLabel]:{data:[..., step1, step2, ...],step:'sequential'}},'parellel']
}

let Quartz = function () {
  /**
   * Execute a node side module function. Only if the script is run from a recipe with a non Quartz module defined.
   * @param {String} name - Name of the function.
   * @param {String} [legacyData] - Depreciated pass data in an depreciated manner to a func.
   * @category Process
   * @example
   * qrtz:
   * data 'hello'
   * func 'myFunction'
   * done               // returns 'hello world'
   *
   * module.js:
   * function myFunction(proc,data){
   *   proc.pass(data+' world');
   * }
   */
  this.func = function (p, funcname, xdata) { // TODO remove legacy xdata
    let rootProcessID = p.processID.split('.')[0];
    let rootProcess = global.hybrixd.proc[rootProcessID];

    const moduleID = rootProcess.recipe.module;
    let ydata = typeof xdata === 'undefined' ? global.hybrixd.proc[p.processID].data : xdata;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') function call to module ' + moduleID + ' -> ' + funcname); }
    if (typeof ydata !== 'object') { ydata = {}; }
    if (!modules.module.hasOwnProperty(moduleID)) {
      this.fail(p, `Unknown module '${moduleID}'`);
    } else if (!modules.module[moduleID].main.hasOwnProperty(funcname)) {
      this.fail(p, `Unknown function '${funcname}' for module '${moduleID}'`);
    } else {
      if (typeof xdata !== 'undefined') { // TODO legacy mode. DEPRICIATED
        ydata.processID = p.processID;
        modules.module[moduleID].main[ funcname ](ydata);
      } else {
        let pass = data => { this.pass(p, data); };
        let done = data => { this.stop(p, data); };
        let stop = (err, data) => { this.stop(p, err, data); };
        let fail = (err, data) => { this.fail(p, err, data); };
        const command = global.hybrixd.proc[p.processID].command || rootProcess.command || [];
        modules.module[moduleID].main[ funcname ]({pass, done, stop, fail, command: JSON.parse(JSON.stringify(command))}, ydata);
      }
    }
  };

  /*
    Not used by qrtz programmers. Internally used by scheduler. Goes to the next step of execution.
    err:    Set the error flag of the subprocess.  (0 = no error, 1 or higher = error)
    data:   Store data in the subprocess data field.
  */
  this.next = function (p, err, xdata) {
    if (err !== 0) {
      scheduler.stop(p.processID, err, xdata);
    } else {
      global.hybrixd.proc[p.processID].err = (typeof err === 'undefined' ? 1 : err);
      global.hybrixd.proc[p.processID].busy = false;
      global.hybrixd.proc[p.processID].progress = 1;
      global.hybrixd.proc[p.processID].stopped = Date.now();
      global.hybrixd.proc[p.processID].data = xdata;
    }
  };

  /**
   * Output debug information to the console.
   * @param {Object} [data] - Data to display (using JSON.stringify). Also passed.
   * @category Depreciated
   * @example
   * dump();      // outputs contents of data stream to console
   * dump({a:1}); // outputs "[D] {a:1}" to console
   */
  this.dump = function (p, xdata) {
    let ydata = typeof xdata === 'undefined' ? global.hybrixd.proc[p.processID].data : xdata;
    console.log('[D] (' + p.parentID + ') dump: ' + JSON.stringify(ydata));
    this.next(p, 0, global.hybrixd.proc[p.processID].data);
  };

  /**
   * Wait a specified amount of time.
   * @param {Number} millisecs - Amount of milliseconds to wait.
   * @category Process
   * @example
   * wait(2000)           // wait for two seconds
   */
  this.wait = function (p, millisecs) {
    let ydata = global.hybrixd.proc[p.processID].data;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') waiting at ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }

    if (global.hybrixd.proc[p.parentID].timeout > 0 && millisecs < global.hybrixd.proc[p.parentID].timeout && global.hybrixd.proc[p.parentID].timeout !== -1) {
      global.hybrixd.proc[p.parentID].timeout = global.hybrixd.proc[p.parentID].timeout + millisecs;
    }
    if (global.hybrixd.proc[p.processID].timeout > 0 && millisecs < global.hybrixd.proc[p.processID].timeout && global.hybrixd.proc[p.processID].timeout !== -1) {
      global.hybrixd.proc[p.processID].timeout = global.hybrixd.proc[p.processID].timeout + millisecs;
    }
    if (millisecs) { // if no millisecs are given, this proces will wait indefenitly
      setTimeout((p, ydata) => {
        this.next(p, 0, ydata);
      }, millisecs, p, ydata);
    }
  };

  /**
   * Wait for a process to finish, and store its processID.
   * @category Depreciated
   * @param {String} processID - Process ID to wait for.
   * @param {Number} [interval=500] - Amount of time in milliseconds between checks.
   * @example
   * prwt("101123")        // wait for process with ID 101123 to finish, then continue
   * prwt("209123")        // wait for process with ID 209123 to finish, then continue
   */
  this.prwt = function (p, processID, millisecs) {
    // TODO: Will be rewritten to be able to wait for multiple processes!
    // TODO: max nr of retries
    if (global.hybrixd.proc[p.processID].sessionID === 1 || global.hybrixd.proc[p.processID].sessionID === global.hybrixd.proc[processID].sessionID) {
      if (typeof global.hybrixd.proc[processID] !== 'undefined') {
        if (global.hybrixd.proc[processID].progress >= 1 || global.hybrixd.proc[processID].stopped > 1) {
          this.next(p, global.hybrixd.proc[processID].err, {processID: processID});
        } else {
          setTimeout(function (p, processID, millisecs) {
            this.prwt(p, processID, millisecs);
          }, millisecs || 500, p, processID, millisecs || 500);
        }
        if (DEBUG) { console.log(' [D] (' + p.parentID + ') processwait at ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
      }
    } else {
      this.fail(p, 'prwt: Insufficient permissions to access process ' + processID + '.');
    }
  };

  /**
   * Logs data to console.
   * @param {Number} [level] - Log level between 0-2.
   * @param {String} message - The message you want to log.
   * @category Logging
   * @example
   * logs("No level!")       // logs "[.] No level!" to console
   * logs(0,"Nice dude!")    // logs "[.] Nice dude!" to console
   * logs(1,"I like you")    // logs "[i] I like you" to console
   * logs(2,"Be careful")    // logs "[!] Be careful" to console
   */
  this.logs = function (p, level, log) {
    if (typeof level !== 'number') {
      log = level;
      level = 0;
    }
    if (typeof log === 'undefined') { log = global.hybrixd.proc[p.processID].data; }
    console.log(' [' + (level === 2 ? '!' : (level === 1 ? 'i' : '.')) + '] ' + (typeof log === 'string' ? log : JSON.stringify(log)));
    this.next(p, 0, global.hybrixd.proc[p.processID].data);
  };

  /**
   * Pass data to parent process.
   * @param {Object} [data=data] -  Store data in this subprocess data field. Passed to parent process.
   * @category Process
   * @example
   * pass()               // push data stream contents to master process
   * pass("Nice dude!")   // push data "Nice dude!" to master process
   * pass("Wow: "+data)   // push data "Wow:" with previous subprocess data concatenated
   */
  this.pass = function (p, xdata) {
    let ydata = typeof xdata === 'undefined' ? global.hybrixd.proc[p.processID].data : xdata;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') passing subprocess data to parent process'); }
    global.hybrixd.proc[p.parentID].data = ydata;
    this.next(p, 0, ydata);
  };

  /**
   * Turns a string into a JSON object. In case of failure pass default.
   * @category Array/String
   * @param {String} [onSuccess=1] - TODO
   * @param {String} [onError=1] - TODO
   * @example
   * jpar()         // input: "{key:'Some data.'}", output: {key:"Some data."}
   * jpar(2)        // on successful parse jump 2, else 1, stream stays unchanged
   * jpar(2,1)      // on successful parse jump 2, else 1, stream stays unchanged
   */
  this.jpar = function (p, success, fail) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') jpar: parsing string data to JSON object'); }
    try {
      this.jump(p, isNaN(success) ? 1 : success || 1, JSON.parse(functions.JSONfix(global.hybrixd.proc[p.processID].data)));
    } catch (e) {
      this.jump(p, isNaN(fail) ? 1 : fail || 1, global.hybrixd.proc[p.processID].data);
    }
  };

  /**
   * Turns JSON object into a string.
   * @category Array/String
   * @example
   * jstr()         // input: {key:"Some data."}, output: '{key:"Some data."}'
   */
  this.jstr = function (p) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') jstr: converting object data to string'); }
    this.next(p, 0, JSON.stringify(global.hybrixd.proc[p.processID].data));
  };

  /**
   * Return a timestamp. TODO: in a specified format.
   * @category Array/String
   * @example
   * date()         // output: '1549468836' (The current date/time epoch.)
   */
  this.date = function (p) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') date: returning date/time epoch'); }
    let datetime = (new Date()).getTime() / 1E3 | 0;
    this.next(p, 0, datetime);
  };

  /**
   * Set progress of parent process.
   * @param {Number} step - Current step in the progress. (Value -1 restores automatic progress reporting.)
   * @param {Number} steps - Total amount of steps.
   * @example
   * prog(20,40)  // progress is set to 0.5 (which means 50%)
   * prog()       // restore automatic progress reporting
   */

  this.prog = function (p, step, steps) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') progress reset to ' + step + ' of ' + steps); }
    if (typeof steps === 'undefined') { steps = 1; }
    if (typeof step === 'undefined') {
      global.hybrixd.proc[p.parentID].autoprog = true;
    } else {
      global.hybrixd.proc[p.parentID].progress = step / steps;
      global.hybrixd.proc[p.parentID].autoprog = false;
    }
    this.next(p, 0, global.hybrixd.proc[p.processID].data);
  };

  /**
   * Set timeout of current process.
   * @category Process
   * @param {Number} millisecs -  Amount of milliseconds to wait.
   * @param {Object} [data=data] - Set data when process times out
   * @param {Object} [err=1] - Set error flag when process times out
   * @example
   * time()                  // set unlimited timeout
   * time(0)                 // immediately timeout the process
   * time(1000)              // set timeout to one second
   * time(1000 "Time's up!" 0)    // set timeout to one second, if exceeded set data to "Time's up!" and give no error
   */
  this.time = function (p, millisecs, hookData, hookErr) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') timeout for process forced to ' + (millisecs ? millisecs + 'ms' : 'indefinite')); }
    if (typeof millisecs === 'undefined') { millisecs = -1; }
    // increase timeout of all siblings
    let loopid;
    let process = global.hybrixd.proc[p.parentID];
    for (let i = 0; i <= process.steps; i += 1) {
      loopid = p.parentID + '.' + i;
      if (global.hybrixd.proc[loopid].timeout < millisecs || millisecs <= 0) {
        global.hybrixd.proc[loopid].timeout = millisecs;
      }
    }
    // increase timeout of all parents
    let parentID = true;
    let processID = p.processID;
    while (parentID) {
      let procinfo = procpart(processID);
      if (procinfo[1] > -1) { parentID = procinfo[0]; processID = parentID; } else { parentID = false; }
      if (parentID) {
        // DEBUG: console.log(' [#] setting timeout of parentID '+parentID);
        if (global.hybrixd.proc[parentID].timeout < millisecs || millisecs <= 0) {
          global.hybrixd.proc[parentID].timeout = millisecs;
        }
      }
    }
    if (typeof hookData !== 'undefined' || typeof hookErr !== 'undefined') {
      process.timeHook = {data: typeof hookData === 'undefined' ? global.hybrixd.proc[p.processID].data : hookData, err: (typeof hookErr === 'undefined' ? 1 : hookErr)};
    }

    this.next(p, 0, global.hybrixd.proc[p.processID].data);
  };

  /**
   * Stop processing and return data
   * @category Process
   * @param {Number} [err=0] - Set the error flag of the subprocess.   (0 = no error, 1 or higher = error)
   * @param {Object} [data=data] - Store data in this subprocess data field. (Passed to parent process on stop.)
   * @example
   *  stop()                          // stop processing and set no error
   *  stop("OK")                      // stop processing, set no error, and put "OK" in main process data field
   *  stop(0,"All is good.")          // stop processing, set no error, and put "All is good." in main process data field
   *  stop(404,"HELP! Not found.")    // stop processing, set error to 404, and put "HELP! Not found." in main process data field
   */
  this.stop = function (p, err, xdata) {
    let ydata;
    if (typeof err === 'undefined' && typeof xdata === 'undefined') {
      ydata = global.hybrixd.proc[p.processID].data;
      err = 0;
    } else if (typeof err !== 'number' && typeof xdata === 'undefined') {
      ydata = err;
      err = 0;
    } else {
      ydata = typeof xdata === 'undefined' ? global.hybrixd.proc[p.processID].data : xdata;
    }
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') stopped at step ' + (global.hybrixd.proc[p.parentID].step <= global.hybrixd.proc[p.parentID].steps ? global.hybrixd.proc[p.parentID].step + 1 : 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
    global.hybrixd.proc[p.processID].data = ydata;
    scheduler.stop(p.processID, typeof err === 'undefined' ? 0 : err, ydata);
  };

  /**
   * Set the type field of a process.
   * @category Process
   * @param {String} data - the data type. default: 'data': data as is;  'file':  for static file content retrieval.
   * @example
   *  type("data")           // set the data type to 'data'
   *  stop(0,"hello")        // stop processing, set no error and pass string 'hello'
   * @example
   *  type("file:data")      // set the data type to 'file:data'
   *  stop(0,"hello.txt")    // stop processing, set no error and pass the content of the hello.txt file as data in the result json
   * @example
   *  type("file:text/html") // set the data type to 'text/html'
   *  stop(0,"hello.html")   // stop processing, set no error and pass the content of the hello.html file as flat file, resulting in webserver behaviour
   */
  this.type = function (p, type) {
    scheduler.type(p.processID, type);
    this.next(p, 0, global.hybrixd.proc[p.processID].data);
  };

  /**
   * Set data stream to a value.
   * @category Process
   * @param {Object} object - Object to fill the data stream with.
   * @example
   * data("test")            // Fill the data stream with 'test'.
   */
  this.data = function (p, xdata) {
    let ydata = typeof xdata === 'undefined' ? global.hybrixd.proc[p.processID].data : xdata;
    this.next(p, 0, ydata);
  };

  /**
   * Indicates a fallback target when an error is encountered.
   * @category Flow
   * @param {String|Integer} onError - Determines fallback behaviour. If integer: jump, if not stop with error code err
   * @param {Integer} [err=1] - Error code for stopping hook.
   * @example
   * hook "Something went wrong." 0
   * fail "Something caused an error"
   * // this will fail but the hook will cause a non error output of "Something went wrong."
   * @example
   * hook "Something went wrong." 1
   * fail "Something caused an error"
   * // this will fail but the hook will overwrite the error output with "Something went wrong."
   * @example
   * hook 2
   * fail "Something caused an error"
   * done "Something went wrong."
   * // this will fail but the hook will cause a jump and a non error output of "Something went wrong."
   * @example
   * hook @problem
   * fail "Something caused an error"
   * @problem
   * done "Something went wrong."
   * // this will fail but the hook will cause a jump and a non error output of "Something went wrong."
   */
  this.hook = function (p, jumpOrErrOrData, err) {
    let process = global.hybrixd.proc[p.parentID];
    if (typeof jumpOrErrOrData !== 'number') {
      process.hook = {data: jumpOrErrOrData, err: typeof err === 'undefined' ? 1 : err};
      return this.next(p, 0, global.hybrixd.proc[p.processID].data);
    } else if (jumpOrErrOrData === 0) {
      return this.stop(p, 'hook: illegal zero jump.');
    } else if (jumpOrErrOrData + process.step < 0) {
      return this.stop(p, 'hook: illegal negative jump.');
    } else if (jumpOrErrOrData + process.step > process.steps) {
      return this.stop(p, 'hook: illegal out of bounds jump.');
    } else {
      process.hook = {jump: (jumpOrErrOrData + process.step), err: typeof err === 'undefined' ? 1 : err};
      return this.next(p, 0, global.hybrixd.proc[p.processID].data);
    }
  };

  /**
   * Fail processing and return message.
   * @category Process
   * @param {Number} [err=1] - Set the error flag of the subprocess.   (0 = no error, 1 (Default) or higher = error)
   * @param {Object} [data=data] - Message/data passed  to parent process.
   * @example
   * fail()                        // stop processing and set error to 1
   * fail("Something wrong")       // stop processing, set error to 1, and put "Something wrong." in main process data field
   * fail(404,"HELP! Not found.")  // stop processing, set error to 404, and put "HELP! Not found." in main process data field
   */
  this.fail = function (p, err, xdata) {
    let ydata = typeof xdata === 'undefined' ? err : xdata;
    this.stop(p, typeof xdata === 'undefined' ? 1 : err, ydata);
  };

  /**
   * Stop processing and return message.
   * @category Process
   * @param {Object} [data=data] - Message/data passed  to parent process.
   * @example
   * done()                // stop processing without error.
   * done("Success")       // stop processing without error and put "Success." in main process data field
   */
  this.done = function (p, xdata) {
    let ydata = typeof xdata === 'undefined' ? global.hybrixd.proc[p.processID].data : xdata;
    this.stop(p, 0, ydata);
  };

  /**
   * Jump forward or backward several instructions.
   * @category Flow
   * @param {Integer} step - Amount of instructions lines to jump.   (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @example
   * jump(2)         // jump over the next instruction
   * jump(-3)        // jump backwards three instructions
   */
  this.jump = function (p, stepTo, xdata) {
    let processStep = global.hybrixd.proc[p.processID];
    let process = global.hybrixd.proc[p.parentID];

    processStep.started = Date.now();

    if (isNaN(stepTo) || stepTo === 0) {
      this.fail(p, 'jump: illegal zero jump.');
      return;
    }
    let jumpTo = process.step + stepTo;
    if (jumpTo < 0) {
      this.fail(p, 'jump: illegal negative jump.');
      return;
    }
    if (jumpTo > process.steps) {
      this.fail(p, 'jump: illegal out of bounds jump.');
      return;
    }

    if (stepTo < 0) {
      let previd;
      for (let i = jumpTo; i < process.step; i += 1) {
        let prevProcessStepID = p.parentID + '.' + i;
        let prevProcessStep = global.hybrixd.proc[prevProcessStepID];
        prevProcessStep.err = 0;
        prevProcessStep.busy = false;
        prevProcessStep.progress = 0;
        prevProcessStep.started = Date.now();
        prevProcessStep.stopped = null;
      }
    }
    process.busy = false;
    process.step = jumpTo;
    processStep.err = 0;
    processStep.busy = false;
    processStep.progress = 1;
    processStep.stopped = Date.now();
    processStep.data = typeof xdata !== 'undefined' ? xdata : global.hybrixd.proc[p.processID].data;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') jumping to step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
  };

  /**
   * Test a condition and choose to jump.
   * @category Flow
   * @param {Boolean} condition -  Condition to test
   * @param {Integer} [onTrue=1] - Amount of instructions lines to jump when condition matches true.   (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @param {Integer} [onFalse=1] - Amount of instructions lines to jump when condition matches false.  (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @example
   * test('a>3',1,-3)    // test if a>3, if true jump to the next instruction, if false jump back three instructions
   * test('b<=1',-4,1)   // test if b<=1, if true jump back four instructions, if false jump to the next instruction
   * test('a>3',-5)      // test if a>3, if true jump back five instructions, else default jump to the next instruction
   */
  this.test = function (p, condition, is_true, is_false) {
    if (condition) {
      this.jump(p, isNaN(is_true) ? 1 : is_true || 1, global.hybrixd.proc[p.processID].data);
    } else if (typeof is_false === 'undefined') {
      this.next(p, 0, global.hybrixd.proc[p.processID].data);
    } else {
      this.jump(p, isNaN(is_false) ? 1 : is_false || 1, global.hybrixd.proc[p.processID].data);
    }
  };

  /**
   * Test a number to be positive, zero or negative (named after the spaceship operator)
   * @category Flow
   * @param {Integer} [onPositive=1] -Amount of instructions lines to jump when number is positive
   * @param {Integer} [onZero=1] - Amount of instructions lines to jump when number is zero
   * @param {Integer} [onNegative=1] - Amount of instructions lines to jump when number is negative
   * @param {Integer} [onNaN=1] - Amount of instructions lines to jump when data is not a number
   * @example
   */
  this.ship = function (p, onPositive, onZero, onNegative, onNaN) {
    let ydata = global.hybrixd.proc[p.processID].data;
    if (isNaN(ydata)) {
      this.jump(p, onNaN || 1, ydata);
    } else if (Number(ydata) > 0) {
      this.jump(p, onPositive || 1, ydata);
    } else if (Number(ydata) === 0) {
      this.jump(p, onZero || 1, ydata);
    } else if (Number(ydata) < 0) {
      this.jump(p, onNegative || 1, ydata);
    } else {
      this.jump(p, onNaN || 1, ydata);
    }
  };

  /**
   * Test truth of a condition and choose to jump.
   * @category Flow
   * @param {Boolean} condition -  Javascript condition to analyse. (Example: a>5)
   * @param {Integer} [onTrue=1] - Amount of instructions lines to jump when condition matches true.   (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @param {Integer} [onFalse=1] - Amount of instructions lines to jump when condition matches false.  (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @example
   * true('>3',1,-3)       // test if data>3, if true jump to the next instruction, if false jump back three instructions
   * true('<=1',-4,1)      // test if data<=1, if true jump back four instructions, if false jump to the next instruction
   * true('>3',-5)         // test if data>3, if true jump back five instructions, else default jump to the next instruction
   * true('=3',-5)         // test if data=3, if true jump back five instructions, else default jump to the next instruction
   */
  this.true = function (p, condition, is_true, is_false) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') [' + condition + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
    if (typeof condition === 'string' && isNaN(condition.substr(0, 1))) {
      condition = global.hybrixd.proc[p.processID].data + condition;
    }
    if (mathCalc(condition) === 'true') {
      this.jump(p, isNaN(is_true) ? 1 : is_true || 1, global.hybrixd.proc[p.processID].data);
    } else {
      this.jump(p, isNaN(is_false) ? 1 : is_false || 1, global.hybrixd.proc[p.processID].data);
    }
  };

  /**
   * Change the flow of execution based on a string comparison.
   * @category Flow
   * @param {Boolean} condition -  Javascript condition to analyse. (Example: a>5)
   * @param {Integer} [onTrue=1] - Amount of instructions lines to jump when condition matches true.   (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @param {Integer} [onFalse=1] - Amount of instructions lines to jump when condition matches false.  (1 = jump forward 1 instruction, -2 = jump backward two instructions)
   * @example
   * flow('yes',1,-3)          // test if data equals 'yes', if true jump to the next instruction, if false jump back three instructions
   * flow({'yes':3,'no':2})    // if data equals 'yes' jump three instructions, if no jump two instructions, else jump to next instruction
   * flow({'yes':3,'no':2},5)  // if data equals 'yes' jump three instructions, if no jump two instructions, else jump five instructions
   */
  this.flow = function (p, compare, success, failure) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') flow [' + compare + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
    let ydata = global.hybrixd.proc[p.processID].data;
    let jumpTo = success || 1;
    if (typeof compare === 'object' || compare instanceof Array) {
      for (let key in compare) {
        if (key === ydata) {
          jumpTo = compare[key];
        }
      }
    } else {
      jumpTo = compare === ydata ? (success || 1) : (failure || 1);
    }
    this.jump(p, jumpTo, ydata);
  };

  /**
   * Count amount of entries a list, string or object has.
   * @category Array/String
   * @param {Boolean} [input] - List, string or object.
   * @example
   * size()              // input: 'abcde', result: 5
   * size(['a','b',5])   // result: 3
   * size({'a':1,'b':2)  // result: 2
   */
  this.size = function (p, xdata) {
    let ydata = typeof xdata !== 'undefined' ? xdata : global.hybrixd.proc[p.processID].data;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') size [' + ydata + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
    let result = 0;
    if (ydata === null) {
      result = 0;
    } else if (typeof ydata === 'object') {
      if (ydata.constructor === 'Array') {
        result = ydata.length;
      } else {
        result = Object.keys(ydata).length;
      }
    } else if (typeof ydata === 'string') {
      result = ydata.length;
    }
    this.next(p, 0, result);
  };

  /**
   * Transforms data using a pattern definition.
   * also for arrays and dictionaries of property paths
   * also for explicit primitive values
   * @param {Object} pattern - A (or nested array/dicationary of) strings containing
   * - explicit values (Example: "Hello")
   * - property paths to test and pass (prefixed with ".") (Example: ".foo.bar"
   * - expressions (prefixed with "=") (Example: "=a+b", "=.foo.bar|default")
   * @param {Object} input - The input
   * @param {Number} [onSuccess=1] - amount of instructions lines to jump on success.
   * @param {Number} [onError=1] - amount of instructions lines to jump on failure.
   * @example
   * tran(".foo",1,2)                                         // Input: {foo:"bar"} : Passes "bar" to next
   * tran(".foo.bar[2]",1,2)                                  // Input: {foo:{bar:[0,1,5]}} :  Passes 5 to next
   * tran(".foo.bar[2]",1,2)                                  // Input: {foo:"bar"}   Jumps 2 instructions and passes {foo:"bar"}
   * tran([".foo",".hello"],1,2)                              // Input: {foo:"bar",hello:"world"} Passes ["bar","world"] to next
   * tran({a:".foo",b:".hello",c:"test"},1,2)                 // Input: {foo:"bar",hello:"world"} Passes {a:"bar", b:"world", c:"test"} to next
   * tran("=.hello|default",1,2)                              // Input: {hello:"world"}  Passes "world" to next
   * tran("=.hello|default",1,2)                              // Input: {foo:"bar"}  Passes "default" to next
   */
  this.tran = function (p, property, is_valid, is_invalid) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') tran [' + JSON.stringify(property) + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
    let ydata = global.hybrixd.proc[p.processID].data;
    let checkVar = chckVar(p, property, ydata);
    if (checkVar.valid) {
      global.hybrixd.proc[p.processID].data = checkVar.data;
      this.jump(p, isNaN(is_valid) ? 1 : is_valid || 1);
    } else {
      this.jump(p, isNaN(is_invalid) ? 1 : is_invalid || 1, ydata);
    }
  };

  /**
   * Find a string in an array of objects, and return the object it was found in.
   * @category Array/String
   * @param {Object} needle - The object to find
   * @param {Number} [onFound=1] - Where to jump when the data is found
   * @param {Number} [onNotFound=1] - Where to jump when the data is not found
   * @example
   * find({'id':'abcd'})      // input: [{'id':'abcd'},{'id':'efgh'}], output: [{'id':'abcd'}]
   */
  this.find = function (p, needle, found, not_found) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') find [' + JSON.stringify(needle) + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
    let ydata = global.hybrixd.proc[p.processID].data;
    let jumpTo = not_found;
    let matches = ydata;
    if (typeof ydata === 'string') {
      if (ydata.indexOf(needle) !== -1) {
        matches = needle;
        jumpTo = found;
      }
    } else if (ydata instanceof Array) {
      matches = [];
      const query = JSON.stringify(needle).replace(new RegExp('^[{]*'), '').replace(new RegExp('[}]*$'), '');
      for (let i = 0; i < ydata.length; i++) {
        if (JSON.stringify(ydata[i]).indexOf(query) !== -1) {
          matches.push(ydata[i]);
          jumpTo = found;
        }
      }
      if (matches.length === 0) { matches = ydata; }
    } else {
      this.fail(p, 'Expected string or array.');
      return;
    }
    this.jump(p, jumpTo || 1, matches);
  };

  /**
   * Format a (floating point) number and return a neatly padded string.
   * @param {Number} [factor=$factor] - Contains a number
   * @example
   * form()     // input: 10, output: "10.00000000" (using $factor = 8)
   * form(8)    // input: 10, output: "10.00000000"
   * form(4)    // input: 8, output: "0.8000"
   */
  this.form = function (p, factor) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') form [' + JSON.stringify(ydata) + ',' + JSON.stringify(factor) + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }

    if (typeof factor === 'undefined') {
      let rootProcessID = p.processID.split('.')[0];
      let rootProcess = global.hybrixd.proc[rootProcessID]; // the root process
      factor = rootProcess.recipe.factor;
    }
    let result = functions.padFloat(global.hybrixd.proc[p.processID].data, factor);
    this.next(p, 0, result);
  };

  /**
   * Convert a number from atomic units, or convert to atomic units.
   * @param {Number} [reduce=false] - When true reduces the input data
   * @param {Number} [factor=$factor] - Factor to use
   * @example
   * atom()     // input: 1000000000, output: "10.00000000" (using $factor = 8)
   * atom(1)    // input: 10, output: "1000000000" (using $factor = 8)
   * atom(0,4)  // input: 8, output: "0.0008"
   * atom(1,4)  // input: 8, output: "80000"
   */
  this.atom = function (p, reduce, factor) {
    let ydata = global.hybrixd.proc[p.processID].data;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') atom [' + JSON.stringify(ydata) + ',' + JSON.stringify(factor) + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
    if (typeof factor === 'undefined') {
      let rootProcessID = p.processID.split('.')[0];
      let rootProcess = global.hybrixd.proc[rootProcessID]; // the root process
      factor = rootProcess.recipe.factor;
    }
    let result;
    if (reduce) {
      result = functions.toInt(ydata, factor).toInteger();
    } else {
      result = functions.padFloat(functions.fromInt(ydata, factor), factor);
    }
    this.next(p, 0, result);
  };

  /**
   * Explode a string into an array, split by separator.
   * @category Array/String
   * @param {String} [separator=' ']      - Separator character
   * @param {String} [elements=undefined] - Elements to select from splitted string
   * @example
   * splt()           // input: "This is nice.", output: ["This","is","nice."]
   * splt(',')        // input: "Some,list,of,stuff", output: ["Some","list","of","stuff]
   * splt(',',2)      // input: "Some,list,of,stuff", output: "list"
   * splt(',',[2,3])  // input: "Some,list,of,stuff", output: ["list","of"]
   */
  this.splt = function (p, separator, elements) {
    if (typeof separator === 'undefined') { separator = ''; }
    let ydata = global.hybrixd.proc[p.processID].data;
    let splitted;
    if (typeof ydata === 'string') {
      splitted = ydata.split(separator);
    } else {
      splitted = [];
    }
    let result = [];
    if (typeof elements !== 'undefined') {
      if (!isNaN(elements)) {
        result = splitted[elements];
        if (typeof result === 'undefined' || result === null) {
          result = '';
        }
      }
      if (elements instanceof Array) {
        for (let key = 0; key < result.length; key++) {
          result.push(splitted[key]);
        }
      }
    } else {
      result = splitted;
    }
    this.next(p, 0, result);
  };

  /**
   * Join an array into a string.
   * @category Array/String
   * @param {String} [separator=''] - Implode an array to a string, split by separator.
   * @example
   * join()     // input: ["This","is","nice."], output: "Thisisnice."
   * join(' ')  // input: ["Some","list","of","stuff"], output: "Some list of stuff"
   */
  this.join = function (p, separator) {
    if (typeof separator === 'undefined') { separator = ''; }
    let result = global.hybrixd.proc[p.processID].data.join(separator);
    this.next(p, 0, result);
  };

  /**
   * Use API queue to perform a curl call to an external host.
   * @param {String} target - A string containing on of the following options
   * - "[user[:password]@]host[:port]"
   * - "asset://base[.mode]"
   * - "source://base[.mode]"
   * @param {String} [querystring=""] - A string containig the querypath  (Example: "/road/cars?color=red")
   * @param {String} [method="GET"] - GET (default) ,POST or PUT
   * @param {Object} [headers={}] - http headers passed to call
   * @param {Object} [overwriteProperties={}] -
   * - retry: max nr of retries allowed
   * - throttle: max amount of calls per second
   * - timeout: timeout of a curl call in seconds
   * - interval: try a new call if no response
   * - user:
   * - password:
   * - proxy:
   * - host:
   * - rejectUnauthorized Whether to reject TLS unauthorized errors. (Defaults to true)
   */
  // TODO: rewrite curl to be able to handle a GET string or properties
  //       e.g.: this.curl = function (p, target, { querystring, method, xdata, headers, overwriteProperties })
  this.curl = function (p, target, querystring, method, headers, overwriteProperties) {
    let ydata = global.hybrixd.proc[p.processID].data;
    let properties;
    let link;
    if (target.substr(0, 8) === 'asset://') { // target = "asset://base.mode"
      target = target.substring(8, target.length); // target = "base.mode"
      const base = target.split('.')[0]; // base = "base"
      link = 'asset["' + base + '"]';
      properties = {};
      Object.assign(properties, global.hybrixd.asset[base]); // use base as default
      if (base !== target) { // extend with mode if required
        properties = Object.assign(properties, global.hybrixd.asset[target]);
      }
    } else if (target.substr(0, 9) === 'source://') { // target = "source://base.mode"
      target = target.substring(9, target.length); // target = "base.mode"
      const base = target.split('.')[0]; // base = "base"
      link = 'source["' + base + '"]';
      properties = {};
      Object.assign(properties, global.hybrixd.source[base]); // use base as default
      if (base !== target) { // extend with mode if required
        properties = Object.assign(properties, global.hybrixd.source[target]);
      }
    } else if (target.substr(0, 9) === 'engine://') { // target = "source://base.mode"
      target = target.substring(9, target.length); // target = "base.mode"
      let base = target.split('.')[0]; // base = "base"
      link = 'source["' + base + '"]';
      properties = {};
      Object.assign(properties, global.hybrixd.engine[base]); // use base as default
      if (base !== target) { // extend with mode if required
        properties = Object.assign(properties, global.hybrixd.engine[target]);
      }
    } else { // target = "user:password@host:port"
      let targetSplitOnAdd = target.split('@');
      properties = {};
      if (targetSplitOnAdd.length === 1) {
        properties.host = targetSplitOnAdd[0];
      } else {
        let protocolSplit = targetSplitOnAdd[0].split('/');
        let userSplitOnColon = protocolSplit[2].split(':');
        properties.user = userSplitOnColon[0];
        properties.pass = userSplitOnColon.length > 1 ? userSplitOnColon[1] : undefined;
        properties.host = protocolSplit[0] + '//' + targetSplitOnAdd[1];
      }
    }

    let args = {};
    args['data'] = ydata;
    args['path'] = typeof querystring === 'undefined' ? '' : querystring;

    if (properties.hasOwnProperty('rejectUnauthorized') && !properties['rejectUnauthorized']) {
      console.log(' [!] module quartz: unauthorized TLS/SSL certificates ignored for ' + properties.symbol);
      args['rejectUnauthorized'] = false;
    }
    args.headers = (headers || {});

    let queueObject = {
      link: link,
      target: target,
      host: properties.host,
      user: properties.user,
      pass: properties.pass,
      args: args,
      method: method || 'GET',
      retry: properties.retry,
      throttle: properties.throttle,
      timeout: properties.timeout,
      interval: properties.retry,
      pid: p.processID
    };

    if (overwriteProperties) { // overwrite connection properties
      if (overwriteProperties.hasOwnProperty('pid')) { delete overwriteProperties.pid; }
      if (overwriteProperties.hasOwnProperty('link')) { delete overwriteProperties.link; }
    } else { overwriteProperties = {}; }

    // Remove undefined values (needed to let APIqueue set defaults)
    let cleanQueueObject = Object.keys(Object.assign(queueObject, overwriteProperties)).reduce(
      function (cleanQueueObject, key) {
        if (typeof queueObject[key] !== 'undefined') {
          cleanQueueObject[key] = queueObject[key];
        }
        return cleanQueueObject;
      }, {});
    // DEBUG: console.log('##########'+JSON.stringify(cleanQueueObject)+'##########');
    APIqueue.add(cleanQueueObject);
  };

  /**
   * Creates a new process by calling the command asynchronously.
   * @category Process
   * @param {String} command -  A string containg the command path. "command/a/b". This calls command using $1 = "a", $2 = "b"
   * @param {Object} [data=data] -  Optional data to be passed to the new process
   * @param {Number} [childId=0] -  if undefined then the new process will be independant. If 0 or larger is will be instantiated as a child process of the current process.
   * @example
   * fork("balance/_dummyaddress_")   // Starts a process to retrieve the dummy balance and continue without waiting for a reply.
   */
  this.fork = function (p, command, childId, xdata) {
    let ydata = typeof xdata === 'undefined' ? global.hybrixd.proc[p.processID].data : xdata;
    let rootProcessID = p.processID.split('.')[0];
    let rootProcess = global.hybrixd.proc[rootProcessID]; // the root process
    command = command.split('/'); // "dummy/balance/_dummyaddress_" => ["dummy","balance","_dummyaddress_"]
    let path = rootProcess.path && rootProcess.command
      ? rootProcess.path.slice(0, rootProcess.path.length - rootProcess.command.length).concat(command) // "/asset/dummy/do/something" => "/asset/dummy/fork/me" (as arrays)
      : null;
    let requestPID;
    if (typeof childId === 'undefined') {
      requestPID = 0;
    } else {
      requestPID = p.processID + '.';
    }
    let childPID = scheduler.init(requestPID, {data: ydata, sessionID: rootProcess.sessionID, recipe: rootProcess.recipe, path: path, command: command});
    // the command xpath passed to the Quartz function: "functionId/$1/$2/$3/..."
    let main = modules.module[rootProcess.recipe.module].main;
    if (!main.hasOwnProperty('exec')) {
      main = modules.module['quartz'].main;
    }
    if (rootProcess.recipe.hasOwnProperty('quartz') && rootProcess.recipe.quartz.hasOwnProperty(command[0])) {
      main = global.hybrixd.module['quartz'].main;
    }

    main.exec({processID: childPID, parentID: p.processID, target: rootProcess.recipe, mode: rootProcess.recipe.mode, factor: rootProcess.recipe.factor, command: command});
    return childPID;
  };

  /**
   * Creates a new process by calling the xpath command and wait for the data to be returned (combines fork and read).
   * TODO: the description below of the command path is incorrect, the path cannot be retrieved in the child fork!
   * @category Process
   * @param {String} command -  A string containg the command path. "command/a/b". processStepID calls command using $1 = "a", $2 = "b"
   * @param {Object} [data=data] -  Optional data to be passed to the new process
   * @example
   * call("balance/_dummyaddress_")          // Retrieve the balance and pass it to next step.
   */
  this.call = function (p, command, xdata) {
    let ydata = typeof xdata === 'undefined' ? global.hybrixd.proc[p.processID].data : xdata;
    this.read(p, this.fork(p, command, 0, ydata));
  };

  /**
   * Return a random number between 0 and 1
   * @example
   * rand          // 0.233
   */
  this.rand = function (p, size) {
    if (typeof size === 'undefined') {
      this.next(p, 0, Math.random());
    } else {
      this.next(p, 0, Math.floor(Math.random() * size));
    }
  };

  /**
   * Route a path through hybrixd and pass the result to the next step. /api/help for API information.
   * @param {String} path - Provide the routing path
   * @example
   * rout('/asset/dummy/balance/__dummyaddress__')   // retrieve the balance for the dummy asset
   */
  this.rout = function (p, xpath) {
    // TODO pass data to post
    let sessionID = global.hybrixd.proc[p.processID.split('.')[0]].sid;
    let result = router.route({url: xpath, sessionID: sessionID});
    if (result.id === 'id') { // if result is a process that has te be awaited, then read that proces until finished
      this.read(p, result.data);
    } else {
      scheduler.help(p.processID, result.help);
      scheduler.type(p.processID, result.type);
      this.next(p, result.hasOwnProperty('error') ? result.error : 1, result.hasOwnProperty('data') ? result.data : null); // if it's a direct result pass it to next
    }
  };

  /**
   * File reads the data of a filekey into process memory
   * @example
   * file(2,1)   // reads file contents and if successful jumps two steps
   */
  this.file = function (p, success, failure) { // todo pass offest and length
    let process = global.hybrixd.proc[p.parentID];
    let processStep = global.hybrixd.proc[p.processID];
    if (process.type.startsWith('file:')) {
      let filePath = '../' + processStep.data.replace('..', ''); // 'file://*' => file : '$HYBRIXD_HOME/*'   //TODO Make safer MAYBE warning on '..' usage?
      if (fs.existsSync(filePath)) {
        processStep.data = fs.readFileSync(filePath).toString('utf8');
        scheduler.type(p.processID, undefined); // reset type
        this.jump(p, isNaN(success) ? 1 : success || 1, processStep.data);
      } else {
        this.jump(p, isNaN(failure) ? 1 : failure || 1, processStep.data);
      }
    } else {
      this.jump(p, isNaN(failure) ? 1 : failure || 1, processStep.data);
    }
  };

  /**
   * Store a key value pair. When value is an object, it will be stored as a string.
   * @category Storage
   * @param {String} key - Key under which to store data
   * @param {Object} [value=data] - Value to store
   * @example
   * save("myFavoriteColor","blue")    // saves "blue" under key myFavoriteColor
   * save("myObject",{key:"storeme"})  // saves "{key:\"storeme\"}" under key myObject
   */
  this.save = function (p, key, value) {
    if (typeof value === 'undefined') { value = global.hybrixd.proc[p.processID].data; }
    if (typeof value !== 'string') {
      value = JSON.stringify(value).replace(/[\\"']/g, '\\$&').replace(/\x0/g, '\\0');
    }
    // TODO: is broken -> modules.module.storage.main.exec({processID:p.processID, command:['save',key,value]});
    this.rout(p, '/engine/storage/set/' + encodeURIComponent(key) + '/' + encodeURIComponent(value));
  };

  /**
   * Retrieve a string value stored under key.
   * NOTE: When loading saved objects, pass them through jpar() for conversion!
   * @category Storage
   * @param {String} key - Key from which to retrieve data
   * @example
   * load("myFavoriteColor")  // retrieve the value for myFavoriteColor
   * load("myObject")         // retrieve the value for myObject
   * load("myObject",@success,@notFound)
   * load(@success,@notFound)
   * jpar()                   // convert loaded value to object
   */
  // TODO: split load() -> seek()
  // make sure rout is used in this.load() and put @success, and @failure
  //  in the this.rout() function!
  // example: seek([input],@success,@failure) -> returns: file handle on success
  this.load = function (p, input, success, failure) {
    let key;
    if (input && isNaN(input)) {
      key = input;
      failure = failure || 1;
      success = success || 1;
    } else {
      key = global.hybrixd.proc[p.processID].data;
      failure = success || 1;
      success = input || 1;
    }

    if (DEBUG) { console.log(' [D] (' + p.parentID + ') load from storage ' + key); }

    let fold = key.substr(0, 2) + '/';
    let filePath = '../storage/' + fold + key.replace('..', '');
    if (fs.existsSync(filePath)) {
      global.hybrixd.proc[p.processID].data = fs.readFileSync(filePath).toString('utf8');
      this.jump(p, success, global.hybrixd.proc[p.processID].data);
    } else {
      if (isNaN(failure)) {
        this.fail(p, 'File not found!', global.hybrixd.proc[p.processID].data);
      } else {
        this.jump(p, failure, global.hybrixd.proc[p.processID].data);
      }
    }

    // this.rout(p, '/engine/storage/load/' + encodeURIComponent(key));
    // DOESNT WORK: modules.module.storage.main.exec({processID:p.processID, command:['load',key]});
    // TEST: modules.module.storage.main.get({processID:p.processID,key:key});
  };

  /**
   * Retrieve the meta data based on a key.
   * @category Storage
   * @param {String} key - Key for which to get metadata
   * @example
   * meta("myFavoriteColor")  // retrieve the meta data for myFavoriteColor
   */
  this.meta = function (p, input) {
    let key = typeof input === 'undefined' ? global.hybrixd.proc[p.processID].data : input;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') meta from storage ' + key); }
    this.rout(p, '/engine/storage/meta/' + encodeURIComponent(key));
  };

  /**
   * Wait for one or more processes to finish and return the results.
   * @category Process
   * @param {String|Array<String>|Object<String>} processIDs - A string containing the processID or an array of strings containing multiple processIDs
   * @param {Number} [interval=500] - The amount of millisecs between each check if processes are finished
   * @example
   * read("123456")                   //Wait for process 123456 to finish and return its data.
   * read(["123456","654321"])        //Wait for processes 123456 and 654321 to finish and return their data combined into an array.
   * read({"a":null,"b":34})          //Wait for processes 123456 and 654321 to finish and return their data combined into an object with property labels a and b.
   */
  this.read = function (p, processIDs, millisecs) {
    readData(p, processIDs, millisecs, this.next);
  };

  /**
   * Iterate through elements of a container execute a given function for each element.
   * @category Process
   * @param {Array|Object} input -  TODO
   * @param {String} command -  A string containg the command path. "command/a/b". This calls command using $1 = "a", $2 = "b"
   * @param {Object} [data=data] -  Optional data to be passed to the new process
   * @example
   * each(["a","b","c"],"test")           //  calls test with data = {key=0, value="a"} and further
   * each({"a":0,"b":1,"c":2},"test")     //  calls test/x/y with data = {key="a", value=0} and further
   */
  this.each = function (p, container, command, xdata) {
    let ydata = typeof xdata === 'undefined' ? global.hybrixd.proc[p.processID].data : xdata;
    let processIDs;
    if (container instanceof Array) { // Array
      processIDs = [];
      for (let key = 0; key < container.length; ++key) {
        processIDs.push(this.fork(p, command, key, {data: ydata, container: container, key: key, value: container[key]}));
      }
    } else { // Dictionary
      processIDs = {};
      let index = 0;
      for (let key in container) {
        processIDs[key] = this.fork(p, command, index, {data: ydata, container: container, key: key, value: container[key]});
        ++index;
      }
    }
    this.read(p, processIDs);
  };

  /**
   * Put data in a variable for later use. Use peek to retrieve. The data is stored in the root parent process under 'vars'. (You can see this poked data stored in global.hybrixd.proc[rootID].vars, but a better way to use this data is by using the command peek("varname").
   * @category Variables
   * @param {String} key - Variable name to get data from.
   * @param {String} [value=data] - The data to store in the variable. This is also stored in this subprocess data field.
   * @example
   *  poke("fee",value)           // sets value in recipe local variable fee. Shorthand for local::fee (runtime, persisted in the .vars.json file)
   *  poke("userDefined")         // given that the recipe does not have property userDefined sets the value in processor variable userDefined (runtime, non persistant)
   *  poke("proc::fee",value)     // sets value in processor variable fee (runtime, non persistant)
   *  poke("local::fee",value)    // sets value in recipe local variable fee (runtime, persisted in the .vars.json file)
   *  poke("::fee",value)         // same as poke("local::fee",value)

   *  poke("btc::fee",value)         // results in an error.
   *  poke("btc::local::fee",value)  // results in an error

   *  poke(2,value)     // results in an error.
   */
  this.poke = function (p, key, pdata) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') poke [' + JSON.stringify(variable) + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }

    let qdata = typeof pdata === 'undefined' ? global.hybrixd.proc[p.processID].data : pdata;

    let result = pokeVar(p, key, qdata);
    if (typeof qdata !== 'undefined') {
      result.v = global.hybrixd.proc[p.processID].data;
    }
    if (result.e > 0) {
      return this.fail(p, result.v);
    } else {
      return this.next(p, 0, result.v);
    }
  };

  /**
   * Gets data from a variable that was defined by poke. Used inside of other instructions.
   * @param {String} key - Variable name to get data from.
   * @category Variables
   * @example
   *  peek("fee")              // returns value in recipe variable fee (non mutable, based on the recipe .json file)
   *  peek("userDefined")      // given that the recipe does not have property userDefined returns value in processor variable userDefined (runtime, non persistant)
   *  peek("proc::fee")        // returns value in processor variable fee (runtime, non persistant)
   *  peek("root::fee")        // returns value in process root parent variable fee (runtime, non persistant)
   *  peek("parent::fee")      // returns value in process parent variable fee (runtime, non persistant)
   *  peek("local::fee")       // returns value in recipe local variable fee (runtime, persisted in the .vars.json file)
   *  peek("::fee")            // same as peek("local::fee")
   *  peek("btc::fee")         // returns value in btc recipe variable fee (non mutable, based on the recipe btc.json file)
   *  peek("btc::local::fee")  // returns value in btc recipe variable fee (based on the recipe .btc.vars.json file)
   *  peek("2")                // returns value of the second command path in the current process (non mutable)
   *  peek("root::3")          // returns value of the third command path in the root process (non mutable)
   */
  this.peek = function (p, key) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') peek [' + JSON.stringify(key) + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
    key = typeof key === 'undefined' ? global.hybrixd.proc[p.processID].data : key;

    let result = peekVar(p, key);

    if (result.e > 0) {
      return this.fail(p, result.v);
    } else {
      return this.next(p, 0, result.v);
    }
  };

  /**
   * Calculates numbers and variables. Mathematical calculations can be done with very large numbers.
   * @param {String} equation - String to calculate outcome of.
   * @example
   *  math('10*34+8-(3^4)')  // returns 267
   *  math('^2*5')           // returns the value of data to the power of two times five
   *  math('+')              // adds all the numbers in the data array
   *  math('10/3 .round')    // divide 10 by 3, and round the result: 3
   */
  // TODO split into math and redu
  this.math = function (p, equationOrOperator, operator) {
    let ydata = global.hybrixd.proc[p.processID].data;
    let equation;

    if (ydata instanceof Array) { // REDU(CE)
      if (typeof equationOrOperator === 'undefined') {
        operator = '+';
      } else {
        operator = equationOrOperator;
      }
      equation = ydata.join(operator);
    } else { // MATH
      const equationChar = equationOrOperator.trim().substr(0, 1);
      if (isNaN(equationChar) && equationChar !== '(') { // if the equation starts with a mathematical operator eg '+4' then prepend the data
        equation = ydata + equationOrOperator;
      } else {
        equation = equationOrOperator;
      }
    }

    if (DEBUG) { console.log(' [D] (' + p.parentID + ') math [' + equation + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }

    this.next(p, 0, mathCalc(equation, operator, ydata));
  };
  /**
   * Scan through the values of an array or object, and return values that pass the test.
   * @param {String} test       - Test to perform when scanning
   * @param {String} cumulative - Cumulative operation
   * @param {Number} [cinit=0]      - Initial value of cumulative counter
   * @example
   * scan('value>5')           // input: [1,2,3,4,5,6,7,8], output: [6,7,8]
   * scan('val>5')             // val is shorthand for value - input: [1,2,3,4,5,6,7,8], output: [6,7,8]
   * scan('cnt>5')             // input: [1,2,3,4,5,6,7,8], output: [4,5,6,7,8]
   * scan('cnt>20','+(v*2)')   // input: [2,4,6,8,10,12,14,16], output: [6,8,10,12,14,16]
   * scan('cnt>5','',3)        // input: [1,2,3,4,5,6,7,8], output: [3,4,5,6,7,8]
   * scan('cnt>1','+val.b')    // input: [{a:'a',b:1},{a:'b',b:1},{a:'c',b:1}], output: [{a:'b',b:1},{a:'c',b:1}]
   */
  this.scan = function (p, test, cumulative, cinit) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') scan [' + test + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
    let scanArray = global.hybrixd.proc[p.processID].data;
    if (Object.prototype.toString.call(scanArray) !== '[object Array]') {
      scanArray = [scanArray];
    }
    if (typeof cinit === 'undefined') { cinit = 0; } else { cinit = mathCalc('0+' + cinit); }
    let val;
    let cnt = '0';
    let out;
    let matches = [];
    let cumulstr = '';
    let teststr = '';
    if (!cumulative) { cumulative = '+val'; }
    for (let key = 0; key < scanArray.length; key++) {
      val = scanArray[key];
      value = val;
      cumulstr = String(cnt) + cumulative.replace(/(key|value|val|cnt)[.|a-z|A-Z]*/g, function (x) { return eval(x); });
      cnt = mathCalc(cumulstr);
      teststr = test.replace(/(key|value|val|cnt)[.|a-z|A-Z]*/g, function (x) { return eval(x); });
      if (mathCalc(teststr) === 'true') {
        matches.push(val);
      }
    }
    this.next(p, 0, matches);
  };

  /**
   * Create a sha256 hash from an input string.
   * @param {String} [method='sha256'] - Method to use for hashing, defaults to SHA256
   * @example
   *  hash()          // input: "this_is_my_data", returns hash: 5322fecfc92a5e3248a297a3df3eddfb9bd9049504272e4f572b87fa36d4b3bd
   *  hash('sha256')  // input: "this_is_my_data", returns hash: 5322fecfc92a5e3248a297a3df3eddfb9bd9049504272e4f572b87fa36d4b3bd
   *  hash('sha244')  // input: "this_is_my_data", returns hash: ??
   *  hash('djb2')    // input: "this_is_my_data", returns hash: ??
   */
  this.hash = function (p, method) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') hash [' + global.hybrixd.proc[p.processID].data + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
    let hash;
    let ydata = global.hybrixd.proc[p.processID].data;
    switch (method) {
      case 'djb2':
        hash = require('../../common/crypto/hashDJB2').hash(ydata);
        break;
      case 'sha244':
        hash = require('js-sha256').sha224(ydata);
        break;
      default:
        hash = require('js-sha256').sha256(ydata);
        break;
    }
    this.next(p, 0, hash);
  };

  /**
   * Change encoding of a string from one format to the other.
   * @category Array/String
   * @param {String} target   - Target encoding
   * @param {String} [source='base256'] - Source encoding
   * @example
   *  code('bin')             // input: 'woot', returns: '1110111011011110110111101110100'
   *  code('utf-8','base58')  // input: 'this_is_my_data', returns: '4FtePA9kj2RpFH4tBkPUt'
   *  code('hex','base58')    // input: '8BA9C1B4', returns: '4a4JJF'
   */
  this.code = function (p, source, target) {
    let input = global.hybrixd.proc[p.processID].data;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') code [' + input + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
    let output = baseCode.recode(source, target, input);
    this.next(p, 0, output);
  };

  /**
   * Change case of a string.
   * @category Array/String
   * @param {String} mode - Target encoding
   * @example
   *  case('upper')           // input: 'what is THIS?', returns: 'WHAT IS THIS?'
   *  case('lower')           // input: 'what is THIS?', returns: 'what is this?'
   *  case('words')           // input: 'what is THIS?', returns: 'What Is This?'
   *  case('first')           // input: 'what is THIS?', returns: 'What is this?'
   *  case('camel')           // input: 'what is THIS?', returns: 'whatIsThis?'
   *  case('inverse')         // input: 'what is THIS?', returns: 'WHAT IS this?'
   */
  this.case = function (p, mode) {
    let input = global.hybrixd.proc[p.processID].data;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') case [' + input + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
    let output;
    switch (mode) {
      case 'lower': output = input.toLowerCase(); break;
      case 'upper': output = input.toUpperCase(); break;
      case 'words': output = input.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      });
        break;
      case 'first': output = input.replace(/.+?([.?!]\s|$)/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      });
        break;
      case 'camel': output = input.replace(/(?:^\w|[A-Z]|\b\w)/g, function (letter, index) {
        return index === 0 ? letter.toLowerCase() : letter.toUpperCase();
      }).replace(/\s+/g, '');
        break;
      // case 'inverse':
      default:
        output = '';
        var j;
        for (let i = 0; i < input.length; i++) {
          j = input.substr(i, 1);
          if (j === j.toLowerCase()) {
            output = output + j.toUpperCase();
          } else {
            output = output + j.toLowerCase();
          }
        }
        break;
    }
    this.next(p, 0, output);
  };

  /**
   * Replace part or parts of a string.
   * @category Array/String
   * @param {String} needle - TODO
   * @param {String} replacement - TODO
   * @example
   *  repl('apples ')                           // input: 'Many apples for you.', returns: 'Many for you.'
   *  repl('apples','pears')                    // input: 'Many apples for you.', returns: 'Many pears for you.'
   *  repl(['apples','you'],['pears','me'])     // input: 'Many apples for you.', returns: 'Many pears for me.'
   *  repl(['apples','you'],'foo'])             // input: 'Many apples for you.', returns: 'Many foo for foo.'
   *  repl('o',['A','I'])                       // input: 'Many apples for you.', returns: 'Many apples fAr yIu.'
   *  repl()                                    // input: 'Many apples for you.', returns: 'Manyapplesfor ou.'
   */
  this.repl = function (p, srch, repl) {
    let input = global.hybrixd.proc[p.processID].data;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') repl [' + input + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
    let output;
    if (typeof srch === 'undefined') {
      srch = ' ';
      repl = '';
    }
    if (typeof repl === 'undefined') {
      repl = '';
    }
    if (typeof srch === 'string') {
      if (typeof repl === 'string') {
        output = input.split(srch).join(repl);
      } else {
        output = input;
        for (let i = 0; i < repl.length; i++) {
          output = output.replace(srch, repl[i]);
        }
      }
    } else {
      if (typeof repl === 'string') {
        output = input;
        for (let i = 0; i < srch.length; i++) {
          output = output.replace(srch[i], repl);
        }
      } else {
        output = functions.replaceBulk(input, srch, repl);
      }
    }
    this.next(p, 0, output);
  };

  /**
   * Poke default values to variables that are undefined.
   * @category Array/String
   * @param {Array} key-value collection
   * @example
   *  vars({'apples':'10','pears':'20'})         // Pokes values into $apples and $pears where they are 'undefined'
   *  vars({'apples':'10','pears':'20'},0)       // Pokes values into $apples and $pears where they are 0
   */
  this.vars = function (p, srch, comp) {
    let checkVar;
    if (typeof comp === 'undefined') { comp = 'undefined'; }
    for (let key in srch) {
      checkVar = peekVar(p, String(key));
      if (checkVar.e || (!checkVar.e && checkVar.v === comp)) {
        pokeVar(p, key, srch[key]);
      }
    }
    this.next(p, 0, global.hybrixd.proc[p.processID].data);
  };

  /**
   * Get the front of a string or array
   * @category Array/String
   * @param {Number} [size=1]  - size to use
   * @example
   * data 'abc'
   * head           // return 'a'
   * head 1         // return 'a'
   * head 2         // return 'ab'
   */
  this.head = function (p, size) {
    let ydata = global.hybrixd.proc[p.processID].data;
    if (typeof ydata === 'string') {
      this.next(p, 0, ydata.substr(0, size));
    } else {
      this.next(p, 0, ydata.splice(0, size));
    }
  };

  /**
   * Get the back of a string or array
   * @category Array/String
   * @param {Number} [size=1]  - size to use
   * @example
   * data 'abc'
   * tail           // return 'c'
   * tail 1         // return 'c'
   * tail 2         // return 'bc'
   */
  this.tail = function (p, size) {
    let ydata = global.hybrixd.proc[p.processID].data;
    if (typeof ydata === 'string') {
      this.next(p, 0, ydata.substr(ydata.length - size));
    } else {
      this.next(p, 0, ydata.splice(ydata.length - size, ydata.length));
    }
  };

  /**
   * Push new data into array or string.
   * @category Array/String
   * @param {Object} input            - Data to add to array
   * @param {Number} [offset=length]  - Offset to use
   * @example
   * push(0)             // add 0 to data array
   * push('woots!')      // input: ['A'], result: ['A','woots!']
   * push('woots!')      // input: 'A', result: 'Awoots!'
   * push('B',1)         // input: ['a','c'], result: ['a','B','c']
   * push(['B','E'],1)   // input: ['a','c'], result: ['a','B','E','c']
   * push('an',8)        // input: 'This is  apple', result: 'This is an apple'
   */
  this.push = function (p, input, pos) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') pushing data into array'); }
    let ydata = global.hybrixd.proc[p.processID].data;
    if (typeof ydata === 'string') {
      var str = true;
      ydata = ydata.split('');
    } else if (Object.prototype.toString.call(ydata) !== '[object Array]') {
      if (typeof ydata === 'undefined' || ydata === null) {
        ydata = [];
      } else {
        ydata = [ ydata ];
      }
    }
    if (typeof pos === 'undefined') {
      ydata.push(input);
    } else {
      if (pos.constructor === Array) {
        for (let i = pos.length - 1; i > -1; i--) {
          if (pos[i] < 0) {
            pos[i]++;
            if (pos[i] === 0) { pos[i] = ydata.length + 1; }
          }
        }
        pos = pos.sort();
        for (let i = pos.length - 1; i > -1; i--) {
          ydata.splice(pos[i], 0, input);
        }
      } else {
        if (pos < 0) {
          pos++;
          if (pos === 0) { pos = ydata.length + 1; }
        }
        ydata.splice(pos, 0, input);
      }
    }
    if (str) {
      ydata = ydata.join('');
    }
    global.hybrixd.proc[p.processID].data = ydata;
    this.next(p, 0, ydata);
  };

  /**
   * Drop elements from the start or end of an array or string.
   * (Reversed function of pick and push.)
   * @category Array/String
   * @param {Integer} offset - Amount of elements to delete from start
   * @param {Integer} ending - Amount of elements to include or trim from end
   * @example
   *  drop(5)      // drop from the left    input: 'this_is_my_data', output: 'is_my_data'
   *  drop(-5)     // drop from the right   input: 'this_is_my_data', output: 'this_is_my'
   *  drop(5,5)    // drop from both edges  input: 'this_is_my_data', output: 'is_my'
   */
  this.drop = function (p, offset, ending) {
    let ydata = global.hybrixd.proc[p.processID].data;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') drop [' + ydata + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
    let str;
    if (typeof ydata === 'string') {
      str = true;
      ydata = ydata.split('');
    }
    if (!isNaN(offset)) {
      let a;
      let b;
      if (offset < 0) {
        if (isNaN(ending)) {
          a = 0;
          b = ydata.length + offset;
        } else if (ending < 0) {
          // undefined
        } else {

        }
      } else {
        if (isNaN(ending)) {
          a = offset;
          b = ydata.length;
        } else if (ending < 0) {
          // undefined
        } else {
          a = offset;
          b = ydata.length - ending;
        }
      }

      ydata = ydata.slice(a, b);
    }
    if (str) {
      ydata = ydata.join('');
    }
    this.next(p, 0, ydata);
  };

  /**
   * Exclude elements from an array or input string based on their value.
   * Jump to a target based on success or failure.
   * (Reversed function of filt.)
   * @category Array/String
   * @param {String} value - Amount of elements to delete from start
   * @example
   *  excl('g')        // matching exclude           input: ['g','l','o','v','e','s'], output: ['l','o','v','e','s']
   *  excl(['g','s'])  // multiple exclude           input: ['g','l','o','v','e','s'], output: ['l','o','v','e']
   *  excl('g',2)      // matching exclude, jump two places
   */
  this.excl = function (p, value, success, failure) {
    let ydata = global.hybrixd.proc[p.processID].data;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') excl [' + ydata + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
    if (typeof ydata === 'string') {
      var str = true;
      ydata = ydata.split('');
    }
    let result = excludeEntries(ydata, value);
    if (str) {
      ydata = result.v.join('');
    } else {
      ydata = result.v;
    }
    if (result.n) {
      this.jump(p, isNaN(success) ? 1 : success || 1, ydata);
    } else {
      this.jump(p, isNaN(failure) ? 1 : failure || 1, ydata);
    }
  };

  /**
   * Remove all duplicate elements from an array, leaving only unique entries.
   * @category Array/String
   * @example
   *  uniq()           // input: ['g','l','o','l','l','s','s'], output: ['g','l','o','s']
   *  uniq(2)          // input: ['g','l','o','l','l','s','s'], output: ['g','l','l','o','s','s'] - two or less unique entries
   */
  this.uniq = function (p, amount) {
    let ydata = global.hybrixd.proc[p.processID].data;
    amount = amount || 1;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') uniq [' + ydata + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
    let str;
    if (typeof ydata === 'string') {
      str = true;
      ydata = ydata.split('');
    }
    let result = [];
    let sorted = ydata.sort();
    for (let i = 0; i < ydata.length; i++) {
      let entries = 0;
      for (let j = 0; j < ydata.length; j++) {
        if (ydata[i] === sorted[j]) {
          if (entries >= amount) {
            ydata.splice(i, 1);
          }
          entries++;
        }
      }
    }
    if (str) {
      ydata = ydata.join('');
    }
    this.next(p, 0, ydata);
  };

  /**
   * TODO: Keep all duplicate elements in an array of which there are many, removing all single entries.
   * @category Array/String
   * @example
   *  many()           // input: ['g','l','o','l','l','s','s'], output: ['l','l','l','s','s']
   *  many(3)          // input: ['g','l','o','l','l','s','s'], output: ['l','l','l'] - more than 3 entries
   */
  this.many = function (p, amount) {
    let ydata = global.hybrixd.proc[p.processID].data;
    amount = amount || 1;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') many [' + ydata + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
    let str;
    if (typeof ydata === 'string') {
      str = true;
      ydata = ydata.split('');
    }
    let result = [];
    for (let i = 0; i < ydata.length; i++) {
      let entries = 0;
      for (let j = 0; j < ydata.length; j++) {
        if (ydata[i] === ydata[j]) {
          entries++;
        }
      }
      if (entries > amount) {
        result.push(ydata[i]);
      }
    }
    if (str) {
      result = result.join('');
    }
    this.next(p, 0, result);
  };

  /**
   * Filter all specified elements from an array, removing all other entries.
   * (Reversed function of excl.)
   * @category Array/String
   * @example
   *  filt(['o','g'])           // input: ['g','l','o','l','l','s','s'], output: ['g','o']
   */
  this.filt = function (p, value) {
    let ydata = global.hybrixd.proc[p.processID].data;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') filt [' + ydata + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
    let str;
    if (typeof ydata === 'string') {
      str = true;
      ydata = ydata.split('');
    }
    ydata = filterThese(ydata, value);
    if (str) {
      ydata = ydata.join('');
    }

    this.next(p, 0, ydata);
  };

  /**
   * Fuse or insert new data onto array or string.
   * @category Array/String
   * @param {Object} input    - Data to add to array
   * @param {Number} [offset=length]   - Offset to use
   * @param {Number} [delete=0]   - Entries to delete
   * @example
   * fuse(0)             // add 0 to data array
   * fuse('woots!')      // input: 'A', result: 'Awoots!'
   * fuse('B',1)         // input: ['a','c'], result: ['a','B','c']
   * fuse(['B','E'],1)   // input: ['a','c'], result: ['a','B','E','c']
   * fuse('an',8)        // input: 'This is  apple', result: 'This is an apple'
   */
  this.fuse = function (p, input, pos, del) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') fusing data into array'); }
    let ydata = global.hybrixd.proc[p.processID].data;
    let str;
    if (typeof ydata === 'string') {
      str = true;
      ydata = ydata.split('');
    } else if (Object.prototype.toString.call(ydata) !== '[object Array]') {
      if (typeof ydata === 'undefined' || ydata === null) {
        ydata = [];
      } else {
        ydata = [ ydata ];
      }
    }
    if (typeof pos === 'undefined') {
      if (input instanceof Array) {
        for (let i = 0; i < input.length; i++) {
          ydata.push(input[i]);
        }
      } else {
        ydata.push(input);
      }
    } else {
      if (del < 0) { pos = pos + del; del = -del; }
      if (input instanceof Array) {
        ydata.splice(pos, del, input[0]);
        for (let i = 1; i < input.length; i++) {
          ydata.splice(pos + i, 0, input[i]);
        }
      } else {
        ydata.splice(pos, del, input);
      }
    }
    if (str) {
      ydata = ydata.join('');
    }
    global.hybrixd.proc[p.processID].data = ydata;
    this.next(p, 0, ydata);
  };

  /**
   * Pick elements from an array or input string. Indexes, a range or selection array of indexes can be entered.
   * @category Array/String
   * @param {String} [start] - TODO
   * @param {String} [end] - TODO
   * @example
   * pick            // input: ['A','B','C'], output: 'A'
   * pick 1          // input: ['A','B','C'], output: 'B'
   * pick -1         // input: ['A','B','C'], output: 'C'
   * pick 1,3        // input: ['A','B','C'], output: ['B','C']
   * pick [1]        // input: ['A','B','C'], output: ['B']
   * pick [0,2]      // input: ['A','B','C'], output: ['A','C']
   */
  this.pick = function (p, start, end) {
    let ydata = global.hybrixd.proc[p.processID].data;
    if (typeof start === 'number' && start < 0) { start = ydata.length + start; }
    if (typeof end === 'number' && end < 0) { end = ydata.length + end; }
    let result;
    if (typeof start === 'undefined' && typeof end === 'undefined') { // first elements
      result = ydata[0];
    } else if (typeof end === 'undefined') { // single index or selection
      if (typeof start === 'number') {
        result = ydata[start];
      } else {
        result = [];
        for (let index of start) {
          if (index >= 0) {
            result.push(ydata[index]);
          } else {
            result.push(ydata[ydata.length + index]);
          }
        }
        if (typeof ydata === 'string') {
          result = result.join('');
        }
      }
    } else { // range
      if (typeof ydata === 'string') {
        result = ydata.substring(start, end);
      } else {
        result = ydata.splice(start, end - start);
      }
    }

    this.next(p, 0, result);
  };

  /**
   * Take elements from an array or input string.
   * @category Array/String
   * @param {String} start - TODO
   * @param {String} [length] - TODO
   * @example
   * take 2           // input: 'abcdefg', output: 'cdefg'
   * take 2 2         // input: 'abcdefg', output: 'cd'
   * take -2          // input: 'abcdefg', output: 'abcde'
   * take -2 2        // input: 'abcdefg', output: 'de'
   */
  this.take = function (p, start, length) {
    let ydata = global.hybrixd.proc[p.processID].data;
    let end;
    if (start >= 0 && typeof length === 'undefined') {
      end = ydata.length;
    } else if (start < 0 && typeof length === 'undefined') {
      end = ydata.length + start;
      start = 0;
    } else if (start >= 0) {
      end = start + length;
    } else {
      end = ydata.length + start - length;
      start = ydata.length + start;
    }
    let result;
    if (typeof ydata === 'string') {
      result = ydata.substring(start, end);
    } else {
      result = ydata.slice(start, end);
    }
    this.next(p, 0, result);
  };

  /**
   * Trim elements from left and or right side
   * @category Array/String
   * @param {String} [leftOrBothTrim=' '] - TODO
   * @param {String} [rightTrim=leftOrBothTrim] - TODO
   * @example
   * trim            // input: "  hello world  ", output: 'hello world'
   * trim '_'        // input: "__hello_world___", output: 'hello_world'
   * trim ['_','-']  // input: "_-_hello-_world_-_-_", output: 'hello-_world'
   * trim ['_','-'] '_'  // input: "_-_hello-_world_-_-_", output: 'hello-_world_-_-'
   */
  this.trim = function (p, leftOrBothTrim, rightTrim) {
    let ydata = global.hybrixd.proc[p.processID].data;
    if (typeof leftOrBothTrim === 'undefined') { leftOrBothTrim = [' ']; }
    if (typeof rightTrim === 'undefined') { rightTrim = leftOrBothTrim; }
    let start;
    let end;
    for (start = 0; start < ydata.length && (ydata[start] === leftOrBothTrim || leftOrBothTrim.indexOf(ydata[start]) !== -1); ++start) {}
    for (end = ydata.length - 1; end >= 0 && (ydata[end] === rightTrim || rightTrim.indexOf(ydata[end]) !== -1); --end) {}
    let result;
    if (typeof ydata === 'string') {
      result = ydata.substring(start, end + 1);
    } else {
      result = ydata.slice(start, end - start);
    }

    this.next(p, 0, result);
  };

  /**
   * Pull elements from an array or input string. Indexes, a range or selection array of indexes can be entered.
   * @category Array/String
   * @param {String} [start] - TODO
   * @param {String} [end] - TODO
   * @example
   * pull            // input: ['A','B','C'], output: ['B',C]
   * pull 1          // input: ['A','B','C'], output: ['A','C']
   * pull -1         // input: ['A','B','C'], output: ['A','B']
   * pull 1,3        // input: ['A','B','C'], output: ['A']
   * pull [1]        // input: ['A','B','C'], output: ['A','C']
   * pull [0,2]      // input: ['A','B','C'], output: ['B']
   */
  this.pull = function (p, start, end) {
    let ydata = global.hybrixd.proc[p.processID].data;
    if (typeof start === 'number' && start < 0) { start = ydata.length + start; }
    if (typeof end === 'number' && end < 0) { end = ydata.length + end; }

    let result;
    if (typeof start === 'undefined' && typeof end === 'undefined') { // drop first element
      result = ydata.slice(1);
    } else if (typeof end === 'undefined') { // single index or selection
      if (typeof start === 'number') {
        if (typeof ydata === 'string') {
          result = ydata.substring(0, start) + ydata.substring(start + 1);
        } else {
          ydata.splice(start, 1);
          result = ydata;
        }
      } else {
        result = [];
        for (let i = 0; i < ydata.length; ++i) {
          if (start.indexOf(i) === -1 && start.indexOf(ydata.length + i) === -1) {
            result.push(ydata[i]);
          }
        }
        if (typeof ydata === 'string') {
          result = result.join('');
        }
      }
    } else { // range
      if (typeof ydata === 'string') {
        result = ydata.substring(0, start) + ydata.substring(end);
      } else {
        ydata.splice(start, end - start);
        result = ydata;
      }
    }

    this.next(p, 0, result);
  };

  /**
   * Sort data by using a certain method.
   * @category Array/String
   * @param {String} method - Array of methods to employ.
   * @example
   *  sort()                                          // input: 'BADEFC', sorts the object ascending by value: 'ABCDEF'
   *  sort('desc')                                    // input: [10,8,5,9], sorts the object descending by value: [10,9,8,5]
   *  sort(['val','asc'])                             // input: {'a':'z','b':'x','c':'y'}, sorts the object ascending by value: [{'b':'x'},{'c':'y'},{'c':'z'}]
   *  sort(['key','desc'])                            // input: {'a':2,'b':1,'c':3}, sorts the object descending by key:  [{'c':3},{'b':1},{'a':2}]
   *  sort(['val','num','asc'])                       // input: {'a':1,'b':10,'c':3}, sorts the object ascending by numeric value:  [{'a':1},{'c':3},{'b':10}]
   *  sort('.b')                                      // input: [{'a':4,'b':'B'},{'a':2,'b':'A'}], sorts the array by object key 'b': [{'a':2,'b':'A'},{'a':4,'b':'B'}]
   */
  this.sort = function (p, method) {
    // TODO: return progress data during sorting (for long lists!)
    let object = global.hybrixd.proc[p.processID].data;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') sort [' + object + '] in step ' + (global.hybrixd.proc[p.parentID].step + 1) + ' of ' + (global.hybrixd.proc[p.parentID].steps + 1)); }
    // set default sorting method if unspecified
    if (typeof method === 'string') { method = [method]; }
    function intSort (a, b) { return a - b; }
    function sortAssocObject (list, reverse, sortInteger, sortByKey) {
      let sortable = [];
      let ind = sortByKey ? 0 : 1;
      for (let key in list) {
        sortable.push([key, list[key]]);
      }
      if (sortInteger) {
        sortable.sort(function (a, b) {
          return a[ind] - b[ind];
        });
      } else {
        sortable.sort(function (a, b) {
          return (String(a[ind]) === String(b[ind]) ? 0 : (String(a[ind]) > String(b[ind]) ? 1 : -1));
        });
      }
      if (reverse) { sortable.reverse(); }
      let orderedList = [];
      let listObj;
      for (let i = 0; i < sortable.length; i++) {
        listObj = {};
        listObj[String(sortable[i][0])] = sortable[i][1];
        orderedList.push(listObj);
      }
      return orderedList;
    }
    function sortArrayByObjKey (arr, key, reverse, sortInteger) {
      // make key value index
      let unordered = {};
      for (let i in arr) {
        if (typeof arr[i][key] !== 'undefined') {
          unordered[arr[i][key]] = i;
        }
      }
      // sort object list
      let ordered = [];
      let cnt = 0;
      let list;
      if (sortInteger) {
        list = Object.keys(unordered).sort(intSort);
      } else {
        list = Object.keys(unordered).sort();
      }
      list.forEach((key) => {
        ordered[cnt] = arr[unordered[key]];
        cnt++;
      });
      if (reverse) { ordered = ordered.reverse(); }
      return ordered;
    }
    let sortDesc = 0;
    let sortByKey = 0;
    let sortByObj = 0;
    let sortInteger = 0;
    let isArray = 0;
    let isString = 0;
    let methodCase;
    let objName;
    if (Object.prototype.toString.call(object) === '[object Array]') {
      isArray = 1;
    } else if (typeof object === 'string') {
      isArray = 1;
      isString = 1;
      object = object.split('');
    }
    for (let i = 0; i < method.length; i++) {
      if (method[i].substr(0, 1) === '.') {
        sortByObj = 1;
        methodCase = 'obj';
        objName = method[i].substr(1);
      } else {
        methodCase = method[i];
      }
      switch (methodCase) {
        case 'val':
          sortByKey = 0;
          sortByObj = 0;
          break;
        case 'key':
          sortByKey = 1;
          sortByObj = 0;
          break;
        case 'num':
          sortInteger = 1;
          break;
        case 'idx':
          sortInteger = 0;
          break;
        case 'obj':
          sortByKey = 0;
          sortByObj = 1;
          break;
        case 'asc':
          sortDesc = 0;
          break;
        case 'desc':
          sortDesc = 1;
          break;
      }
    }
    if (sortDesc) {
      if (isArray) {
        if (sortByObj) {
          object = sortArrayByObjKey(object, objName, 1, sortInteger);
        } else {
          object = sortInteger ? object.sort(intSort).reverse() : object.sort().reverse();
        }
      } else {
        object = sortAssocObject(object, 1, sortInteger, sortByKey);
      }
    } else {
      if (isArray) {
        if (sortByObj) {
          object = sortArrayByObjKey(object, objName, 0, sortInteger);
        } else {
          object = sortInteger ? object.sort(intSort) : object.sort();
        }
      } else {
        object = sortAssocObject(object, 0, sortInteger, sortByKey);
      }
    }
    if (isString) {
      object = object.join('');
    }
    this.next(p, 0, object);
  };

  /**
   * Loop back to position or label based on criteria.
   * @category Flow
   * @param {String} position         - Position to loop back to.
   * @param {String} variable         - Variable to store loop count.
   * @param {String} condition        - Condition that keeps loop going.
   * @param {String} [initvalue='0']  - Value to initialize loop.
   * @param {String} [stepvalue='+1'] - Optional: How variable is iterated.
   * @example
   * loop(@loopStart,'loopCount','<5')             // Loops back to loopStart five times
   * loop(@loopStart,'loopCount','<10','0','+1')   // Loops back to loopStart ten times
   */
  this.loop = function (p, jumpTo, loopVar, condition, initVal, stepVal) {
    if (typeof initVal === 'undefined') {
      initVal = '0';
    }
    if (typeof stepVal === 'undefined') {
      stepVal = '+1';
    }
    let loopVal = peekVar(p, loopVar);
    if (loopVal.e > 0) {
      loopVal = initVal;
    } else {
      loopVal = mathCalc(loopVal.v + stepVal);
    }
    if (mathCalc(loopVal + condition) === 'true') {
      if (DEBUG) { console.log(' [D] (' + p.parentID + ') loop to ' + jumpTo + ' in ' + loopVar + ' is ' + loopVal + ' while ' + condition + ' start ' + initVal + ' step ' + stepVal); }
      pokeVar(p, loopVar, loopVal);
      this.jump(p, isNaN(jumpTo) ? 1 : jumpTo || 1, global.hybrixd.proc[p.processID].data);
    } else {
      if (DEBUG) { console.log(' [D] (' + p.parentID + ') loop to ' + jumpTo + ' in ' + loopVar + ' ended'); }
      pokeVar(p, loopVar, initVal);
      this.next(p, 0, global.hybrixd.proc[p.processID].data);
    }
  };

  /**
   * Initiates a client stack program. This stack can be filled using step and executed using exec.
   * @category Interface
   * @example
   * init()     // Initiates a hybrixd.Interface stack program.
   */
  this.init = function (p) {
    this.next(p, 0, ['init']);
  };

  /**
   * Add a step to a client stack program. Executed using exec.
   * @category Interface
   * @param {String} key - Variable name to get data from.
   * @example
   * TODO
   */
  this.step = function (p, v1, v2, v3) {
    let args = Array.prototype.slice.call(arguments);
    let labelOrStep = args[1];
    let steps;
    let label;
    if (typeof labelOrStep !== 'string' || this.hasOwnProperty(labelOrStep)) {
      label = '';
      steps = args.slice(1);
    } else {
      label = labelOrStep;
      steps = args.slice(2);
    }
    let program = global.hybrixd.proc[p.processID].data;
    this.next(p, 0, appendProgram(program, label, steps));
  };

  /**
   * Execute a client stack program.
   * @category Interface
   * @example
   * TODO
   */
  this.exec = function (p, onSuccess, onError, xdata) {
    let ydata = typeof xdata === 'undefined' && typeof xdata !== 'number' ? global.hybrixd.proc[p.processID].data : xdata;
    let dataCallback = (data) => {
      global.hybrixd.proc[p.processID].data = data;
      this.jump(p, isNaN(onSuccess) ? 1 : onSuccess || 1);
    };
    let errorCallback = (error) => {
      if (typeof onError === 'undefined') {
        this.next(p, 1, error);
      } else {
        global.hybrixd.proc[p.processID].data = error;
        this.jump(p, isNaN(onError) ? 1 : onError || 1);
      }
    };
    let progressCallback = () => {};
    hybrix.sequential(ydata, dataCallback, errorCallback, progressCallback);
  };

  /**
   * TODO
   * @category Meta
   * @param {String} variable      -  Variable to read/write to.
   * @param {String} qrtz command  -  A string containg the Qrtz command.
   * @param {Object} a, b, c, etc. -  Arguments to be passed to the Qrtz command.
   * @example
   */
  this.qrtz = function (p) {
    let processStepIdSplit = p.processID.split('.');
    let rootID = processStepIdSplit[0];
    let rootProcess = global.hybrixd.proc[rootID];

    const recipe = rootProcess.recipe;
    if (typeof recipe === 'object' && recipe != null && recipe.hasOwnProperty('quartz')) {
      this.next(p, 0, Object.keys(recipe.quartz));
    } else {
      this.next(p, 0, []);
    }
  };

  /**
   * Performs a data command using a specific variable. The data buffer is left untouched.
   * @category Process
   * @param {String} variable      -  Variable to read/write to.
   * @param {String} qrtz command  -  A string containg the Qrtz command.
   * @param {Object} a, b, c, etc. -  Arguments to be passed to the Qrtz command.
   * @example
   * with("someVariable","math","+1")                              // Increment $someVariable by +1.
   * with("someVariable",["math","+1"])                            // Increment $someVariable by +1. (same as above, different notation)
   * with("someVariable",["math","+1"],["math","+100"],["atom"])   // Increment $someVariable by +1, +100, then convert to atomic units.
   */
  this.with = function (p, variable, command, properties) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') with variable ' + variable + ' doing ' + command + ' ' + args); }
    let result = peekVar(p, variable);
    if (result.e > 0) {
      result.v = undefined;
    }
    let subprocesses = [];
    if (typeof command === 'string') {
      let args = '';
      for (let i = 3; i < Object.keys(arguments).length; i++) {
        args = args + ' ' + JSON.stringify(arguments[String(i)]);
      }
      subprocesses.push(command.substr(0, 4) + args);
      subprocesses.push('done');
    } else {
      if (Object.keys(arguments).length > 10) {
        this.fail(p, 'with error: contains more than 8 commands! (Hint: split your code into multiple lines!)');
      } else {
        for (let j = 2; j < Object.keys(arguments).length; j++) {
          command = arguments[String(j)];
          let args = '';
          for (let i = 1; i < command.length; i++) {
            args = args + ' ' + JSON.stringify(command[i]);
          }
          subprocesses.push(command[0].substr(0, 4) + args);
        }
        subprocesses.push('done');
      }
    }
    // fire the Qrtz-language program into the subprocess queue
    let processStepIdSplit = p.processID.split('.');
    let rootID = processStepIdSplit[0];
    let rootProcess = global.hybrixd.proc[rootID];
    // TODO make proper childof p.processID+'.'
    let childPID = scheduler.init(p.processID + '.', {data: result.v, sessionID: rootProcess.sessionID, recipe: rootProcess.recipe});
    scheduler.fire(childPID, subprocesses);
    readData(p, childPID, 0, (p, err, xdata) => {
      if (err) {
        this.fail(p, err);
      } else {
        let result = pokeVar(p, variable, xdata);
        if (result.e > 0) {
          this.fail(p, result.v);
        } else {
          this.next(p, 0, global.hybrixd.proc[p.processID].data);
        }
      }
    });
  };
  /**
   * Create signing keys
   * @category Cryptography
   * @param {String} secret - The secret key to recreate a public key from.
   * @example
   * keys                              // Generate a public,secret key pair.
   * keys 'node'                       // Reproduce keys that belong to the node.
   * keys 'HEX_ENTROPY_OF_128_CHARS'   // Recreate the public key from a secret key.
   */
  this.keys = function (p, secret) {
    if (typeof secret === 'undefined') {
      const keys = nacl.crypto_sign_keypair();
      const publicKey = nacl.to_hex(keys.signPk);
      const secretKey = nacl.to_hex(keys.signSk);
      this.next(p, 0, {public: publicKey, secret: secretKey}); // create keypair
    } else if (secret === 'string' && secret === 'node') {
      this.next(p, 0, {public: global.hybrixd.node.publicKey, secret: global.hybrixd.node.secretKey}); // create keypair
    } else if (secret === 'string' && secret.length === 128) {
      secret = nacl.from_hex(secret);
      const keys = nacl.sign.keyPair.fromSecretKey(secret).publicKey;
      const publicKey = nacl.to_hex(keys.signPk);
      const secretKey = nacl.to_hex(keys.signSk);
      this.next(p, 0, {public: publicKey, secret: secretKey}); // public key from secret key
    } else {
      this.fail(p, 1, 'Keys error');
    }
  };
  /**
   * Sign a message with a secret key or verify the signature for a public key.
   * @category Cryptography
   * @param {String} key - The secret key ot sign with of the public key to verify
   * @param {Boolean|String} [signature] - Indication to create a detached signature or a detached signature to verify.
   * @param {Boolean|String} [onSuccess] - Amount of instructions lines to jump on success.
   * @param {Boolean|String} [onFail] - Amount of instructions lines to jump on success.
   * @example
   * sign secretKey           // sign the message using the secret key
   * sign secretKey true      // create a signature for the message
   * sign publicKey 1 2          // open the message using the secret key and jump accordingly.
   * sign publicKey signature // verify the signature for the message and jump accordingly.
   */
  this.sign = function (p, key, signatureOrOnSuccess, onSuccessOrOnFail, onFail) {
    let message = global.hybrixd.proc[p.processID].data;
    if (typeof message === 'string' && typeof key === 'string' && key.length === 64) {
      let publicKey = nacl.from_hex(key);
      message = nacl.from_hex(message);
      if (typeof signatureOrOnSuccess === 'string') {
        let verified = nacl.crypto_sign_verify_detached(message, signatureOrOnSuccess, publicKey);
        if (verified) {
          this.jump(p, onSuccessOrOnFail || 1, message); // jump onSuccess if message is verified for public key
        } else {
          this.jump(p, onFail || 1, message); // jump onFail
        }
      } else {
        let unpackedMessage = nacl.crypto_sign_open(message, publicKey);
        if (unpackedMessage === null) {
          message = nacl.to_hex(message);
          this.jump(p, onSuccessOrOnFail || 1, message); // jump onFail
        } else {
          unpackedMessage = nacl.to_hex(unpackedMessage);
          unpackedMessage = baseCode.recode('hex', 'utf-8', unpackedMessage);
          this.jump(p, signatureOrOnSuccess || 1, unpackedMessage); // jump onSuccess if message can be decoded by puclic key
        }
      }
    } else if (typeof message === 'string' && typeof key === 'string' && key.length === 128) {
      let secret = nacl.from_hex(key);
      message = baseCode.recode('utf-8', 'hex', message);
      message = nacl.from_hex(message);
      if (signatureOrOnSuccess) {
        message = nacl.crypto_sign_detached(message, secret);
      } else {
        message = nacl.crypto_sign(message, secret);
      }
      message = nacl.to_hex(message);
      this.next(p, 0, message);
    } else {
      this.fail(p, 1, 'Sign error');
    }
  };
  /**
   * Return information about the hybrix node
   * @category Cryptography
   * @param {String} request - The information you want to request
   * @example
   * node                              // Returns the public key / node ID
   */
  this.node = function (p, request) {
    let info = null;
    switch (request) {
      case 'peers':
        info = 'NOT YET SUPPORTED!';
        break;
      default:
        info = global.hybrixd.node.publicKey;
        break;
    }
    this.next(p, 0, info);
  };

  /**
   * Test the data against the regex pattern
   * @category String
   * @param {String} pattern - the regex pattern
   * @example
   * data 'applepie'
   * regx '/^apple/' 1 2
   * done 'Match'
   * done 'No Match'
   */
  this.regx = function (p, pattern, onMatch, onNoMatch) {
    const flags = '';
    const pattern2 = pattern;
    const regex = new RegExp(pattern2, flags);
    if (regex.test(global.hybrixd.proc[p.processID].data)) {
      this.jump(p, onMatch || 1, global.hybrixd.proc[p.processID].data);
    } else {
      this.jump(p, onNoMatch || 1, global.hybrixd.proc[p.processID].data);
    }
  };
};

exports.Quartz = Quartz; // initialize a new process
