//
// hybridd - main.js
//

// exports
exports.main = main;

// required standard libraries
var fs = require("fs");
var path = require("path");

router = require("./router");
recipes = require("./recipes");

// router globals
last_xpath = "";

// required hybridd components
modules = require("./modules");
scheduler = require("./scheduler");
APIqueue = require("./APIqueue");

var conf = require("./conf");
var servers = require("./servers");
var cache = require("./cache");

function main (route) {
  // initialize components sequentially
  functions.sequential([conf.init,
                        recipes.init,
                        modules.init,
                        servers.local.init,
                        scheduler.initialize,
                        APIqueue.initialize,
                        servers.public.init,
                        cache.init]
                      );
}
