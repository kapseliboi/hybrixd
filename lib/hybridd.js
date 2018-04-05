// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybridd - hybridd.js
// Top level initiator for main.js

// globals and constants
require("./globals");

// required hybridd components
var hybridd = require("./main");
var router = require("./router");

// start hybridd server
hybridd.main(router.route);
