// engine.js -> handle engine calls
//
// (c) 2018 Internet of Coins project - Joachim de Koning
//

const {getFreshOrCachedData} = require('./cache');

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
  const recipe = global.hybrixd.engine[engine];
  const engineError = {
    'error': 404,
    'data': 'Engine "' + engine + '" not found!'
  };

  return engineExists
    ? getFreshOrCachedData(recipe, request, xpath)
    : engineError;
}

exports.process = process;
