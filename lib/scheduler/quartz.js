var router = require('../router');
var modules = require('../modules');
var scheduler = require('../scheduler');
var functions = require('../functions'); // only required for   procinfo[0] = functions.implode('.', pieces);

var IoC = require('../../common/ioc.client/ioc.nodejs.client');
var ioc = new IoC.Interface({http: require('http')});

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
 * wait(1000,"WOOT!")   // wait for one second and fill subprocess data field with value "WOOT!"
 */
  this.wait = function (p, millisecs, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') waiting at ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }

    if (global.hybridd.proc[p.parentID].timeout > 0 && millisecs < global.hybridd.proc[p.parentID].timeout && global.hybridd.proc[p.parentID].timeout !== -1) {
      global.hybridd.proc[p.parentID].timeout = global.hybridd.proc[p.parentID].timeout + millisecs;
    }
    if (global.hybridd.proc[p.processID].timeout > 0 && millisecs < global.hybridd.proc[p.processID].timeout && global.hybridd.proc[p.processID].timeout !== -1) {
      global.hybridd.proc[p.processID].timeout = global.hybridd.proc[p.processID].timeout + millisecs;
    }
    if (millisecs) { // if no millisecs are given, this proces will wait indefenitly
      setTimeout(function (p, ydata) {
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
  this.logs = function (p, level, log, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    console.log(' [' + (level === 2 ? '!' : (level == 1 ? 'i' : '.')) + '] ' + log);
    this.next(p, 0, ydata);
  };
  /**
 * Pass data to parent process
 * @param {Object} data -  Store data in this subprocess data field. Passed to parent process.
 * @example
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
 * jpar("{key:'Some data.'}")              // returns {key:"Some data."}
 * jpar("{key:'Some data.'",'failed')      // returns "failed"
 */
  this.jpar = function (p, xdata, failvalue) {
    // TODO maybe a jump instead of default
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') parsing string data to JSON object'); }
    try {
      ydata = JSON.parse(ydata);
    } catch (e) {
      if (typeof failvalue !== 'undefined') {
        ydata = failvalue;
      } else {
        ydata = null;
      }
    }
    this.next(p, 0, ydata);
  };
  /**
 * Turns JSON object into a string.
 * @param {Object} data - String to turn into a JSON object.
 * @example
 * jstr({key:'Some data.'}) // returns '{key:"Some data."}'
 * jstr(12)                 // returns '12'
 */
  this.jstr = function (p, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    this.next(p, 0, JSON.stringify(ydata));
  };
  /**
 *Set progress of parent process
 * @param {Number} step - Current step in the progress. (Value -1 restores automatic progress reporting.)
 * @param {Number} steps - Total amount of steps.
 * @param {Object} [data] - Store data in this subprocess data field. (Passed to parent process on stop.)
 * @example
 * prog(20,40)  // progress is set to 0.5 (which means 50%)
 * prog(-1)     // restore automatic progress reporting
 */
  //
  this.prog = function (p, step, steps, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') progress reset to ' + step + ' of ' + steps); }
    if (typeof steps === 'undefined') { steps = 1; }
    if (step === -1) {
      global.hybridd.proc[p.parentID].autoprog = true;
    } else {
      global.hybridd.proc[p.parentID].progress = step / steps;
      global.hybridd.proc[p.parentID].autoprog = false;
    }
    this.next(p, 0, ydata);
  };
  /**
 * Set timeout of current process
 * @param {Number} millisecs -  Amount of milliseconds to wait.
 * @param {Object} [data] - Store data in this subprocess data field.
 * @example
 * time(0)                 // unlimited timeout
 * time(8000,"Timeout!")   // set a timeout of 8 seconds for the process and return "Timeout!"
 */
  //
  this.time = function (p, millisecs, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') timeout for process forced to ' + (millisecs ? millisecs + 'ms' : 'indefinite')); }
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
    this.next(p, 0, ydata);
  };
  /**
 * Stop processing and return data
 * @param {Number} err - Set the error flag of the subprocess.   (0 = no error, 1 or higher = error)
 * @param {Object} [data] - Store data in this subprocess data field. (Passed to parent process on stop.)
 * @example
 *   stop(1)                         // stop processing and set error to 1
 *  stop(0,"Everything is ok.")     // stop processing, set no error, and put "Everything is ok." in main process data field
 *  stop(404,"HELP! Not found.")    // stop processing, set error to 404, and put "HELP! Not found." in main process data field
 */
  this.stop = function (p, err, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    global.hybridd.proc[p.processID].busy = false;
    global.hybridd.proc[p.processID].err = (typeof err === 'undefined' ? 1 : err);
    if (err === 0) {
      global.hybridd.proc[p.processID].progress = 1; // only set progress when without error, else keep progress info as error indication
    }
    global.hybridd.proc[p.processID].stopped = Date.now();
    global.hybridd.proc[p.processID].data = ydata;
    global.hybridd.proc[p.parentID].busy = false;
    global.hybridd.proc[p.parentID].err = (typeof err === 'undefined' ? 1 : err);
    global.hybridd.proc[p.parentID].progress = 1; // TODO if error recalc using process.progress
    global.hybridd.proc[p.parentID].stopped = Date.now();
    global.hybridd.proc[p.parentID].data = ydata;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') stopped at step ' + (global.hybridd.proc[p.parentID].step <= global.hybridd.proc[p.parentID].steps ? global.hybridd.proc[p.parentID].step + 1 : 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
  };
  /**
 * Fail processing and return message
 * @param {Number} [err] - Set the error flag of the subprocess.   (0 = no error, 1 (Default) or higher = error)
 * @param {Object} [data] - Message/data passed  to parent process.
 * @example
 * fail()                        // stop processing and set error to 1
 * fail("Something wrong")       // stop processing, set error to 0, and put "Something wrong." in main process data field
 * fail(404,"HELP! Not found.")  // stop processing, set error to 404, and put "HELP! Not found." in main process data field
 */
  //
  this.fail = function (p, xdata) {
    this.stop(1, xdata);
  };
  /**
 * Jump forward or backward several instructions
 * @param {Number} step - Amount of instructions lines to jump.   (1 = jump forward 1 instruction, -2 = jump backward two instructions)
 * @param {Object} [data] - Store data in this subprocess data field.
 * @example
 * jump(2)         // jump over the next instruction
 * jump(-3)        // jump backwards three instructions
 * jump(1,"Yo!")   // step to the next instruction, and fill data field of this subprocess with "Yo!"
 */
  this.jump = function (p, stepto, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
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
    global.hybridd.proc[p.processID].data = ydata;
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
  //
  this.test = function (p, condition, is_true, is_false, data) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') testing [' + condition + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    if (condition) {
      this.jump(p, is_true, data);
    } else if (typeof is_false === 'undefined') {
      this.next(p, 0, data);
    } else {
      this.jump(p, is_false, data);
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
   * tran (".foo.bar[2]",{foo:{bar:[0,1,5]}},1,2)                         // Passes 5 to next
   * tran (".foo.bar[2]",{foo:"bar"},1,2)                                 // Jumps 2 instructions and passes {foo:"bar"}
   * tran ([".foo",".hello"],{foo:"bar",hello:"world"},1,2)               // Passes ["bar","world"] to next
   * tran ({a:".foo",b:".hello",c:"test"},{foo:"bar",hello:"world"},1,2)  // Passes {a:"bar", b:"world", c:"test"} to next
   * tran("=.hello|default",{hello:"world"},1,2)                          // Passes "world" to next
   * tran("=.hello|default",{foo:"bar"},1,2)                              // Passes "default" to next
 */
  this.tran = function (p, property, testObject, is_valid, is_invalid, xdata) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') tran [' + JSON.stringify(property) + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    var checkVar = chckVar(p, property, testObject);
    if (checkVar.valid) {
      this.jump(p, is_valid, xdata || checkVar.data); // xdata instead of ydata is passed on purpose
    } else if (typeof is_invalid === 'undefined') {
      this.next(p, 0, typeof xdata !== 'undefined' ? xdata : testObject); // xdata instead of ydata is passed on purpose
    } else {
      this.jump(p, is_invalid, typeof xdata !== 'undefined' ? xdata : testObject); // xdata instead of ydata is passed on purpose
    }
  };
  /**
 * Find a string in an array of objects, and return the object it was found in
 * @param {Object} needle - TODO
 * @param {Array} haystack - TODO
 * @param {Number} onFound - TODO
 * @param {Number} onNotFound - TODO
 * @param {Object} [data] - TODO
 */
  //
  this.find = function (p, findObject, searchArray, found, not_found, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') find [' + JSON.stringify(property) + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }

    var matches = []; var query;
    query = JSON.stringify(findObject).replace(new RegExp('^[{]*'), '').replace(new RegExp('[}]*$'), '');
    if (Object.prototype.toString.call(searchArray) !== '[object Array]') {
      searchArray = [].push(searchArray);
    }
    for (var i = 0; i < searchArray.length; i++) {
      if (JSON.stringify(searchArray[i]).indexOf(query) > -1) {
        matches.push(searchArray[i]);
      }
    }
    if (matches.length > 0) {
      this.jump(p, found, matches.length === 1 ? matches[0] : matches);
    } else if (typeof not_found === 'undefined') {
      this.next(p, 0, ydata);
    } else {
      this.jump(p, not_found, ydata);
    }
  };
  /**
 * Format a (floating point) number and return a neatly padded string
 * @param {Object} data - Contains a number
 * @param {Number} factor - Contains a number
 * @param {String} [convert] - Option to convert to or from atomic units. ( 0 or 'none', 1 or 'reduce', 2 or 'atomic')
 * @example
 * form(10,  8)    // Returns "10.00000000"
 * form(0.8, 4)    // Returns "0.8000"
 */
  //
  this.form = function (p, xdata, factor, convert) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;

    if (DEBUG) { console.log(' [D] (' + p.parentID + ') form [' + JSON.stringify(ydata) + ',' + JSON.stringify(factor) + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    var result = null;
    if (typeof convert === 'undefined' || !convert || convert === 'none') {
      result = padFloat(ydata, factor);
    } else if (convert === 1 || convert === 'reduce') {
      result = padFloat(fromInt(ydata, factor), factor);
    } else if (convert === 2 || convert === 'atomic') {
      result = toInt(ydata, factor).toInteger();
    }
    this.next(p, 0, result);
  };
  /**
 * Explode string
 * @param {String} seperator - TODO
 * @param {String} data - TODO
 */
  this.expl = function (p, seperator, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    var result = ydata.split(seperator);
    this.next(p, 0, result);
  };
  /**
  /**
 * Explode string
 * @param {String} seperator - TODO
 * @param {Array<String>} data - TODO
 */
  this.impl = function (p, seperator, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    var result = ydata.join(seperator);
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
 * - rejectUnauthorized Whether to reject TLS unauthorized
errors. (Defaults to true)
 */
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
 * Creates a new process by calling the xpath command on target asynchronously.
 * @param {String} target -  A string containing on of the following options
 * - "asset://base[.mode]"
 * - "source://base[.mode]"
 * - "engine://base[.mode]"
 * @param {String} path -  A string containg the command path. "command/a/b". This calls command using $1 = "a", $2 = "b"
 * @param {Object} data -  Optional data to be passed to the new process
 * @param {Number} childId -  if undefined then the new process will be
independant. If 0 or larger is will be instantiated as a child process
of the current process.
* @example
* fork("asset://dummy","balance/_dummyaddress_")   // Starts a process to
  retrieve the dummy balance and continue without waiting for a reply.
 */
  this.fork = function (p, target, xpath, xdata, childId) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;

    var requestPID = typeof childID === 'undefined' ? 0 : p.processID + '.' + childId; // PID+"."+childID for child process, "0" for independant process.
    var childPID = scheduler.init(requestPID, {data: ydata});
    var childRecipe;

    if (target.substr(0, 8) === 'asset://') { // target = "asset://base.mode"
      target = target.substring(8, target.length); // target = "base.mode"
      childRecipe = global.hybridd.asset[target];
    } else if (target.substr(0, 9) === 'source://') { // target = "source://base.mode"
      target = target.substring(9, target.length); // target = "base.mode"
      childRecipe = global.hybridd.source[target];
    } else if (target.substr(0, 9) === 'engine://') { // target = "engine://base.mode"
      target = target.substring(9, target.length); // target = "base.mode"
      childRecipe = global.hybridd.engine[target];
    } else {
      stop(p, 1, "call: Target not found: '" + target + "'!");
      return 0;
    }
    // the command xpath passed to the Quartz function: "functionId/$1/$2/$3/..."
    modules.module[childRecipe.module].main.exec({processID: childPID, parentID: p.processID, target: childRecipe, mode: childRecipe.mode, factor: childRecipe.factor, command: xpath.split('/')});

    return childPID;
  };
  /**
 * Creates a new process by calling the xpath command on target and wait
for the data to be returned. (Combining fork and read)
 * @param {String} target -  A string containing on of the following options
 * - "asset://base[.mode]"
 * - "source://base[.mode]"
 * - "engine://base[.mode]"
 * @param {String} path -  A string containg the command path. "command/a/b". This calls command using $1 = "a", $2 = "b"
 * @param {Object} data -  Optional data to be passed to the new process
 * @example
 * call("asset://dummy","balance/_dummyaddress_")          // Retrieve the
  dummy balance and pass it to next step.
 */
  this.call = function (p, target, xpath, xdata) {
    console.log(JSON.stringify(global.hybridd.proc[p.processID]));
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    this.read(p, this.fork(p, target, xpath, ydata, 0));
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
    var result = router.route({url: xpath, sessionID: sessionID}, modules);
    var r = JSON.parse(result);
    if (r.id === 'id') { // if result is a process that has te be awaited, then read that proces until finished
      this.read(p, r.data);
    } else {
      this.next(p, r.hasOwnProperty('error') ? r.error : 1, r.hasOwnProperty('data') ? r.data : null); // If it's a direct result pass it to next
    }
  };
  /**
 * Wait for one or more processes to finish and return the results.
 * @param {String|Array<String>|Object<String>} processIDs - A string containing the processID or an array of strings containing multiple processIDs
 * @param {Number} interval - The amount of millisecs between each check if processes
are finished
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
 * Loop through elements of a container execute a given function for each
element.
 * @param {String} target -  A string containing on of the following options
- "asset://base[.mode]"
- "source://base[.mode]"
- "engine://base[.mode]"
 * @param {String} path -  A string containg the command path. "command/a/b". This calls command using $1 = "a", $2 = "b"
 * @param {Object} data -  Optional data to be passed to the new process
 * @example
 * each(["a","b","c"], "asset://dummy","test")     //  calls
  asset://dummy/test with data = {key=0, value="a"} and further
 * each({"a":0,"b":1,"c":2}, "asset://dummy","test")     //  calls
  asset://dummy/test with data = {key="a", value=0} and further
 */
  this.each = function (p, container, target, xpath, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;

    var processIDs;
    if (container instanceof Array) { // Array
      processIDs = [];
      for (var key = 0; key < container.length; ++key) {
        processIDs.push(this.fork(p, target, xpath, {data: ydata, container: container, key: key, value: container[key]}, key));
      }
    } else { // Dictionary
      processIDs = {};
      var index = 0;
      for (var key in container) {
        processIDs[key] = this.fork(p, target, xpath, {data: ydata, container: container, key: key, value: container[key]}, index);
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
 *  poke("thisnum",55) // poke 55 into variable "thisnum"
 *  poke("coolness","Wooty.")   // poke "Wooty." into variable "coolness"
 */
  this.poke = function (p, variable, pokedata, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;

    if (DEBUG) { console.log(' [D] (' + p.parentID + ') poke [' + JSON.stringify(variable) + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    // get root parent
    var rootID = p.processID.substring(0, p.processID.indexOf('.'));
    // store poke data in root process
    global.hybridd.proc[rootID].vars[variable] = pokedata;
    this.next(p, 0, ydata);
  };
  /**
 * Gets data from a variable that was defined by poke. Used inside of other instructions.
 * @param {String} key - Variable name to get data from.
 * @example
 * poke("thisnum",55) // poke 55 into variable "thisnum"
 * peek("thisnum")     // returns 55
 */
  this.peek = function (p, variable) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') peek [' + JSON.stringify(variable) + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    // get root parent
    var rootID = p.processID.substring(0, p.processID.indexOf('.'));
    // set data to what is peeked
    var pdata = null;
    if (typeof global.hybridd.proc[rootID].vars !== 'undefined') {
      if (typeof global.hybridd.proc[rootID].vars[variable] !== 'undefined') {
        pdata = global.hybridd.proc[rootID].vars[variable];
      }
    }
    return pdata;
  };
  /**
 * Initiates a client stack program. This stack can be filled using step and executed using exec.
 * @example
 * init()     // Initiates a IoC client lib stack program.
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
  this.exec = function (p, xdata, onSuccess, onError) {
    var ydata = typeof (xdata === 'undefined' && xdata !== 'number') ? global.hybridd.proc[p.processID].data : xdata;
    var dataCallback = (data) => { this.jump(p, onSuccess || 1, data); };
    var errorCallback = (error) => {
      if (typeof onError === 'undefined') {
        this.next(p, 1, error);
      } else {
        this.jump(p, onError, error);
      }
    };
    var progressCallback = () => {};
    ioc.sequential(ydata, dataCallback, errorCallback, progressCallback);
  };
};

exports.Quartz = Quartz; // initialize a new process
