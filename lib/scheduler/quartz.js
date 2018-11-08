var fs = require('fs');
var router = require('../router');
var modules = require('../modules');
var scheduler = require('../scheduler');
var functions = require('../functions'); // only required for   procinfo[0] = functions.implode('.', pieces);
var APIqueue = require('../APIqueue');
var Decimal = require('../../common/crypto/decimal-light.js');

var Hybridd = require('../../interface/hybridd.interface.nodejs');
var hybridd = new Hybridd.Interface({http: require('http')});

// process ID decomposition
var procpart = function procpart (processID) {
  var procsplit = processID.split('.');
  var pieces = {};
  var procinfo = [];
  procinfo[0] = '';
  // store parent in first element
  for (var i = 0; i < procsplit.length - 1; i += 1) {
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

function tranOperator (p, expression, data, lhs) {
  expression = expression.trim();
  if (expression.startsWith('+')) { // use + to add numbers
    if (!lhs.valid) { return lhs; }
    var rhs = tranExpression(p, expression.substr(1), data);
    if (rhs.valid) {
      return {valid: true, data: Number(lhs.data) + Number(rhs.data)};
    } else {
      return {valid: false, data: data};
    }
  } else if (expression.startsWith('/')) { // use + to add numbers
    if (!lhs.valid) { return lhs; }
    var rhs = tranExpression(p, expression.substr(1), data);
    if (rhs.valid) {
      return {valid: true, data: Number(lhs.data) / Number(rhs.data)};
    } else {
      return {valid: false, data: data};
    }
  } else if (expression.startsWith('*')) { // use * to multiply numbers
    if (!lhs.valid) { return lhs; }
    var rhs = tranExpression(p, expression.substr(1), data);
    if (rhs.valid) {
      return {valid: true, data: Number(lhs.data) * Number(rhs.data)};
    } else {
      return {valid: false, data: data};
    }
  } else if (expression.startsWith('-')) { // use - to deduct numbers
    if (!lhs.valid) { return lhs; }
    var rhs = tranExpression(p, expression.substr(1), data);
    if (rhs.valid) {
      return {valid: true, data: Number(lhs.data) - Number(rhs.data)};
    } else {
      return {valid: false, data: data};
    }
  } else if (expression.startsWith('|')) { // use | for fall back values
    if (lhs.valid && lhs.data) { return lhs; }
    var rhs = tranExpression(p, expression.substr(1), data);
    return rhs.valid ? rhs : lhs;
  } else {
    return {valid: false, data: data};
  }
}

function tranExpression (p, expression, data) {
  expression = expression.trim();
  var lhs;
  var value;
  var c = expression.substr(0, 1);
  var valid = true;
  if (c === '.') { // .123 or .property
    if ('0123456789'.indexOf(expression.substr(1, 1)) !== -1) { // Number  .123
      lhs = /\.\d+/.exec(expression)[0];
      value = Number(lhs);
    } else { // Property
      lhs = /\.[\w\-\.]+/.exec(expression)[0];
      var property = chckString(p, lhs, data);
      valid = property.valid;
      value = property.data;
    }
  } else if (c === '"') { // " String
    lhs = /\"[^"\\]|\\.\"/.exec(expression)[0];
    value = lhs;
  } else if (c === "'") { // ' String
    lhs = /\'[^'\\]|\\.\'/.exec(expression)[0];
    value = lhs;
  } else if ('0123456789'.indexOf(c) !== -1) { // Number 123.232
    lhs = /\d+\.?\d*/.exec(expression)[0];
    value = Number(lhs);
  } else {
    var match = /[a-zA-Z\_]+\w*/.exec(expression);
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
  var iterator = data;
  for (var i = 0, len = path.length; i < len; ++i) {
    if (iterator !== null && typeof iterator === 'object') {
      if (iterator.constructor === Array) { // Array object
        if (path[i] === '') { // []  operator     [{a:1},{a:2}]  '[].a' => [1,2]
          var resultArray = [];
          var subPath = path.slice(i + 1);
          for (var index = 0; index < iterator.length; ++index) {
            var r = tranPropertyPath(p, subPath, iterator[index]);
            if (!r.valid) { return {valid: false, data: data}; }
            resultArray.push(r.data);
          }
          return {valid: true, data: resultArray}; // return, the rest of the path is taken care of by the loop
        } else {
          var index = Number(path[i]);
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
  var path = property.substr(1).replace(/\]/g, '').replace(/\[/g, '.').split('.'); // ".foo.bar[3][5].x" -> ["foo","bar","3","5","x"]
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
      var newData = [];
      for (var index, len = property.length; index < len; ++index) {
        var chckIndex = chckVar(p, property[index], data);
        if (!chckIndex.valid) { return {valid: false, data: data}; }
        newData[key] = chckIndex.data;
      }
      return {valid: true, data: newData};
    } else { // If Dictionary
      var newData = {};
      for (var key in property) {
        var chckKey = chckVar(p, property[key], data);
        if (!chckKey.valid) { return {valid: false, data: data}; }
        newData[key] = chckKey.data;
      }
      return {valid: true, data: newData};
    }
  } else {
    return {valid: false, data: data};
  }
}

function mathCalc (equation, operator, data) {
  if (equation.length > 0) {
    function stricteval (equation) { return eval(equation); }

    equation = '(new Decimal(' + String(equation)
      .replace(/\(/g, 'new Decimal(')
      .replace(/\>\=/g, ').greaterThanOrEqualTo(')
      .replace(/\<\=/g, ').lessThanOrEqualTo(')
      .replace(/\+\-/g, ').minus(')
      .replace(/\>/g, ').greaterThan(')
      .replace(/\</g, ').lessThan(')
      .replace(/\=/g, ').equals(')
      .replace(/\^/g, ').toPower(')
      .replace(/\*/g, ').times(')
      .replace(/\//g, ').dividedBy(')
      .replace(/\+/g, ').plus(')
      .replace(/\-/g, ').minus(') + ').toString());';

    // add quotes to all numbers
    equation = equation.replace(/[+-]?([0-9]*[.])?[0-9]+/g, function (str) {
      return "'" + str + "'";
    });

    // make sure equation does not reference itself
    equation = equation.replace('equation', '0');
    return stricteval(equation, data);
  } else { return '0'; }
}

var Quartz = function () {
// TO BE REMOVED
  this.func = function (p, module, funcname, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') function call to module ' + module + ' -> ' + funcname); }
    if (typeof ydata !== 'object') { ydata = {}; }
    ydata.processID = p.processID;
    modules.module[module].main[ funcname ](ydata);
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
      global.hybridd.proc[p.processID].err = (typeof err === 'undefined' ? 1 : err);
      global.hybridd.proc[p.processID].busy = false;
      global.hybridd.proc[p.processID].progress = 1;
      global.hybridd.proc[p.processID].stopped = Date.now();
      global.hybridd.proc[p.processID].data = xdata;
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
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    console.log('[D] (' + p.parentID + ') dump: ' + JSON.stringify(ydata));
    this.next(p, 0, ydata);
  };

  /**
 * Wait a specified amount of time.
 * @param {Number} millisecs - Amount of milliseconds to wait.
 * @category Process
 * @example
 * wait(2000)           // wait for two seconds
 */
  this.wait = function (p, millisecs) {
    var ydata = global.hybridd.proc[p.processID].data;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') waiting at ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }

    if (global.hybridd.proc[p.parentID].timeout > 0 && millisecs < global.hybridd.proc[p.parentID].timeout && global.hybridd.proc[p.parentID].timeout !== -1) {
      global.hybridd.proc[p.parentID].timeout = global.hybridd.proc[p.parentID].timeout + millisecs;
    }
    if (global.hybridd.proc[p.processID].timeout > 0 && millisecs < global.hybridd.proc[p.processID].timeout && global.hybridd.proc[p.processID].timeout !== -1) {
      global.hybridd.proc[p.processID].timeout = global.hybridd.proc[p.processID].timeout + millisecs;
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
    if (global.hybridd.proc[p.processID].sessionID === 1 || global.hybridd.proc[p.processID].sessionID === global.hybridd.proc[processID].sessionID) {
      if (typeof global.hybridd.proc[processID] !== 'undefined') {
        if (global.hybridd.proc[processID].progress >= 1 || global.hybridd.proc[processID].stopped > 1) {
          this.next(p, global.hybridd.proc[processID].err, {processID: processID});
        } else {
          setTimeout(function (p, processID, millisecs) {
            this.prwt(p, processID, millisecs);
          }, millisecs || 500, p, processID, millisecs || 500);
        }
        if (DEBUG) { console.log(' [D] (' + p.parentID + ') processwait at ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
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
    if (typeof log === 'undefined') { log = global.hybridd.proc[p.processID].data; }
    console.log(' [' + (level === 2 ? '!' : (level == 1 ? 'i' : '.')) + '] ' + (typeof log === 'string' ? log : JSON.stringify(log)));
    this.next(p, 0, global.hybridd.proc[p.processID].data);
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
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') passing subprocess data to parent process'); }
    global.hybridd.proc[p.parentID].data = ydata;
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
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') parsing string data to JSON object'); }
    try {
      global.hybridd.proc[p.processID].data = JSON.parse(global.hybridd.proc[p.processID].data);
      this.jump(p, success || 1);
    } catch (e) {
      this.jump(p, fail || 1);
    }
  };

  /**
 * Turns JSON object into a string.
 * @category Array/String
 * @example
 * jstr()         // input: {key:"Some data."}, output: '{key:"Some data."}'
 */
  this.jstr = function (p) {
    this.next(p, 0, JSON.stringify(global.hybridd.proc[p.processID].data));
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
      global.hybridd.proc[p.parentID].autoprog = true;
    } else {
      global.hybridd.proc[p.parentID].progress = step / steps;
      global.hybridd.proc[p.parentID].autoprog = false;
    }
    this.next(p, 0, global.hybridd.proc[p.processID].data);
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
    var loopid;
    var process = global.hybridd.proc[p.parentID];
    for (var i = 0; i <= process.steps; i += 1) {
      loopid = p.parentID + '.' + i;
      if (global.hybridd.proc[loopid].timeout < millisecs || millisecs <= 0) {
        global.hybridd.proc[loopid].timeout = millisecs;
      }
    }
    // increase timeout of all parents
    var parentID = true;
    var processID = p.processID;
    while (parentID) {
      var procinfo = procpart(processID);
      if (procinfo[1] > -1) { parentID = procinfo[0]; processID = parentID; } else { parentID = false; }
      if (parentID) {
        // DEBUG: console.log(' [#] setting timeout of parentID '+parentID);
        if (global.hybridd.proc[parentID].timeout < millisecs || millisecs <= 0) {
          global.hybridd.proc[parentID].timeout = millisecs;
        }
      }
    }
    if (typeof hookData !== 'undefined' || typeof hookErr !== 'undefined') {
      process.timeHook = {data: typeof hookData === 'undefined' ? global.hybridd.proc[p.processID].data : hookData, err: (typeof hookErr === 'undefined' ? 1 : hookErr)};
    }

    this.next(p, 0, global.hybridd.proc[p.processID].data);
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
    var ydata;
    if (typeof err === 'undefined' && typeof xdata === 'undefined') {
      ydata = global.hybridd.proc[p.processID].data;
      err = 0;
    } else if (typeof err !== 'number' && typeof xdata === 'undefined') {
      ydata = err;
      err = 0;
    } else {
      ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    }
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') stopped at step ' + (global.hybridd.proc[p.parentID].step <= global.hybridd.proc[p.parentID].steps ? global.hybridd.proc[p.parentID].step + 1 : 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    global.hybridd.proc[p.processID].data = ydata;
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
    var ydata = typeof type === 'undefined' ? global.hybridd.proc[p.processID].data : type;
    scheduler.type(p.processID, ydata);
    this.next(p, 0, ydata);
  };

  /**
 * Set data stream to a value.
 * @category Process
 * @param {Object} object - Object to fill the data stream with.
 * @example
 * data("test")            // Fill the data stream with 'test'.
 */
  this.data = function (p, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
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
    var process = global.hybridd.proc[p.parentID];
    if (typeof jumpOrErrOrData !== 'number') {
      process.hook = {data: jumpOrErrOrData, err: typeof err === 'undefined' ? 1 : err};
      return this.next(p, 0, global.hybridd.proc[p.processID].data);
    } else if (jumpOrErrOrData === 0) {
      return this.stop(p, 'hook: illegal zero jump.');
    } else if (jumpOrErrOrData + process.step < 0) {
      return this.stop(p, 'hook: illegal negative jump.');
    } else if (jumpOrErrOrData + process.step > process.steps) {
      return this.stop(p, 'hook: illegal out of bounds jump.');
    } else {
      process.hook = {jump: jumpOrErrOrData + process.step};
      return this.next(p, 0, global.hybridd.proc[p.processID].data);
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
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    this.stop(p, typeof err === 'undefined' ? 1 : err, ydata);
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
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
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
    var processStep = global.hybridd.proc[p.processID];
    var process = global.hybridd.proc[p.parentID];

    processStep.started = Date.now();

    if (typeof stepTo === 'undefined') { stepTo = 1; }

    if (stepTo === 0) {
      this.fail(p, 'jump: illegal zero jump.');
      return;
    }
    var jumpTo = process.step + stepTo;
    if (jumpTo < 0) {
      this.fail(p, 'jump: illegal negative jump.');
      return;
    }
    if (jumpTo > process.steps) {
      this.fail(p, 'jump: illegal out of bounds jump.');
      return;
    }

    if (stepTo < 0) {
      var previd;
      for (var i = jumpTo; i < process.step; i += 1) {
        var prevProcessStepID = p.parentID + '.' + i;
        var prevProcessStep = global.hybridd.proc[prevProcessStepID];
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
    processStep.data = typeof xdata !== 'undefined' ? xdata : global.hybridd.proc[p.processID].data;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') jumping to step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
  };
  /**
 * Test a condition and choose to jump.
 * @category Flow
 * @param {Boolean} condition -  Javascript condition to test. (Example: a>5)
 * @param {Integer} [onTrue=1] - Amount of instructions lines to jump when condition matches true.   (1 = jump forward 1 instruction, -2 = jump backward two instructions)
 * @param {Integer} [onFalse=1] - Amount of instructions lines to jump when condition matches false.  (1 = jump forward 1 instruction, -2 = jump backward two instructions)
 * @example
 * test('a>3',1,-3)    // test if a>3, if true jump to the next instruction, if false jump back three instructions
 * test('b<=1',-4,1)   // test if b<=1, if true jump back four instructions, if false jump to the next instruction
 * test('a>3',-5)      // test if a>3, if true jump back five instructions, else default jump to the next instruction
 */
  this.test = function (p, condition, is_true, is_false) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') testing [' + condition + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    // TODO: function stricteval (equation) { return eval(equation); }
    //       if (stricteval("'"+condition.replace(/[^\w-]+/g,"'$&'")+"'")) {
    if (condition) {
      this.jump(p, is_true || 1);
    } else if (typeof is_false === 'undefined') {
      this.next(p, 0, global.hybridd.proc[p.processID].data);
    } else {
      this.jump(p, is_false, global.hybridd.proc[p.processID].data);
    }
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
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') tran [' + JSON.stringify(property) + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    var testObject = global.hybridd.proc[p.processID].data;
    var checkVar = chckVar(p, property, testObject);
    if (checkVar.valid) {
      global.hybridd.proc[p.processID].data = checkVar.data;
      this.jump(p, is_valid || 1);
    } else {
      this.jump(p, is_invalid || 1);
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
  this.find = function (p, findObject, found, not_found) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') find [' + JSON.stringify(property) + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    var searchArray = global.hybridd.proc[p.processID].data;
    var matches = [];
    var query;
    query = JSON.stringify(findObject).replace(new RegExp('^[{]*'), '').replace(new RegExp('[}]*$'), '');
    if (!(searchArray instanceof Array)) {
      searchArray = [searchArray];
    }
    for (var i = 0; i < searchArray.length; i++) {
      if (JSON.stringify(searchArray[i]).indexOf(query) > -1) {
        matches.push(searchArray[i]);
      }
    }
    if (matches.length > 0) {
      this.jump(p, found || 1, matches);
    } else {
      this.jump(p, not_found || 1, searchArray);
    }
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
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') form [' + JSON.stringify(ydata) + ',' + JSON.stringify(factor) + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    if (typeof factor === 'undefined') {
      var rootProcessID = p.processID.split('.')[0];
      var rootProcess = global.hybridd.proc[rootProcessID]; // the root process
      factor = rootProcess.recipe.factor;
    }
    var result = functions.padFloat(global.hybridd.proc[p.processID].data, factor);
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
    var ydata = global.hybridd.proc[p.processID].data;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') atom [' + JSON.stringify(ydata) + ',' + JSON.stringify(factor) + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    if (typeof factor === 'undefined') {
      var rootProcessID = p.processID.split('.')[0];
      var rootProcess = global.hybridd.proc[rootProcessID]; // the root process
      factor = rootProcess.recipe.factor;
    }
    var result;
    if (reduce) {
      result = functions.toInt(ydata, factor).toInteger();
    } else {
      result = functions.padFloat(functions.fromInt(ydata, factor), factor);
    }
    this.next(p, 0, result);
  };
  /**
 * Split a string.
 * @category Array/String
 * @param {String} [separator=' '] - Explode a string into an array, split by separator
 * @example
 * splt()     // input: "This is nice.", output: ["This","is","nice."]
 * splt(',')  // input: "Some,list,of,stuff", output: ["Some","list","of","stuff]
 */
  this.splt = function (p, separator) {
    if (typeof separator === 'undefined') { separator = ''; }
    var ydata = global.hybridd.proc[p.processID].data;
    var result = null;
    if (typeof ydata === 'string') {
      result = ydata.split(separator);
    } else {
      result = [];
    }
    this.next(p, 0, result);
  };
  /**
 * Join an array into a string.
 * @category Array/String
 * @param {String} [separator=''] - Implode an array to a string, split by separator
 * @example
 * join()     // input: ["This","is","nice."], output: "Thisisnice."
 * join(' ')  // input: ["Some","list","of","stuff"], output: "Some list of stuff"
 */
  this.join = function (p, separator) {
    if (typeof separator === 'undefined') { separator = ''; }
    var result = global.hybridd.proc[p.processID].data.join(separator);
    this.next(p, 0, result);
  };

  /**
 * Use API queue to perform a curl call to an external host.
 * @param {String} target - A string containing on of the following options
 * - "[user[:password]@]host[:port]"
 * - "asset://base[.mode]"
 * - "source://base[.mode]"
 * @param {String} querystring - A string containig the querypath  (Example: "/road/cars?color=red")
 * @param {String} [method] - GET (default) ,POST or PUT
 * @param {Object} [data=data] - post data passed to call
 * @param {Object} [headers] - http headers passed to call
 * @param {Object} [overwriteProperties] -
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
  this.curl = function (p, target, querystring, method, xdata, headers, overwriteProperties) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;

    var properties;
    var link;
    if (target.substr(0, 8) === 'asset://') { // target = "asset://base.mode"
      target = target.substring(8, target.length); // target = "base.mode"
      var base = target.split('.')[0]; // base = "base"
      link = 'asset["' + base + '"]';
      properties = {};
      Object.assign(properties, global.hybridd.asset[base]); // use base as default
      if (base !== target) { // extend with mode if required
        properties = Object.assign(properties, global.hybridd.asset[target]);
      }
    } else if (target.substr(0, 9) === 'source://') { // target = "source://base.mode"
      target = target.substring(9, target.length); // target = "base.mode"
      var base = target.split('.')[0]; // base = "base"
      link = 'source["' + base + '"]';
      properties = {};
      Object.assign(properties, global.hybridd.source[base]); // use base as default
      if (base !== target) { // extend with mode if required
        properties = Object.assign(properties, global.hybridd.source[target]);
      }
    } else if (target.substr(0, 9) === 'engine://') { // target = "source://base.mode"
      target = target.substring(9, target.length); // target = "base.mode"
      var base = target.split('.')[0]; // base = "base"
      link = 'source["' + base + '"]';
      properties = {};
      Object.assign(properties, global.hybridd.engine[base]); // use base as default
      if (base !== target) { // extend with mode if required
        properties = Object.assign(properties, global.hybridd.engine[target]);
      }
    } else { // target = "user:password@host:port"
      var targetSplitOnAdd = target.split('@');
      properties = {};
      if (targetSplitOnAdd.length === 1) {
        properties.host = targetSplitOnAdd[0];
      } else {
        var protocolSplit = targetSplitOnAdd[0].split('/');
        var userSplitOnColon = protocolSplit[2].split(':');
        properties.user = userSplitOnColon[0];
        properties.pass = userSplitOnColon.length > 1 ? userSplitOnColon[1] : undefined;
        properties.host = protocolSplit[0] + '//' + targetSplitOnAdd[1];
      }
    }

    var args = {};
    args['data'] = ydata;
    args['path'] = querystring;
    if (properties.hasOwnProperty('rejectUnauthorized') && !properties['rejectUnauthorized']) {
      console.log(' [!] module quartz: unauthorized TLS/SSL certificates ignored for ' + properties.symbol);
      args['rejectUnauthorized'] = false;
    }
    args.headers = (headers || {});

    var queueObject = {
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
    var cleanQueueObject = Object.keys(Object.assign(queueObject, overwriteProperties)).reduce(
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
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    var rootProcessID = p.processID.split('.')[0];
    var rootProcess = global.hybridd.proc[rootProcessID]; // the root process
    command = command.split('/'); // "dummy/balance/_dummyaddress_" => ["dummy","balance","_dummyaddress_"]
    var path = rootProcess.path && rootProcess.command
      ? rootProcess.path.slice(0, rootProcess.path.length - rootProcess.command.length).concat(command) // "/asset/dummy/do/something" => "/asset/dummy/fork/me" (as arrays)
      : null;

    var requestPID = typeof childId === 'undefined' ? 0 : p.processID + '.' + childId; // PID+"."+childID for child process, "0" for independant process.
    var childPID = scheduler.init(requestPID, {data: ydata, sessionID: rootProcess.sessionID, recipe: rootProcess.recipe, path: path, command: command});
    // the command xpath passed to the Quartz function: "functionId/$1/$2/$3/..."
    modules.module[rootProcess.recipe.module].main.exec({processID: childPID, parentID: p.processID, target: rootProcess.recipe, mode: rootProcess.recipe.mode, factor: rootProcess.recipe.factor, command: command});
    return childPID;
  };
  /**
 * Creates a new process by calling the xpath command and wait for the data to be returned (combines fork and read).
 * @category Process
 * @param {String} command -  A string containg the command path. "command/a/b". processStepID calls command using $1 = "a", $2 = "b"
 * @param {Object} [data=data] -  Optional data to be passed to the new process
 * @example
 * call("balance/_dummyaddress_")          // Retrieve the balance and pass it to next step.
 */
  this.call = function (p, command, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    this.read(p, this.fork(p, command, 0, ydata));
  };
  /**
 * Route a path through hybridd and pass the result to the next step. /api/help for API information.
 * @param {String} path - Provide the routing path
 * @example
 * rout('/asset/dummy/balance/__dummyaddress__')   // retrieve the balance for the dummy asset
 */
  this.rout = function (p, xpath) {
    // TODO pass data to post
    var sessionID = global.hybridd.proc[p.processID.split('.')[0]].sid;
    var result = router.route({url: xpath, sessionID: sessionID});
    if (result.id === 'id') { // if result is a process that has te be awaited, then read that proces until finished
      this.read(p, result.data);
    } else {
      scheduler.type(p.processID, result.type);
      this.next(p, result.hasOwnProperty('error') ? result.error : 1, result.hasOwnProperty('data') ? result.data : null); // if it's a direct result pass it to next
    }
  };
  /**
 * TODO
 * @example
 * rout('/asset/dummy/balance/__dummyaddress__')   // retrieve the balance for the dummy asset
 */
  this.file = function (p) { // todo pass offest and length
    var process = global.hybridd.proc[p.parentID];
    var processStep = global.hybridd.proc[p.processID];
    if (process.type.startsWith('file:')) {
      var filePath = '../' + processStep.data.replace('..', ''); // 'file://*' => file : '$HYBRIDD_HOME/*'   //TODO Make safer MAYBE warning on '..' usage?
      if (fs.existsSync(filePath)) {
        processStep.data = fs.readFileSync(filePath).toString('utf8');
        scheduler.type(p.processID, undefined); // reset type
        this.next(p, 0, processStep.data);
      } else {
        this.fail(p, 'File not found');
      }
    } else {
      this.next(p, 0, processStep.data);
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
    if (typeof value === 'undefined') { value = global.hybridd.proc[p.processID].data; }
    if (typeof value !== 'string') {
      value = JSON.stringify(value).replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
    }
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
 * jpar()                   // convert loaded value to object
 */
  this.load = function (p, key) {
    this.rout(p, '/engine/storage/get/' + encodeURIComponent(key));
  };

  /**
 * Retrieve the meta data based on a key.
 * @category Storage
 * @param {String} key - Key for which to get metadata
 * @example
 * meta("myFavoriteColor")  // retrieve the meta data for myFavoriteColor
 */
  this.meta = function (p, key) {
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
 * read({"a":null,"b":34})        //Wait for processes 123456 and 654321 to finish and return their data combined into an object with property labels a and b.
 */
  this.read = function (p, processIDs, millisecs) {
    // check permissions for processes
    var permission;
    if (typeof processIDs === 'string') { // single
      permission = global.hybridd.proc[p.processID].sessionID === 1 || global.hybridd.proc[p.processID].sessionID === global.hybridd.proc[processIDs].sessionID;
    } else if (processIDs instanceof Array) { // array
      permission = processIDs.reduce(function (permission, processID) {
        return permission && global.hybridd.proc.hasOwnProperty(processID) && (global.hybridd.proc[this.mainProcessID].sessionID === 1 || global.hybridd.proc[this.mainProcessID].sessionID === global.hybridd.proc[processID].sessionID);
      }.bind({mainProcessID: p.processID}), true);
    } else { // dictionary
      permission = true;
      for (var key in processIDs) {
        var processID = processIDs[key];
        if (!global.hybridd.proc.hasOwnProperty(processID) || (global.hybridd.proc[p.processID].sessionID !== 1 && global.hybridd.proc[p.processID].sessionID !== global.hybridd.proc[processID].sessionID)) {
          permission = false;
          break;
        }
      }
    }

    if (permission) {
      // check if processes have finished:
      var finished = 0;
      var progress = 0;
      if (typeof processIDs === 'string') { // single
        finished = (global.hybridd.proc[processIDs].progress >= 1 || global.hybridd.proc[processIDs].stopped) ? 1 : 0;
        global.hybridd.proc[p.processID].progress = global.hybridd.proc[processIDs].progress;
      } else if (processIDs instanceof Array) { // array
        for (var i = 0; i < processIDs.length; i++) {
          progress += global.hybridd.proc[processIDs[i]].progress;
          finished += (global.hybridd.proc[processIDs[i]].progress >= 1 || global.hybridd.proc[processIDs[i]].stopped) ? 1 : 0;
        }
        finished = finished === processIDs.length;
        global.hybridd.proc[p.processID].progress = progress / processIDs.length;
      } else { // dictionary
        for (var key in processIDs) {
          var processID = processIDs[key];
          progress += global.hybridd.proc[processID].progress;
          finished += finished + (global.hybridd.proc[processID].progress >= 1 || global.hybridd.proc[processID].stopped) ? 1 : 0;
        }
        finished = finished === Object.keys(processIDs).length;
        global.hybridd.proc[p.processID].progress = progress / Object.keys(processIDs).length;
      }

      if (finished) {
        var result;
        if (typeof processIDs === 'string') { // single
          result = {data: global.hybridd.proc[processIDs].data, err: global.hybridd.proc[processIDs].err, type: global.hybridd.proc[processIDs].type};
        } else if (processIDs instanceof Array) { // array
          result = {data: [], err: 0};
          for (var i = 0; i < processIDs.length; i++) {
            result.data.push(global.hybridd.proc[processIDs[i]].data);
            result.err = Math.max(result.err, global.hybridd.proc[processIDs[i]].err);
          }
          global.hybridd.proc[p.processID].progress = 1;
        } else { // dictionary
          result = {data: {}, err: 0};
          for (var key in processIDs) {
            var processID = processIDs[key];
            result.data[key] = global.hybridd.proc[processID].data;
            result.err = Math.max(global.hybridd.proc[processID].err, result.err);
          }
          global.hybridd.proc[p.processID].progress = 1;
        }
        scheduler.type(p.processID, result.type);
        this.next(p, result.err, result.data);
      } else {
        setTimeout(function (p, processIDs, millisecs, quartz) {
          quartz.read(p, processIDs, millisecs);
        }, millisecs || 500, p, processIDs, millisecs || 500, this);
      }
    } else {
      this.fail(p, 'read: Insufficient permissions to access processes ' + processIDs + '.');
    }
  };
  /**
 * Loop through elements of a container execute a given function for each element.
 * @category Process
 * @param {Array|Object} input -  TODO
 * @param {String} command -  A string containg the command path. "command/a/b". This calls command using $1 = "a", $2 = "b"
 * @param {Object} [data=data] -  Optional data to be passed to the new process
 * @example
 * each(["a","b","c"],"test")           //  calls test with data = {key=0, value="a"} and further
 * each({"a":0,"b":1,"c":2},"test")     //  calls test/x/y with data = {key="a", value=0} and further
 */
  this.each = function (p, container, command, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    var processIDs;
    if (container instanceof Array) { // Array
      processIDs = [];
      for (var key = 0; key < container.length; ++key) {
        processIDs.push(this.fork(p, command, key, {data: ydata, container: container, key: key, value: container[key]}));
      }
    } else { // Dictionary
      processIDs = {};
      var index = 0;
      for (var key in container) {
        processIDs[key] = this.fork(p, command, index, {data: ydata, container: container, key: key, value: container[key]});
        ++index;
      }
    }
    this.read(p, processIDs);
  };
  /**
 * Put data in a variable for later use. Use peek to retrieve. The data is stored in the root parent process under 'vars'. (You can see this poked data stored in global.hybridd.proc[rootID].vars, but a better way to use this data is by using the command peek("varname").
 * @category Variables
 * @param {String} key - Variable name to get data from.
 * @param {String} [value=data] - The data to store in the variable. This is also stored in this subprocess data field.
 * @example
 *  poke("fee",value)         // sets value in recipe local variable fee. Shorthand for local::fee (runtime, persisted in the .vars.json file)
 *  poke("userDefined")         // given that the recipe does not have property userDefined sets the value in processor variable userDefined (runtime, non persistant)
 *  poke("proc::fee",value)         // sets value in processor variable fee (runtime, non persistant)
 *  poke("local::fee",value)         // sets value in recipe local variable fee (runtime, persisted in the .vars.json file)
 *  poke("::fee",value)         // same as poke("local::fee",value)

 *  poke("btc::fee",value)         // results in an error.
 *  poke("btc::local::fee",value)         // results in an error

 *  poke(2,value)     // results in an error.
 */
  this.poke = function (p, key, pdata) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') poke [' + JSON.stringify(variable) + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }

    var qdata = typeof pdata === 'undefined' ? global.hybridd.proc[p.processID].data : pdata;

    var keySplit = key.split('::');

    var scope;
    var subKey;
    var process = global.hybridd.proc[p.parentID];
    var rootID = p.processID.split('.')[0];
    var rootProcess = global.hybridd.proc[rootID];
    if (keySplit.length === 2) {
      scope = keySplit[0];
      subKey = keySplit[1];
      if (scope === 'proc') { // proc::key
        process.vars[subKey] = qdata;
      } else if (scope === 'local' || scope === '') { // local::key
        if (typeof rootProcess.recipe.vars !== 'object') {
          rootProcess.recipe.vars = {};
        }
        rootProcess.recipe.vars[subKey] = qdata;
        fs.writeFileSync('../var/recipes/' + rootProcess.recipe.filename, JSON.stringify(rootProcess.recipe.vars));
      } else if (scope === 'parent') {
        return this.failure(p, 'poke: Not allowed to write to parent scope.');
      } else { // otherRecipe::key
        return this.fail(p, 'poke: Not allowed to write to other recipe scope.');
      }
      return this.next(p, 0, global.hybridd.proc[p.processID].data);
    } else if (keySplit.length === 3) {
      return this.fail(p, 'poke: Not allowed to write to local variable of other recipe.');
    } else if (typeof key === 'number') { // 0,1,2,3,   or fee
      return this.fail(p, 'poke: Not allowed to write to command array.');
    } else {
      if (!rootProcess.recipe.hasOwnProperty(key)) {
        process.vars[key] = qdata;
        return this.next(p, 0, global.hybridd.proc[p.processID].data);
      } else {
        return this.fail(p, 'poke: Not allowed to write to recipe property.');
      }
    }
  };
  /**
 * Gets data from a variable that was defined by poke. Used inside of other instructions.
 * @param {String} key - Variable name to get data from.
 * @category Variables
 * @example
 *  peek("fee")         // returns value in recipe variable fee (non mutable, based on the recipe .json file)
 *  peek("userDefined")         // given that the recipe does not have property userDefined returns value in processor variable userDefined (runtime, non persistant)
 *  peek("proc::fee")         // returns value in processor variable fee (runtime, non persistant)
 *  peek("local::fee")         // returns value in recipe local variable fee (runtime, persisted in the .vars.json file)
 *  peek("::fee")         // same as peek("local::fee")

 *  peek("btc::fee")         // returns value in btc recipe variable fee (non mutable, based on the recipe btc.json file)
 *  peek("btc::local::fee")         // returns value in btc recipe variable fee (based on the recipe .btc.vars.json file)

 *  peek(2)     // returns value of the second command path (non mutable)

 */
  this.peek = function (p, key) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') peek [' + JSON.stringify(key) + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    var pdata;
    key = typeof key === 'undefined' ? global.hybridd.proc[p.processID].data : key;
    if (typeof key === 'string') {
      var keySplit = key.split('::');

      var processStepIdSplit = p.processID.split('.');
      var rootID = processStepIdSplit[0];

      var rootProcess = global.hybridd.proc[rootID];
      var process = global.hybridd.proc[p.parentID];

      if (keySplit.length === 2) {
        var scope = keySplit[0];
        var subKey = keySplit[1];
        if (scope === 'proc') { // proc::key
          if (rootProcess.hasOwnProperty('vars')) {
            pdata = process.vars[subKey];
          } else {
            return this.fail(p, "peek: 'proc::" + subKey + "' not defined.");
          }
        } else if (scope === 'local' || scope === '') { // local::key
          if (rootProcess.recipe.hasOwnProperty('vars')) {
            pdata = rootProcess.recipe.vars[subKey];
          } else {
            return this.fail(p, "peek: 'local::" + subKey + "' not defined.");
          }
        } else if (scope === 'parent') { // parent::key
          var processID = p.parentID;

          if (processStepIdSplit.length > 3) {
            var parentProcessID = processStepIdSplit.slice(0, processStepIdSplit.length - 3).join('.');
            var parentProcess = global.hybridd.proc[parentProcessID];
            if (parentProcess.vars.hasOwnProperty(subKey)) {
              pdata = parentProcess.vars[subKey];
            } else {
              return this.fail(p, 'peek: parent::' + subKey + ' not defined.');
            }
          } else {
            return this.fail(p, 'peek: parent does not exist for parent::' + subKey + '.');
          }
        } else { // otherRecipe::key
          if (global.hybridd.asset.hasOwnProperty(scope) && global.hybridd.asset[scope].hasOwnProperty(subKey)) {
            pdata = global.hybridd.asset[scope][subKey];
          } else if (global.hybridd.source.hasOwnProperty(scope) && global.hybridd.source[scope].hasOwnProperty(subKey)) {
            pdata = global.hybridd.source[scope][subKey];
          } else if (global.hybridd.engine.hasOwnProperty(scope) && global.hybridd.engine[scope].hasOwnProperty(subKey)) {
            pdata = global.hybridd.engine[scope][subKey];
          } else {
            return this.fail(p, 'peek: ' + scope + '::' + subKey + ' not defined.');
          }
        }
      } else if (keySplit.length === 3) {
        var scope = keySplit[0];
        var subScope = keySplit[1];
        var subKey = keySplit[2];
        if (subScope === 'local') {
          if (global.hybridd.asset.hasOwnProperty(scope) && global.hybridd.asset[scope].hasOwnProperty('vars') && global.hybridd.asset[scope].vars.hasOwnProperty(subKey)) {
            pdata = global.hybridd.asset[scope].vars[subKey];
          } else if (global.hybridd.source.hasOwnProperty(scope) && global.hybridd.source[scope].hasOwnProperty('vars') && global.hybridd.source[scope].vars.hasOwnProperty(subKey)) {
            pdata = global.hybridd.source[scope].vars[subKey];
          } else if (global.hybridd.engine.hasOwnProperty(scope) && global.hybridd.engine[scope].hasOwnProperty('vars') && global.hybridd.engine[scope].vars.hasOwnProperty(subKey)) {
            pdata = global.hybridd.engine[scope].vars[subKey];
          }
        } else {
          return this.fail(p, 'peek: Unrecognized scope ' + subScope + ' for ' + key + '.');
        }
      } else if (typeof key === 'number') { // 0,1,2,3
        pdata = rootProcess.command ? rootProcess.command[key] : undefined;
      } else if (rootProcess.recipe.hasOwnProperty(key)) { // fee
        pdata = rootProcess.recipe[key];
      } else if (process.vars.hasOwnProperty(key)) {
        pdata = process.vars[key];
      } else {
        return this.fail(p, "peek: '" + key + "' not defined.");
      }
    } else {
      return this.fail(p, 'peek: expected string.');
    }
    return this.next(p, 0, pdata);
  };

  /**
 * Calculates numbers and variables. Mathematical calculations can be done with very large numbers.
 * @param {String} equation - String to calculate outcome of.
 * @example
 *  math('10*34+8-(3^4)')  // returns 267
 *  math('^2*5')           // returns the value of data to the power of two times five
 *  math([2,3,4,5,6])      // returns the sum of all the numbers in the array
 *  math([2,3,4,5,6],'*')  // multiplies all the numbers in the array
 *  math('+')              // adds all the numbers in the data array
 */
  // TODO split into math and redu
  this.math = function (p, equation, operator) {
    var data = global.hybridd.proc[p.processID].data;
    if (typeof equation === 'string' && isNaN(equation.substr(0, 1)) && typeof operator === 'undefined') {
      operator = equation;
      equation = data;
    }

    if (Object.prototype.toString.call(equation) === '[object Array]') {
      operator = typeof operator === 'string' && operator ? operator : '+';
      equation = equation.join(operator);
    } else {
      if (!operator) { operator = ''; }
      equation = String(equation) + String(operator);
    }

    if (DEBUG) { console.log(' [D] (' + p.parentID + ') math [' + equation + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }

    this.next(p, 0, mathCalc(equation, operator, data));
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
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') scan [' + test + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    var scanArray = global.hybridd.proc[p.processID].data;
    if (Object.prototype.toString.call(scanArray) !== '[object Array]') {
      scanArray = [scanArray];
    }
    if (typeof cinit === 'undefined') { cinit = 0; } else { cinit = mathCalc('0+' + cinit); }
    var val;
    var cnt = '0';
    var out;
    var matches = [];
    var cumulstr = '';
    var teststr = '';
    if (!cumulative) { cumulative = '+val'; }
    for (var key = 0; key < scanArray.length; key++) {
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
 *  hash("this_is_my_data")  // returns the hash: 5322fecfc92a5e3248a297a3df3eddfb9bd9049504272e4f572b87fa36d4b3bd
 */
  // TODO: Implement method DJB2
  this.hash = function (p, method) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') hash [' + global.hybridd.proc[p.processID].data + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    var hash;
    switch (method) {
      case 'djb2':
        break;
      default:
        hash = nacl.to_hex(nacl.crypto_hash_sha256(global.hybridd.proc[p.processID].data));
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
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') code [' + input + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    var input = global.hybridd.proc[p.processID].data;
    function asciitable () {
      var x = '';
      for (i = 0; i < 256; i++) { x = x + String.fromCharCode(i); }
      return x;
    }
    var BASE = function (val) {
      var out;
      switch (val) {
        case 2: out = '01'; break;
        case 8: out = '01234567'; break;
        case 10: out = '0123456789'; break;
        case 16: out = '0123456789abcdef'; break;
        case 58: out = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'; break;
        case 256: out = asciitable(); break;
        case 'RFC4648': out = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; break;
      }
      return out;
    };
    if (typeof target === 'undefined') { target = source; source = BASE(256); }
    var postTarget = target;
    switch (source) {
      case 'base58':
        input = input.replace(/[^1-9A-HJ-NP-Za-km-z]/g, '');
        source = BASE(58);
        break;
      case 'hex':
        source = BASE(16);
        input = input.toLowerCase().replace(/[^0-9a-f]/g, '');
        if (input.substring(0, 2) === '0x') input = input.substring(2);
        break;
      case 'dec':
        input = input.replace(/[^0-9]/g, '');
        source = BASE(10);
        break;
      case 'oct':
        input = input.replace(/[^0-8]/g, '');
        source = BASE(8);
        break;
      case 'bin':
        input = input.replace(/[^0-1]/g, '');
        source = BASE(2);
        break;
      default:
        if (source === 'ascii' || source === 'utf-8' || source === 'utf8') { source = BASE(256); }
        if (source === 'bech32' || source === 'RFC4648') {
          input = functions.replaceBulk(input.toUpperCase(), ['0', '1', '8', '9'], ['O', 'I', 'B', 'G']).replace(/[^A-Z2-7]/g, '');
          source = BASE('RFC4648');
        }
        break;
    }
    switch (target) {
      case 'base58': target = BASE(58); break;
      case 'hex': target = BASE(16); break;
      case 'dec': target = BASE(10); break;
      case 'oct': target = BASE(8); break;
      case 'bin': target = BASE(2); break;
      default:
        if (target === 'ascii' || target === 'utf-8' || target === 'utf8') { target = BASE(256); }
        if (target === 'bech32' || target === 'RFC4648') { target = BASE('RFC4648'); }
        if (!target) { target = BASE(256); }
        break;
    }
    var output = new Buffer(require('base-x')(target).encode(new Buffer(require('base-x')(source).decode(input)))).toString();
    // DEBUG: var output = ' #  '+source+' ### '+target+'  ############## ';
    // DEBUG: var output = ' #  '+input+' ############## ';
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
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') case [' + input + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    var input = global.hybridd.proc[p.processID].data;
    var output;
    switch (mode) {
      case 'lower': output = input.toLowerCase(); break;
      case 'upper': output = input.toUpperCase(); break;
      case 'words': output = input.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      });
        break;
      case 'first': output = input.replace(/.+?([\.\?\!]\s|$)/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      });
        break;
      case 'camel': output = input.replace(/(?:^\w|[A-Z]|\b\w)/g, function (letter, index) {
        return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
      }).replace(/\s+/g, '');
        break;
      // case 'inverse':
      default:
        output = '';
        var j;
        for (var i = 0; i < input.length; i++) {
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
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') repl [' + input + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    var input = global.hybridd.proc[p.processID].data;
    var output;
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
        for (var i = 0; i < repl.length; i++) {
          output = output.replace(srch, repl[i]);
        }
      }
    } else {
      if (typeof repl === 'string') {
        output = input;
        for (var i = 0; i < srch.length; i++) {
          output = output.replace(srch[i], repl);
        }
      } else {
        output = functions.replaceBulk(input, srch, repl);
      }
    }
    this.next(p, 0, output);
  };
  /**
 * Push new data into array or string.
 * @category Array/String
 * @param {Object} input    - Data to add to array
 * @param {Number} [offset=length]   - Offset to use
 * @param {Number} [delete=0]   - Entries to delete
 * @example
 * push(0)           // add 0 to data array
 * push('woots!')    // input: ['A'], result: ['A','woots!']
 * push('woots!')    // input: 'A', result: 'Awoots!'
 * push('B',1)       // input: ['a','c'], result: ['a','B','c']
 * push(['B','E'],1) // input: ['a','c'], result: ['a','B','E','c']
 * push('an',8)      // input: 'This is  apple', result: 'This is an apple'
 */
  this.push = function (p, input, pos, del) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') pushing data into array'); }
    var ydata = global.hybridd.proc[p.processID].data;
    if (typeof ydata === 'string') {
      var str = true;
      ydata = ydata.split('');
    }
    if (Object.prototype.toString.call(ydata) !== '[object Array]') {
      if (typeof ydata === 'undefined' || ydata === null) {
        ydata = [];
      } else {
        ydata = [ ydata ];
      }
    }
    if (typeof pos === 'undefined') {
      if (input instanceof Array) {
        for (var i = 0; i < input.length; i++) {
          ydata.push(input[i]);
        }
      } else {
        ydata.push(input);
      }
    } else {
      if (del < 0) { pos = pos + del; del = -del; }
      if (input instanceof Array) {
        ydata.splice(pos, del, input[0]);
        for (var i = 1; i < input.length; i++) {
          ydata.splice(pos + i, 0, input[i]);
        }
      } else {
        ydata.splice(pos, del, input);
      }
    }
    if (str) {
      ydata = ydata.join('');
    }
    global.hybridd.proc[p.processID].data = ydata;
    this.next(p, 0, ydata);
  };
  /**
 * Pull elements from an array or input string.
 * @category Array/String
 * @param {Integer} offset - Amount of elements to delete from start
 * @param {Integer} ending - Amount of elements to include or trim from end
 * @example
 *  pull(5)      // pull from the left    input: 'this_is_my_data', output: 'is_my_data'
 *  pull(-5)     // pull from the right   input: 'this_is_my_data', output: '_data'
 *  pull(5,-5)   // pull from both edges  input: 'this_is_my_data', output: 'is_my'
 *  pull(4,7)    // select from center    input: 'this_is_my_data', output: '_is_my_'
 *  pull(-4,-5)  // extract edges         input: 'this_is_my_data', output: 'this_data'
 *  pull(-4, 6)  // select inversed       input: 'this_is_my_data', output: 'thista'
 *  pull(1,-1)   // arrays also work!     input: ['a','b','c','d'], output: ['b','c']
 *  pull(1,4)    // another array pull    input: ['g','l','o','v','e','s'], output: ['l','o','v','e']
 */
  this.pull = function (p, offset, ending) {
    var ydata = global.hybridd.proc[p.processID].data;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') pull [' + ydata + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    if (typeof ydata === 'string') {
      var str = true;
      ydata = ydata.split('');
    }
    if (typeof offset !== 'undefined') {
      if (typeof ending === 'undefined') {
        ending = offset; offset = 0;
      }
      if (ending >= 0) {
        if (offset > 0) {
          ydata.splice(offset + ending, ydata.length - (offset + ending));
        } else if (offset === 0) {
          ydata.splice(0, ending);
        }
      } else if (offset >= 0) {
        ydata.splice(ydata.length + ending, ydata.length);
      }
      if (offset >= 0) {
        ydata.splice(0, offset);
      } else if (offset < 0) {
        if (ending >= 0) {
          ydata.splice(-offset, ydata.length - (ending + offset) + offset);
        } else {
          ydata.splice(-offset, ydata.length + ending + offset);
        }
      }
    }
    if (str) {
      ydata = ydata.join('');
    }
    this.next(p, 0, ydata);
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
    var object = global.hybridd.proc[p.processID].data;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') sort [' + object + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    // set default sorting method if unspecified
    if (typeof method === 'string') { method = [method]; }
    function intSort (a, b) { return a - b; }
    function sortAssocObject (list, reverse, sortInteger, sortByKey) {
      var sortable = [];
      var ind = sortByKey ? 0 : 1;
      for (var key in list) {
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
      var orderedList = [];
      var listObj;
      for (var i = 0; i < sortable.length; i++) {
        listObj = {};
        listObj[String(sortable[i][0])] = sortable[i][1];
        orderedList.push(listObj);
      }
      return orderedList;
    }
    function sortArrayByObjKey (arr, key, reverse, sortInteger) {
      // make key value index
      var unordered = {};
      for (var i in arr) {
        if (typeof arr[i][key] !== 'undefined') {
          unordered[arr[i][key]] = i;
        }
      }
      // sort object list
      var ordered = [];
      var cnt = 0;
      var list;
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
    var sortDesc = 0;
    var sortByKey = 0;
    var sortByObj = 0;
    var sortInteger = 0;
    var isArray = 0;
    var isString = 0;
    var methodCase;
    var objName;
    if (Object.prototype.toString.call(object) === '[object Array]') {
      isArray = 1;
    } else if (typeof object === 'string') {
      isArray = 1;
      isString = 1;
      object = object.split('');
    }
    for (var i = 0; i < method.length; i++) {
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
 * Initiates a client stack program. This stack can be filled using step and executed using exec.
 * @category Interface
 * @example
 * init()     // Initiates a Hybridd.Interface stack program.
 */
  this.init = function (p) {
    this.next(p, 0, ['init']);
  };

  var append = (program, label, steps) => {
    if (label === '') { // [...] => [..., step1, step2, ...]
      return program.concat(steps);
    } else if (program.length < 2 || program[program.length - 1] !== 'parallel') {
      program = program.concat([{}, 'parallel']); // [...] => [..., {},'parellel']
    }
    // [..., {x: {..}, [label]: * }, 'parallel']
    var subLabels = label.split('.');
    var subLabel = subLabels[0];
    var subProgram = program[program.length - 2];
    if (!subProgram.hasOwnProperty(subLabel)) { // [..., {},'parellel'] => [..., {[subLabel]:{data:[],step:'sequential'}},'parellel']
      subProgram[subLabel] = {data: [], step: 'sequential'};
    } else if (subProgram[subLabel].step !== 'sequential') {
      // [..., {[subLabel]:{data:$DATA,step:'$STEP'}},'parellel'] => [..., {[subLabel]:{data:[$DATA,$STEP],step:'sequential'}},'parellel']
      var data = subProgram[subLabel].data;
      var step = subProgram[subLabel].step;
      subProgram[subLabel].data = [data, step];
      subProgram[subLabel].step = 'sequential';
    }
    subProgram[subLabel].data = append(subProgram[subLabel].data, subLabels.slice(1, subLabels.length).join('.'), steps);
    return program;
    // [..., {[subLabel]:{data:[...],step:'sequential'}},'parellel'] => [..., {[subLabel]:{data:[..., step1, step2, ...],step:'sequential'}},'parellel']
  };

  /**
 * Add a step to a client stack program. Executed using exec.
 * @category Interface
 * @param {String} key - Variable name to get data from.
 * @example
 * TODO
 */
  this.step = function (p, v1, v2, v3) {
    var args = Array.prototype.slice.call(arguments);
    var labelOrStep = args[1];
    var steps;
    var label;
    if (typeof labelOrStep !== 'string' || this.hasOwnProperty(labelOrStep)) {
      label = '';
      steps = args.slice(1);
    } else {
      label = labelOrStep;
      steps = args.slice(2);
    }
    var program = global.hybridd.proc[p.processID].data;
    this.next(p, 0, append(program, label, steps));
  };
  /**
 * Execute a client stack program.
 * @category Interface
 * @example
 * TODO
 */
  this.exec = function (p, onSuccess, onError, xdata) {
    var ydata = typeof (xdata === 'undefined' && xdata !== 'number') ? global.hybridd.proc[p.processID].data : xdata;
    var dataCallback = (data) => {
      global.hybridd.proc[p.processID].data = data;
      this.jump(p, onSuccess || 1);
    };
    var errorCallback = (error) => {
      if (typeof onError === 'undefined') {
        this.next(p, 1, error);
      } else {
        global.hybridd.proc[p.processID].data = error;
        this.jump(p, onError);
      }
    };
    var progressCallback = () => {};
    hybridd.sequential(ydata, dataCallback, errorCallback, progressCallback);
  };
};

exports.Quartz = Quartz; // initialize a new process
