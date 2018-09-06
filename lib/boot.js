// boot.js -> handles boot
//
// (c)2018 internet of coins project - Rouke Pouw
//

var router = require('./router');
var functions = require('./functions');
var fs = require('fs');

// export every function
exports.init = init;

function init (callbackArray) {
  if (fs.existsSync('../boot.json')) {
    console.log(' [i] Executing bootscript.');
    router.route({url: 'command/exec/boot.json', sessionID: 1});
  } else {
    console.log(' [i] No bootscript found.');
  }

  functions.sequential(callbackArray);
}
