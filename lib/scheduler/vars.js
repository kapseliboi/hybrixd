let fs = require('fs');

function subpoke (properties, scopeVars, qdata) {
  if (typeof scopeVars === 'object' && scopeVars !== null) {
    if (properties.length === 1) {
      scopeVars[properties[0]] = qdata;
    } else {
      if (!scopeVars.hasOwnProperty(properties[0])) {
        scopeVars[properties[0]] = isNaN(properties[0]) ? {} : [];
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

// key = [$scope::][$subScope::]$keyBase[.$property1][...][.$propertyn]
function poke (p, key, qdata) {
  key = key.replace(/\]/g, '').replace(/\[/g, '.');
  let keySplit = key.split('::');
  let keyBase;
  let properties;
  let scope;
  let process = global.hybrixd.proc[p.parentID];
  const processData = global.hybrixd.proc[p.processID].data;

  let rootID = p.processID.split('.')[0];
  let rootProcess = global.hybrixd.proc[rootID];
  if (keySplit.length === 2) {
    scope = keySplit[0];
    key = keySplit[1];
    properties = key.split('.');
    keyBase = properties[0];

    if (isNaN(key) || key.startsWith('.')) {
      if (scope === 'proc') { // proc::key
        if (keyBase === '' || keyBase === 'data') {
          subpoke(properties.slice(1), processData, qdata);
        } else {
          subpoke(properties, process.vars, qdata);
        }
      } else if (scope === 'local' || scope === '') { // local::key
        if (typeof rootProcess.recipe.vars !== 'object') {
          rootProcess.recipe.vars = {};
        }
        // todo error for         if(keyBase==='' || keyBase === 'data'){
        subpoke(properties, rootProcess.recipe.vars, qdata);
        fs.writeFileSync('../var/recipes/' + rootProcess.recipe.filename, JSON.stringify(rootProcess.recipe.vars));
      } else if (scope === 'parent') {
        return {e: 1, v: 'poke error: Not allowed to write to parent scope from a subprocess!'};
      } else if (scope === 'root') {
        return {e: 1, v: 'poke error: Not allowed to write to root scope from a subprocess!'};
      } else { // otherRecipe::key
        return {e: 1, v: 'poke error: Not allowed to write to another recipe scope!'};
      }
      return {e: 0, v: qdata};
    } else {
      return {e: 1, v: 'poke error: Not allowed to write to a numeral argument property!'};
    }
  } else if (keySplit.length === 3) {
    return {e: 1, v: 'poke error: Not allowed to write to local variable of another recipe!'};
  } else if (typeof key === 'number' && !key.startsWith('.')) { // 0,1,2,3,   or fee
    return {e: 1, v: 'poke error: Not allowed to write to a numeral argument property!'};
  } else {
    properties = key.split('.');
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
}

// key = [$scope::][$subScope::]$keyBase[.$property1][...][.$propertyn]
function peek (p, key) {
  // DEBUG: console.log('peek>>>', key);
  if (typeof key === 'string') {
    key = key.replace(/\]/g, '').replace(/\[/g, '.');
    let pdata;
    let keySplit = key.split('::');
    let properties;
    let keyBase;
    let processStepIdSplit = p.processID.split('.');
    let rootID = processStepIdSplit[0];
    const processData = global.hybrixd.proc[p.processID].data;
    let rootProcess = global.hybrixd.proc[rootID];
    let process = global.hybrixd.proc[p.parentID];

    if (keySplit.length === 2) {
      let scope = keySplit[0];
      key = keySplit[1];
      properties = key.split('.');
      keyBase = properties[0];

      if (scope === 'proc') { // proc::key
        if (isNaN(key) || key.startsWith('.')) {
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
        // ERROR if                  if(keyBase==='' || keyBase === 'data'){

        let filePath = '../var/recipes/' + rootProcess.recipe.filename;
        if (!rootProcess.recipe.hasOwnProperty('vars') && fs.existsSync(filePath)) { // retrieve data from file if not yet loaded into memory
          let content = fs.readFileSync(filePath).toString();
          try {
            rootProcess.recipe.vars = JSON.parse(content);
          } catch (e) {
            console.log(` [!] error: local var file corrupt for ${rootProcess.recipe.filename}`);
            return {e: 1, v: 'peek error: local var file corrupt!'};
          }
        }
        if (rootProcess.recipe.hasOwnProperty('vars')) {
          pdata = subpeek(properties, rootProcess.recipe.vars);
        } else {
          pdata = undefined;
        }
      } else if (scope === 'parent') { // parent::key
        if (processStepIdSplit.length > 3) {
          let parentProcessID = processStepIdSplit.slice(0, processStepIdSplit.length - 3).join('.');
          let parentProcess = global.hybrixd.proc[parentProcessID];
          // TODO check if parent exists
          if (isNaN(key) || key.startsWith('.')) {
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
        } else if (scope === 'root') { // root::key
          if (isNaN(key || key.startsWith('.'))) {
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
      keyBase = key.split('.')[0];
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
      properties = key.split('.');
      keyBase = properties[0];
      if (!isNaN(key) && !key.startsWith('.')) { // 0,1,2,3
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
