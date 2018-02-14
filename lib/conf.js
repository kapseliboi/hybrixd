// conf.js -> handles loading of configuration
//
// (c)2018 internet of coins project - Rouke Pouw
//

// export every function
exports.init = init;

function init(callbackArray){
  var ini = require("./ini");
  Object.assign(global.hybridd, ini.parse(fs.readFileSync("../hybridd.conf", "utf-8"))); // merge object
  if (fs.existsSync("../hybridd.local.conf")) { //  load local conf if available
    Object.assign(global.hybridd, ini.parse(fs.readFileSync("../hybridd.local.conf", "utf-8"))); // merge object
  }

  // ignore TLS certificate errors?
  if(typeof global.hybridd.ignoreTLSerror !== 'undefined' && global.hybridd.ignoreTLSerror) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
  functions.sequential(callbackArray);
}
