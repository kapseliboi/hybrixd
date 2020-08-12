const net = require('net');
const Client = require('./rest').Client;
const WebSocket = require('ws');
const sequential = require('../util/sequential');

const tcp = require('./tcp');

const defaultProtocolPorts = {
  http: 80,
  https: 443,
  ws: 80,
  wss: 443,
  tcp: 23
};

const APIhosts = {};

function list () {
  return Object.keys(APIhosts);
}

function closeAll (callbackArray) {
  for (let host in APIhosts) {
    const APIhost = APIhosts[host];
    if (host.substr(0, 6) === 'tcp://') {
      global.hybrixd.logger(['info', 'apiQueue'], 'TCP closed for ' + host);
      APIhost.link.close();
    } else if (host.substr(0, 5) === 'ws://' || host.substr(0, 6) === 'wss://') {
      global.hybrixd.logger(['info', 'apiQueue'], 'WebSocket closed for ' + host);
      APIhost.link.close();
    } else {
      global.hybrixd.logger(['info', 'apiQueue'], 'http(s) closed for ' + host);
    }
    delete APIhosts[host];
  }
  sequential.next(callbackArray);
}

function tcpCall (link, host, qpath, args, method, dataCallback, errorCallback) {
  link.request(args.data, {timeout: args.timeout}, dataCallback, errorCallback);
}

function httpCall (link, host, qpath, args, method, dataCallback, errorCallback) {
  const methodLowerCase = (typeof method === 'string') ? method.toLowerCase() : 'get';
  link[methodLowerCase](host + qpath, args || {}, dataCallback, errorCallback);
}

function webSocketCall (link, host, qpath, args, method, dataCallback, errorCallback, count) {
  if (link.readyState) {
    if (typeof args.data !== 'object' || args.data === null) {
      errorCallback('Expected an object.');
    } else {
      const id = args.data.hasOwnProperty('id') ? args.data.id : Math.floor(Math.random() * 10000);
      link.stack[id] = dataCallback;
    }
    try {
      link.send(JSON.stringify(args.data));
    } catch (e) {
      errorCallback('link not ready');
    }
  } else if ((count || 0) < 3) { // retry if link not yet ready
    setTimeout(() => {
      webSocketCall(link, host, qpath, args, method, dataCallback, errorCallback, (count || 0) + 1);
    }, 300);
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
  link.stack = {};

  return link
    .on('open', () => {
      global.hybrixd.logger(['info', 'apiQueue'], 'Websocket ' + host + ' opened');
    })
    .on('close', () => {
      global.hybrixd.logger(['info', 'apiQueue'], 'Websocket ' + host + ' closed');
      delete (APIhosts[host]);
    })
    .on('error', (error) => {
      global.hybrixd.logger(['info', 'apiQueue'], 'Websocket ' + host + ' : Error ' + error);
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
        global.hybrixd.logger(['info', 'apiQueue'], 'Websocket ' + host + ' : Parsing Error ' + e);
      }
    });
}

function mkTcpLink (host) {
  const hostSplit = host.substr(6).split(':');
  const hostaddr = hostSplit[0];
  const hostport = hostSplit[1] ? Number(hostSplit[1]) : defaultProtocolPorts.tcp;
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
    global.hybrixd.logger(['error', 'host', 'apiQueue'], 'Unknown protocol for :' + host);
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

function errorAndReturnIfNotString (string, errorCallback) {
  if (typeof string === 'string') return false;
  errorCallback(`Illegal url ${string}`);
  return true;
}

function ping (url, APIrequest, dataCallback, errorCallback) {
  if (errorAndReturnIfNotString(url, errorCallback)) return;

  const [protocol, hostNamePathAndPort] = url.split('://'); // 'protocol://hostname:port/path' -> ['protocol','hostname:port/path']
  if (errorAndReturnIfNotString(hostNamePathAndPort, errorCallback)) return;

  const hostNameAndPort = hostNamePathAndPort.split('/')[0]; // 'hostname:port/path' -> 'hostname:port'
  if (errorAndReturnIfNotString(hostNameAndPort, errorCallback)) return;

  let [hostName, port] = hostNameAndPort.split(':'); // 'hostname:port' -> ['hostname','port']
  port = port || defaultProtocolPorts[protocol];

  const timeout = APIrequest.timeout || 10000; // default of 10 seconds

  const timer = setTimeout(function () {
    socket.end();
    errorCallback('Failure: timeout occured');
  }, timeout);

  const socket = net.createConnection(port, hostName, () => {
    clearTimeout(timer);
    socket.end();
    dataCallback('Success');
  });
  socket.on('error', error => {
    clearTimeout(timer);
    errorCallback('Failure:' + error);
  });
}

function call (host, APIrequest, now, dataCallback, errorCallback) {
  if (APIrequest.ping) {
    ping(host, APIrequest, dataCallback, errorCallback);
    return;
  }

  const link = getLink(host, APIrequest, now);
  if (!link) {
    errorCallback('Failed to created link');
  } else {
    setLastRequestTime(host, now); // set the last request time

    // get the initialized link
    try {
      const args = APIrequest.args;
      const method = APIrequest.method;
      const qpath = (typeof args.path === 'undefined' ? '' : args.path);
      args.timeout = APIrequest.timeout;
      if (host.substr(0, 6) === 'tcp://') {
        tcpCall(link, host, qpath, args, method, dataCallback, errorCallback);
      } else if (host.substr(0, 5) === 'ws://' || host.substr(0, 6) === 'wss://') {
        webSocketCall(link, host, qpath, args, method, dataCallback, errorCallback);
      } else {
        httpCall(link, host, qpath, args, method, dataCallback, errorCallback);
      }
    } catch (e) {
      global.hybrixd.logger(['error', 'host', 'apiQueue'], 'call error for ' + host + ' : ' + e);
      errorCallback(e);
    }
  }
}

exports.findAvailableHost = findAvailableHost;
exports.getLink = getLink;
exports.list = list;
exports.call = call;
exports.closeAll = closeAll;
