// servers.js -> implements functions to init servers
//
// (c)2018 internet of coins project - Rouke Pouw

// https://stackoverflow.com/questions/12006417/node-js-server-that-accepts-post-requests

const functions = require('./functions');

const protocols = {
  http: require('./servers/http'),
  https: require('./servers/http')

};

const create = (endpoint, entryPoint) => (callbackArray) => {
  const protocol = endpoint.split('://')[0];

  if (protocols.hasOwnProperty(protocol)) {
    const server = protocols[protocol].init(endpoint, entryPoint, callbackArray);
    global.hybrixd.endpoints[endpoint] = {endpoint, entryPoint, server};
  } else {
    // TODO error
    functions.sequential(callbackArray);
  }
};

function init (callbackArray) {
  global.hybrixd.endpoints = {};
  if (typeof global.hybrixd.servers === 'string') {
    global.hybrixd.servers = JSON.parse(global.hybrixd.servers);
  }

  for (let endpoint in global.hybrixd.servers) {
    const entryPoint = global.hybrixd.servers[endpoint];
    callbackArray.unshift(create(endpoint, entryPoint));
  }

  functions.sequential(callbackArray);
}

const open = server => callbackArray => {
  const protocol = server.endpoint.split('://')[0];
  return protocol.hasOwnProperty(protocol)
    ? protocols[protocol].open(server, callbackArray)
    : functions.sequential(callbackArray);
};

const close = server => callbackArray => {
  const protocol = server.endpoint.split('://')[0];
  return protocols.hasOwnProperty(protocol)
    ? protocols[protocol].close(server, callbackArray)
    : functions.sequential(callbackArray);
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
