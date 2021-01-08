const Decimal = require('../../common/crypto/decimal-light.js');
const peek = require('./vars').peek;

const regexLabelName = /@([_a-zA-Z][\w]*)/g; // Search for @labelname
/*
  parses a line of quartz code of the form "head(body)" = "head(param1,param2,...)" or "head param1 parame2 ..." into an object containing, head, body and parameters. It parses default javascript with single and double quotes strings, object and array literals and parentheses notation.
  This to ensure  "{a:1,b:2}" to be parsed as ["{a:1,b:2}"] and not as ["{a:1","b:2}"]
*/
const splitStatement = function (line, labels, step) {
  // head(body)
  // head(param1,{param2:value},[1,2,3],"foo {} [] bar")
  let body;
  let seperator;
  if (line.length === 4) { // head
    body = '';
    seperator = ' ';
  } else if (line.length >= 6 && line.substr(4, 1) === '(' && line.endsWith(')')) { // head() // head([parameter1],[parameter2],...)
    body = line.substr(5, line.length - 6);
    seperator = ',';
  } else if (line.length > 4 && line.substr(4, 1) === ' ') { //  head [parameter1] [parameter2] ...
    body = line.substr(5, line.length - 5);
    seperator = ' ';
  } else return { error: 'Expected statement of the form: head [parameter1] [parameter2] ... or head([parameter1],[parameter2],...)' };

  const result = splitParameters(body, seperator, '');
  result.head = line.substr(0, 4);
  // TODO Move label parsing to resolveVariable
  if (result.parameters) {
    // Replace all "@label" with labels[label]-step (relative jump required to go to label
    for (let j = 0; j < result.parameters.length; ++j) result.parameters[j] = result.parameters[j].replace(regexLabelName, (x, label) => labels[label] - step);
  } else result.parameters = [];
  return result;
};

// splits a comma or space separated string into multiple parameters. Ensuring that string quotes '...' "..." `...` and nested arrays [...] and objects {...} are preserved
const splitParameters = function (body, seperator, whitespace) {
  const parameters = body === '' ? [] : [''];
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
        if (stringDouble || stringSingle) slashEscape = !slashEscape;
        break;
      case '"':
        if (stringDouble && !slashEscape) stringDouble = false;
        else if (!stringDouble && !stringSingle && !slashEscape) stringDouble = true;
        break;
      case "'":
        if (stringSingle && !slashEscape) stringSingle = false;
        else if (!stringDouble && !stringSingle && !slashEscape) stringSingle = true;
        break;
      case '{':
        if (!stringDouble && !stringSingle) ++objectDepth;
        break;
      case '}':
        if (!stringDouble && !stringSingle) --objectDepth;
        break;
      case '[':
        if (!stringDouble && !stringSingle) ++arrayDepth;
        break;
      case ']':
        if (!stringDouble && !stringSingle) --arrayDepth;
        break;
      case '(':
        if (!stringDouble && !stringSingle) ++parenthesesDepth;
        break;
      case ')':
        if (!stringDouble && !stringSingle) --parenthesesDepth;
        break;
      case seperator:
        if (!stringDouble && !stringSingle && objectDepth === 0 && arrayDepth === 0 && parenthesesDepth === 0) {
          if (parameters[parameterIndex] !== '') {
            ++parameterIndex;
            parameters.push('');
          }
          skipCharacter = true;
        }
        break;
      default:
        if (whitespace.indexOf(c) !== -1 && !stringDouble && !stringSingle && objectDepth === 0 && arrayDepth === 0 && parenthesesDepth === 0) skipCharacter = true;
        break;
    }
    if (c !== '\\') slashEscape = false;
    if (!skipCharacter) parameters[parameterIndex] += c;
  }
  if (slashEscape) return {error: 'Illegal open \\ character'};
  if (stringDouble) return {error: 'Expected " character'};
  if (stringSingle) return {error: "Expected ' character"};
  if (objectDepth > 0) return {error: 'Expected } character'};
  if (objectDepth < 0) return {error: 'Illegal } character'};
  if (arrayDepth > 0) return {error: 'Expected ] character'};
  if (arrayDepth < 0) return {error: 'Illegal ] character'};
  if (parenthesesDepth > 0) return {error: 'Expected ) character'};
  if (parenthesesDepth < 0) return {error: 'Illegal ) character'};
  return {parameters};
};

// 'a.b[1].c[d.e].f' ->  ['a','b','1','c','d.e','f']
// '.a[]' -> ['a','']
// '.a[]{b:c,d}' -> ['a','','{b:c,d}']

// - ensure that '[a]' is parse as ['a'] and not as ['','a']
// - ensure that 'a[b.c]' is parsed properly as ['a','b.c'] instead of ['a','b','c']
// - ensure that '[a.b]' is parsed as ['a.b'] and not as ['a','b']
function parseProperty (key) {
  if (key === '') return [];
  if (key.endsWith('}')) {
    const [head, object] = key.split('{');
    const result = parseProperty(head);
    result.push('{' + object);
    return result;
  } else {
    const result = key
      .replace(/\]\./g, ']').replace(/\.\[/g, '[') // 'a[1].b.[2]'-> 'a[1]b[2]'
      .split('[') // ['a.b','1]c','d.e]f']
      .map(x => x.split(']')) // [['a.b'],['1','c'],['d.e','f']]
      .reduce((a, b, i) => {
        if (i === 0) {
          if (key.charAt(0) !== '[' || key.startsWith('[]')) return a.concat(b[0].split('.')); // ['a','b',...]
          else return a.concat([''], b[0]); // ['a','b',...]
        } else if (b[1] !== '') return a.concat([b[0]], b[1].split('.')); // [..., '1','c','d.e','f']
        else return a.concat([b[0]]);
      }, []); // ['a','b','1','c','d.e','f']
    if (result[0] === '' && key.charAt(0) === '[') result.shift();
    return result;
  }
}

function parseString (parameter, quote) {
  if (parameter.startsWith(quote) && parameter.endsWith(quote)) return {body: parameter.slice(1, -1)};
  else return {error: 'Expected closing' + quote + ' after "' + parameter + '"'};
}

function parseArray (parameter) {
  if (parameter.startsWith('[') && parameter.endsWith(']')) {
    const values = splitParameters(parameter.slice(1, -1), ',', ' ');
    if (values.error) return values;
    const body = [];
    for (let i = 0; i < values.parameters.length; ++i) {
      const value = values.parameters[i];
      if (value.startsWith('...')) { // handle spread operator [1,2,...[3,4]] but not when quoted: [1,2,'...[3,4]']
        const itemToSpread = convertParameter(value.substr(3));
        if (itemToSpread.error) return itemToSpread;
        if (itemToSpread.body instanceof Array) itemToSpread.body.forEach(value => body.push(value));
        else return {error: 'Expected array for spread operation.'};
      } else {
        const valueResult = convertParameter(value);
        if (valueResult.error) return valueResult;
        body.push(valueResult.body);
      }
    }
    return {body};
  } else return {error: 'Expected closing ] after "' + parameter + '"'};
}

function parseObject (parameter) {
  if (parameter.startsWith('{') && parameter.endsWith('}')) {
    const keyValuePairs = splitParameters(parameter.slice(1, -1), ',', ' ');
    if (keyValuePairs.error) { return keyValuePairs; }
    const body = {};
    for (let i = 0; i < keyValuePairs.parameters.length; ++i) {
      const keyValuePair = splitParameters(keyValuePairs.parameters[i], ':', ' ');
      if (keyValuePair.error) return keyValuePairs;
      if (keyValuePair.parameters.length === 1) {
        if (keyValuePair.parameters[0].startsWith('...')) { // handle spread operator {...{a:1}} and {...[1,2]}
          const itemToSpread = convertParameter(keyValuePair.parameters[0].substr(3));
          if (itemToSpread.error) return itemToSpread;
          if (itemToSpread.body instanceof Array) itemToSpread.body.forEach((value, key) => { body[key] = value; });
          else if (typeof itemToSpread.body === 'object' && itemToSpread.body !== null) for (let key in itemToSpread.body) body[key] = itemToSpread.body[key];
          else return {error: 'Expected array or object for spread operation.'};
        } else return {error: `Expected 'key:value pair', got only key '${keyValuePair.parameters[0]}'`}; // {a}
        // TODO MAYBE find a use for {a}  (since its compile time things like peek and take from data don't work
      } else { // {a:1} or {a:1:2} (and {a:1:2:3} and further) which is read as {a:'1:2'}
        const key = keyValuePair.parameters[0];
        const convertedKey = convertParameter(key);
        if (convertedKey.error) return convertedKey;
        const value = keyValuePair.parameters.slice(1).join(':');
        const convertedValue = convertParameter(value);
        if (convertedValue.error) return convertedValue;
        body[convertedKey.body] = convertedValue.body;
      }
    }
    return {body};
  } else return {error: `Expected closing } after '${parameter}'`};
}

function isNumber (x) {
  return x.length < 10 && // ensure that too large numbers get parsed as string
  !isNaN(x) &&
    !x.startsWith('+') && // math command needs to parse +1 as a string
    !x.startsWith('.') && // tran command needs to parse .property as string
    !/^0\d/.test(x); // 012321 should be parsed as string and not as a number
}

function isRange (x) {
  return /^\d+\.\.\.\d+$/.test(x);
}

function getRange (range) {
  const [start, end] = range.split('...').map(Number);
  if (start === end) return [start];
  const abs = Math.abs(end - start);
  const dir = Math.sign(end - start);
  const array = [];
  for (let i = 0; i <= abs; ++i) array.push(start + i * dir);
  return array;
}

function convertParameter (resolvedParameter) {
  if (resolvedParameter.startsWith('"')) return parseString(resolvedParameter, '"'); // "string"
  else if (resolvedParameter.startsWith("'")) return parseString(resolvedParameter, "'");// 'string'
  else if (resolvedParameter.startsWith('`')) return parseString(resolvedParameter, '`'); // `string`
  else if (
    resolvedParameter.startsWith('[') && resolvedParameter.endsWith(']') &&
  !(resolvedParameter.length > 2 && resolvedParameter.startsWith('[]'))
  ) {
    return parseArray(resolvedParameter); // [array] with exception of '[]...' for tran
  } else if (
    !resolvedParameter.startsWith('{*:}') && !resolvedParameter.startsWith('{:*}') &&
    resolvedParameter.startsWith('{') && resolvedParameter.endsWith('}') &&
  !(resolvedParameter.length > 2 && resolvedParameter.startsWith('{}'))
  ) {
    return parseObject(resolvedParameter); // {object} with exception of '{}...' for tran
  } else if (resolvedParameter === 'true') return {body: true};
  else if (resolvedParameter === 'false') return {body: false};
  else if (resolvedParameter === 'null') return {body: null};
  else if (resolvedParameter === 'undefined') return {body: undefined};
  // TODO MAYBE NaN Infinity?
  else if (resolvedParameter === '') return {body: ''}; // empty string
  else if (isRange(resolvedParameter)) return {body: getRange(resolvedParameter)}; // range 1...5 -> [1,2,3,4,5]
  else if (isNumber(resolvedParameter)) return {body: Number(resolvedParameter)}; // number
  else return {body: resolvedParameter}; // other -> direct string
}

function stringify (x) {
  if (typeof x === 'number' || typeof x === 'boolean') return x;
  if (typeof x === 'string') return x.replace(/[$]/g, () => '$$');
  if (typeof x === 'undefined') return 'undefined';
  if (typeof x === 'object') {
    if (x !== null && (x instanceof Decimal || x.constructor.name === 'r')) x = x.toString(); // Handle mathimatical objects
    else x = JSON.stringify(x);
    x = x.replace(/[$]/g, () => '$$').replace(/[\\]/g, () => '\\\\');
    return x;
  } else return 'undefined';
}

// uses peek to retreive a property defined by property path: scope::[name=.property[3].subproperty]
function retrieveProperty (scopeId, name, command, data, recipe, vars) {
  const p = {
    getCommand: () => command,
    getRecipe: () => recipe,
    getVars: () => vars,
    getData: () => data
  };
  const key = scopeId
    ? scopeId + '::' + name
    : name;

  const r = peek(p, key);
  return r.e ? 'undefined' : stringify(r.v);
}

const regexCommandArray = /\$@+/g; // Search for $@, replace with command parameter array
const regexScopedEncasedProperty = /\$\{(::|([_a-zA-Z][\w]*)::)([a-zA-Z0-9_\-.[\]]*)\}/g; // Search for ${scopeId::propertyId.subproperty[4].subsubproperty}
const regexEncasedProperty = /\$\{([a-zA-Z0-9_\-.[\]]*)\}/g; // Search for ${propertyId.subproperty[4].subsubproperty}
const regexDataShortHand = /([^$]|^)(\$)([^\w$]|$)/g; // Search for single $
const regexScopedProperty = /[$](::|([_a-zA-Z][\w]*)::)([_\w-]+)/g; // Search for "$scopeId::propertyId"
const regexProperty = /\$([_a-zA-Z]+[\w\-_]*)/g; // Search for "$propertyId" and "$_propertyId-with_dashes--andNumbers1231"
const regexCommandParameter = /[$]([\d])+/g; // Search for $0, $1, ... replace with corresponding command parameter

const replaceCommandArray = (recipe, command, data, vars) => x => retrieveProperty('', '@', command, data, recipe, vars);
const replaceScopedEncasedProperty = (recipe, command, data, vars) => (full, noRecipeId, scopeId, propertyId) => retrieveProperty(scopeId || 'local', propertyId, command, data, recipe, vars);
const replaceEncasedProperty = (recipe, command, data, vars) => (full, propertyId) => retrieveProperty('', propertyId, command, data, recipe, vars);
const replaceDataShortHand = (recipe, command, data, vars) => (full, pre, dollarSign, post) => pre + retrieveProperty('', '', command, data, recipe, vars) + post;
const replaceScopedProperty = (recipe, command, data, vars) => (full, noRecipeId, scopeId, propertyId) => retrieveProperty(scopeId || 'local', propertyId, command, data, recipe, vars);
const replaceProperty = (recipe, command, data, vars) => (full, propertyId) => retrieveProperty('', propertyId, command, data, recipe, vars);
const replaceCommandParameter = (recipe, command, data, vars) => (full, propertyNumber) => retrieveProperty('', propertyNumber, command, data, recipe, vars);

// Preprocess quartz command to resolve $variables and ${variables}
function resolveVariables (statement, recipe, command, data, vars) {
  return statement
    .replace(regexCommandArray, replaceCommandArray(recipe, command, data, vars))
    .replace(regexScopedEncasedProperty, replaceScopedEncasedProperty(recipe, command, data, vars))
    .replace(regexEncasedProperty, replaceEncasedProperty(recipe, command, data, vars))
    .replace(regexDataShortHand, replaceDataShortHand(recipe, command, data, vars))
    .replace(regexScopedProperty, replaceScopedProperty(recipe, command, data, vars))
    .replace(regexProperty, replaceProperty(recipe, command, data, vars))
    .replace(regexCommandParameter, replaceCommandParameter(recipe, command, data, vars))
    .replace(/\$\$/g, '$'); // Replace all "$$" with single "$"
}

function parseParameter (parameter, recipe, command, data, vars) {
  const resolvedParameter = resolveVariables(parameter, recipe, command, data, vars);
  return convertParameter(resolvedParameter);
}

exports.splitStatement = splitStatement;
exports.parseParameter = parseParameter;
exports.parseProperty = parseProperty;
