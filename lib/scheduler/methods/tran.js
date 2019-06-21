const Decimal = require('../../../common/crypto/decimal-light.js');

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
    return {valid: true, data: property};
  } else if (typeof property === 'object') { // If Object
    if (property === null) { // If Nullz
      return {valid: true, data: null};
    } else if (property instanceof Decimal || property.constructor.name === 'r') { // If decimal object
      return {valid: true, data: property};
    } else if (property.constructor === Array) { // If Array
      const newData = [];
      for (let index, len = property.length; index < len; ++index) {
        const chckIndex = chckVar(p, property[index], data);
        if (!chckIndex.valid) { return {valid: false, data: data}; }
        newData[index] = chckIndex.data;
      }
      return {valid: true, data: newData};
    } else { // If Dictionary
      const newData = {};
      for (let key in property) {
        const chckKey = chckVar(p, property[key], data);
        if (!chckKey.valid) { return {valid: false, data: data}; }
        newData[key] = chckKey.data;
      }
      return {valid: true, data: newData};
    }
  } else {
    return {valid: false, data: data};
  }
}
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
exports.tran = ydata => function (p, property, is_valid, is_invalid) {
  const checkVar = chckVar(p, property, ydata);
  if (checkVar.valid) {
    global.hybrixd.proc[p.processID].data = checkVar.data;
    this.jump(p, isNaN(is_valid) ? 1 : is_valid || 1);
  } else {
    this.jump(p, isNaN(is_invalid) ? 1 : is_invalid || 1, ydata);
  }
};

exports.chckVar = chckVar;
