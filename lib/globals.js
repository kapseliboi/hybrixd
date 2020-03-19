// =============================================
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//     CRITICAL : DO NOT ADD MORE GLOBALS!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// =============================================

const logger = require('./log/logger').logger;

global.hybrixd = {};

// node specific variables
global.hybrixd.node = { publicKey: null, secretKey: null };

// recipes
global.hybrixd.asset = {};
global.hybrixd.engine = {};
global.hybrixd.source = {};

global.hybrixd.logger = logger;

// servers and routing
global.hybrixd.endpoints = {}; // The endpoint server objects

// include js-NaCl everywhere. This will be initialized by naclFactory.js
nacl = null;

// constants
DEBUG = false; // adds debug messages to stdout
