//
// hybridd - main.js
//

// exports
exports.main = main;

// required hybridd components
var recipes = require("./recipes");
var modules = require("./modules");
var scheduler = require("./scheduler");
var APIqueue = require("./APIqueue");
var conf = require("./conf");
var servers = require("./servers");
var cache = require("./cache");

function initNacl(callbackArray){
  var nacl_factory = require("./crypto/nacl.js");
  nacl_factory.instantiate(function (naclinstance) {
    nacl = naclinstance; // nacl is a global that is initialized here.
    functions.sequential(this.callbackArray);
  }.bind({callbackArray:callbackArray})
                          );
}

function main (route) {
  // initialize components sequentially
  functions.sequential([
    initNacl,
    conf.init,
    recipes.init,
    modules.init,
    servers.local.init,
    scheduler.initialize,
    APIqueue.initialize,
    servers.public.init,
    cache.init]
                      );
}
