// cache.js -> handles cache clearing
//
// (c)2018 internet of coins project - Rouke Pouw
//

// export every function
exports.init = init;
exports.add = add;
exports.get = get;
exports.clear = clear;

function init(callbackArray){
  // periodically clean the request cache
  setInterval(function() {

    var maxentries = typeof global.hybridd.cacheidx !== "undefined" && global.hybridd.cacheidx > 0 ? global.hybridd.cacheidx : 100;
    var cachedarray = Object.keys(global.hybridd.cached);
    if (cachedarray.length > maxentries) {

      for (var i = 0; i < cachedarray.length - maxentries; i++) {

        delete global.hybridd.cached[cachedarray[i]];

      }

    }

  }, 1000);
  // This sequential call is put here async by purpose, the cache clearer needs te be started, is does not need to be run a first time before contunuing
  functions.sequential(callbackArray);
}

function clear(callbackArray){
  global.hybridd.cached = {};
  functions.sequential(callbackArray);
}

function add(index,data) {
  global.hybridd.cached[index] = [Date.now(),data];
}

function get(index,millisecs) {
  if(millisecs<100) { millisecs=100; }
  if(global.hybridd.cached.hasOwnProperty(index)) { // Cache exists for this request
    if(global.hybridd.cached[index][0]>Date.now()-millisecs) { // The time does not exceed max allowed delta, it is still fresh
      if(DEBUG) { console.log(" [D] cache hit for index: "+index); }
      return {data: global.hybridd.cached[index][1], fresh: true};
    }else{
      return {data: global.hybridd.cached[index][1], fresh: false}; // the data is no longer fresh
    }
  }else{ // No cache exists for this request
    return null;
  }
}
