// (c)2015-2016 Internet of Coins / Metasync / Joachim de Koning
// hybridd - router.js
// Routes incoming path array xpath to asynchronous processes.

var fileHashes = {}; // Keep file hashes cached

// required libraries in this context
var fs = require('fs');
var DJB2 = require('../common/crypto/hashDJB2'); // fast DJB2 hashing
// TODO var cache = require('./cache');

// routing submodules (keep in alphabetical order)
var asset = require('./router/asset');
var command = require('./router/command');
var list = require('./router/list');
var help = require('./router/help');
var proc = require('./router/proc');
var source = require('./router/source');
var engine = require('./router/engine');
var wchan = require('./router/wchan');
var xauth = require('./router/xauth');
var version = require('./router/version');

// exports
exports.route = route;
exports.isValidPath = isValidPath;
exports.isValidRef = isValidRef;
exports.refList = refList;

// Please keep in alphabetical order and keep alias letter reserved
var routeRootMap = {
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
    return Object.keys(global.hybridd.asset);
  } else if (list === 'source') {
    return Object.keys(global.hybridd.source);
  } else if (list === 'engine') {
    return Object.keys(global.hybridd.engine);
  } else if (list === 'proc') {
    // var processID = item.split('.')[0];
    // TODO check session Id??
    // return Object.keys(global.hybridd.proc);
  }
  return undefined;
}

function isValidRef (list, item) {
  if (list === 'asset') {
    return global.hybridd.asset.hasOwnProperty(item);
  } else if (list === 'source') {
    return global.hybridd.source.hasOwnProperty(item);
  } else if (list === 'engine') {
    return global.hybridd.engine.hasOwnProperty(item);
  } else if (list === 'proc') {
    var processID = item.split('.')[0];
    // TODO check session Id??
    return global.hybridd.proc.hasOwnProperty(processID);
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
  var it = global.hybridd.routetree; // iterate through routes.json

  if (xpath[0] === 'help') { return {valid: true, ypath: [it], status: 200}; }

  var ypath = [];

  for (var i = 0, len = xpath.length; i < len; ++i) {
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
      var flag_found_ref = false;
      if (it.hasOwnProperty('_ref')) { // Next xpath node is part of a dynamic list
        if (it['_ref'].hasOwnProperty('_ellipsis') && it['_ref']['_ellipsis']) { return {valid: true, ypath: [it], status: 200}; }

        if (!it['_ref'].hasOwnProperty('_list')) {
          return {valid: false, ypath: ypath, status: 500, msg: 'Missing list describer for references.'}; // List not found
        }
        var list = it['_ref']['_list']; // get the list of references for this dynamic list

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
    var xpath = request.url.split('/'); // create xpath array
    for (var i = 0; i < xpath.length; i++) {
      if (xpath[i] === '') {
        xpath.splice(i, 1); i--;
      } else {
        try {
          xpath[i] = decodeURIComponent(xpath[i]); // prune empty values and clean vars
        } catch (e) {
          console.log(' [!] illegal routing url: ' + request.url);
          return {'error': 1, 'info': 'Your request ' + request.url + ' was ill formatted!'}; // TODO request tovoegen
        }
      }
    }

    // default error message
    var result = {error: 1, info: 'Your request was not understood!'};
    // route path handling (console.log only feedbacks same route once and stay silent for y and z calls )
    if (JSON.stringify(xpath) !== JSON.stringify(global.hybridd.last_routed_xpath) && xpath[0] !== 'y' && xpath[0] !== 'z') {
      console.log(' [i] routing request /' + xpath.join('/'));
    }
    global.hybridd.last_routed_xpath = xpath; // used to prevent double console.log on repeated calls

    // routing logic starts here
    if (xpath.length === 0) {
      xpath = ['help'];
    }

    var v = isValidPath(xpath, request.sessionID);
    if (!v.valid) {
      console.log(' [!] illegal routing request: /' + xpath.join('/'));
      return {help: help.help(xpath, v), error: 1, id: null, path: '/' + xpath.join('/')};
    }

    var node;
    if (routeRootMap.hasOwnProperty(xpath[0])) { // Check if node is directly defined in routeMap
      node = xpath[0];
    } else if (global.hybridd.routetree.hasOwnProperty(xpath[0]) &&
               global.hybridd.routetree[xpath[0]].hasOwnProperty('_alias') && // Check for alias in routeTree
               routeRootMap.hasOwnProperty(global.hybridd.routetree[xpath[0]]['_alias']) // Check if node alias is defined in routeMap
    ) {
      node = global.hybridd.routetree[xpath[0]]['_alias'];
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
         - - [info]
         - - [id]
         - - [type]  'file' 'html'
      */
    if (typeof result === 'object') { // flat files
      var offset = request.offset || result.offset;
      var length = request.length || result.length;
      var hash = request.hash || result.hash;
      if (typeof offset !== 'undefined' && typeof length !== 'undefined') {
        if (typeof result.type !== 'undefined' && result.type.startsWith('file:')) {
          var filePath = '../' + result.data.replace('..', ''); // 'file://*' => file : '$HYBRIDD_HOME/*'   //TODO Make safer MAYBE warning on '..' usage?

          if (fs.existsSync(filePath)) {
            // use a offset and length to return partial data
            var buffer = Buffer.alloc(length);
            var fileStream = fs.openSync(filePath, 'r');
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
            result.data = null;
            result.info = 'File not found.';
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
          result.data = null;
          result.info = 'File not found.';
        } else {
          var filePath = '../' + result.data.replace('..', ''); // 'file://*' => file : '$HYBRIDD_HOME/*'   //TODO Make safer MAYBE warning on '..' usage?
          if (fs.existsSync(filePath)) {
            if (hash) {
              if (!fileHashes.hasOwnProperty(filePath)) {
                fileHashes[filePath] = DJB2.hash(String(fs.readFileSync(filePath).toString('utf8')));
              }
              result.data = fileHashes[filePath];
              delete result.type;
            } else {
              result.data = fs.readFileSync(filePath).toString('utf8');
              result.type = result.type.substr(5); // "file:$CONTENT-TYPE" =>  "$CONTENT-TYPE"
              if (result.type === 'data') { // remove default
                delete result.type;
              }
            }
          } else {
            delete result.type;
            result.error = 1;
            result.data = null;
            result.info = 'File not found.';
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
    // when shorthand is used, cull output data by removing result.info
    if (typeof xpath[0] === 'undefined' || xpath[0].length <= 1) {
      delete result.info;
      delete result.command;
      delete result.path;
    }

    return result;
  }
  return {error: 1, info: 'Your request was ill formatted. Expected request url to be a string'};
}
