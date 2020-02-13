const fs = require('fs');
const parse = require('./parse.js');
const conf = require('../conf/conf');

function subpoke (properties, scopeVars, qdata) {
  if (typeof scopeVars === 'object' && scopeVars !== null) {
    if (properties.length === 1) {
      scopeVars[properties[0]] = qdata;
    } else {
      if (!scopeVars.hasOwnProperty(properties[0])) {
        scopeVars[properties[0]] = isNaN(Number(properties[0])) ? {} : [];
      }
      subpoke(properties.slice(1), scopeVars[properties[0]], qdata);
    }
  } else {
    // TODO ERROR?
  }
}

function subpeek (properties, scopeVars) {
  if (typeof scopeVars === 'object' && scopeVars !== null) {
    if (properties.length === 1) {
      return scopeVars[properties[0]];
    } else {
      if (!scopeVars.hasOwnProperty(properties[0])) {
        return undefined;
      } else {
        return subpeek(properties.slice(1), scopeVars[properties[0]]);
      }
    }
  } else {
    return undefined;
  }
}

function pokeLocal (recipe, properties, qdata) {
  if (typeof recipe.vars !== 'object') {
    recipe.vars = {};
  }
  subpoke(properties, recipe.vars, qdata);
  let content;
  try {
    content = JSON.stringify(recipe.vars);
  } catch (e) {
    console.log('[.] Error stringifying local variable for file:' + recipe.filename);
    return {e: 1, v: 'poke error: Failed to store local variable.'};
  }
  if (typeof content === 'string' && content !== '') {
    try {
      fs.writeFileSync('../var/recipes/' + recipe.filename, content);
      return {e: 0, v: qdata};
    } catch (e) {
      console.log('[.] Error writing local variable to file:' + recipe.filename);
      return {e: 1, v: 'poke error: Failed writing local variable.'};
    }
  } else {
    console.log('[.] Error storing local variable to file:' + recipe.filename);
    return {e: 1, v: 'poke error: Failed to store local variable.'};
  }
}

// key = [$scope::][$subScope::]$keyBase[.$property1][...][.$propertyn]
function poke (p, key, qdata) {
  if (typeof key === 'number') {
    return {e: 1, v: 'poke error:Not allowed to write to a command argument property!'};
  } else if (typeof key === 'string') {
    const keySplit = key.split('::');
    let keyBase;
    let properties;
    let scope;

    const processData = p.getProcessData();

    if (keySplit.length === 2) { // "scope::key"
      scope = keySplit[0];
      key = keySplit[1];
      properties = parse.parseProperty(key);
      keyBase = properties[0];

      if (isNaN(Number(key)) || key.startsWith('.')) {
        if (scope === 'local') { // local::key
          return pokeLocal(p.getRecipe(), properties, qdata);
        } else if (scope === 'conf') { // conf::key
          return {e: 1, v: 'poke error: Not allowed to write to configuration.'};
          /*
            if (scope === 'proc') { // proc::key
            if (keyBase === '' || keyBase === 'data') {
            subpoke(properties.slice(1), processData, qdata);
            } else {
            subpoke(properties, p.getVars(), qdata);
            }
            return {e: 0, v: qdata};
            } else

            } else if (scope === 'parent') {
            return {e: 1, v: 'poke error: Not allowed to write to parent scope from a subprocess!'};
            } else if (scope === 'root') {
            return {e: 1, v: 'poke error: Not allowed to write to root scope from a subprocess!'};
          */
        } else { // otherRecipe::key
          return {e: 1, v: 'poke error: Not allowed to write to another recipe scope!'};
        }
      } else {
        return {e: 1, v: 'poke error: Not allowed to write to a numeral argument property!'};
      }
    } else if (keySplit.length === 3) { // "scope1::scope2::key"
      return {e: 1, v: 'poke error: Not allowed to write to local variable of another recipe!'};
    } else if (typeof key === 'number' && !key.startsWith('.')) { // "0","1","2", or ".key"
      return {e: 1, v: 'poke error: Not allowed to write to a command argument property!'};
    } else { // "key"
      properties = parse.parseProperty(key);
      keyBase = properties[0];
      if (!p.getRecipe().hasOwnProperty(keyBase)) {
        if (keyBase === '' || keyBase === 'data') {
          subpoke(properties.slice(1), processData, qdata);
        } else {
          subpoke(properties, p.getVars(), qdata);
        }
        return {e: 0, v: qdata};
      } else {
        return {e: 1, v: 'poke error: Not allowed to write to a read-only recipe property!'};
      }
    }
  } else {
    return {e: 1, v: 'poke error: Expected string!'};
  }
}

function peekLocal (recipe, properties) {
  const filePath = '../var/recipes/' + recipe.filename;
  if (!recipe.hasOwnProperty('vars') && fs.existsSync(filePath)) { // retrieve data from file if not yet loaded into memory
    let content = fs.readFileSync(filePath).toString();
    try {
      recipe.vars = JSON.parse(content);
    } catch (e) {
      console.log(` [!] error: local var file corrupt for ${recipe.filename}. Created backup ${recipe.filename}.corrupt`);
      try {
        fs.renameSync(filePath, filePath + '.corrupt');
        return {e: 1, v: 'peek error: local var file corrupt!'};
      } catch (e) {
        console.log(` [!] error: creating backup ${recipe.filename}.corrupt`);
        return {e: 1, v: 'peek error: local var file corrupt!'};
      }
    }
  }
  if (recipe.hasOwnProperty('vars')) {
    return {e: 0, v: subpeek(properties, recipe.vars)};
  } else {
    return {e: 0, v: undefined};
  }
}

// key = [$scope::][$subScope::]$keyBase[.$property1][...][.$propertyn]
function peek (p, key) {
  if (typeof key === 'number') {
    const pdata = subpeek([key], p.getCommand());
    return {e: 0, v: pdata};
  } else if (typeof key === 'string') {
    const processData = p.getData();
    let pdata;
    const keySplit = key.split('::');
    let properties;
    let keyBase;

    if (keySplit.length === 2) {
      let scope = keySplit[0];
      key = keySplit[1];
      properties = parse.parseProperty(key);
      keyBase = properties[0];
      if (scope === 'conf') {
        pdata = conf.get(p.getRecipe().id + '.' + keyBase);
      } else if (scope === 'local') { // local::key
        return peekLocal(p.getRecipe(), properties);
        /* TODO reinstate
    } else if (scope === 'parent') { // parent::key
        if (processStepIdSplit.length > 3) {
          let parentProcessID = processStepIdSplit.slice(0, processStepIdSplit.length - 3).join('.');
          let parentProcess = global.hybrixd.proc[parentProcessID];
          // TODO check if parent exists
          if (isNaN(Number(key)) || key.startsWith('.')) {
            if (parentProcess.vars.hasOwnProperty(keyBase)) {
              if (keyBase === '' || keyBase === 'data') {
                pdata = subpeek(properties.slice(1), parentProcess.data);
              } else {
                pdata = subpeek(properties, parentProcess.vars);
              }
            } else {
              pdata = undefined;
            }
          } else {
            pdata = parentProcess.command ? subpeek(properties, parentProcess.command) : undefined;
          }
        } else if (scope === 'root' && typeof rootProcess !== 'undefined') { // root::key
          if (isNaN(Number(key)) || key.startsWith('.')) {
            if (rootProcess.hasOwnProperty('vars')) {
              if (keyBase === '' || keyBase === 'data') {
                pdata = subpeek(properties.slice(1), rootProcess.data);
              } else {
                pdata = subpeek(properties, rootProcess.vars, rootProcess.data);
              }
            } else {
              pdata = undefined;
            }
          } else {
            pdata = rootProcess.command ? subpeek(properties, rootProcess.command) : undefined;
          }
        } else {
          return {e: 1, v: "peek error: Parent does not exist for 'parent::" + key + "'!"};
        }

*/
      } else { // otherRecipe::key
        if (global.hybrixd.asset.hasOwnProperty(scope) && global.hybrixd.asset[scope].hasOwnProperty(keyBase)) {
          pdata = subpeek(properties, global.hybrixd.asset[scope]);
        } else if (global.hybrixd.source.hasOwnProperty(scope) && global.hybrixd.source[scope].hasOwnProperty(keyBase)) {
          pdata = subpeek(properties, global.hybrixd.source[scope]);
        } else if (global.hybrixd.engine.hasOwnProperty(scope) && global.hybrixd.engine[scope].hasOwnProperty(keyBase)) {
          pdata = subpeek(properties, global.hybrixd.engine[scope]);
        } else {
          return {e: 1, v: "peek error: '" + scope + '::' + key + "' not defined!"};
        }
      }
    } else if (keySplit.length === 3) {
      let scope = keySplit[0];
      let subScope = keySplit[1];
      let key = keySplit[2];
      keyBase = parse.parseProperty(key)[0];
      if (subScope === 'local') {
        if (global.hybrixd.asset.hasOwnProperty(scope) && global.hybrixd.asset[scope].hasOwnProperty('vars') && global.hybrixd.asset[scope].vars.hasOwnProperty(keyBase)) {
          pdata = subpeek(properties, global.hybrixd.asset[scope].vars);
        } else if (global.hybrixd.source.hasOwnProperty(scope) && global.hybrixd.source[scope].hasOwnProperty('vars') && global.hybrixd.source[scope].vars.hasOwnProperty(keyBase)) {
          pdata = subpeek(properties, global.hybrixd.source[scope].vars);
        } else if (global.hybrixd.engine.hasOwnProperty(scope) && global.hybrixd.engine[scope].hasOwnProperty('vars') && global.hybrixd.engine[scope].vars.hasOwnProperty(keyBase)) {
          pdata = subpeek(properties, global.hybrixd.engine[scope].vars);
        }
      } else {
        return {e: 1, v: "peek error: Unrecognized scope '" + subScope + "' for '" + key + "'!"};
      }
    } else if (keySplit.length === 1) {
      properties = parse.parseProperty(key);
      keyBase = properties[0];
      if (!isNaN(Number(keyBase)) && !key.startsWith('.')) { // 0,1,2,3
        pdata = subpeek(properties, p.getCommand());
      } else if (keyBase === '' || keyBase === 'data') { // "."  ".data"
        pdata = subpeek(properties.slice(1), processData);
      } else if (p.getRecipe().hasOwnProperty(keyBase)) { // "fee" etc
        pdata = subpeek(properties, p.getRecipe());
      } else if (p.getVars().hasOwnProperty(keyBase)) {
        pdata = subpeek(properties, p.getVars());
      } else {
        return {e: 1, v: "peek error: '" + key + "' not defined!"};
      }
    }
    return {e: 0, v: pdata};
  } else {
    return {e: 1, v: 'peek error: Expected string!'};
  }
}

exports.peek = peek;
exports.poke = poke;
