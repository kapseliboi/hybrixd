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
  const engines = engineList().data;
  const engineExists = engines.indexOf(xpath[1]) > -1;
  const target = global.hybrixd.engine[xpath[1]];
  const targetWithID = Object.assign(target, {id: target.engine});
  const engineError = {
    'error': 1,
    'id': `engine/${xpath[1]}`,
    'info': 'Engine not found!'
  };

  return engineExists
    ? getFreshOrCachedData(true, targetWithID, request, xpath)
    : engineError;
}

exports.process = process;
