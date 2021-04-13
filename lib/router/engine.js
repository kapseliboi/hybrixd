// engine.js -> handle engine calls
//
// (c) 2018 Internet of Coins project - Joachim de Koning
//

const {getFreshOrCachedData} = require('./cache');
const conf = require('../conf/conf');

function engineList (module) {
  const engine = Object.keys(global.hybrixd.engine);
  return {
    'error': 0,
    'data': engine.sort()
  };
}

function process (request, xpath) {
  const hasNoArguments = xpath.length === 1;

  return hasNoArguments
    ? engineList()
    : getEngineData(request, xpath);
}

function getEngineData (request, xpath) {
  const engine = xpath[1];
  const engineExists = global.hybrixd.engine.hasOwnProperty(engine);
  if(engineExists){
    if(!conf.get(engine+'.enabled')) return { error: 400, data: 'Engine "' + engine + '" not enabled.' };
    const recipe = global.hybrixd.engine[engine];
    return getFreshOrCachedData(recipe, request, xpath)
  }else return {error: 404, data: 'Engine "' + engine + '" not found!'};
}

exports.process = process;
