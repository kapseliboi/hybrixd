// (c)2015-2016 Internet of Coins / Metasync / Joachim de Koning
// hybrixd - router.js
// Routes incoming path array xpath to asynchronous processes.

let fileHashes = {}; // Keep file hashes cached

// required libraries in this context
const fs = require('fs');
const DJB2 = require('../common/crypto/hashDJB2'); // fast DJB2 hashing
// TODO var cache = require('./cache');

// routing submodules (keep in alphabetical order)
const asset = require('./router/asset');
const command = require('./router/command');
const list = require('./router/list');
const help = require('./router/help');
const proc = require('./router/proc');
const source = require('./router/source');
const engine = require('./router/engine');
const wchan = require('./router/wchan');
const xauth = require('./router/xauth');
const version = require('./router/version');

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

const refs = ['asset', 'source', 'engine'];

function refList (list) {
  return refs.includes(list)
    ? Object.keys(global.hybrixd[list])
    : undefined;
}

const sources = ['asset', 'source', 'engine', 'proc'];
// const attributes = ['address', 'nonce', 'encrypted_path', 'session_hexkey', 'crypt_hex', 'mode'];

// function isValidRef (list, item) {
//   if (attributes.includes(list)) {
//     return true;
//   } else if (sources.includes(list)) {
//     const idOrItem = list === 'proc' ? item.split('.')[0] : item;
//     return global.hybrixd[list].hasOwnProperty(idOrItem);
//   } else {
//     return true;
//   }
// }

function isValidRef (list, item) {
  if (sources.includes(list)) {
    const idOrItem = list === 'proc' ? item.split('.')[0] : item;
    return global.hybrixd[list].hasOwnProperty(idOrItem);
  } else {
    return true;
  }
}

// Check whether a route is valid according to router/routes.json
function isValidPath (xpath, sessionID) {
  const it = global.hybrixd.routetree; // iterate through routes.json

  return xpath[0] === 'help'
    ? {valid: true, ypath: [it], status: 200}
    : handleItPath(it, sessionID, xpath);
}

function handleItPath (it, sessionID, xpath) {
  let ypath = [];

  for (let i = 0, len = xpath.length; i < len; ++i) {
    let flagFoundRef = false;
    ypath.push(it);

    if (it !== null && typeof it === 'object') {
      if (it.hasOwnProperty('_ellipsis') && it['_ellipsis']) {
        return {valid: true, ypath: [it], status: 200};
      }

      if (it.hasOwnProperty('_access')) {
        if (!it['_access'] === 'root' || (it['_access'] === 'root' && sessionID !== 1)) {
          return {valid: false, ypath: ypath, status: 403}; // Root required, but caller is not root : Signal forbidden // Unknown access protocol : Signal forbidden
        }
      }

      if (it.hasOwnProperty('_ref')) { // Next xpath node is part of a dynamic list
        const list = it['_ref']['_list']; // get the list of references for this dynamic list

        if (it['_ref'].hasOwnProperty('_ellipsis') && it['_ref']['_ellipsis']) {
          return {valid: true, ypath: [it], status: 200};
        }

        if (!it['_ref'].hasOwnProperty('_list')) {
          return {valid: false, ypath: ypath, status: 500, msg: 'Missing list describer for references.'}; // List not found
        }

        flagFoundRef = isValidRef(list, xpath[i]);

        if (flagFoundRef) {
          it = it['_ref'];
        }
      }

      if (!flagFoundRef) { // If no reference list is found, try explicit nodes
        it = getExplicitNodeOrReturnError(it, xpath, ypath, i);
      }
    } else if (i < len - 1) {
      return {valid: false, ypath: ypath, status: 404}; // Not an object so can't find a next xpath node
    }
  }

  return handleItTypes(it, xpath, ypath);
}

function handleItTypes (it, xpath, ypath) {
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

function getExplicitNodeOrReturnError (it, xpath, ypath, i) {
  if (it.hasOwnProperty(xpath[i])) {
    return updateItOrError_(it, xpath, ypath, i);
  } else {
    return {valid: false, ypath: ypath, status: 404}; // Can't find next xpath node
  }
}

function updateItOrError_ (it, xpath, ypath, i) {
  const hasAlias = it[xpath[i]] !== null && typeof it[xpath[i]] === 'object' && it[xpath[i]].hasOwnProperty('_alias');

  return hasAlias
    ? updateItOrError(it, xpath, ypath, i)
    : it[xpath[i]]; // Found next xpath node, moving to it
}

function updateItOrError (it, xpath, ypath, i) {
  if (it.hasOwnProperty(it[xpath[i]]['_alias'])) {
    return it[it[xpath[i]]['_alias']];
  } else {
    return {valid: false, ypath: ypath, status: 500, msg: "Alias '" + xpath[i] + "' => '" + it[xpath[i]]['_alias'] + "'not found"}; // Alias not found
  }
}

// routing handler
function route (request) {
  if (typeof request.url === 'string') {
    return handleRequest(request);
  } else {
    return {error: 1, data: 'Your request was ill formatted. Expected request url to be a string'};
  }
}

function handleRequest (request) {
  let xpath = request.url.split('/'); // create xpath array
  xpath = updateXpathOrError(xpath, request);

  // route path handling (console.log only feedbacks same route once and stay silent for y and z calls )
  if (JSON.stringify(xpath) !== JSON.stringify(global.hybrixd.last_routed_xpath) && xpath[0] !== 'y' && xpath[0] !== 'z') {
    console.log(' [i] routing request /' + xpath.join('/'));
  }
  global.hybrixd.last_routed_xpath = xpath; // used to prevent double console.log on repeated calls

  // routing logic starts here
  const xpathOrHelp = xpath.length === 0 ? ['help'] : xpath;
  const v = isValidPath(xpathOrHelp, request.sessionID);

  return !v.valid
    ? logAndReturnHelp(xpathOrHelp, v)
    : getFinalResult(request, xpathOrHelp);
}

function updateXpathOrError (xpath, request) {
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

  return xpath;
}

function getFinalResult (request, xpath) {
  let result = getNode(request, xpath);

  if (typeof result === 'object') { // flat files
    let offset = request.offset || result.offset;
    let length = request.length || result.length;
    let hash = request.hash || result.hash;

    if (typeof offset !== 'undefined' && typeof length !== 'undefined') {
      result = checkFileResult(result, offset, length, request);
    } else if (typeof result.type !== 'undefined' && result.type.startsWith('file:')) { // a file without  offset and length => delete result['file'];
      if (!hash && ((result.stopped === null && result.hasOwnProperty('stopped')) || result.error !== 0)) { // clear type if there's an error or if not yet stopped
        delete result.type;
      } else if (typeof result.data !== 'string') {
        result = fileNotFoundResult(result);
      } else {
        result = handleFileRequest(result, hash);
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

function handleFileRequest (result, hash) {
  let filePath = '../' + result.data.replace('..', ''); // 'file://*' => file : '$HYBRIXD_HOME/*'   //TODO Make safer MAYBE warning on '..' usage?
  if (fs.existsSync(filePath)) {
    if (hash) {
      result = checkHashResult(result, filePath);
    } else {
      result = checkFileData(result, filePath);
    }
  } else {
    result = fileNotFoundResult(result);
  }
  return result;
}

function fileNotFoundResult (result) {
  delete result.type;
  result.error = 1;
  result.data = 'File not found.';
  return result;
}

function checkHashResult (result, filePath) {
  if (!fileHashes.hasOwnProperty(filePath)) {
    fileHashes[filePath] = DJB2.hash(String(fs.readFileSync(filePath).toString('utf8')));
  }
  result.data = fileHashes[filePath];
  delete result.type;

  return result;
}

function checkFileData (result, filePath) {
  result.data = fs.readFileSync(filePath);// .toString('utf8');
  result.type = result.type.substr(5); // "file:$CONTENT-TYPE" =>  "$CONTENT-TYPE"

  if ((typeof result.type === 'undefined' || result.type === 'data') && result.data instanceof Buffer) {
    result.data = result.data.toString('utf8');
  }

  if (result.type === 'data') { // remove default
    delete result.type;
  }

  return result;
}

function getFileResult (result, filePath, offset, length, request) {
  if (fs.existsSync(filePath)) {
    result = getPartialData(result, length, offset, filePath);
    if (request.offset && request.length) {
      result.path = ['wchan', offset, length].concat(result.path);
    }
    return result;
  } else {
    return {
      err: 1,
      data: 'File not found.'
    };
  }
}

function checkFileResult (result, offset, length, request) {
  if (typeof result.type !== 'undefined' && result.type.startsWith('file:')) {
    let filePath = '../' + result.data.replace('..', ''); // 'file://*' => file : '$HYBRIXD_HOME/*'   //TODO Make safer MAYBE warning on '..' usage?
    result = Object.assign(result, getFileResult(result, filePath, offset, length, request));
  } else { // a non file with offset && length : remove the options, no pagination for those
    delete result['length'];
    delete result['offset'];
  }
  return result;
}

function logAndReturnHelp (xpath, v) {
  console.log(' [!] illegal routing request: /' + xpath.join('/'));
  return {help: help.help(xpath, v), error: 1, id: null, path: '/' + xpath.join('/')};
}

function getPartialData (result, length, offset, filePath) {
  // use a offset and length to return partial data
  const buffer = Buffer.alloc(length);
  const fileStream = fs.openSync(filePath, 'r');
  fs.readSync(fileStream, buffer, 0, length, offset);
  fs.closeSync(fileStream);
  result.type = result.type.substr(5); // "file:$CONTENT-TYPE" =>  "$CONTENT-TYPE"
  result.data = buffer.toString('utf8');
  result.offset = offset;
  result.length = length;

  return result;
}

function getNode (request, xpath) {
  const isAliasDefined = global.hybrixd.routetree.hasOwnProperty(xpath[0]) &&
        global.hybrixd.routetree[xpath[0]].hasOwnProperty('_alias') && // Check for alias in routeTree
        routeRootMap.hasOwnProperty(global.hybrixd.routetree[xpath[0]]['_alias']);
  const aliasOrNull = isAliasDefined ? global.hybrixd.routetree[xpath[0]]['_alias'] : null;
  const node = routeRootMap.hasOwnProperty(xpath[0]) ? xpath[0] : aliasOrNull;

  return node !== null
    ? routeRootMap[node](request, xpath)
    : {error: 1, data: 'Your request was not understood!'}; // default error message
}

exports.route = route;
exports.isValidPath = isValidPath;
exports.isValidRef = isValidRef;
exports.refList = refList;

// if (node) {
//   result = routeRootMap[node](request, xpath);
//   /*        var index = xpath.join('/');
//     var cacheResult = cache.get(index);
//     if (cacheResult && cacheResult.fresh) {
//       result = cacheResult.data;
//     } else {
//       cache.set(index, result);
//       // TODO if result contains error and cacheResult exists then use old value
//     } */
// }

// /* Result should be one of the following
//      - A string containging encrypted ychan data or compressed zchan data
//      - A result data object containing:
//      - - error
//      - - data
//      - - path
//      - - command
//      - - [id]
//      - - [type]  'file' 'html'
//   */
