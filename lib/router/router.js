// (c)2015-2016 Internet of Coins / Metasync / Joachim de Koning
// hybrixd - router.js
// Routes incoming path array xpath to asynchronous processes.

const fileHashes = {}; // Keep file hashes cached

// required libraries in this context
const fs = require('fs');
const DJB2 = require('../../common/crypto/hashDJB2'); // fast DJB2 hashing
// TODO var cache = require('./cache');

// routing submodules (keep in alphabetical order)
const asset = require('./asset');
const command = require('./command');
const engine = require('./engine');
const list = require('./list');
const help = require('./help');
const proc = require('./proc');
const source = require('./source');
const report = require('./report');
const wchan = require('./wchan');
const xauth = require('./xauth');
const version = require('./version');
const qrtzProcess = require('../scheduler/process');

let lastRoutedPath = ''; // avoid double display logging of routing

// Please keep in alphabetical order and keep alias letter reserved
const routeRootMap = {
  asset: asset.process,
  command: command.process,
  engine: engine.process,
  list: list.process,
  help: help.serve,
  proc: proc.process,
  report: report.serve,
  source: source.process,
  version: version.serve,
  wchan: wchan.process,
  xauth: xauth.processX,
  ychan: xauth.processY,
  zchan: xauth.processZ
};

const refs = ['asset', 'source', 'engine'];

function refList (list) {
  if (list === 'proc') {
    return qrtzProcess.getProcessList(); // TODO +sessionID
  }
  return refs.includes(list) && list !== 'proc'
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
  if (list === 'proc') {
    return qrtzProcess.processExists(item); // TODO use session?
  } else if (sources.includes(list)) {
    return global.hybrixd[list].hasOwnProperty(item);
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

function forbidden (it, sessionID) {
  if (it.hasOwnProperty('_access')) {
    if (it['_access'] !== 'root' || (it['_access'] === 'root' && sessionID !== 1)) {
      return true; // Root required, but caller is not root : Signal forbidden // Unknown access protocol : Signal forbidden
    }
  }
  return false;
}

function hasEllipsis (it) {
  return it.hasOwnProperty('_ellipsis') && it['_ellipsis'] === true;
}

function handleItPath (it, sessionID, xpath) {
  let ypath = [];

  for (let i = 0, len = xpath.length; i < len; ++i) {
    let flagFoundRef = false;
    ypath.push(it);

    if (it !== null && typeof it === 'object') {
      if (forbidden(it, sessionID)) {
        return {valid: false, ypath: ypath, status: 403};
      }

      let ellipsis = hasEllipsis(it);

      if (it.hasOwnProperty('_ref')) { // Next xpath node is part of a dynamic list
        if (hasEllipsis(it['_ref'])) {
          ellipsis = true;
        }

        if (!it['_ref'].hasOwnProperty('_list')) { // List not found
          if (ellipsis) {
            return {valid: true, ypath: [it], status: 200};
          } else {
            return {valid: false, ypath: ypath, status: 500, msg: 'Missing list describer for references.'};
          }
        }
        const list = it['_ref']['_list']; // get the list of references for this dynamic list

        flagFoundRef = isValidRef(list, xpath[i]);

        if (flagFoundRef) {
          it = it['_ref'];
        }
      }

      if (!flagFoundRef) { // If no reference list is found, try explicit nodes
        const itOrError = getExplicitNodeOrReturnError(it, xpath, ypath, i, sessionID);
        if (itOrError.valid === true) {
          return itOrError;
        } else if (itOrError.valid === false) {
          if (ellipsis && itOrError.status === 404) {
            return {valid: true, ypath: [it], status: 200};
          } else {
            return itOrError;
          }
        } else {
          it = itOrError;
        }
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

function getExplicitNodeOrReturnError (it, xpath, ypath, i, sessionID) {
  if (it.hasOwnProperty(xpath[i])) {
    return updateItOrError_(it, xpath, ypath, i, sessionID);
  } else {
    return {valid: false, ypath: ypath, status: 404}; // Can't find next xpath node
  }
}

function updateItOrError_ (it, xpath, ypath, i, sessionID) {
  const hasAlias = it[xpath[i]] !== null && typeof it[xpath[i]] === 'object' && it[xpath[i]].hasOwnProperty('_alias');
  return hasAlias
    ? updateItOrError(it, xpath, ypath, i, sessionID)
    : it[xpath[i]]; // Found next xpath node, moving to it
}

function updateItOrError (it, xpath, ypath, i, sessionID) {
  const alias = it[xpath[i]]['_alias'];
  if (alias === '/') {
    xpath.splice(0, i + 1);
    return isValidPath(xpath, sessionID);
  } else if (it.hasOwnProperty(alias)) {
    const newIt = it[it[xpath[i]]['_alias']];
    xpath[i] = it[xpath[i]]['_alias']; // update xpath with alias
    return newIt;
  } else {
    return {valid: false, ypath: ypath, status: 500, msg: "Alias '" + xpath[i] + "' => '" + it[xpath[i]]['_alias'] + "'not found"}; // Alias not found
  }
}

// routing handler
function route (request) {
  if (typeof request.url === 'string') {
    return handleRequest(request);
  } else {
    return {error: 400, data: 'Your request was ill formatted. Expected request url to be a string'};
  }
}

function handleRequest (request) {
  const routedPath = request.url;
  let xpath = routedPath.split('/'); // create xpath array
  xpath = cleanPath(xpath, request);
  if (xpath.length === 0) { xpath = ['help']; }

  const shorthand = typeof xpath[0] === 'undefined' || xpath[0].length <= 1;

  // route path handling (console.log only feedbacks same route once and stay silent for y and z calls )

  if (xpath[0] !== 'y' && !(xpath[0] === 'p' && xpath[0] !== 'debug') && xpath[0] !== 'z' && routedPath !== lastRoutedPath) {
    console.log(' [i] routing request /' + xpath.join('/'));
  }

  lastRoutedPath = routedPath; // used to prevent double console.log on repeated calls

  // routing logic starts here
  const v = isValidPath(xpath, request.sessionID);
  return !v.valid
    ? logAndReturnHelp(xpath, v)
    : getFinalResult(request, xpath, shorthand);
}

function cleanPath (xpath, request) {
  for (let i = 0; i < xpath.length; i++) {
    if (xpath[i] === '') {
      xpath.splice(i, 1); i--;
    } else {
      try {
        xpath[i] = decodeURIComponent(xpath[i]); // prune empty values and clean vars
      } catch (e) {
        console.log(' [!] illegal routing url: ' + request.url);
        return xpath; // Default to help;
      }
    }
  }

  return xpath;
}

function getFinalResult (request, xpath, shorthand) {
  let result = getNode(request, xpath);

  if (typeof result === 'object') { // flat files
    let offset = request.offset || result.offset;
    let length = request.length || result.length;
    let hash = request.hash || result.hash;

    if (typeof offset !== 'undefined' && typeof length !== 'undefined') {
      result = checkFileResult(result, offset, length, request);
    } else if (typeof result.mime === 'string' && result.mime.startsWith('file:')) { // a file without  offset and length => delete result['file'];
      if (!hash && ((result.hasOwnProperty('stopped') && result.stopped === null) || result.error !== 0)) { // clear type if there's an error or if not yet stopped
        delete result.mime;
      } else if (typeof result.data !== 'string') {
        result = fileNotFoundResult(result);
      } else {
        result = handleFileRequest(result, hash);
      }
    }
  }
  if (typeof result !== 'object' || result === null) {
    console.log(' [!] Routing error for /' + xpath.join('/'), result);
    result = {error: 500};
  }
  if (typeof result.path === 'undefined') {
    result.path = xpath;
  }
  if (typeof result.path === 'object' && result.path !== null) {
    result.path = '/' + result.path.join('/'); // format the path back to string ["asset","dummy"] => "asset/dummy"
  }
  // when shorthand is used, cull output data
  if (shorthand) {
    delete result.command;
    delete result.help;
    delete result.path;
  }
  delete result.noCache;
  return result;
}

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

function handleFileRequest (result, hash) {
  const filePath = '../' + result.data.replace('..', ''); // 'file://*' => file : '$HYBRIXD_HOME/*'   //TODO Make safer MAYBE warning on '..' usage?
  if (!fs.existsSync(filePath)) {
    result = fileNotFoundResult(result);
  } else {
    const stats = fs.statSync(filePath);
    if (stats.isFile()) {
      if (hash) {
        result = checkHashResult(result, filePath);
      } else {
        result = checkFileData(result, filePath);
      }
    } else {
      result = fileNotFoundResult(result);
    }
  }
  return result;
}

function fileNotFoundResult (result) {
  delete result.mime;
  result.error = 404;
  console.log(' [!] File not found', result.data);
  result.data = 'File not found.';
  return result;
}

function checkHashResult (result, filePath) {
  if (!fileHashes.hasOwnProperty(filePath)) {
    fileHashes[filePath] = DJB2.hash(String(fs.readFileSync(filePath).toString('utf8')));
  }
  result.data = fileHashes[filePath];
  delete result.mime;

  return result;
}

function checkFileData (result, filePath) {
  result.data = fs.readFileSync(filePath);// .toString('utf8');
  if (typeof result.mime === 'string') {
    result.mime = result.mime.substr(5); // "file:$CONTENT-TYPE" =>  "$CONTENT-TYPE"
  }
  if ((typeof result.mime === 'undefined' || result.mime === 'data') && result.data instanceof Buffer) {
    result.data = result.data.toString('utf8');
  }

  if (result.mime === 'data') { // remove default
    delete result.mime;
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
    console.log(' [!] File not found', filePath);
    return {
      err: 1,
      data: 'File not found.'
    };
  }
}

function checkFileResult (result, offset, length, request) {
  if (typeof result.mime === 'string' && result.mime.startsWith('file:')) {
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
  return {help: help.help(xpath, v), error: v.status, id: null, path: '/' + xpath.join('/')};
}

function getPartialData (result, length, offset, filePath) {
  // use a offset and length to return partial data
  const buffer = Buffer.alloc(length);
  const fileStream = fs.openSync(filePath, 'r');
  fs.readSync(fileStream, buffer, 0, length, offset);
  fs.closeSync(fileStream);
  result.mime = result.mime.substr(5); // "file:$CONTENT-TYPE" =>  "$CONTENT-TYPE"
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
    : {error: 400, data: 'Your request was not understood!'}; // default error message
}

exports.route = route;
exports.isValidPath = isValidPath;
exports.isValidRef = isValidRef;
exports.refList = refList;
