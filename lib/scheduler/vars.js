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

function pokeLocal (rootProcess, properties, qdata) {
  if (typeof rootProcess.recipe.vars !== 'object') {
    rootProcess.recipe.vars = {};
  }
  subpoke(properties, rootProcess.recipe.vars, qdata);
  let content;
  try {
    content = JSON.stringify(rootProcess.recipe.vars);
  } catch (e) {
    console.log('[.] Error stringifying local variable for file:' + rootProcess.recipe.filename);
    return {e: 1, v: 'poke error: Failed to store local variable.'};
  }
  if (typeof content === 'string' && content !== '') {
    try {
      fs.writeFileSync('../var/recipes/' + rootProcess.recipe.filename, content);
      return {e: 0, v: qdata};
    } catch (e) {
      console.log('[.] Error writing local variable to file:' + rootProcess.recipe.filename);
      return {e: 1, v: 'poke error: Failed writing local variable.'};
    }
  } else {
    console.log('[.] Error storing local variable to file:' + rootProcess.recipe.filename);
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
    const process = global.hybrixd.proc[p.parentID];
    const processData = global.hybrixd.proc[p.processID].data;

    const rootID = p.processID.split('.')[0];
    const rootProcess = global.hybrixd.proc[rootID];
    if (keySplit.length === 2) { // "scope::key"
      scope = keySplit[0];
      key = keySplit[1];
      properties = parse.parseProperty(key);
      keyBase = properties[0];

      if (isNaN(Number(key)) || key.startsWith('.')) {
        if (scope === 'proc') { // proc::key
          if (keyBase === '' || keyBase === 'data') {
            subpoke(properties.slice(1), processData, qdata);
          } else {
            subpoke(properties, process.vars, qdata);
          }
          return {e: 0, v: qdata};
        } else if (scope === 'local' || scope === '') { // local::key
          return pokeLocal(rootProcess, properties, qdata);
        } else if (scope === 'conf') { // conf::key
          return {e: 1, v: 'poke error: Not allowed to write to configuration.'};
        } else if (scope === 'parent') {
          return {e: 1, v: 'poke error: Not allowed to write to parent scope from a subprocess!'};
        } else if (scope === 'root') {
          return {e: 1, v: 'poke error: Not allowed to write to root scope from a subprocess!'};
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
      if (!rootProcess.recipe.hasOwnProperty(keyBase)) {
        if (keyBase === '' || keyBase === 'data') {
          subpoke(properties.slice(1), processData, qdata);
        } else {
          subpoke(properties, process.vars, qdata);
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

function peekLocal (rootProcess, properties) {
  const filePath = '../var/recipes/' + rootProcess.recipe.filename;
  if (!rootProcess.recipe.hasOwnProperty('vars') && fs.existsSync(filePath)) { // retrieve data from file if not yet loaded into memory
    let content = fs.readFileSync(filePath).toString();
    try {
      rootProcess.recipe.vars = JSON.parse(content);
    } catch (e) {
      console.log(` [!] error: local var file corrupt for ${rootProcess.recipe.filename}. Created backup ${rootProcess.recipe.filename}.corrupt`);
      try {
        fs.renameSync(filePath, filePath + '.corrupt');
        return {e: 1, v: 'peek error: local var file corrupt!'};
      } catch (e) {
        console.log(` [!] error: creating backup ${rootProcess.recipe.filename}.corrupt`);
        return {e: 1, v: 'peek error: local var file corrupt!'};
      }
    }
  }
  if (rootProcess.recipe.hasOwnProperty('vars')) {
    return {e: 0, v: subpeek(properties, rootProcess.recipe.vars)};
  } else {
    return {e: 0, v: undefined};
  }
}

// key = [$scope::][$subScope::]$keyBase[.$property1][...][.$propertyn]
function peek (p, key) {
  if (typeof key === 'number') {
    const process = global.hybrixd.proc[p.parentID];
    const pdata = process.command ? subpeek([key], process.command) : undefined;
    return {e: 0, v: pdata};
  } else if (typeof key === 'string') {
    let processData;
    if (typeof global.hybrixd.proc[p.processID] !== 'undefined' && typeof global.hybrixd.proc[p.processID].data !== 'undefined') {
      processData = global.hybrixd.proc[p.processID].data;
    }
    let pdata;
    const keySplit = key.split('::');
    let properties;
    let keyBase;
    const processStepIdSplit = p.processID.split('.');
    const rootID = processStepIdSplit[0];
    const rootProcess = global.hybrixd.proc[rootID];
    const process = global.hybrixd.proc[p.parentID];

    if (keySplit.length === 2) {
      let scope = keySplit[0];
      key = keySplit[1];
      properties = parse.parseProperty(key);
      keyBase = properties[0];
      if (scope === 'conf') {
        pdata = conf.get(rootProcess.recipe.id + '.' + keyBase);
      } else if (scope === 'proc' && typeof processData !== 'undefined') { // proc::key
        if (isNaN(Number(key)) || key.startsWith('.')) {
          if (keyBase === '' || keyBase === 'data') {
            pdata = subpeek(properties.slice(1), processData);
          } else if (process.hasOwnProperty('vars')) {
            pdata = subpeek(properties, process.vars);
          } else {
            pdata = undefined;
          }
        } else {
          pdata = process.command ? subpeek(properties, process.command) : undefined;
        }
      } else if (scope === 'local' || scope === '') { // local::key
        return peekLocal(rootProcess, properties);
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
        pdata = rootProcess.command ? subpeek(properties, rootProcess.command) : undefined;
      } else if (keyBase === '' || keyBase === 'data') { // "."  ".data"
        pdata = subpeek(properties.slice(1), processData);
      } else if (rootProcess.recipe.hasOwnProperty(keyBase)) { // "fee" etc
        pdata = subpeek(properties, rootProcess.recipe);
      } else if (process.vars.hasOwnProperty(keyBase)) {
        pdata = subpeek(properties, process.vars);
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
