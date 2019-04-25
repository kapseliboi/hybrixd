// globals.js - gets all dependency globals (and constants) in place
// (c) 2016 Internet of Coins

// =============================================
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//     CRITICAL : DO NOT ADD MORE GLOBALS!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// =============================================

global.hybrixd = {};

// node specific variables
global.hybrixd.node = { publicKey: null, secretKey: null };

// processes
global.hybrixd.proc = {};
global.hybrixd.procPaused = {};
global.hybrixd.procqueue = {};

// recipes
global.hybrixd.asset = {};
global.hybrixd.engine = {};
global.hybrixd.source = {};

// servers and routing
global.hybrixd.endpoints = {}; // The endpoint server objects

// include js-NaCl everywhere. This will be initialized by naclFactory.js
nacl = null;

// constants
DEBUG = false; // adds debug messages to stdout
