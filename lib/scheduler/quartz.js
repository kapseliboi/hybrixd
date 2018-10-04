var fs = require('fs');
var router = require('../router');
var modules = require('../modules');
var scheduler = require('../scheduler');
var functions = require('../functions'); // only required for   procinfo[0] = functions.implode('.', pieces);
var APIqueue = require('../APIqueue');
var Decimal = require('../../common/crypto/decimal-light.js');

var Hybridd = require('../../interface/dist/hybridd.interface.nodejs');
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
    return {valid: valid, data: valid ? value : data};
  } else {
    return tranOperator(p, expression.substr(lhs.length), data, {valid, data: valid ? value : data});
  }
}

function chckString (p, property, data) {
  if (property.substr(0, 1) === '=') { // "=1+1" -> 2 evaluated expression
    return tranExpression(p, property.substr(1), data);
  }
  if (property.substr(0, 1) !== '.') { return {valid: true, data: property}; } // "foo" -> "foo"

  var propertyPath = property.substr(1).replace(']', '').replace('[', '.').split('.'); // ".foo.bar[3][5].x" -> ["foo","bar","3","5","x"]

  var iterator = data;
  for (var i = 0, len = propertyPath.length; i < len; ++i) {
    if (iterator !== null && typeof iterator === 'object') {
      if (iterator.constructor === Array) { // Array object
        var index = Number(propertyPath[i]);
        if (index >= 0 && index < iterator.length) {
          iterator = iterator[index];
        } else {
          return {valid: false, data: data};
        }
      } else { // Dictionary object
        if (iterator.hasOwnProperty(propertyPath[i])) {
          iterator = iterator[propertyPath[i]];
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
  }
}

/**
 * Quartz
 */
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
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    global.hybridd.proc[p.processID].err = (typeof err === 'undefined' ? 1 : err);
    global.hybridd.proc[p.processID].busy = false;
    global.hybridd.proc[p.processID].progress = 1;
    global.hybridd.proc[p.processID].stopped = Date.now();
    global.hybridd.proc[p.processID].data = ydata;
  };

  /**
 * Output debug information to the console
 * @param {Object} data - Data to display (using JSON.stringify). Also passed.
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
 * Wait a specified amount of time
 * @param {Number} millisecs - Amount of milliseconds to wait.
 * @param {Object} [data] - Store data in this subprocess data field.
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
 * Wait for a process to finish, and store its processID
 * @param {String} processID - Process ID to wait for.
 * @param {Number} [interval] - Amount of time in milliseconds between checks. Defaults to 500.
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
      this.stop(p, 1, 'prwt: Insufficient permissions to access process ' + processID + '.');
    }
  };

  /**
 * Collate data from previous subprocess steps into an array.
 * @param {Number} steps - Number of previous steps to collate. Zero value means all previous steps.
 * @example
 * coll(0)   // collate data of all previous steps
 * coll(5)   // collate data of the last five steps
 */
  this.coll = function (p, steps) {
    // TODO coll(2,2) collect every second step for the last 4=2*2 steps
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') collating subprocess data for ' + steps + ' steps'); }
    if (typeof steps === 'undefined' || steps === 0) { steps = global.hybridd.proc[p.parentID].step; } // default: collate all previous steps
    if (steps > global.hybridd.proc[p.parentID].step) { steps = global.hybridd.proc[p.parentID].step; } // avoid reads beyond the first processID
    var data = [];
    for (var i = global.hybridd.proc[p.parentID].step - steps; i < global.hybridd.proc[p.parentID].step; i += 1) {
      data.push(global.hybridd.proc[p.parentID + '.' + i].data);
    }
    this.next(p, 0, data);
  };

  /**
 * Logs data to console
 * @param {Number} level - Log level between 0-2.
 * @param {String} log - The message you want to log.
 * @param {Object} [data] -  Store data in this subprocess data field. (Passed to parent process on stop.)
 * @example
 * logs(0,"Nice dude!")    // logs "[.] Nice dude!" to console
 * logs(1,"I like you")    // logs "[i] I like you" to console
 * logs(2,"Be careful")    // logs "[!] Be careful" to console
 */
  this.logs = function (p, level, log) {
    if (typeof log === 'undefined') { log = global.hybridd.proc[p.processID].data; }
    console.log(' [' + (level === 2 ? '!' : (level == 1 ? 'i' : '.')) + '] ' + (typeof log === 'string' ? log : JSON.stringify(log)));
    this.next(p, 0, global.hybridd.proc[p.processID].data);
  };

  /**
 * Pass data to parent process
 * @param {Object} data -  Store data in this subprocess data field. Passed to parent process.
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
 * @param {String} data - String to turn into a JSON object.
 * @param {String} [default] - In case of failure pass default.
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
 * @param {Object} data - String to turn into a JSON object.
 * @example
 * jstr()         // input: {key:"Some data."}, output: '{key:"Some data."}'
 */
  this.jstr = function (p, xdata) {
    this.next(p, 0, JSON.stringify(global.hybridd.proc[p.processID].data));
  };

  /**
 *Set progress of parent process
 * @param {Number} step - Current step in the progress. (Value -1 restores automatic progress reporting.)
 * @param {Number} steps - Total amount of steps.
 * @param {Object} [data] - Store data in this subprocess data field. (Passed to parent process on stop.)
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
 * Set timeout of current process
 * @param {Number} millisecs -  Amount of milliseconds to wait.
 * @param {Object} [data] - Store data in this subprocess data field.
 * @example
 * time()                  // set unlimited timeout
 * time(0)                 // immediately timeout the process
 * time(1000)              // set timeout to one second
 */
  this.time = function (p, millisecs) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') timeout for process forced to ' + (millisecs ? millisecs + 'ms' : 'indefinite')); }
    if (typeof millisecs === 'undefined') { millisecs = -1; }
    // increase timeout of all siblings
    var loopid;
    for (var i = global.hybridd.proc[p.parentID].step; i <= global.hybridd.proc[p.parentID].steps; i += 1) {
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
    this.next(p, 0, global.hybridd.proc[p.processID].data);
  };

  /**
 * Stop processing and return data
 * @param {Number} err - Set the error flag of the subprocess.   (0 = no error, 1 or higher = error)
 * @param {Object} [data] - Store data in this subprocess data field. (Passed to parent process on stop.)
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
    scheduler.stop(p.processID, err, ydata);
  };

  /**
 * Set the type field of a process
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
 * Set data stream to a value
 * @param {Object} object - Object to fill the data stream with.
 * @example
 * data("test")            // Fill the data stream with 'test'.
 */
  this.data = function (p, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    this.next(p, 0, ydata);
  };

  /**
 * Fail processing and return message
 * @param {Number} [err] - Set the error flag of the subprocess.   (0 = no error, 1 (Default) or higher = error)
 * @param {Object} [data] - Message/data passed  to parent process.
 * @example
 * fail()                        // stop processing and set error to 1
 * fail("Something wrong")       // stop processing, set error to 1, and put "Something wrong." in main process data field
 * fail(404,"HELP! Not found.")  // stop processing, set error to 404, and put "HELP! Not found." in main process data field
 */
  this.fail = function (p, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    this.stop(p, 1, ydata);
  };

  /**
 * Jump forward or backward several instructions
 * @param {Number} step - Amount of instructions lines to jump.   (1 = jump forward 1 instruction, -2 = jump backward two instructions)
 * @example
 * jump(2)         // jump over the next instruction
 * jump(-3)        // jump backwards three instructions
 */
  this.jump = function (p, stepto) {
    global.hybridd.proc[p.processID].started = Date.now();
    if (stepto === 0 || typeof stepto === 'undefined') { stepto = 1; }
    if (stepto < 0) {
      var previd;
      for (var i = global.hybridd.proc[p.parentID].step + stepto; i < global.hybridd.proc[p.parentID].step; i += 1) {
        previd = p.parentID + '.' + i;
        global.hybridd.proc[previd].err = 0;
        global.hybridd.proc[previd].busy = false;
        global.hybridd.proc[previd].progress = 0;
        global.hybridd.proc[previd].started = Date.now();
        global.hybridd.proc[previd].stopped = null;
      }
    }
    global.hybridd.proc[p.parentID].busy = false;
    global.hybridd.proc[p.parentID].step = global.hybridd.proc[p.parentID].step + stepto;
    global.hybridd.proc[p.processID].err = 0;
    global.hybridd.proc[p.processID].busy = false;
    global.hybridd.proc[p.processID].progress = 1;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') jumping to step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    global.hybridd.proc[p.processID].stopped = Date.now();
  };
  /**
 * Test a condition and choose to jump
 * @param {Boolean} condition -  Javascript condition to test. (Example: a>5)
 * @param {Number} onTrue - Amount of instructions lines to jump when condition matches true.   (1 = jump forward 1 instruction, -2 = jump backward two instructions)
 * @param {Number} onFalse - Amount of instructions lines to jump when condition matches false.  (1 = jump forward 1 instruction, -2 = jump backward two instructions)
 * @param {Object} [data] -  Store data in this subprocess data field.
 * @example
 * test(a>3,1,-3)    // test if a>3, if true jump to the next instruction, if false jump back three instructions
 * test(b<=1,-4,1)   // test if b<=1, if true jump back four instructions, if false jump to the next instruction
 * test(a>3,-5)      // test if a>3, if true jump back five instructions, else default jump to the next instruction
 */
  this.test = function (p, condition, is_true, is_false) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') testing [' + condition + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    if (condition) {
      this.jump(p, is_true || 1);
    } else if (typeof is_false === 'undefined') {
      this.next(p, 0, global.hybridd.proc[p.processID].data);
    } else {
      this.jump(p, is_false);
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
 * @param {Number} onSuccess - amount of instructions lines to jump on success.
 * @param {Number} onError - amount of instructions lines to jump on failure.
 * @param {Object} [data] - Data to be passed on failure. If data is not defined then input is passed.
 * @example
 * tran(".foo",{foo:"bar"},1,2)                                         // Passes "bar" to next
 * tran(".foo.bar[2]",{foo:{bar:[0,1,5]}},1,2)                         // Passes 5 to next
 * tran(".foo.bar[2]",{foo:"bar"},1,2)                                 // Jumps 2 instructions and passes {foo:"bar"}
 * tran([".foo",".hello"],{foo:"bar",hello:"world"},1,2)               // Passes ["bar","world"] to next
 * tran({a:".foo",b:".hello",c:"test"},{foo:"bar",hello:"world"},1,2)  // Passes {a:"bar", b:"world", c:"test"} to next
 * tran("=.hello|default",{hello:"world"},1,2)                          // Passes "world" to next
 * tran("=.hello|default",{foo:"bar"},1,2)                              // Passes "default" to next
 */
  this.tran = function (p, property, is_valid, is_invalid) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') tran [' + JSON.stringify(property) + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    var testObject = global.hybridd.proc[p.processID].data;
    var checkVar = chckVar(p, property, testObject);
    if (checkVar.valid) {
      global.hybridd.proc[p.processID].data = checkVar.data;
      this.jump(p, is_valid);
    } else {
      this.jump(p, is_invalid || 1);
    }
  };
  /**
 * Find a string in an array of objects, and return the object it was found in
 * @param {Object} needle - The object to find
 * @param {Number} [onFound] - Where to jump when the data is found
 * @param {Number} [onNotFound] - Where to jump when the data is not found
 * @example
 * find({'id':'abcd'})      // input: [{'id':'abcd'},{'id':'efgh'}], output: {'id':'abcd'}
 */
  //
  this.find = function (p, findObject, found, not_found) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') find [' + JSON.stringify(property) + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    var searchArray = global.hybridd.proc[p.processID].data;
    var matches = [];
    var query;
    query = JSON.stringify(findObject).replace(new RegExp('^[{]*'), '').replace(new RegExp('[}]*$'), '');
    if (Object.prototype.toString.call(searchArray) !== '[object Array]') {
      searchArray = [].push(searchArray);
    }
    for (var i = 0; i < searchArray.length; i++) {
      if (JSON.stringify(searchArray[i]).indexOf(query) > -1) {
        matches.push(searchArray[i]);
      }
    }
    if (matches.length > 0) { // TODO: Do not return 'unwrapped' array if only one element!!!
      this.jump(p, found, matches.length === 1 ? matches[0] : matches);
    } else {
      this.jump(p, not_found || 1, searchArray);
    }
  };
  /**
 * Format a (floating point) number and return a neatly padded string
 * @param {Number} [factor] - Contains a number
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
 * Convert a number from atomic units, or convert to atomic units
 * @param {Number} [reduce] - When true reduces the input data
 * @param {Number} [factor] - Factor to use
 * @example
 * atom()     // input: 10, output: "10.00000000" (using $factor = 8)
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
      result = functions.padFloat(functions.fromInt(ydata, factor), factor);
    } else {
      result = functions.toInt(ydata, factor).toInteger();
    }
    this.next(p, 0, result);
  };
  /**
 * Explode string
 * @param {String} [separator] - Explode a string into an array, split by separator
 * @example
 * expl()     // input: "This is nice.", output: ["This","is","nice."]
 * expl(',')  // input: "Some,list,of,stuff", output: ["Some","list","of","stuff]
 */
  this.expl = function (p, separator) {
    if (typeof separator === 'undefined') { separator = ' '; }
    var result = global.hybridd.proc[p.processID].data.split(separator);
    this.next(p, 0, result);
  };
  /**
  /**
 * Implode array
 * @param {String} [separator] - Implode an array to a string, split by separator
 * @example
 * impl()     // input: ["This","is","nice."], output: "Thisisnice."
 * impl(' ')  // input: ["Some","list","of","stuff"], output: "Some list of stuff"
 */
  this.impl = function (p, separator) {
    if (typeof separator === 'undefined') { separator = ''; }
    var result = global.hybridd.proc[p.processID].data.join(separator);
    this.next(p, 0, result);
  };

  //  !!!!!
  //
  //  WE CONTINUE OPTIMIZING FROM HERE!!!!
  //
  //  !!!!!

  /**
 * Use API queue to perform a curl call to an external host.
 * @param {String} target - A string containing on of the following options
 * - "[user[:password]@]host[:port]"
 * - "asset://base[.mode]"
 * - "source://base[.mode]"
 * @param {String} querystring - A string containig the querypath  (Example: "/road/cars?color=red")
 * @param {String} [method] - GET (default) ,POST or PUT
 * @param {Object} [data] - post data passed to call
 * @param {Object} [headers] - http headers passed to call
 * @param {Object} [overwriteProperties] -
 * - retry: max nr of retries allowed
 * - throttle:
 * - timeout:
 * - interval:
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
    args.headers = headers;
    var queueObject = {
      'link': link,
      'target': target,
      'host': properties.host,
      'user': properties.user,
      'pass': properties.pass,
      'args': args,
      'method': method || 'GET',
      'retry': properties.retry,
      'throttle': properties.throttle,
      'timeout': properties.timeout,
      'interval': properties.retry,
      'pid': p.processID
    };

    // Remove undefined values (needed to let APIqueue set defaults)
    var cleanQueueObject = Object.keys(queueObject).reduce(
      function (cleanQueueObject, key) {
        if (typeof queueObject[key] !== 'undefined') {
          cleanQueueObject[key] = queueObject[key];
        }
        return cleanQueueObject;
      }, {});

    if (overwriteProperties) { // overwrite connection properties
      if (overwriteProperties.hasOwnProperty('pid')) { delete overwriteProperties.pid; }
      if (overwriteProperties.hasOwnProperty('link')) { delete overwriteProperties.link; }
      Object.assign(cleanQueueObject, overwriteProperties);
    }

    APIqueue.add(cleanQueueObject);
  };
  /**
 * Creates a new process by calling the command asynchronously.
 * @param {String} command -  A string containg the command path. "command/a/b". This calls command using $1 = "a", $2 = "b"
 * @param {Object} data -  Optional data to be passed to the new process
 * @param {Number} [childId] -  if undefined then the new process will be independant. If 0 or larger is will be instantiated as a child process of the current process.
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

    var requestPID = typeof childID === 'undefined' ? 0 : p.processID + '.' + childId; // PID+"."+childID for child process, "0" for independant process.
    var childPID = scheduler.init(requestPID, {data: ydata, sessionID: rootProcess.sessionID, recipe: rootProcess.recipe, path: path, command: command});

    // the command xpath passed to the Quartz function: "functionId/$1/$2/$3/..."
    modules.module[rootProcess.recipe.module].main.exec({processID: childPID, parentID: p.processID, target: rootProcess.recipe, mode: rootProcess.recipe.mode, factor: rootProcess.recipe.factor, command: command});

    return childPID;
  };
  /**
 * Creates a new process by calling the xpath command and wait for the data to be returned. (Combining fork and read)
 * @param {String} command -  A string containg the command path. "command/a/b". This calls command using $1 = "a", $2 = "b"
 * @param {Object} data -  Optional data to be passed to the new process
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
 * rout('/asset/dummy/balance/__dummyaddress__')   // retrieve the
  balance for the dummy asset
 */
  this.rout = function (p, xpath) {
    // TODO pass data to post
    var sessionID = global.hybridd.proc[p.processID.split('.')[0]].sid;
    var result = router.route({url: xpath, sessionID: sessionID});
    if (result.id === 'id') { // if result is a process that has te be awaited, then read that proces until finished
      this.read(p, result.data);
    } else {
      this.next(p, result.hasOwnProperty('error') ? result.error : 1, result.hasOwnProperty('data') ? result.data : null); // If it's a direct result pass it to next
    }
  };

  /**
 * Store a key value pair
 * @param {String} key - Key under which to store data
 * @param {Object} [value] - Value to store
 * @example
 * save("myFavoriteColor","blue")  // save "blue" as myFavoriteColor
 */
  this.save = function (p, key, value) {
    if (typeof value === 'undefined') { value = global.hybridd.proc[p.processID].data; }
    this.rout(p, ['engine', 'storage', 'set', encodeURIComponent(key), encodeURIComponent(JSON.stringify(value))]);
  };

  /**
 * Retrieve a value based on a key
 * @param {String} key - Key from which to retrieve data
 * @example
 * load("myFavoriteColor")  // retrieve the value for myFavoriteColor
 */
  this.load = function (p, key) {
    this.rout(p, ['engine', 'storage', 'get', encodeURIComponent(key)]); // TODO make sure that value is decoded as well (pass postprocess callback to rout and read?)
  };

  /**
 * Retrieve the meta data based on a key
 * @param {String} key - Key for which to get metadata
 * @example
 * meta("myFavoriteColor")  // retrieve the meta data for myFavoriteColor
 */
  this.meta = function (p, key) {
    this.rout(p, ['engine', 'storage', 'meta', encodeURIComponent(key)]);
  };

  /**
 * Wait for one or more processes to finish and return the results.
 * @param {String|Array<String>|Object<String>} processIDs - A string containing the processID or an array of strings containing multiple processIDs
 * @param {Number} interval - The amount of millisecs between each check if processes are finished
 * @example
 * read("123456")                   //Wait for process 123456 to finish and return its data.
 * read(["123456","654321"])        //Wait for processes 123456 and 654321 to finish and return their data combined into an array.
 *read({"a":null,"b":34})        //Wait for processes 123456 and 654321 to finish and return their data combined into an object with property labels a and b.
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
      var finished;
      if (typeof processIDs === 'string') { // single
        finished = global.hybridd.proc[processIDs].progress >= 1 || global.hybridd.proc[processIDs].stopped > 1;
      } else if (processIDs instanceof Array) { // array
        finished = processIDs.reduce(function (finished, processID) {
          return finished && (global.hybridd.proc[processID].progress >= 1 || global.hybridd.proc[processID].stopped > 1);
        }, true);
      } else { // dictionary
        for (var key in processIDs) {
          var processID = processIDs[key];
          finished = true;
          if (global.hybridd.proc[processID].progress < 1 && global.hybridd.proc[processID].stopped <= 1) {
            finished = false;
            break;
          }
        }
      }

      if (finished) {
        var result;
        if (typeof processIDs === 'string') { // single
          result = {data: global.hybridd.proc[processIDs].data, err: global.hybridd.proc[processIDs].err};
        } else if (processIDs instanceof Array) { // array
          result = processIDs.reduce(function (result, processID) {
            return {data: result.data.concat([global.hybridd.proc[processID].data]), err: Math.max(result.err, global.hybridd.proc[processID].err)};
          }, {data: [], err: 0});
        } else { // dictionary
          result = {data: {}, err: 0};
          for (var key in processIDs) {
            var processID = processIDs[key];
            result.data[key] = global.hybridd.proc[processID].data;
            result.err = Math.max(global.hybridd.proc[processID].err, result.err);
          }
        }
        this.next(p, result.err, result.data);
      } else {
        setTimeout(function (p, processIDs, millisecs, quartz) {
          quartz.read(p, processIDs, millisecs);
        }, millisecs || 500, p, processIDs, millisecs || 500, this);
      }
    } else {
      this.stop(p, 1, 'read: Insufficient permissions to access processes ' + processIDs + '.');
    }
  };
  /**
 * Loop through elements of a container execute a given function for each element.
 * @param {String} command -  A string containg the command path. "command/a/b". This calls command using $1 = "a", $2 = "b"
 * @param {Object} data -  Optional data to be passed to the new process
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
 * @param {String} key - Variable name to get data from.
 * @param {String} value - The data to store in the variable. This is also stored in this subprocess data field.
 * @param {Object} [data] -  Store data in this subprocess data field.
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
    var process = global.hybridd.proc[p.processID];

    var scope;
    var subKey;
    var rootID = p.processID.substring(0, p.processID.indexOf('.'));
    var rootProcess = global.hybridd.proc[rootID];
    if (keySplit.length === 2) {
      scope = keySplit[0];
      subKey = keySplit[1];
      if (scope === 'proc') { // proc::key
        rootProcess.vars[subKey] = qdata;
      } else if (scope === 'local' || scope === '') { // local::key
        if (rootProcess.recipe.vars !== 'object') {
          rootProcess.recipe.vars = {};
        }
        rootProcess.recipe.vars[subKey] = qdata;
        fs.writeFileSync('../var/recipes/' + rootProcess.recipe.filename, JSON.stringify(rootProcess.recipe.vars));
      } else { // otherRecipe::key
        return this.stop(p, 1, 'poke: Not allowed to write to other recipe property.');
      }
      return this.next(p, 0, global.hybridd.proc[p.processID].data);
    } else if (keySplit.length === 3) {
      return this.stop(p, 1, 'poke: Not allowed to write to local variable of other recipe.');
    } else if (typeof key === 'number') { // 0,1,2,3,   or fee
      return this.stop(p, 1, 'poke: Not allowed to write to command array.');
    } else {
      if (!rootProcess.recipe.hasOwnProperty(key)) {
        rootProcess.vars[key] = qdata;
        return this.next(p, 0, global.hybridd.proc[p.processID].data);
      } else {
        return this.stop(p, 1, 'poke: Not allowed to write to recipe property.');
      }
    }
  };
  /**
 * Gets data from a variable that was defined by poke. Used inside of other instructions.
 * @param {String} key - Variable name to get data from.
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
    var keySplit = key.split('::');
    var process = global.hybridd.proc[p.processID];
    var rootID = p.processID.substring(0, p.processID.indexOf('.'));
    var rootProcess = global.hybridd.proc[rootID];

    if (keySplit.length === 2) {
      var scope = keySplit[0];
      var subKey = keySplit[1];
      if (scope === 'proc') { // proc::key
        if (rootProcess.hasOwnProperty('vars')) {
          pdata = rootProcess.vars[subKey];
        }
      } else if (scope === 'local' || scope === '') { // local::key
        if (rootProcess.recipe.hasOwnProperty('vars')) {
          pdata = rootProcess.recipe.vars[subKey];
        }
      } else { // otherRecipe::key
        if (global.hybridd.asset.hasOwnProperty(scope) && global.hybridd.asset[scope].hasOwnProperty(subKey)) {
          pdata = global.hybridd.asset[scope][subKey];
        } else if (global.hybridd.source.hasOwnProperty(scope) && global.hybridd.source[scope].hasOwnProperty(subKey)) {
          pdata = global.hybridd.source[scope][subKey];
        } else if (global.hybridd.engine.hasOwnProperty(scope) && global.hybridd.engine[scope].hasOwnProperty(subKey)) {
          pdata = global.hybridd.engine[scope][subKey];
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
        this.stop(p, 1, 'peek: unrecognized subscope ' + subScope + ' for ' + key + '.');
        return;
      }
    } else if (typeof key === 'number') { // 0,1,2,3
      pdata = rootProcess.command ? rootProcess.command[key] : undefined;
    } else if (rootProcess.recipe.hasOwnProperty(key)) { // fee
      pdata = rootProcess.recipe[key];
    } else {
      pdata = rootProcess.vars[key];
    }
    this.next(p, 0, pdata);
  };
  /**
 * Calculates numbers and variables. Mathematical calculations can be done with very large numbers.
 * @param {String} equation - String to calculate outcome of.
 * @example
 *  math("10*34+8-(3^4)")  // returns 267
 *  math("data^2*5")       // returns the value of data to the power of two times five
 */
  this.math = function (p, equation) {
    var data = global.hybridd.proc[p.processID].data;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') math [' + equation + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }

    equation = '(new Decimal(' + String(equation)
      .replace(/\(/g, 'new Decimal(')
      .replace(/\^/g, ').toPower(')
      .replace(/\*/g, ').times(')
      .replace(/\//g, ').dividedBy(')
      .replace(/\+/g, ').plus(')
      .replace(/\-/g, ').minus(') + ').toString());';

    // add quotes to all numbers
    equation = equation.replace(/[+-]?([0-9]*[.])?[0-9]+/g, function (str) {
      return "'" + str + "'";
    });

    // add quotes to all hexadecimals
    /* TODO
    equation = equation.replace(/0[xX][0-9a-fA-F]+/g, function(str) {
      return "'"+str+"'";
    });  more info: https://stackoverflow.com/questions/9221362/regular-expression-for-a-hexadecimal-number */

    // make sure equation does not reference itself
    equation = equation.replace('equation', '0');

    this.next(p, 0, (eval(equation)));
  };
  /**
 * Create a sha256 hash from an input string.
 * @param {String} method - Method to use for hashing, defaults to SHA256
 * @example
 *  hash("this_is_my_data")  // returns the hash: 5322fecfc92a5e3248a297a3df3eddfb9bd9049504272e4f572b87fa36d4b3bd
 */
  // TODO: Implement method DJB2
  this.hash = function (p, method) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') hash [' + global.hybridd.proc[p.processID].data + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    var hash = nacl.to_hex(nacl.crypto_hash_sha256(global.hybridd.proc[p.processID].data));
    this.next(p, 0, hash);
  };

  /**
 * Change encoding of a string from one format to the other.
 * @param {String} target - Target encoding
 * @param {String} source - Source encoding
 * @param {String} string - String to change encoding
 * @example
 *  code(base58,utf8)  // input: "this_is_my_data", returns: TODO
 *  code(hex,base58)   // input: "this_is_my_data", returns: TODO
 */
  this.code = function (p, source, target) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') code [' + input + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    var input = global.hybridd.proc[p.processID].data;
    if (typeof target === 'undefined') { target = source; source = 'utf-8'; }
    if (!target) { target = 'utf-8'; }
    // variables
    var encoder;
    var interim;
    var string;
    var output = null;
    var BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    // decode
    switch (source) {
      case 'base58':
        encoder = require('base-x')(BASE58);
        interim = new Buffer(encoder.decode(input)).toString();
        break;
      case 'hex':
        interim = decodeURIComponent(input.replace(/(..)/g, '%$1'));
        break;
      default:
        interim = input;
        break;
    }
    // encode
    switch (target) {
      case 'base58':
        encoder = require('base-x')(BASE58);
        output = encoder.encode(new Buffer(interim));
        break;
      case 'hex':
        output = unescape(encodeURIComponent(interim))
          .split('').map(function (v) {
            return v.charCodeAt(0).toString(16);
          }).join('');
        break;
      default:
        output = interim;
        break;
    }
    this.next(p, 0, output);
  };
  /**
 * Trim an input string
 * @param {String} string - String to trim
 * @param {Integer} offset - Amount of characters to trim from start
 * @param {Integer} ending - Amount of characters to include or trim from end
 * @example
 *  trim(5)     // input: 'this_is_my_data', output: 'is_my_data'
 *  trim(-5)    // input: 'this_is_my_data', output: '_data'
 *  trim(4,7)   // input: 'this_is_my_data', output: '_is_my_'
 *  trim(5,-5)  // input: 'this_is_my_data', output: 'is_my'
 */
  this.trim = function (p, offset, ending) {
    var input = global.hybridd.proc[p.processID].data;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') trim [' + input + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    var result;
    if (ending > 0 || ending < 0) {
      if (offset < 1) { offset = 0; }
      if (ending > 0) {
        result = input.substr(offset, ending);
      } else {
        result = input.substr(offset, input.length - offset + ending);
      }
    } else {
      result = input.substr(offset);
    }
    this.next(p, 0, result);
  };

  /**
 * Sort data by using a certain method
 * @param {String} input - Array, object or string to sort.
 * @param {String} method - Array of methods to employ.
 * @example
 *  sort()                                          // input: 'BADEFC', sorts the object ascending by value: 'ABCDEF'
 *  sort('desc')                                    // input: [10,8,5,9], sorts the object descending by value: [10,9,8,5]
 *  sort(['val','asc'])                             // input: {'a':'z','b':'x','c':'y'}, sorts the object ascending by value: [{'b':'x'},{'c':'y'},{'c':'z'}]
 *  sort(['key','desc'])                            // input: {'a':2,'b':1,'c':3}, sorts the object descending by key:  [{'c':3},{'b':1},{'a':2}]
 *  sort(['val','num','asc'])                       // input: {'a':1,'b':10,'c':3}, sorts the object ascending by numeric value:  [{'a':1},{'c':3},{'b':10}]
 *  sort(['.b'])                                    // input: [{'a':4,'b':'B'},{'a':2,'b':'A'}], sorts the array by object key 'b': [{'a':2,'b':'A'},{'a':4,'b':'B'}]
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
      // make key value index for unspents
      var unordered = {};
      for (var i in arr) {
        unordered[arr[i][key]] = i;
      }
      // sort unspent list
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
