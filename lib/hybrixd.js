// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd - hybrixd.js
// Top level initiator for main.js

// globals and constants
require("./globals");

// required hybrixd components
var hybrixd = require("./main");
var router = require("./router");

// start hybrixd server
hybrixd.main(router.route);
