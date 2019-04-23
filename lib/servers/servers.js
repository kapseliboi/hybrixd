// servers.js -> implements functions to init servers
//
// (c)2018 internet of coins project - Rouke Pouw

// https://stackoverflow.com/questions/12006417/node-js-server-that-accepts-post-requests

const sequential = require('../util/sequential');
const conf = require('../conf/conf');

const protocols = {
  http: require('./http'),
  https: require('./http')

};

const create = (endpoint, entryPoint) => (callbackArray) => {
  const protocol = endpoint.split('://')[0];

  if (protocols.hasOwnProperty(protocol)) {
    const server = protocols[protocol].init(endpoint, entryPoint, callbackArray);
    global.hybrixd.endpoints[endpoint] = {endpoint, entryPoint, server};
  } else {
    // TODO error
    sequential.next(callbackArray);
  }
};

function init (callbackArray) {
  global.hybrixd.endpoints = {};
  const servers = conf.get('host.servers');
  for (let endpoint in servers) {
    const entryPoint = servers[endpoint];
    callbackArray.unshift(create(endpoint, entryPoint));
  }

  sequential.next(callbackArray);
}

const open = server => callbackArray => {
  const protocol = server.endpoint.split('://')[0];
  return protocol.hasOwnProperty(protocol)
    ? protocols[protocol].open(server, callbackArray)
    : sequential.next(callbackArray);
};

const close = server => callbackArray => {
  const protocol = server.endpoint.split('://')[0];
  return protocols.hasOwnProperty(protocol)
    ? protocols[protocol].close(server, callbackArray)
    : sequential.next(callbackArray);
};

const status = server => {
  const protocol = server.endpoint.split('://')[0];
  return protocols.hasOwnProperty(protocol)
    ? protocols[protocol].status(server)
    : undefined;
};

exports.init = init;
exports.open = open;
exports.close = close;
exports.status = status;
