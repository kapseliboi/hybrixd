// source.js -> handle source calls
//
// (c)2018 internet of coins project - Joachim de Koning
//

const {getFreshOrCachedData, getFreshDataWithoutCaching} = require('./cache');
const conf = require('../conf/conf');

function listSources () {
  const sources = Object.keys(global.hybrixd.routetree.source)
    .filter(s => !s.startsWith('_'));
  return {error: 0, data: sources};
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
  if (sourceExists) {
    if(!conf.get(sourceID+'.enabled')) return { error: 400, data: 'Source "' + sourceID + '" not enabled.' };
    const recipe = global.hybrixd.source[sourceID];
    const getFreshDataWithOrWithoutCaching = request.data ? getFreshDataWithoutCaching : getFreshOrCachedData;
    return getFreshDataWithOrWithoutCaching(recipe, request, xpath);
  } else return {error: 404, data: `Source ${sourceID} not found!`};
}

exports.process = process;
