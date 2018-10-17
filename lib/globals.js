// globals.js - gets all dependency globals (and constants) in place
//  - bundled nicely for overview convenience
// (c) 2016 metasync r&d / internet of coins project

// proc and auth globals
global.hybridd = {};
global.hybridd.proc = {};
global.hybridd.procPaused = {};
global.hybridd.procqueue = {};

global.hybridd.APIqueue = {};
global.hybridd.APIhost = {};
global.hybridd.APIqueueInterval = null; // the API queue main interval loop
global.hybridd.APIqueueInitiated = false; // whether the API queue has been initiated

global.hybridd.asset = {};
global.hybridd.engine = {};
global.hybridd.source = {};
global.hybridd.xauth = {};
global.hybridd.xauth.session = [];
global.hybridd.uiServer = null;
global.hybridd.restServer = null;
global.hybridd.last_routed_xpath = ''; // avoid double display logging of routing
global.hybridd.cached = {}; // cached responses
global.hybridd.defaultQuartz = null; // the default quartz functions
global.hybridd.cronCounter = 0;

global.hybridd.schedulerCoreInterval = null; // the schedulers core interval loop
global.hybridd.schedulerCronInterval = null; // the schedulers cron interval loop
global.hybridd.schedulerProcPurgeTime = 120;

global.hybridd.schedulerInitiated = false; // whether the scheduler has been initiated
global.hybridd.schedulerParallelProcesses = 0; // number of processes
global.hybridd.schedulerMaxParallelProcesses = 1000; // maximum nr of processes, the rest will be queued
global.hybridd.schedulerTick = 50; // The scheduler tick frequency
global.hybridd.schedulerMaxUsage = 80; // the percentage of tick maximally allowed to be used
global.hybridd.schedulerCoreBusy = false;

// include js-NaCl everywhere. This will be initialized by naclFactory.js
nacl = null; // TODO: make official global by using global.hybridd prefix

// constants
DEBUG = false; // adds debug messages to stdout
