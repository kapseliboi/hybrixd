// globals.js - gets all dependency globals (and constants) in place
//  - bundled nicely for overview convenience
// (c) 2016 Internet of Coins

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
global.hybrixd.cached = {}; // cached responses
global.hybrixd.endpoints = {}; // The endpoint server objects

// include js-NaCl everywhere. This will be initialized by naclFactory.js
nacl = null; // TODO: make official global by using global.hybrixd prefix

// constants
DEBUG = false; // adds debug messages to stdout
