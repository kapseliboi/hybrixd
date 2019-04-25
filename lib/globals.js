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
global.hybrixd.last_routed_xpaths = []; // avoid double display logging of routing
global.hybrixd.cached = {}; // cached responses

// scheduler
global.hybrixd.defaultQuartz = null; // the default quartz functions
global.hybrixd.cronCounter = 0;

global.hybrixd.schedulerCoreInterval = null; // the schedulers core interval loop
global.hybrixd.schedulerCronInterval = null; // the schedulers cron interval loop

global.hybrixd.schedulerInitiated = false; // whether the scheduler has been initiated
global.hybrixd.schedulerParallelProcesses = 0; // number of processes
global.hybrixd.schedulerCoreBusy = false;

// include js-NaCl everywhere. This will be initialized by naclFactory.js
nacl = null;

// constants
DEBUG = false; // adds debug messages to stdout
