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
  if (result.error === 0) {
    status = 200;
  } else if (result.error >= 400 && result.error <= 599) {
    status = Math.floor(result.error);
  } else {
    status = 500;
  }
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
    if (typeof result.data === 'string') data = result.data;
    if (result.data instanceof Buffer) data = String(result.data);
    else data = JSON.stringify(result.data);

    response.writeHead(status, {
      'Content-Type': result.mime,
      'Access-Control-Allow-Origin': '*'
    });
    response.end(data);
  }
}

function handleRequest (request, response, entryPoint) {
  if (entryPoint === '/root') {
    request.sessionID = 1;
  } else {
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
    } else {
      request.data = null;
    }
    createResponse(request, response);
  }
}

function init (endpoint, entryPoint, callbackArray) {
  // http://hostname:port
  const protocol_hostnameport = endpoint.split('://');
  const protocol = protocol_hostnameport[0];
  const hostname_port = protocol_hostnameport[1].split(':');
  const hostname = hostname_port[0];
  const port = hostname_port[1];

  let server = http.createServer(function (request, response) {
    handleRequest(request, response, entryPoint);
  });

  server = server.listen(port, hostname, undefined, function () {
    global.hybrixd.logger(['info', 'server'], `REST API endpoint running on: ${protocol}://${hostname}:${port} -> ${entryPoint}`);
    sequential.next(callbackArray);
  });

  return server;
}

const close = function (server, callbackArray) {
  if (status(server)) {
    const protocol_hostnameport = server.endpoint.split('://');
    const protocol = protocol_hostnameport[0];
    const hostname_port = protocol_hostnameport[1].split(':');
    const hostname = hostname_port[0];
    const port = hostname_port[1];
    server.server.close(function () {
      global.hybrixd.logger(['info', 'server'], `REST API endpoint closed for: http://${hostname}:${port}`);
      sequential.next(callbackArray);
    });
  } else { // No server to be closed, callback directly
    sequential.next(callbackArray);
  }
};

const open = function (server, callbackArray) {
  if (!status(server)) {
    const protocol_hostnameport = server.endpoint.split('://');
    const protocol = protocol_hostnameport[0];
    const hostname_port = protocol_hostnameport[1].split(':');
    const hostname = hostname_port[0];
    const port = hostname_port[1];
    server.server.listen(port, hostname, undefined, function () {
      global.hybrixd.logger(['info', 'server'], `REST API endpoint running on: http://${hostname}:${port}`);
      sequential.next(callbackArray);
    });
  } else { // No server to be initialized, callback directly
    sequential.next(callbackArray);
  }
};

const status = function (server) {
  return server.server.listening;
};

exports.init = init;
exports.close = close;
exports.open = open;
exports.status = status;
