const parse = require('../parse.js');
const Decimal = require('../../../common/crypto/decimal-light.js');

function tranOperator (p, expression, data, lhs) {
  expression = expression.trim();
  if (expression.startsWith('+')) { // use + to add numbers
    if (!lhs.valid) { return lhs; }
    const rhs = tranExpression(p, expression.substr(1), data);
    if (rhs.valid) {
      return {valid: true, data: Number(lhs.data) + Number(rhs.data)};
    } else {
      return {valid: false, data: data};
    }
  } else if (expression.startsWith('/')) { // use + to add numbers
    if (!lhs.valid) { return lhs; }
    const rhs = tranExpression(p, expression.substr(1), data);
    if (rhs.valid) {
      return {valid: true, data: Number(lhs.data) / Number(rhs.data)};
    } else {
      return {valid: false, data: data};
    }
  } else if (expression.startsWith('*')) { // use * to multiply numbers
    if (!lhs.valid) { return lhs; }
    const rhs = tranExpression(p, expression.substr(1), data);
    if (rhs.valid) {
      return {valid: true, data: Number(lhs.data) * Number(rhs.data)};
    } else {
      return {valid: false, data: data};
    }
  } else if (expression.startsWith('-')) { // use - to deduct numbers
    if (!lhs.valid) { return lhs; }
    const rhs = tranExpression(p, expression.substr(1), data);
    if (rhs.valid) {
      return {valid: true, data: Number(lhs.data) - Number(rhs.data)};
    } else {
      return {valid: false, data: data};
    }
    /*  } else if (expression.startsWith('|')) { // use | for fall back values
    if (lhs.valid && lhs.data) { return lhs; }
    const rhs = tranExpression(p, expression.substr(1), data);
    return rhs.valid ? rhs : lhs; */
  } else {
    return {valid: false, data: data};
  }
}

const atom = require('./atom.js').atomFunc;

function tranExpression (p, expression, data) {
  expression = expression.trim();
  let lhs;
  let value;
  const c = expression.substr(0, 1);
  let valid = true;
  if (c === '.' || c === '[') { // .property
    lhs = /^[.[][\w-.[\]]+/.exec(expression)[0];
    const property = chckString(p, lhs, data);
    valid = property.valid;
    value = property.data;
  } else if (c === '"') { // " String
    lhs = String(/^"[^"\\]|\\."/.exec(expression)[0]);
    value = lhs;
  } else if (c === "'") { // ' String
    lhs = String(/^'[^'\\]|\\.'/.exec(expression)[0]);
    value = lhs;
  } else if (c === '`') { // ' String
    lhs = String(/^`[^`\\]|\\.'/.exec(expression)[0]);
    value = lhs;
  } else if (/^-?\d+(\.\d+)?/.test(expression)) { // Number 123, -123, 123.231 or -123.232
    lhs = /^-?\d+\.?\d*/.exec(expression)[0];
    value = Number(lhs);
  } else if (/^\w+\(.*?\)/.test(expression)) { // function func(parameter0,parameter1,..)
    const [funcWithParametersAndParentheses, func, parameters] = /(\w+)\((.*?)\)/.exec(expression);
    lhs = funcWithParametersAndParentheses;

    const parameterResults = parameters.split(',').map(parameter => chckVar(p, parameter, data));
    if (parameterResults.reduce((valid, result) => valid && result.valid, true)) {
      const x = parameterResults.map(result => result.data); // [parameter0,parameter1,...]
      switch (func) {
        case 'size':
          if (x.length === 1 && (x[0] instanceof Array || typeof x[0] === 'string')) {
            value = x[0].length;
            valid = true;
          }
          break;
        case 'atom':
          value = atom(p, x[0], x[1], x[2]);
          valid = true;
          break;
        default:
          valid = false;
          break;
      }
    } else {
      valid = false;
    }
  } else if (expression.startsWith('true')) {
    value = true; lhs = 'true'; valid = true;
  } else if (expression.startsWith('false')) {
    value = false; lhs = 'false'; valid = true;
  } else if (expression.startsWith('null')) {
    value = null; lhs = 'null'; valid = true;
  } else if (expression.startsWith('undefined')) {
    value = undefined; lhs = 'undefined'; valid = true;
  } else {
    const match = /^[a-zA-Z_]+\w*/.exec(expression);
    if (match && match.length > 0) {
      lhs = match[0];
      value = lhs;
    } else {
      // TODO error
      // TODO array []
      // TODO object {}
      valid = false;
    }
  }
  if (lhs === expression) { // expression is done
    return {valid: valid, data: (valid ? value : data)};
  } else { // there's more to the expression for example .property+10 -> ".property", then "+10"
    return tranOperator(p, expression.substr(lhs.length), data, {valid, data: (valid ? value : data)});
  }
}

function tranExpressionList (p, expressionsString, data) {
  const expressionsList = expressionsString.split('|');
  for (let expression of expressionsList) {
    const result = tranExpression(p, expression, data);
    if (result.valid) {
      return result;
    }
  }
  return {valid: false, data: data};
}

function tranPropertyPath (p, path, data) { //  path: ["a","1"], data: {a:[1,2]}  => 2
  let iterator = data;
  for (let i = 0, len = path.length; i < len; ++i) {
    if (iterator !== null && typeof iterator === 'object') {
      if (iterator.constructor === Array) { // Array object
        if (path[i] === '' && path.length === i + 2 && path[i + 1].startsWith('{') && path[i + 1].endsWith('}')) { // []{a:1,b:2} operator
          const parsing = parse.parseParameter(path[i + 1], p.processID, {}, [], data, {}, {});
          if (parsing.error) { return {valid: false, data: data}; }
          const resultArray = [];
          for (let index = 0; index < iterator.length; ++index) {
            const r = chckVar(p, parsing.body, iterator[index]);
            if (!r.valid) { return {valid: false, data: data}; }
            resultArray.push(r.data);
          }
          return {valid: true, data: resultArray};
        } else if (path[i] === '') { // []  operator     [{a:1},{a:2}]  '[].a' => [1,2]
          const resultArray = [];
          const subPath = path.slice(i + 1);
          for (let index = 0; index < iterator.length; ++index) {
            const r = tranPropertyPath(p, subPath, iterator[index]);
            if (!r.valid) { return {valid: false, data: data}; }
            resultArray.push(r.data);
          }
          return {valid: true, data: resultArray}; // return, the rest of the path is taken care of by the loop
        } else {
          const index = Number(path[i]);
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
    return tranExpressionList(p, property.substr(1), data);
  } else if (property.substr(0, 1) !== '.' && property.substr(0, 1) !== '[') {
    return {valid: true, data: property}; // literal "foo" -> "foo"
  } else {
    if (property.charAt(0) === '.') { property = property.substr(1); }
    const path = parse.parseProperty(property); // ".foo.bar[3][5].x" -> ["foo","bar","3","5","x"]
    return tranPropertyPath(p, path, data);
  }
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
      for (let index = 0, len = property.length; index < len; ++index) {
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
   * Also for arrays and dictionaries of property paths.
   * Also for explicit primitive values.
   * @param {Object} pattern - A string or nested array/dictionary of strings containing:
   * - explicit values (Example: "Hello")
   * - property paths to test and pass prefixed with "." (Example: ".foo.bar")
   * - expressions prefixed with "=" (Example: "=a+b", "=.foo.bar|default")
   * @param {Number} [success=1] - Amount of instructions lines to jump on success.
   * @param {Number} [failure=1] - Amount of instructions lines to jump on failure.
   * @example
   * tran '.foo' 1 2                                          // input: {foo:"bar"} - passes "bar" to next
   * tran '.foo.bar[2]' 1 2                                   // input: {foo:{bar:[0,1,5]}} - passes 5 to next
   * tran '.foo.bar[2]' 1 2                                   // input: {foo:"bar"} -  Jumps 2 instructions and passes {foo:"bar"}
   * tran ['.foo','.hello'] 1 2                               // input: {foo:"bar",hello:"world"} - passes ["bar","world"] to next
   * tran {a:'.foo',b:'.hello',c:'test'} 1 2                  // input: {foo:"bar",hello:"world"} - passes {a:"bar", b:"world", c:"test"} to next
   * tran '=.hello|default' 1 2                               // input: {hello:"world"} - passes "world" to next
   * tran '=.hello|default' 1 2                               // input: {foo:"bar"} - passes "default" to next
   * tran '=[].a' 1 2                                         // input: [{a:1},{a:2}] - passes [1,2] to next
   * tran '=[]{a:.a,b:2}' 1 2                                 // input: [{a:1},{a:2}] - passes [{a:1,b:2},{a:2,b:2}] to next
   */
exports.tran = ydata => function (p, property, onSuccess, onFail) {
  const checkVar = chckVar(p, property, ydata);
  if (checkVar.valid) {
    global.hybrixd.proc[p.processID].data = checkVar.data;
    this.jump(p, isNaN(onSuccess) ? 1 : onSuccess || 1);
  } else {
    this.jump(p, isNaN(onFail) ? 1 : onFail || 1, ydata);
  }
};

exports.chckVar = chckVar;
