// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybridd - hybridd.js
// Top level initiator for main.js and router.js

// globals and constants
require("./globals");

// global prototypes functions for string manipulation and such
require("./prototypes");

// required hybridd components
var hybridd = require("./main");
// start hybridd server
var router = require("./router");
hybridd.main(router.route);
