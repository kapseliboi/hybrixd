// cache.js -> handles cache clearing
//
// (c)2018 internet of coins project - Rouke Pouw
//

// export every function
exports.init = init;


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
