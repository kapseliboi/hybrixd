
exports.findAvailableHost = findAvailableHost;
exports.list = list;
exports.call = call;
exports.closeAll = closeAll;

const net = require('net');
const sequential = require('../util/sequential');

const protocols = [
  require('./protocols/http'),
  require('./protocols/websocket'),
  require('./protocols/tcp'),
  require('./protocols/socks')
];

const defaultProtocolPorts = {}; // 'http' -> 8000, ...
Object.assign(defaultProtocolPorts, ...protocols.map(protocol => protocol.ports));

const protocolPerPrefix = {}; // 'http' -> require('./protocols/http')
for (const protocol of protocols) {
  for (const prefix in protocol.ports) {
    protocolPerPrefix[prefix] = protocol;
  }
}

function getProtocol (host) {
  const prefix = host.split('://')[0];
  return protocolPerPrefix[prefix];
}

const APIhosts = {};

function list () {
  return Object.keys(APIhosts);
}

function closeAll (callbackArray) {
  for (const host in APIhosts) {
    const APIhost = APIhosts[host];
    const protocol = getProtocol(host);
    if (!protocol) {
      global.hybrixd.logger(['error', 'host', 'apiQueue'], 'Unknown protocol for :' + host);
    } else {
      if (typeof APIhost.link === 'function') APIhost.link.close();
      global.hybrixd.logger(['info', 'apiQueue'], 'Link closed for ' + host);
    }
    delete APIhosts[host];
  }
  sequential.next(callbackArray);
}

function getLastRequestTime (host) {
  return APIhosts.hasOwnProperty(host)
    ? APIhosts[host].lastRequestTime
    : 0;
}

function setLastRequestTime (host, now) {
  if (!APIhosts.hasOwnProperty(host)) APIhosts[host] = {};
  APIhosts[host].lastRequestTime = now;
}

function getLink (host, APIrequest, now, dataCallback, errorCallback) {
  if (APIhosts.hasOwnProperty(host)) {
    const APIhost = APIhosts[host];
    if (APIhost.hasOwnProperty('link')) return dataCallback(APIhost.link); // already initialized
    // still busy with initializing, add request to queue
    APIhost.queue.push({dataCallback, errorCallback});
    return;
  }
  const APIhost = APIhosts[host] = {
    queue: []
  };

  const protocol = getProtocol(host);
  if (!protocol) {
    const error = 'Unknown protocol for :' + host;
    global.hybrixd.logger(['error', 'host', 'apiQueue'], error);
    for (const q of APIhost.queue) q.errorCallback(error); // handle queued requests
    APIhost.queue.length = 0;
    return errorCallback(error);
  } else {
    return protocol.createLink(APIrequest, host, APIhosts, link => {
      APIhost.link = link;
      APIhost.lastRequestTime = 0; // TODO now?
      for (const q of APIhost.queue) q.dataCallback(link); // handle queued requests
      APIhost.queue.length = 0;
      return dataCallback(link);
    }, error => {
      for (const q of APIhost.queue) q.errorCallback(error); // handle queued requests
      APIhost.queue.length = 0;
      errorCallback(error);
    });
  }
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

  getLink(host, APIrequest, now, link => { // get the initialized link
    setLastRequestTime(host, now); // set the last request time

    try {
      const args = APIrequest.args;
      const method = APIrequest.method;
      const qpath = (typeof args.path === 'undefined' ? '' : args.path);
      args.timeout = APIrequest.timeout;
      const protocol = getProtocol(host);
      if (!protocol) {
        const error = 'Unknown protocol for :' + host;
        global.hybrixd.logger(['error', 'host', 'apiQueue'], error);
        errorCallback(error);
      } else protocol.call(link, host, qpath, args, method, dataCallback, errorCallback);
    } catch (error) {
      global.hybrixd.logger(['error', 'host', 'apiQueue'], 'call error for ' + host + ' : ' + error);
      errorCallback(error);
    }
  }, errorCallback);
}
