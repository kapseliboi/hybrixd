// (c)2015-2016 Internet of Coins / Metasync / Joachim de Koning
// hybrixd - router.js
// Routes incoming path array xpath to asynchronous processes.

let fileHashes = {}; // Keep file hashes cached

// required libraries in this context
let fs = require('fs');
let DJB2 = require('../common/crypto/hashDJB2'); // fast DJB2 hashing
// TODO var cache = require('./cache');

// routing submodules (keep in alphabetical order)
let asset = require('./router/asset');
let command = require('./router/command');
let list = require('./router/list');
let help = require('./router/help');
let proc = require('./router/proc');
let source = require('./router/source');
let engine = require('./router/engine');
let wchan = require('./router/wchan');
let xauth = require('./router/xauth');
let version = require('./router/version');

// exports
exports.route = route;
exports.isValidPath = isValidPath;
exports.isValidRef = isValidRef;
exports.refList = refList;

// Please keep in alphabetical order and keep alias letter reserved
let routeRootMap = {
  asset: asset.process,
  command: command.process,
  engine: engine.process,
  list: list.process,
  help: help.serve,
  proc: proc.process,
  source: source.process,
  version: version.serve,
  wchan: wchan.process,
  xauth: xauth.processX,
  ychan: xauth.processY,
  zchan: xauth.processZ
};

function refList (list) {
  if (list === 'asset') {
    return Object.keys(global.hybrixd.asset);
  } else if (list === 'source') {
    return Object.keys(global.hybrixd.source);
  } else if (list === 'engine') {
    return Object.keys(global.hybrixd.engine);
  } else if (list === 'proc') {
    // var processID = item.split('.')[0];
    // TODO check session Id??
    // return Object.keys(global.hybrixd.proc);
  }
  return undefined;
}

function isValidRef (list, item) {
  if (list === 'asset') {
    return global.hybrixd.asset.hasOwnProperty(item);
  } else if (list === 'source') {
    return global.hybrixd.source.hasOwnProperty(item);
  } else if (list === 'engine') {
    return global.hybrixd.engine.hasOwnProperty(item);
  } else if (list === 'proc') {
    let processID = item.split('.')[0];
    // TODO check session Id??
    return global.hybrixd.proc.hasOwnProperty(processID);
  } else if (list === 'address') {
    return true; // TODO validate?
  } else if (list === 'nonce') {
    return true; // TODO validate?
  } else if (list === 'encrypted_path') {
    return true; // TODO validate?
  } else if (list === 'session_hexkey') {
    return true; // TODO validate? 64 char
  } else if (list === 'crypt_hex') {
    return true; // TODO validate?
  } else if (list === 'mode') {
    return true; // TODO validate?
  }
  return true;
}

// Check whether a route is valid according to router/routes.json
function isValidPath (xpath, sessionID) {
  let it = global.hybrixd.routetree; // iterate through routes.json

  if (xpath[0] === 'help') { return {valid: true, ypath: [it], status: 200}; }

  let ypath = [];

  for (let i = 0, len = xpath.length; i < len; ++i) {
    ypath.push(it);

    if (it !== null && typeof it === 'object') {
      if (it.hasOwnProperty('_ellipsis') && it['_ellipsis']) { return {valid: true, ypath: [it], status: 200}; }

      if (it.hasOwnProperty('_access')) {
        if (it['_access'] === 'root') {
          if (sessionID !== 1) { return {valid: false, ypath: ypath, status: 403}; } // Root required, but caller is not root : Signal forbidden
        } else {
          return {valid: false, ypath: ypath, status: 403}; // Unknown access protocol : Signal forbidden
        }
      }
      let flag_found_ref = false;
      if (it.hasOwnProperty('_ref')) { // Next xpath node is part of a dynamic list
        if (it['_ref'].hasOwnProperty('_ellipsis') && it['_ref']['_ellipsis']) { return {valid: true, ypath: [it], status: 200}; }

        if (!it['_ref'].hasOwnProperty('_list')) {
          return {valid: false, ypath: ypath, status: 500, msg: 'Missing list describer for references.'}; // List not found
        }
        let list = it['_ref']['_list']; // get the list of references for this dynamic list

        flag_found_ref = isValidRef(list, xpath[i]);

        if (flag_found_ref) {
          it = it['_ref'];
        }
      }
      if (!flag_found_ref) { // If no reference list is found, try explicit nodes
        if (it.hasOwnProperty(xpath[i])) {
          if (it[xpath[i]] !== null && typeof it[xpath[i]] === 'object' && it[xpath[i]].hasOwnProperty('_alias')) { // use alias instead
            if (it.hasOwnProperty(it[xpath[i]]['_alias'])) {
              it = it[it[xpath[i]]['_alias']];
            } else {
              return {valid: false, ypath: ypath, status: 500, msg: "Alias '" + xpath[i] + "' => '" + it[xpath[i]]['_alias'] + "'not found"}; // Alias not found
            }
          } else {
            it = it[xpath[i]]; // Found next xpath node, moving to it
          }
        } else {
          return {valid: false, ypath: ypath, status: 404}; // Can't find next xpath node
        }
      }
    } else if (i < len - 1) {
      return {valid: false, ypath: ypath, status: 404}; // Not an object so can't find a next xpath node
    }
  }
  if (typeof it === 'string') {
    return {valid: true, ypath: ypath, node: it, status: 200};
  } else if (it !== null && typeof it === 'object') {
    if (it.hasOwnProperty('_this') && ypath.length === xpath.length) {
      return {valid: true, ypath: ypath, node: it, status: 200};
    } else {
      return {valid: false, ypath: ypath, status: 404};
    }
  } else {
    return {valid: false, ypath: ypath, status: 500}; // the routes.json itself is invalid
  }
}

// routing handler
function route (request) {
  if (typeof request.url === 'string') {
    let xpath = request.url.split('/'); // create xpath array

    for (let i = 0; i < xpath.length; i++) {
      if (xpath[i] === '') {
        xpath.splice(i, 1); i--;
      } else {
        try {
          xpath[i] = decodeURIComponent(xpath[i]); // prune empty values and clean vars
        } catch (e) {
          console.log(' [!] illegal routing url: ' + request.url);
          return {'error': 1, 'data': 'Your request ' + request.url + ' was ill formatted!'}; // TODO request tovoegen
        }
      }
    }

    if (xpath.length > 1 && xpath[0] === 'api' && xpath[1] === 'v1') {
      xpath.shift();
      xpath.shift();
    } else if (xpath.length > 0 && (xpath[0] === 'api' || xpath[0] === 'v1')) {
      xpath.shift();
    }

    // default error message
    let result = {error: 1, data: 'Your request was not understood!'};
    // route path handling (console.log only feedbacks same route once and stay silent for y and z calls )
    if (JSON.stringify(xpath) !== JSON.stringify(global.hybrixd.last_routed_xpath) && xpath[0] !== 'y' && xpath[0] !== 'z') {
      console.log(' [i] routing request /' + xpath.join('/'));
    }
    global.hybrixd.last_routed_xpath = xpath; // used to prevent double console.log on repeated calls

    // routing logic starts here
    if (xpath.length === 0) {
      xpath = ['help'];
    }

    let v = isValidPath(xpath, request.sessionID);
    if (!v.valid) {
      console.log(' [!] illegal routing request: /' + xpath.join('/'));
      return {help: help.help(xpath, v), error: 1, id: null, path: '/' + xpath.join('/')};
    }

    let node;
    if (routeRootMap.hasOwnProperty(xpath[0])) { // Check if node is directly defined in routeMap
      node = xpath[0];
    } else if (global.hybrixd.routetree.hasOwnProperty(xpath[0]) &&
               global.hybrixd.routetree[xpath[0]].hasOwnProperty('_alias') && // Check for alias in routeTree
               routeRootMap.hasOwnProperty(global.hybrixd.routetree[xpath[0]]['_alias']) // Check if node alias is defined in routeMap
    ) {
      node = global.hybrixd.routetree[xpath[0]]['_alias'];
    }

    if (node) {
      result = routeRootMap[node](request, xpath);
      /*        var index = xpath.join('/');
        var cacheResult = cache.get(index);
        if (cacheResult && cacheResult.fresh) {
          result = cacheResult.data;
        } else {
          cache.set(index, result);
          // TODO if result contains error and cacheResult exists then use old value
        } */
    }

    /* Result should be one of the following
         - A string containging encrypted ychan data or compressed zchan data
         - A result data object containing:
         - - error
         - - data
         - - path
         - - command
         - - [id]
         - - [type]  'file' 'html'
      */
    if (typeof result === 'object') { // flat files
      let offset = request.offset || result.offset;
      let length = request.length || result.length;
      let hash = request.hash || result.hash;
      if (typeof offset !== 'undefined' && typeof length !== 'undefined') {
        if (typeof result.type !== 'undefined' && result.type.startsWith('file:')) {
          var filePath = '../' + result.data.replace('..', ''); // 'file://*' => file : '$HYBRIXD_HOME/*'   //TODO Make safer MAYBE warning on '..' usage?

          if (fs.existsSync(filePath)) {
            // use a offset and length to return partial data
            let buffer = Buffer.alloc(length);
            let fileStream = fs.openSync(filePath, 'r');
            fs.readSync(fileStream, buffer, 0, length, offset);
            fs.closeSync(fileStream);
            result.type = result.type.substr(5); // "file:$CONTENT-TYPE" =>  "$CONTENT-TYPE"
            result.data = buffer.toString('utf8');
            result.offset = offset;
            result.length = length;
            if (request.offset && request.length) {
              result.path = ['wchan', offset, length].concat(result.path);
            }
          } else {
            result.err = 1;
            result.data = 'File not found.';
          }
        } else { // a non file with offset && length : remove the options, no pagination for those
          delete result['length'];
          delete result['offset'];
        }
      } else if (typeof result.type !== 'undefined' && result.type.startsWith('file:')) { // a file without  offset and length => delete result['file'];
        if (!hash && ((result.stopped === null && result.hasOwnProperty('stopped')) || result.error !== 0)) { // clear type if there's an error or if not yet stopped
          delete result.type;
        } else if (typeof result.data !== 'string') {
          delete result.type;
          result.error = 1;
          result.data = 'File not found.';
        } else {
          var filePath = '../' + result.data.replace('..', ''); // 'file://*' => file : '$HYBRIXD_HOME/*'   //TODO Make safer MAYBE warning on '..' usage?
          if (fs.existsSync(filePath)) {
            if (hash) {
              if (!fileHashes.hasOwnProperty(filePath)) {
                fileHashes[filePath] = DJB2.hash(String(fs.readFileSync(filePath).toString('utf8')));
              }
              result.data = fileHashes[filePath];
              delete result.type;
            } else {
              result.data = fs.readFileSync(filePath);// .toString('utf8');

              result.type = result.type.substr(5); // "file:$CONTENT-TYPE" =>  "$CONTENT-TYPE"

              if ((typeof result.type === 'undefined' || result.type === 'data') && result.data instanceof Buffer) {
                result.data = result.data.toString('utf8');
              }

              if (result.type === 'data') { // remove default
                delete result.type;
              }
            }
          } else {
            delete result.type;
            result.error = 1;
            result.data = 'File not found.';
          }
        }
      }
    }
    if (typeof result.path === 'undefined') {
      result.path = xpath;
    }
    if (typeof result.path === 'object' && result.path !== null) {
      result.path = '/' + result.path.join('/'); // format the path back to string ["asset","dummy"] => "asset/dummy"
    }
    // when shorthand is used, cull output data
    if (typeof xpath[0] === 'undefined' || xpath[0].length <= 1) {
      delete result.command;
      delete result.path;
    }

    return result;
  }
  return {error: 1, data: 'Your request was ill formatted. Expected request url to be a string'};
}
