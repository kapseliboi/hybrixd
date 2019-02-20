const cache = require('../cache');
const scheduler = require('../scheduler');
const DJB2 = require('../../common/crypto/hashDJB2'); // fast DJB2 hashing

const DEFAULT_CACHE_VALUE = 12000;

function getFreshOrCachedData (moduleExecExists, recipe, request, xpath) {
  const cacheVal = typeof recipe.cache !== 'undefined' ? recipe.cache : DEFAULT_CACHE_VALUE;
  const cacheIdx = DJB2.hash(request.sessionID + xpath.join('/'));
  const cacheResult = cache.get(cacheIdx, cacheVal);
  const result = getFreshOrCachedData_(moduleExecExists, cacheResult, cacheIdx, recipe, request, xpath);

  // if there's no error, use the new value
  if (!result.error && !result.noCache) cache.add(cacheIdx, result);

  return result;
}

function getFreshDataWithoutCaching (recipe, request, xpath) {
  const result = assetExecOrError(recipe, xpath, request.sessionID, request.data);
  return Object.assign(result, {noCache: true});
}

function getFreshOrCachedData_ (moduleExecExists, cacheResult, cacheIdx, recipe, request, xpath) {
  return cacheResult && cacheResult.fresh
    ? cacheResult.data
    : getExecDataorCached(moduleExecExists, cacheIdx, cacheResult, recipe, request, xpath);
}

// TODO: See TODO above :)
function getExecDataorCached (moduleExecExists, cacheIdx, cacheResult, recipe, request, xpath) {
  let result = moduleExecOrError(moduleExecExists, recipe, xpath, request.sessionID, request.data); // We do a fresh call
  return !result.error || !cacheResult
    ? result
    : cacheResult.data;
}

function moduleExecOrError (moduleExecExists, recipe, xpath, sessionID, data) {
  return !moduleExecExists
    ? {error: 1, data: 'Module not found or disfunctional!'}
    : activateModuleExec(data, recipe, xpath, sessionID);
}

function activateModuleExec (data, recipe, xpath, sessionID) {
  const command = xpath.slice(2);
  // init new process
  const processID = scheduler.init(0, {sessionID, data, path: xpath, command, recipe
  }); // Is this a pure function? => No it has a side effect / main prupose  of creating a proccess. Kind of anti-pure :)
  const main = global.hybrixd.module[recipe.module].main;
  const doesNotHaveExec = !main.hasOwnProperty('exec');
  const recipesQuartz = recipe.hasOwnProperty('quartz') && recipe.quartz.hasOwnProperty(command[0]);
  const mainProcess = doesNotHaveExec || recipesQuartz ? global.hybrixd.module['quartz'].main : main;
  const result = mainProcessDataOrError(mainProcess, processID, recipe, command);

  return typeof result === 'undefined'
    ? scheduler.result(processID, xpath)
    : result;
}

function mainProcessDataOrError (main, processID, recipe, command) {
  try {
    return main.exec({
      processID: processID,
      target: recipe,
      command: command
    });
  } catch (e) {
    console.log(' [!] Error executing asset function: ' + e);
    return {error: 1, data: 'Error executing asset function.'};
  }
}

// activate module exec function - disconnects and sends results to processID!
// run the module connector function - disconnects and sends results to processID!
function assetExecOrError (recipe, xpath, sessionID, data) {
  const assetModuleExec = global.hybrixd.module[recipe.module];

  return !assetModuleExec
    ? {error: 1, data: 'Module not found or disfunctional!'}
    : activateModuleExec(data, recipe, xpath, sessionID);
}

module.exports = {
  getFreshOrCachedData,
  getFreshDataWithoutCaching
};
