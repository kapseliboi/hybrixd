// source.js -> handle source calls
//
// (c)2018 internet of coins project - Joachim de Koning
//

const {getFreshOrCachedData} = require('./cache');

function listSources () {
  const sources = Object.keys(global.hybrixd.routetree.source)
    .filter(s => !s.startsWith('_'));

  return {
    'error': 0,
    'data': sources
  };
}

function process (request, xpath) {
  const hasSingleArgument = xpath.length === 1;
  const sourceID = xpath[1];

  return hasSingleArgument
    ? listSources()
    : getSourceDataOrError(sourceID, request, xpath);
}

function getSourceDataOrError (sourceID, request, xpath) {
  const sourceExists = global.hybrixd.source.hasOwnProperty(sourceID);

  return sourceExists
    ? getFreshOrCachedData(global.hybrixd.source[sourceID], request, xpath)
    : {
      'error': 404,
      'data': 'Source ${sourceID} not found!'
    };
}

exports.process = process;
