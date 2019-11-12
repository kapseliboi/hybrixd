const Client = require('./rest').Client;
const WebSocket = require('ws');
const sequential = require('../util/sequential');

const tcp = require('./tcp');

const DEFAULT_TCP_PORT = 23;

const APIhosts = {};

function list () {
  return Object.keys(APIhosts);
}

function closeAll (callbackArray) {
  for (let host in APIhosts) {
    const APIhost = APIhosts[host];
    if (host.substr(0, 6) === 'tcp://') {
      console.log(' [i] API queue: TCP closed for ' + host);
      APIhost.link.close();
    } else if (host.substr(0, 5) === 'ws://' || host.substr(0, 6) === 'wss://') {
      console.log(' [i] API queue: WebSocket closed for ' + host);
      APIhost.link.close();
    } else {
      console.log(' [i] API queue: http(s) closed for ' + host);
    }
    delete APIhosts[host];
  }
  sequential.next(callbackArray);
}

function tcpCall (link, host, qpath, args, method, dataCallback, errorCallback) {
  const hostSplit = host.substr(6).split(':');
  host = hostSplit[0];
  const port = hostSplit[1] ? Number(hostSplit[1]) : DEFAULT_TCP_PORT;

  link.request(args.data, dataCallback, errorCallback);
}

function httpCall (link, host, qpath, args, method, dataCallback, errorCallback) {
  const methodLowerCase = (typeof method === 'string') ? method.toLowerCase() : 'get';
  const postresult = link[methodLowerCase](host + qpath, args || {}, dataCallback);
  postresult.once('error', errorCallback);
}

function webSocketCall (link, host, qpath, args, method, dataCallback, errorCallback) {
  if (link.readyState) {
    if (typeof args.data !== 'object' || args.data === null) {
      errorCallback('Expected an object.');
    } else {
      const id = args.data.hasOwnProperty('id') ? args.data.id : Math.floor(Math.random() * 10000);
      link.stack[id] = dataCallback;
    }
    link.send(JSON.stringify(args.data));
  } else {
    errorCallback('link not ready');
  }
}

function getLastRequestTime (host) {
  return APIhosts.hasOwnProperty(host)
    ? APIhosts[host].lastRequestTime
    : 0;
}

function setLastRequestTime (host, now) {
  if (!APIhosts.hasOwnProperty(host)) { APIhosts[host] = {}; }
  APIhosts[host].lastRequestTime = now;
}

function mkWsLink (host) {
  const link = new WebSocket(host, {});

  return link
    .on('open', () => {
      console.log(' [i] API queue: Websocket ' + host + ' opened');
      link.stack = {};
    })
    .on('close', () => {
      console.log(' [i] API queue: Websocket ' + host + ' closed');
      delete (APIhosts[host]);
    })
    .on('error', (error) => {
      console.log(' [i] API queue: Websocket ' + host + ' : Error ' + error);
    })
    .on('message', message => {
      try {
        const data = JSON.parse(message);
        if (data.hasOwnProperty('id')) {
          if (link.stack.hasOwnProperty(data.id)) {
            link.stack[data.id](data);
            delete link.stack[data.id];
          }
        }
      } catch (e) {
        console.log(' [i] API queue: Websocket ' + host + ' : Parsing Error ' + e);
      }
    });
}

function mkTcpLink (host) {
  const hostSplit = host.substr(6).split(':');
  const hostaddr = hostSplit[0];
  const hostport = hostSplit[1] ? Number(hostSplit[1]) : DEFAULT_TCP_PORT;
  const link = new tcp.Link(hostaddr, hostport);
  return link;
}

function mkHttpLink (APIrequest) {
  let options = {};
  if (APIrequest.user) { options.user = APIrequest.user; }
  if (APIrequest.pass) { options.password = APIrequest.pass; }

  /*
    TODO possibly to extend options:
    proxy
    connection
    mimetypes
    requestConfig
    rejectUnauthorized
  */

  return new Client(options);
}

function mkLink (APIrequest, host) {
  let link = null;
  if (host.startsWith('ws://') || host.startsWith('wss://')) {
    link = mkWsLink(host);
  } else if (host.startsWith('tcp://')) {
    link = mkTcpLink(host);
  } else if (host.startsWith('http://') || host.startsWith('https://')) {
    link = mkHttpLink(APIrequest);
  } else {
    console.log(' [i] API queue: Unknown protocol for :' + host);
    return null;
  }
  return link;
}

function getLink (host, APIrequest, now) {
  let link = null;
  if (APIhosts.hasOwnProperty(host)) {
    return APIhosts[host].link;
  } else {
    link = mkLink(APIrequest, host);
  }
  APIhosts[host] = {
    link: link,
    lastRequestTime: 0
  };
  setLastRequestTime(host, now); // set the last request time

  return link;
}

function getHostOrNull (APIrequest, now) {
  const host = APIrequest.host;
  return now - getLastRequestTime(host) >= 1000 / APIrequest.throttle // check if  the last call was made suffciently long ago
    ? host
    : null;
}

// using throttle and reqcnt (round robin) for load balancing
function findAvailableHost (APIrequest, now) {
  let host = null;
  if (typeof APIrequest.host === 'string') {
    return getHostOrNull(APIrequest, now);
  } else {
    if (APIrequest.host) {
      const offset = Math.floor(Math.random() * APIrequest.host.length);
      for (let i = 0; i < APIrequest.host.length; ++i) {
        const j = (offset + i) % APIrequest.host.length;
        host = APIrequest.host[j];
        if (now - getLastRequestTime(host) >= 1000 / APIrequest.throttle) { // check if the last call was made suffciently long ago
          return host; // found an available host
        }
      }
    }
    return null;
  }
}

function call (host, APIrequest, now, dataCallback, errorCallback) {
  let link = getLink(host, APIrequest, now);
  if (!link) {
    errorCallback('Failed to created link');
  } else {
    // get the initialized link
    let args = APIrequest.args;
    let method = APIrequest.method;
    let qpath = (typeof args.path === 'undefined' ? '' : args.path);

    try {
      if (host.substr(0, 6) === 'tcp://') {
        tcpCall(link, host, qpath, args, method, dataCallback, errorCallback);
      } else if (host.substr(0, 5) === 'ws://' || host.substr(0, 6) === 'wss://') {
        webSocketCall(link, host, qpath, args, method, dataCallback, errorCallback);
      } else {
        httpCall(link, host, qpath, args, method, dataCallback, errorCallback);
      }
    } catch (e) {
      console.log(' [!] API queue call error for ' + host + ' : ' + e);
    }
  }
}

exports.findAvailableHost = findAvailableHost;
exports.getLink = getLink;
exports.list = list;
exports.call = call;
exports.closeAll = closeAll;
