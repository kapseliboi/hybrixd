// cache.js -> handles cache clearing
//
// (c)2018 internet of coins project - Rouke Pouw
//

const CLEAN_UP_INTERVAL = 1000;
const FRESH_THRESHOLD = 100;
const DEFAULT_MAX_CACHE_ENTRIES = 100;

const functions = require('./functions');

function init (callbackArray) {
  // periodically clean the request cache
  setInterval(function () {
    let maxentries = typeof global.hybrixd.cacheidx !== 'undefined' && global.hybrixd.cacheidx > 0 ? global.hybrixd.cacheidx : DEFAULT_MAX_CACHE_ENTRIES;
    let cachedarray = Object.keys(global.hybrixd.cached);
    if (cachedarray.length > maxentries) {
      for (let i = 0; i < cachedarray.length - maxentries; i++) {
        delete global.hybrixd.cached[cachedarray[i]];
      }
    }
  }, CLEAN_UP_INTERVAL);
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
  if (millisecs < FRESH_THRESHOLD) { millisecs = FRESH_THRESHOLD; }

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
