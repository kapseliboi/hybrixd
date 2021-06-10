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
const DEFAULT_CONF = {enabled: {"default": true, "type": "boolean", "requiresRestart": true}};
const conf = {};

// needed because this file is also included outside global.hybrixd scope
function logger () {
  if (global && global.hybrixd && global.hybrixd.logger) global.hybrixd.logger.apply(global.hybrixd.logger, arguments);
}

// get the ids of parent recipes based on the import property
function getRecipeImportIds (id) {
  if (!global || !global.hybrixd) return [];
  let recipe;
  if (global.hybrixd.engine.hasOwnProperty(id)) recipe = global.hybrixd.engine[id];
  if (global.hybrixd.source.hasOwnProperty(id)) recipe = global.hybrixd.source[id];
  if (typeof recipe !== 'object' || recipe === null) return [];
  if (typeof recipe.import === 'string') return [recipe.import];
  if (recipe.import instanceof Array) return recipe.import;
  return [];
}

function getConf (keys, silent = false) {
  if (typeof keys === 'string') keys = keys.split('.');
  let c = conf; // configuration iterator
  let m = metaconf; // metaconf iterator
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i].toLowerCase();
    if (m.hasOwnProperty(key)) m = m[key];
    else {
      if (i === 0) { // read configuration from parent recipes
        for (const importId of getRecipeImportIds(keys[0])) {
          const value = getConf([importId, ...keys.slice(1)], true);
          if (typeof value !== 'undefined') return value;
        }
      }

      if (!silent) logger(['error', 'conf'], 'Unknown configuration key: ' + keys.join('.'));
      return undefined;
    }

    if (c && c.hasOwnProperty(key)) c = c[key];
    else if (i === keys.length - 1) c = m.default;
    else c = {};  // rely on a default
  }
  return c;
}

function listConf (keys) {
  if (typeof keys === 'undefined') return metaconf;
  if (typeof keys === 'string') keys = keys.split('.');
  let c = conf; // configuration iterator
  let m = metaconf; // metaconf iterator
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i].toLowerCase();
    if (m.hasOwnProperty(key)) m = m[key];
    else {
      logger(['error', 'conf'], 'Unknown configuration key: ' + keys.join('.'));
      return undefined;
    }

    if (c && c.hasOwnProperty(key)) c = c[key];
    else if (i === keys.length - 1) c = m.default;
  }
  return m;
}

function simpleStringify (value) {
  if (typeof value === 'string' && /^[a-zA-Z0-9.-_?!]*$/.test(value)) return value;
  else return JSON.stringify(value);
}

/**
 * Save configuration key value pair to file
 * @param  {[type]} keys                             [description]
 * @param  {[type]} value                            [description]
 * @param  {String} [confFileName='../hybrixd.conf'] [description]
 */
function writeConf (keys, value, confFileName = '../hybrixd.conf') {
  let content;
  const moduleId = keys[0];
  const key = keys.slice(1).join('.');
  value = simpleStringify(value);
  if (fs.existsSync(confFileName)) {
    content = fs.readFileSync(confFileName).toString();
    const stanzaRegex = new RegExp('^\\[' + moduleId + '\\]\\s*$', 'gmi');
    if (stanzaRegex.test(content)) {
      let padd = false;
      if (content.startsWith('[')) { // add a newline padding for easier split
        content = '\n' + content;
        padd = true;
      }
      const stanzas = content.split('\n['); // ['label]\nkey=value\n...',...]
      for (let i = 0; i < stanzas.length; ++i) {
        let stanza = stanzas[i];
        if (stanza.startsWith(moduleId + ']')) { // 'label]\nkey=value\n...'
          const keyRegex = new RegExp('^(\\t| )*' + key + '\\s*=.*$', 'gmi');
          stanza = stanza.replace(keyRegex, line => key + ' = ' + value);
          stanzas[i] = stanza;
        }
      }
      content = stanzas.join('\n[');
      if (padd) content = content.substr(1); // if it was padded, remove the padding
    } else content += `\n[${moduleId}]\n${key}=${value};\n`;
  } else content = `[${moduleId}]\n${key}=${value};\n`; // no content so add stanza completely

  fs.writeFileSync(confFileName, content);
}

function setConf (keys, value, silent = false, importing = false) {
  if (typeof keys === 'string') keys = keys.split('.');
  let c = conf; // configuration iterator
  let m = metaconf; // metaconf iterator
  for (let i = 0; i < keys.length - 1; ++i) {
    const key = keys[i].toLowerCase();
    if (m.hasOwnProperty(key)) m = m[key];
    else if (silent) return undefined;
    else {
      logger(['error', 'conf'], 'Unknown configuration key: ' + keys.join('.'));
      return undefined;
    }
    if (c.hasOwnProperty(key)) c = c[key];
    else c = c[key] = {};
  }
  const key = keys[keys.length - 1].toLowerCase();
  const changed = (c[key] === value);
  c[key] = value;
  if (!importing && changed) writeConf(keys, value);
  return changed;
}

function importConf (fileName, silent = false) {
  if (fs.existsSync(fileName)) {
    const lines = fs.readFileSync(fileName, 'utf-8').split('\n');
    let stanza = '';
    for (let i = 0; i < lines.length; ++i) {
      const line = lines[i].trim();
      if (line.startsWith('[') && line.endsWith(']')) {
        stanza = line.substring(1, line.length - 1) + '.';
      } else if (!line.startsWith('#') && line.indexOf('=') !== -1) {
        const keyValue = line.split('=');
        let value;
        try { // try parsing as JSON, else just use as string
          value = JSON.parse(keyValue[1].trim());
        } catch (e) {
          value = keyValue[1].trim();
        }
        setConf(stanza + keyValue[0].trim(), value, silent, true);
      }
    }
    return true;
  } else if (!silent) {
    logger(['error', 'conf'], 'Configuration file not found: ' + fileName);
    return false;
  } else return false;
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
      metaconf[id] = {...DEFAULT_CONF};
      for (const key in global.hybrixd[recipeType][id].conf) {
        metaconf[id][key.toLowerCase()] = global.hybrixd[recipeType][id].conf[key];
      }
    } else metaconf[id] = {...DEFAULT_CONF};
  });
}

function init (callbackArray) {
  // ignore TLS certificate errors?
  if (getConf('host.ignoreTLSerror')) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  // load route tree from files
  global.hybrixd.routetree = JSON.parse(fs.readFileSync('./router/routetree.json', 'utf8'));
  global.hybrixd.routetree.asset = JSON.parse(fs.readFileSync('../recipes/engine.asset.json', 'utf8')).router;

  applyCustomConf('engine');
  applyCustomConf('source');

  if (fs.existsSync('../hybrixd.conf')) importConf('../hybrixd.conf', false);

  events.EventEmitter.defaultMaxListeners = getConf('host.defaultMaxListeners');

  // load default quartz functions
  sequential.next(callbackArray);
}

function reload (callbackArray) {
  // TODO clear current conf and reset everything to default
  init(callbackArray);
  // Todo: if conf for ui/rest ports changes we need to reload those as well
}
