const parse = require('./parse.js');
const conf = require('../conf/conf');
const {write} = require('./local');

function isNumber (x) { // TODO maybe merge with parse.isNumber but need to double check 0x...
  return x.length < 10 && // ensure that too large numbers get parsed as string
  !isNaN(x) &&
    !x.startsWith('0x') && // exclude hexade
    !x.startsWith('+') && // math command needs to parse +1 as a string
    !x.startsWith('.') && // tran command needs to parse .property as string
    !/^0\d/.test(x); // 012321 should be parsed as string and not as a number
}

function subpoke (properties, scopeVars, qdata) {
  if (typeof scopeVars === 'object' && scopeVars !== null) {
    if (properties.length === 1) scopeVars[properties[0]] = qdata;
    else {
      if (!scopeVars.hasOwnProperty(properties[0])) scopeVars[properties[0]] = isNumber(properties[1]) ? [] : {}; // create an object or array based on keytype
      else if (scopeVars[properties[0]] instanceof Array && !isNumber(properties[1])) { // if it's an array but string key is pushed, convert to object
        scopeVars[properties[0]] = Object.assign({}, scopeVars[properties[0]]); // ['a','b'] -> {'0':'a','1':'b'}
      }
      subpoke(properties.slice(1), scopeVars[properties[0]], qdata);
    }
  } else {
    // TODO ERROR?
  }
}

function subpeek (properties, scopeVars) {
  if (properties.length === 0) return scopeVars;
  if (typeof scopeVars === 'object' && scopeVars !== null) {
    if (properties.length === 1) return scopeVars[properties[0]];
    else if (!scopeVars.hasOwnProperty(properties[0])) return undefined;
    else return subpeek(properties.slice(1), scopeVars[properties[0]]);
  } else return undefined;
}

function pokeLocal (recipe, properties, qdata) {
  subpoke(properties, recipe.vars, qdata);
  const result = write(recipe, qdata);
  return result.e
    ? result
    : {e: 0, v: qdata};
}

// key = [$scope::][$subScope::]$keyBase[.$property1][...][.$propertyn]
function poke (p, key, qdata) {
  if (typeof key === 'number') return {e: 1, v: 'poke error:Not allowed to write to a command argument property!'};
  else if (typeof key === 'string') {
    const keySplit = key.split('::');
    if (keySplit.length === 2) { // "scope::key"
      const scope = keySplit[0];
      const key = keySplit[1];
      const properties = parse.parseProperty(key);
      if (isNaN(Number(key)) || key.startsWith('.')) {
        if (scope === 'local') return pokeLocal(p.getRecipe(), properties, qdata); // local::key
        else if (scope === 'conf') return {e: 1, v: 'poke error: Not allowed to write to configuration.'}; // conf::key // TODO only SESSION root/1
        else return {e: 1, v: 'poke error: Not allowed to write to another recipe scope!'}; // otherRecipe::key
      } else return {e: 1, v: 'poke error: Not allowed to write to a numeral argument property!'};
    } else if (keySplit.length === 3) return {e: 1, v: 'poke error: Not allowed to write to local variable of another recipe!'}; // "scope1::scope2::key"
    else if (typeof key === 'number' && !key.startsWith('.')) return {e: 1, v: 'poke error: Not allowed to write to a command argument property!'}; // "0","1","2", or ".key"
    else if (key.startsWith('@')) return {e: 1, v: 'poke error: Not allowed to write to a command argument array!'}; // @ command parameter array
    else { // "key"
      const properties = parse.parseProperty(key);
      const keyBase = properties[0];
      if (!p.getRecipe().hasOwnProperty(keyBase)) {
        const processData = p.getProcessData();
        if (keyBase === '') subpoke(properties.slice(1), processData, qdata);
        else subpoke(properties, p.getVars(), qdata);
        return {e: 0, v: qdata};
      } else return {e: 1, v: 'poke error: Not allowed to write to a read-only recipe property!'};
    }
  } else return {e: 1, v: 'poke error: Expected string!'};
}

function peekLocal (recipe, properties) {
  if (recipe.hasOwnProperty('vars')) return {e: 0, v: subpeek(properties, recipe.vars)};
  else return {e: 0, v: undefined};
}

function checkOtherRecipeLocalScope (recipeType, scope, keyBase) {
  return global.hybrixd[recipeType].hasOwnProperty(scope) &&
    global.hybrixd[recipeType][scope].hasOwnProperty('vars') &&
    global.hybrixd[recipeType][scope].vars.hasOwnProperty(keyBase);
}
function checkOtherRecipeScope (recipeType, scope, keyBase) {
  return global.hybrixd[recipeType].hasOwnProperty(scope) && global.hybrixd[recipeType][scope].hasOwnProperty(keyBase);
}

// key = [$scope::][$subScope::]$keyBase[.$property1][...][.$propertyn]
function peek (p, key) {
  if (typeof key === 'number') {
    const pdata = subpeek([key], p.getCommand());
    return {e: 0, v: pdata};
  } else if (typeof key === 'string') {
    let pdata;
    const keySplit = key.split('::');

    if (keySplit.length === 2) {
      const scope = keySplit[0];
      const key = keySplit[1];
      const properties = parse.parseProperty(key);
      const keyBase = properties[0];
      if (scope === 'conf') pdata = conf.get(p.getRecipe().id + '.' + keyBase); // conf::key
      else if (scope === 'local') return peekLocal(p.getRecipe(), properties);// local::key
      else { // otherRecipe::key
        if (checkOtherRecipeScope('asset', scope, keyBase)) pdata = subpeek(properties, global.hybrixd.asset[scope]);
        else if (checkOtherRecipeScope('source', scope, keyBase)) pdata = subpeek(properties, global.hybrixd.source[scope]);
        else if (checkOtherRecipeScope('engine', scope, keyBase)) pdata = subpeek(properties, global.hybrixd.engine[scope]);
        else return {e: 1, v: "peek error: '" + scope + '::' + key + "' not defined!"};
      }
    } else if (keySplit.length === 3) {
      const scope = keySplit[0];
      const subScope = keySplit[1];
      const key = keySplit[2];
      const properties = parse.parseProperty(key);
      const keyBase = properties[0];
      if (subScope === 'local') {
        if (checkOtherRecipeLocalScope('asset', scope, keyBase)) pdata = subpeek(properties, global.hybrixd.asset[scope].vars);
        else if (checkOtherRecipeLocalScope('source', scope, keyBase)) pdata = subpeek(properties, global.hybrixd.source[scope].vars);
        else if (checkOtherRecipeLocalScope('engine', scope, keyBase)) pdata = subpeek(properties, global.hybrixd.engine[scope].vars);
      } else return {e: 1, v: "peek error: Unrecognized scope '" + subScope + "' for '" + key + "'!"};
    } else if (key === '') pdata = subpeek([], p.getData()); // data stream
    else if (keySplit.length === 1) {
      const properties = parse.parseProperty(key);
      const keyBase = properties[0];

      if (keyBase === '@') pdata = subpeek(properties.slice(1), p.getCommand()); // @ command parameter array
      else if (keyBase === '') pdata = subpeek(properties.slice(1), p.getData()); // "." datastream
      else if (!isNaN(Number(keyBase)) && !key.startsWith('.')) pdata = subpeek(properties, p.getCommand()); //  0,1,2,3 command parameters
      else if (p.getRecipe().hasOwnProperty(keyBase)) pdata = subpeek(properties, p.getRecipe()); // "fee" etc recipe properties
      else if (p.getVars().hasOwnProperty(keyBase)) pdata = subpeek(properties, p.getVars()); // proc vars
      else return {e: 1, v: "peek error: '" + key + "' not defined!"};
    }
    return {e: 0, v: pdata};
  } else return {e: 1, v: 'peek error: Expected string!'};
}

exports.peek = peek;
exports.poke = poke;
