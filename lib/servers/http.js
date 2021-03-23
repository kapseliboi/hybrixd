const http = require('http');
const router = require('../router/router');
const sequential = require('../util/sequential');

function createResponse (request, response) {
  // default ->    content as flat json   mime:'data'
  // help ->       content as flat html   mime:'text/html'
  // storage ->    file as data           mime:'file:data'
  // det. blob ->  file as data           mime:'file:data'
  // web_walet ->  file as flat html      mime:'file:text/html'
  // views ->      file as flat json      mime:'application/json'
  const result = router.route(request);

  let status;
  if (result.error === 0) status = 200;
  else if (result.error >= 400 && result.error <= 599) status = Math.floor(result.error);
  else status = 500;

  if (typeof result.mime === 'undefined' || result.mime === 'data') {
    response.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    delete (result.recipe);
    response.write(JSON.stringify(result));
    response.end();
  } else {
    let data;
    if (typeof result.data === 'string' || result.data instanceof Buffer) data = result.data;
    else data = typeof result.data === 'undefined' ? 'undefined' : JSON.stringify(result.data);
    // else data = JSON.stringify(result.data);
    const headers = {
      'Content-Type': result.mime,
      'Access-Control-Allow-Origin': '*'
    };
    if ((result.cach instanceof Array) && result.cach.length > 0) headers['Cache-Control'] = result.cach.join(', ');
    response.writeHead(status, headers);
    response.write(data);
    response.end();
  }
}

function handleRequest (request, response, entryPoint) {
  if (entryPoint === '/root') request.sessionID = 1;
  else {
    request.url = entryPoint + request.url;
    request.sessionID = 0;
  }

  if (request.method === 'POST') {
    let data = '';
    request.on('data', chunk => {
      data += chunk.toString(); // convert Buffer to string
    });
    request.on('end', () => {
      request.data = data;
      createResponse(request, response);
    });
  } else if (request.method === 'GET') {
    const urlGetData = request.url.split('/POST=');// TODO seperator kiezen and move to router?
    if (urlGetData.length > 1) {
      request.url = urlGetData[0];
      request.data = decodeURIComponent(urlGetData[1]);
    } else request.data = null;
    createResponse(request, response);
  }
}

const handleInitError = (endpoint, entryPoint, protocol, hostName, port) => error => {
  global.hybrixd.logger(['info', 'server'], `Failed to create REST API endpoint  for: ${protocol}://${hostName}:${port} -> ${entryPoint}`);
  if (String(error).startsWith('Error: listen EADDRINUSE:')) {
    global.hybrixd.logger(['info', 'server'], `${protocol}://${hostName}:${port} already in use. Is another instance of hybrixd already running?`);
  }
};

function init (endpoint, entryPoint, callbackArray) {
  // http://hostname:port
  const protocolHostNamePort = endpoint.split('://');
  const protocol = protocolHostNamePort[0];
  const [hostName, port] = protocolHostNamePort[1].split(':');
  const server = http.createServer(function (request, response) { handleRequest(request, response, entryPoint); })
    .listen(port, hostName, undefined, function () {
      global.hybrixd.logger(['info', 'server'], `REST API endpoint running on: ${protocol}://${hostName}:${port} -> ${entryPoint}`);
      sequential.next(callbackArray);
    }).on('error', handleInitError(endpoint, entryPoint, protocol, hostName, port));
  return server;
}

const close = function (server, callbackArray) {
  if (status(server)) {
    const protocolHostNamePort = server.endpoint.split('://');
    const protocol = protocolHostNamePort[0];
    const [hostName, port] = protocolHostNamePort[1].split(':');
    server.server.close(function () {
      global.hybrixd.logger(['info', 'server'], `REST API endpoint closed for: ${protocol}://${hostName}:${port}`);
      sequential.next(callbackArray);
    });
  } else sequential.next(callbackArray);// No server to be closed, callback directly
};

const open = function (server, callbackArray) {
  if (!status(server)) {
    const protocolHostNamePort = server.endpoint.split('://');
    const protocol = protocolHostNamePort[0];
    const [hostName, port] = protocolHostNamePort[1].split(':');
    server.server.listen(port, hostName, undefined, function () {
      global.hybrixd.logger(['info', 'server'], `REST API endpoint running on: ${protocol}://${hostName}:${port}`);
      sequential.next(callbackArray);
    }).on('error', handleInitError(server.endpoint, server.entryPoint, protocol, hostName, port));
  } else sequential.next(callbackArray); // No server to be initialized, callback directly
};

function status (server) {
  return server.server.listening;
}

exports.init = init;
exports.close = close;
exports.open = open;
exports.status = status;
