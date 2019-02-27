let fs = require('fs');
let Decimal = require('../../common/crypto/decimal-light.js');

/*
  parses a line of quartz code of the form "head(body)" = "head(param1,param2,...)" or "head param1 parame2 ..." into an object containing, head, body and parameters. It parses default javascript with single and double quotes strings, object and array literals and parentheses notation.
  This to ensure  "{a:1,b:2}" to be parsed as ["{a:1,b:2}"] and not as ["{a:1","b:2}"]
*/
let splitLine = function (line, labels, step) {
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
  } else {
    return { error: 'Expected statement of the form: head [parameter1] [parameter2] ... or head([parameter1],[parameter2],...)' };
  }
  let head = line.substr(0, 4);
  let result = splitParameters(body, seperator, '');

  // TODO Move label parsing to resolveVariable
  for (let j = 0; j < result.parameters.length; ++j) {
    let re = /^@([_a-zA-Z][\w]*)$/g; // Search for @labelname
    result.parameters[j] = result.parameters[j].replace(re, (x, label) => { return (labels[label] - step); }); // Replace all "@label" with labels[label]-step (relative jump required to go to label
  }

  result.head = head;
  return result;
};

let splitParameters = function (body, seperator, whitespace) {
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
        if (whitespace.indexOf(c) !== -1 && !stringDouble && !stringSingle && objectDepth === 0 && arrayDepth === 0 && parenthesesDepth === 0) {
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

  return {parameters};
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
      return value;
    } else if (typeof value === 'number') {
      return value;
    } else if (typeof value === 'object') {
      if (value !== null && (value instanceof Decimal || value.constructor.name === 'r')) { // Handle mathimatical objects
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

// Preprocess quartz command to resolve $variables
function resolveVariables (statement, recipe, command, data, vars, parentVars) {
  let re;
  let parsedStatement = statement;

  re = /\$\@+/g; // Search for $@, replace with command parameter array
  parsedStatement = parsedStatement.replace(re, x => {
    return retrieveProperty('', '@', command, data, recipe, vars, parentVars);
  });

  re = /\$\{(::|([_a-zA-Z][\w]*)::)([a-zA-Z0-9_\-.[\]]*)\}/g; // Search for ${scopeId::propertyId.subproperty[4].subsubproperty}, replace with object
  parsedStatement = parsedStatement.replace(re, (full, noRecipeId, scopeId, propertyId) => {
    if (scopeId === '' || typeof scopeId === 'undefined') { scopeId = 'local'; }
    return retrieveProperty(scopeId, propertyId, command, data, recipe, vars, parentVars);
  });

  re = /\$\{([a-zA-Z0-9_\-.[\]]*)\}/g; // Search for ${propertyId.subproperty[4].subsubproperty}, replace with object
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
    return retrieveProperty(scopeId, propertyId, command, data, recipe, vars, parentVars);
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
function parseString (parameter, quote) {
  if (parameter.startsWith(quote) && parameter.endsWith(quote)) {
    return {body: parameter.slice(1, -1)};
  } else {
    return {error: 'Expected closing' + quote + ' after "' + parameter + '"'};
  }
}

function parseArray (parameter) {
  if (parameter.startsWith('[') && parameter.endsWith(']')) {
    const values = splitParameters(parameter.slice(1, -1), ',', ' ');
    if (values.error) { return values; }
    for (let i = 0; i < values.parameters.length; ++i) {
      const valueResult = convertParameter(values.parameters[i]);
      if (valueResult.error) { return valueResult; }
      values.parameters[i] = valueResult.body;
    }
    return {body: values.parameters};
  } else {
    return {error: 'Expected closing ] after "' + parameter + '"'};
  }
}

function parseObject (parameter) {
  if (parameter.startsWith('{') && parameter.endsWith('}')) {
    const body = splitObject(parameter.slice(1, -1));
    return {body};
  } else {
    return {error: 'Expected closing } after "' + parameter + '"'};
  }
}

function convertParameter (resolvedParameter) {
  let result;
  if (resolvedParameter.startsWith('"')) { // "string"
    result = parseString(resolvedParameter, '"');
  } else if (resolvedParameter.startsWith("'")) { // 'string'
    result = parseString(resolvedParameter, "'");
  } else if (resolvedParameter.startsWith('`')) { // `string`
    result = parseString(resolvedParameter, '`');
  } else if (resolvedParameter.startsWith('[')) { // [array]
    result = parseArray(resolvedParameter);
    /* } else if (resolvedParameter.startsWith('{')) { // {object}
    result = parseObject(resolvedParameter); */
  } else if (resolvedParameter === 'true' || resolvedParameter === 'false' || resolvedParameter === 'null' || resolvedParameter === 'undefined') { // literals
    result = {body: resolvedParameter};
  } else if (!isNaN(resolvedParameter)) { // number
    result = {body: Number(resolvedParameter)};
  } else {
    try {
      result = {body: new Function('return ' + resolvedParameter)()};
    } catch (e) {
      result = {error: `parameter parse error: \n     ${resolvedParameter}\n`};
    }
  }
  return result;
}

function parseParameter (parameter, processID, recipe, command, data, vars, parentVars) {
  const resolvedParameter = resolveVariables(parameter, recipe, command, data, vars, parentVars);
  return convertParameter(resolvedParameter);
}

function parseLine (line, labels, step, processID, recipe, command, data, vars, parentVars) {
  let result = splitLine(line, labels, step);
  if (!result.error) {
    // For each parameter try to evaluate it
    for (let i = 0; i < result.parameters.length; ++i) {
      let parameterResult = parseParameter(result.parameters[i], processID, recipe, command, data, vars, parentVars);
      if (parameterResult.error) {
        return parameterResult;
      } else {
        result.parameters[i] = parameterResult.body;
      }
    }
  }
  return result;
}

exports.parseLine = parseLine; // pass data to to a process step
