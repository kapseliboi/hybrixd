// conf.js -> handles loading of configuration
//
// (c)2018 internet of coins project - Rouke Pouw
//

// export every function
exports.init = init;
exports.reload = reload;
exports.get = getConf;
exports.set = setConf;
exports.import = importConf;
exports.setup = setup;
exports.list = listConf;

const sequential = require('../util/sequential');
const fs = require('fs');
const events = require('events');
const path = require('path');

const metaconf = require('./metaconf.json');

let conf = {};

// needed because this file is also included outside global.hybrixd scope
function logger () {
  if (global && global.hybrixd && global.hybrixd.logger) {
    global.hybrixd.logger.apply(global.hybrixd.logger, arguments);
  }
}

function getConf (keys) {
  if (typeof keys === 'string') { keys = keys.split('.'); }
  let c = conf;
  let m = metaconf;
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i].toLowerCase();
    if (m.hasOwnProperty(key)) {
      m = m[key];
    } else {
      logger(['error', 'conf'], 'Unknown configuration key: ' + keys.join('.'));
      return undefined;
    }

    if (c && c.hasOwnProperty(key)) {
      c = c[key];
    } else if (i === keys.length - 1) {
      c = m.default;
    }
  }
  return c;
}

function listConf (keys) {
  if (typeof keys === 'undefined') { return metaconf; }
  if (typeof keys === 'string') { keys = keys.split('.'); }
  let c = conf;
  let m = metaconf;
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i].toLowerCase();
    if (m.hasOwnProperty(key)) {
      m = m[key];
    } else {
      logger(['error', 'conf'], 'Unknown configuration key: ' + keys.join('.'));
      return undefined;
    }

    if (c && c.hasOwnProperty(key)) {
      c = c[key];
    } else if (i === keys.length - 1) {
      c = m.default;
    }
  }
  return m;
}

function setConf (keys, value, silent) {
  if (typeof keys === 'string') { keys = keys.split('.'); }
  let c = conf;
  let m = metaconf;
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i].toLowerCase();
    if (m.hasOwnProperty(key)) {
      m = m[key];
    } else if (silent) {
      return undefined;
    } else {
      logger(['error', 'conf'], 'Unknown configuration key: ' + keys.join('.'));
      return undefined;
    }

    if (i === keys.length - 1) {
      const changed = c[key] === value;
      c[key] = value;
      return changed;
    } else if (c.hasOwnProperty(key)) {
      c = c[key];
    } else {
      c[key] = {};
      c = c[key];
    }
  }
  return false;
}

function importConf (fileName, silent) {
  if (fs.existsSync(fileName)) {
    const lines = fs.readFileSync(fileName, 'utf-8').split('\n');
    let stanza = '';
    for (let i = 0; i < lines.length; ++i) {
      const line = lines[i].trim();
      if (line.startsWith('[') && line.endsWith(']')) {
        stanza = line.substring(1, line.length - 1) + '.';
      } else if (!line.startsWith('#') && line.indexOf('=') !== -1) {
        const keyValue = line.split('=');
        setConf(stanza + keyValue[0].trim(), JSON.parse(keyValue[1].trim()), silent);
      }
    }
    return true;
  } else if (!silent) {
    logger(['error', 'conf'], 'Configuration file not found: ' + fileName);
    return false;
  } else {
    return false;
  }
}

function setup (fileName) {
  if (typeof fileName === 'undefined') fileName = path.resolve(__dirname, '../../hybrixd.conf');
  return importConf(fileName, true);
}

function applyCustomConf (recipeType) {
  Object.keys(global.hybrixd[recipeType]).forEach(id => {
    if (global.hybrixd[recipeType][id].hasOwnProperty('router')) { // load router data
      global.hybrixd.routetree[recipeType][id] = global.hybrixd[recipeType][id].router;
    }
    if (global.hybrixd[recipeType][id].hasOwnProperty('conf')) { // load config data
      metaconf[id] = global.hybrixd[recipeType][id].conf;
    }
  });
}

function init (callbackArray) {
  // ignore TLS certificate errors?
  if (getConf('host.ignoreTLSerror')) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  // load route tree from file
  global.hybrixd.routetree = JSON.parse(fs.readFileSync('./router/routetree.json', 'utf8')); // iterate through routes.json

  applyCustomConf('engine');
  applyCustomConf('source');

  importConf('../hybrixd.conf', false);

  events.EventEmitter.defaultMaxListeners = getConf('host.defaultMaxListeners');

  // load default quartz functions
  sequential.next(callbackArray);
}

function reload (callbackArray) {
  // TODO clear current conf and reset everything to default
  init(callbackArray);
  // Todo: if conf for ui/rest ports changes we need to reload those as well
}
