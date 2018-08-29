var router = require('../router');
var modules = require('../modules');
var scheduler = require('../scheduler');
var functions = require('../functions'); // only required for   procinfo[0] = functions.implode('.', pieces);

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
var quartz = {

  /**
 * TODO call an external module function (To be removed)
 * @param {String} module - TODO
 * @param {String} funcname - TODO
 * @param {[Object]} data - TODO
 */
  func: function (p, module, funcname, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') function call to module ' + module + ' -> ' + funcname); }
    if (typeof ydata !== 'object') { ydata = {}; }
    ydata.processID = p.processID;
    modules.module[module].main[ funcname ](ydata);
  },

  /**
 * TODO
 * @param {Number} err - TODO
 * @param {[object]} data - TODO
 */
  next: function (p, err, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    global.hybridd.proc[p.processID].err = (typeof err === 'undefined' ? 1 : err);
    global.hybridd.proc[p.processID].busy = false;
    global.hybridd.proc[p.processID].progress = 1;
    global.hybridd.proc[p.processID].stopped = Date.now();
    global.hybridd.proc[p.processID].data = ydata;
  },

  /**
 * Output information to the console
 * @param {[object]} data - TODO
 */
  dump: function (p, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    console.log('[D] (' + p.parentID + ') dump: ' + JSON.stringify(ydata));
    quartz.next(p, 0, ydata);
  },

  /**
 * Wait a specified amount of time
 * @param {Number} millisecs - TODO
 * @param {[Object]} data - TODO
 */
  wait: function (p, millisecs, xdata) {
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
        quartz.next(p, 0, ydata);
      }, millisecs, p, ydata);
    }
  },
  /**
 * Wait for a process to finish, and store its processID
 * @param {String} processID - TODO
 * @param {Number} millisecs - TODO
 */
  //
  prwt: function (p, processID, millisecs) {
    if (global.hybridd.proc[p.processID].sessionID === 1 || global.hybridd.proc[p.processID].sessionID === global.hybridd.proc[processID].sessionID) {
      if (typeof global.hybridd.proc[processID] !== 'undefined') {
        if (global.hybridd.proc[processID].progress >= 1 || global.hybridd.proc[processID].stopped > 1) {
          quartz.next(p, global.hybridd.proc[processID].err, {processID: processID});
        } else {
          setTimeout(function (p, processID, millisecs) {
            quartz.prwt(p, processID, millisecs);
          }, millisecs || 500, p, processID, millisecs || 500);
        }
        if (DEBUG) { console.log(' [D] (' + p.parentID + ') processwait at ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
      }
    } else {
      quartz.stop(p, 1, 'prwt: Insufficient permissions to access process ' + processID + '.');
    }
  },
  /**
 * Collate data from previous subprocess steps
 * @param {Number} steps - TODO
 */
  coll: function (p, steps) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') collating subprocess data for ' + steps + ' steps'); }
    if (typeof steps === 'undefined' || steps === 0) { steps = global.hybridd.proc[p.parentID].step; } // default: collate all previous steps
    if (steps > global.hybridd.proc[p.parentID].step) { steps = global.hybridd.proc[p.parentID].step; } // avoid reads beyond the first processID
    var data = [];
    for (var i = global.hybridd.proc[p.parentID].step - steps; i < global.hybridd.proc[p.parentID].step; i += 1) {
      data.push(global.hybridd.proc[p.parentID + '.' + i].data);
    }
    quartz.next(p, 0, data);
  },
  /**
 * Logs data to console
 * @param {Number} err - TODO
 * @param {String} log - TODO
 * @param {[Object]} data - TODO
 */
  logs: function (p, level, log, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    console.log(' [' + (level === 2 ? '!' : (level == 1 ? 'i' : '.')) + '] ' + log);
    quartz.next(p, 0, ydata);
  },
  /**
 * Pass data to parent process
 * @param {Object} data - TODO
 */
  pass: function (p, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') passing subprocess data to parent process'); }
    global.hybridd.proc[p.parentID].data = ydata;
    quartz.next(p, 0, ydata);
  },
  /**
 * Parse string data to JSON object
 * @param {[Object]} data - TODO
 * @param {[Object]} default - TODO
 */
  //
  jpar: function (p, xdata, failvalue) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') parsing string data to JSON object'); }
    // var err = 0;
    try {
      ydata = JSON.parse(ydata);
    } catch (e) {
    // err = 1;
      if (typeof failvalue !== 'undefined') {
        ydata = failvalue;
      } else {
        ydata = null;
      }
    }
    quartz.next(p, 0, ydata);
  },
  /**
 *Set progress of parent process
 * @param {Number} step - TODO
 * @param {Number} steps - TODO
 * @param {[Object]} data - TODO
 */
  //
  prog: function (p, step, steps, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') progress reset to ' + step + ' of ' + steps); }
    if (typeof steps === 'undefined') { steps = 1; }
    if (step === -1) {
      global.hybridd.proc[p.parentID].autoprog = true;
    } else {
      global.hybridd.proc[p.parentID].progress = step / steps;
      global.hybridd.proc[p.parentID].autoprog = false;
    }
    quartz.next(p, 0, ydata);
  },
  /**
 * Set timeout of current process
 * @param {Number} millisecs - TODO
 * @param {[Object]} data - TODO
 */
  //
  time: function (p, millisecs, xdata) {
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
    quartz.next(p, 0, ydata);
  },
  /**
 * Stop processing and return data
 * @param {Number} err - TODO
 * @param {[Object]} data - TODO
 */
  //
  stop: function (p, err, xdata) {
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
  },
  /**
 * Jump forward or backward X instructions
 * @param {Number} step - TODO
 * @param {[Object]} data - TODO
 */
  jump: function (p, stepto, xdata) {
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
  },
  /**
 * Test a condition and choose to jump
 * @param {Bool} condition - TODO
 * @param {Number} onTrue - TODO
 * @param {Number} onFalse - TODO
 * @param {[Object]} data - TODO
 */
  //
  test: function (p, condition, is_true, is_false, data) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') testing [' + condition + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    if (condition) {
      quartz.jump(p, is_true, data);
    } else if (typeof is_false === 'undefined') {
      quartz.next(p, 0, data);
    } else {
      quartz.jump(p, is_false, data);
    }
  },
  /**
 * Given property = ".foo.bar[3][5].x" checks if data.foo.bar[3][5].x exists if so passes it to jump
 * also for arrays and dictionaries of property paths
 * also for explicit primitive values
 * @param {Object} pattern - TODO
 * @param {Object} object - TODO
 * @param {Number} onValid - TODO
 * @param {Number} onInvalid - TODO
  * @param {[Object]} data - TODO
 */

  tran: function (p, property, testObject, is_valid, is_invalid, xdata) {
    if (DEBUG) { console.log(' [D] (' + p.parentID + ') tran [' + JSON.stringify(property) + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    var checkVar = chckVar(p, property, testObject);
    if (checkVar.valid) {
      quartz.jump(p, is_valid, xdata || checkVar.data); // xdata instead of ydata is passed on purpose
    } else if (typeof is_invalid === 'undefined') {
      quartz.next(p, 0, typeof xdata !== 'undefined' ? xdata : testObject); // xdata instead of ydata is passed on purpose
    } else {
      quartz.jump(p, is_invalid, typeof xdata !== 'undefined' ? xdata : testObject); // xdata instead of ydata is passed on purpose
    }
  },
  /**
 * Find a string in an array of objects, and return the object it was found in
 * @param {Object} needle - TODO
 * @param {Array} haystack - TODO
 * @param {Number} onFound - TODO
 * @param {Number} onNotFound - TODO
 * @param {[Object]} data - TODO
 */
  //
  find: function (p, findObject, searchArray, found, not_found, xdata) {
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
      quartz.jump(p, found, matches.length === 1 ? matches[0] : matches);
    } else if (typeof not_found === 'undefined') {
      quartz.next(p, 0, ydata);
    } else {
      quartz.jump(p, not_found, ydata);
    }
  },
  /**
 * Format float number
 * @param {[Object]} data - TODO
 * @param {Number} factor - TODO
 * @param {String} convert - TODO
 */
  //
  form: function (p, xdata, factor, convert) {
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
    quartz.next(p, 0, result);
  },
  /**
 * Explode string
 * @param {String} seperator - TODO
 * @param {String} data - TODO
 */
  expl: function (p, seperator, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    var result = ydata.split(seperator);
    quartz.next(p, 0, result);
  },
  /**
  /**
 * Explode string
 * @param {String} seperator - TODO
 * @param {Array<String>} data - TODO
 */
  impl: function (p, seperator, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    var result = ydata.join(seperator);
    quartz.next(p, 0, result);
  },
  /**
 * Use APIqueue to perform a curl
 * @param {Function} err - TODO
 */
  curl: function (p, target, querystring, method, xdata, headers, overwriteProperties) {
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
      'method': method,
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
  },
  /**
 * TODO
 * @param {Function} err - TODO
 * @param {Function} data - TODO
 */
  fork: function (p, target, xpath, xdata, childId) {
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
  },
  /**
 * TODO
 * @param {Function} err - TODO
 * @param {Function} data - TODO
 */
  call: function (p, target, xpath, xdata) {
    console.log(JSON.stringify(global.hybridd.proc[p.processID]));
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;
    quartz.read(p, quartz.fork(p, target, xpath, ydata, 0));
  },
  /**
 * TODO
 * @param {Function} err - TODO
 * @param {Function} data - TODO
 */
  rout: function (p, xpath) {
    // TODO pass data to post
    var sessionID = global.hybridd.proc[p.processID.split('.')[0]].sid;
    var result = router.route({url: xpath, sessionID: sessionID}, modules);
    var r = JSON.parse(result);
    if (r.id === 'id') { // if result is a process that has te be awaited, then read that proces until finished
      quartz.read(p, r.data);
    } else {
      quartz.next(p, r.hasOwnProperty('error') ? r.error : 1, r.hasOwnProperty('data') ? r.data : null); // If it's a direct result pass it to next
    }
  },
  /**
 * TODO
 * @param {Function} err - TODO
 * @param {Function} data - TODO
 */
  // wait for one or more processes to finish, and pass its data
  read: function (p, processIDs, millisecs) {
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
        quartz.next(p, result.err, result.data);
      } else {
        setTimeout(function (p, processIDs, millisecs) {
          quartz.read(p, processIDs, millisecs);
        }, millisecs || 500, p, processIDs, millisecs || 500);
      }
    } else {
      quartz.stop(p, 1, 'read: Insufficient permissions to access processes ' + processIDs + '.');
    }
  },

  each: function (p, container, target, xpath, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;

    var processIDs;
    if (container instanceof Array) { // Array
      processIDs = [];
      for (var key = 0; key < container.length; ++key) {
        processIDs.push(quartz.fork(p, target, xpath, {data: ydata, container: container, key: key, value: container[key]}, key));
      }
    } else { // Dictionary
      processIDs = {};
      var index = 0;
      for (var key in container) {
        processIDs[key] = quartz.fork(p, target, xpath, {data: ydata, container: container, key: key, value: container[key]}, index);
        ++index;
      }
    }
    quartz.read(p, processIDs);
  },
  /**
 * TODO
 * @param {Function} err - TODO
 * @param {Function} data - TODO
 */
  poke: function (p, variable, pokedata, xdata) {
    var ydata = typeof xdata === 'undefined' ? global.hybridd.proc[p.processID].data : xdata;

    if (DEBUG) { console.log(' [D] (' + p.parentID + ') poke [' + JSON.stringify(variable) + '] in step ' + (global.hybridd.proc[p.parentID].step + 1) + ' of ' + (global.hybridd.proc[p.parentID].steps + 1)); }
    // get root parent
    var rootID = p.processID.substring(0, p.processID.indexOf('.'));
    // store poke data in root process
    global.hybridd.proc[rootID].vars[variable] = pokedata;
    quartz.next(p, 0, ydata);
  },
  /**
 * TODO
 * @param {Function} err - TODO
 * @param {Function} data - TODO
 */
  // peek at a variable
  peek: function (p, variable) {
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
  }
};

exports.quartz = quartz; // initialize a new process
