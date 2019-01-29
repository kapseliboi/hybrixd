// servers.js -> implements functions to init servers
//
// (c)2018 internet of coins project - Rouke Pouw

// https://stackoverflow.com/questions/12006417/node-js-server-that-accepts-post-requests

var functions = require('./functions');

var protocols = {
  http: require('./servers/http'),
  https: require('./servers/http')

};

var create = (endpoint, entryPoint) => (callbackArray) => {
  var protocol = endpoint.split('://')[0];

  if (protocols.hasOwnProperty(protocol)) {
    var server = protocols[protocol].init(endpoint, entryPoint, callbackArray);
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
  for (var endpoint in global.hybrixd.servers) {
    var entryPoint = global.hybrixd.servers[endpoint];
    callbackArray.unshift(create(endpoint, entryPoint));
  }
  functions.sequential(callbackArray);
}

var open = server => callbackArray => {
  var protocol = server.endpoint.split('://')[0];
  if (protocols.hasOwnProperty(protocol)) {
    protocols[protocol].open(server, callbackArray);
  } else {
    // TODO error
    functions.sequential(callbackArray);
  }
};

var close = server => callbackArray => {
  var protocol = server.endpoint.split('://')[0];
  if (protocols.hasOwnProperty(protocol)) {
    protocols[protocol].close(server, callbackArray);
  } else {
    // TODO error
    functions.sequential(callbackArray);
  }
};

var status = server => {
  var protocol = server.endpoint.split('://')[0];
  if (protocols.hasOwnProperty(protocol)) {
    return protocols[protocol].status(server);
  } else {
    return undefined;
  }
};

exports.init = init;
exports.open = open;
exports.close = close;
exports.status = status;
