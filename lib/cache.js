// cache.js -> handles cache clearing
//
// (c)2018 internet of coins project - Rouke Pouw
//

const functions = require('./functions');
const conf = require('./conf/conf');

function init (callbackArray) {
  // periodically clean the request cache
  setInterval(function () {
    let maxentries = conf.get('cache.maxentries');

    let cachedarray = Object.keys(global.hybrixd.cached);
    if (cachedarray.length > maxentries) {
      for (let i = 0; i < cachedarray.length - maxentries; i++) {
        delete global.hybrixd.cached[cachedarray[i]];
      }
    }
  }, conf.get('cache.cleanupinterval'));
  // This sequential call is put here async by purpose, the cache clearer needs te be started, is does not need to be run a first time before contunuing
  functions.sequential(callbackArray);
}

function clear (callbackArray) {
  global.hybrixd.cached = {};
  functions.sequential(callbackArray);
}

function add (index, data) {
  global.hybrixd.cached[index] = [Date.now(), data];
}

function get (index, millisecs) {
  const freshThreshold = conf.get('cache.freshthreshold');
  if (millisecs < freshThreshold) { millisecs = freshThreshold; }

  return global.hybrixd.cached.hasOwnProperty(index) // Cache exists for this request
    ? {
      data: global.hybrixd.cached[index][1],
      fresh: global.hybrixd.cached[index][0] > Date.now() - millisecs } // The time does not exceed max allowed delta, it is still fresh
    : null;
}

// export every function
exports.init = init;
exports.add = add;
exports.get = get;
exports.clear = clear;
