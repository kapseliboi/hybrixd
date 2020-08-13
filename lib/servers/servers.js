// servers.js -> implements functions to init servers
//
// (c)2018 internet of coins project - Rouke Pouw

// https://stackoverflow.com/questions/12006417/node-js-server-that-accepts-post-requests

const sequential = require('../util/sequential');
const conf = require('../conf/conf');

const serverLinks = {};

const protocols = {
  http: require('./http'),
  https: require('./http')
};

const create = (endpoint, entryPoint) => callbackArray => {
  const protocol = endpoint.split('://')[0];
  if (protocols.hasOwnProperty(protocol)) {
    const server = protocols[protocol].init(endpoint, entryPoint, callbackArray);
    const serverLink = {endpoint, entryPoint, server};
    serverLinks[endpoint] = serverLink;
  } else {
    global.hybrixd.logger(['error', 'server'], `Unknown server protocol ${protocol}`);
    sequential.next(callbackArray);
  }
};

function exists (endpoint) {
  return serverLinks.hasOwnProperty(endpoint);
}

function init (callbackArray) {
  const servers = conf.get('host.servers');
  for (let endpoint in servers) {
    const entryPoint = servers[endpoint];
    callbackArray.unshift(create(endpoint, entryPoint));
  }
  sequential.next(callbackArray);
}

function list () {
  const result = [];
  for (let endpoint in serverLinks) result.push(endpoint);
  return result;
}

function closeAll (callbackArray) {
  callbackArray = callbackArray || [];
  for (let endpoint in serverLinks) callbackArray.unshift(close(endpoint));
  sequential.next(callbackArray);
}

const open = endpoint => callbackArray => {
  const protocol = endpoint.split('://')[0];
  return protocols.hasOwnProperty(protocol) && serverLinks.hasOwnProperty(endpoint)
    ? protocols[protocol].open(serverLinks[endpoint], callbackArray)
    : sequential.next(callbackArray);
};

const close = endpoint => callbackArray => {
  const protocol = endpoint.split('://')[0];
  return protocols.hasOwnProperty(protocol) && serverLinks.hasOwnProperty(endpoint)
    ? protocols[protocol].close(serverLinks[endpoint], callbackArray)
    : sequential.next(callbackArray);
};

const status = endpoint => callbackArray => {
  const protocol = endpoint.split('://')[0];
  return protocols.hasOwnProperty(protocol) && serverLinks.hasOwnProperty(endpoint)
    ? protocols[protocol].status(serverLinks[endpoint], callbackArray)
    : sequential.next(callbackArray);
};

exports.init = init;
exports.open = open;
exports.list = list;
exports.close = close;
exports.status = status;
exports.closeAll = closeAll;
exports.exists = exists;
