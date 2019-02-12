// globals.js - gets all dependency globals (and constants) in place
//  - bundled nicely for overview convenience
// (c) 2016 Internet of Coins

global.hybrixd = {};

// processes
global.hybrixd.proc = {};
global.hybrixd.procPaused = {};
global.hybrixd.procqueue = {};

// API queue
global.hybrixd.APIqueue = {};
global.hybrixd.APIhost = {};
global.hybrixd.APIqueueInterval = null; // the API queue main interval loop
global.hybrixd.APIqueueInitiated = false; // whether the API queue has been initiated

// assets, engines, sources
global.hybrixd.asset = {};
global.hybrixd.engine = {};
global.hybrixd.source = {};

// authentication
global.hybrixd.xauth = {};
global.hybrixd.xauth.session = [];

global.hybrixd.servers = {}; // The server endpoint to entrypoint mapping
global.hybrixd.endpoints = {}; // The endpoint server objects

// servers and routing
global.hybrixd.uiServer = null;
global.hybrixd.restServer = null;
global.hybrixd.last_routed_xpath = ''; // avoid double display logging of routing
global.hybrixd.cached = {}; // cached responses

// scheduler
global.hybrixd.defaultQuartz = null; // the default quartz functions
global.hybrixd.cronCounter = 0;

global.hybrixd.schedulerCoreInterval = null; // the schedulers core interval loop
global.hybrixd.schedulerCronInterval = null; // the schedulers cron interval loop
global.hybrixd.schedulerProcPurgeTime = 120;

global.hybrixd.schedulerInitiated = false; // whether the scheduler has been initiated
global.hybrixd.schedulerParallelProcesses = 0; // number of processes
global.hybrixd.schedulerMaxParallelProcesses = 1000; // maximum nr of processes, the rest will be queued
global.hybrixd.schedulerTick = 50; // The scheduler tick frequency
global.hybrixd.schedulerMaxUsage = 80; // the percentage of tick maximally allowed to be used
global.hybrixd.schedulerCoreBusy = false;

// include js-NaCl everywhere. This will be initialized by naclFactory.js
nacl = null; // TODO: make official global by using global.hybrixd prefix

// constants
DEBUG = false; // adds debug messages to stdout
