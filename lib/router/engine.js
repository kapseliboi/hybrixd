// engine.js -> handle engine calls
//
// (c) 2018 Internet of Coins project - Joachim de Koning
//

const cache = require('../cache');
const scheduler = require('../scheduler');
const modules = require('../modules');
const DJB2 = require('../../common/crypto/hashDJB2'); // fast DJB2 hashing

const {getFreshOrCachedData, getFreshDataWithoutCaching} = require('./cache');

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
  const engineError = {
    'error': 1,
    'id': `engine/${xpath[1]}`,
    'info': 'Engine not found!'
  };
  let target = global.hybrixd.engine[xpath[1]];

  target.id = target.engine;

  return engineExists
    ? getFreshOrCachedData(true, target, request, xpath)
    : engineError;
}

exports.process = process;
