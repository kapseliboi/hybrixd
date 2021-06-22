// (C) 2015 Internet of Coins / hybrix / Rouke Pouw
// hybrixd - rest.js
// Amended NPM REST library dependency for performing REST requests
const DEFAULT_TIMEOUT = 60000;
const jsonctypes = ['application/json', 'application/json;charset=utf-8'];

const http = require('http');
const https = require('https');
const urlParser = require('url');
const util = require('util');
const zlib = require('zlib');

const isJSON = function (content) {
  if (typeof content !== 'string') return false;
  for (const jsonctype of jsonctypes) {
    if (jsonctype.toLowerCase() === content.toLowerCase()) return true;
  }
  return false;
};

const isValidData = data => typeof data !== 'undefined' && data.length > 0;

const configureRequest = function (req, config, errorCallback) {
  if (config.timeout) req.setTimeout(config.timeout, errorCallback);
  if (config.noDelay) req.setNoDelay(config.noDelay);
  if (config.keepAlive) req.setSocketKeepAlive(config.noDelay, config.keepAliveDelay || 0);
};

const configureResponse = function (res, config, errorCallback) {
  if (config.timeout) {
    res.setTimeout(config.timeout, () => {
      errorCallback('Timeout');
      res.close();
    });
  }
};

const handleEnd = function (options, res, buffer, dataCallback, errorCallback) {
  const status = res.statusCode;
  if (
    (status >= 200 && status < 300) ||
    (options.ignore404 && status === 404) ||
    options.ignoreError
  ) {
    const encoding = res.headers['content-encoding'];
    if (encoding !== undefined && encoding.indexOf('gzip') >= 0) {
      zlib.gunzip(Buffer.concat(buffer), (er, gunzipped) => { // TODO handle error
        handleResponse(res, gunzipped, dataCallback, errorCallback);
      });
    } else if (encoding !== undefined && encoding.indexOf('deflate') >= 0) {
      zlib.inflate(Buffer.concat(buffer), (er, inflated) => { // TODO handle error
        handleResponse(res, inflated, dataCallback, errorCallback);
      });
    } else handleResponse(res, Buffer.concat(buffer).toString(), dataCallback, errorCallback);
  } else {
    let errorMessage = buffer.toString();
    if (errorMessage.length > 100) errorMessage = errorMessage.substr(0, 97) + '...';
    errorCallback('Received status ' + status + ' ' + errorMessage);
  }
};

const handleResponse = function (res, data, dataCallback, errorCallback) {
  const content = res.headers['content-type'];
  if (isJSON(content)) {
    let jsonData;
    try {
      jsonData = isValidData(data) ? JSON.parse(data) : data;
    } catch (error) {
      return errorCallback('Error parsing json. response: [' + data + '], error: [' + error + ']');
    }
    return dataCallback(jsonData);
  } else return dataCallback(data);
};

const prepareData = (data) => (data instanceof Buffer) || typeof data !== 'object'
  ? data
  : JSON.stringify(data);

const proxyRequest = function (options, dataCallback, errorCallback) {
  // creare a new proxy tunnel, and use to connect to API URL
  const proxyTunnel = http.request(options.proxy);
  proxyTunnel.on('connect', (res, socket) => {
    // TODO handle res?
    options.socket = socket; // set tunnel socket in request options, that's the tunnel itself
    normalRequest(options, dataCallback, errorCallback);
  });
  // proxy tunnel error are only handled by general error handler
  proxyTunnel.on('error', errorCallback);
  proxyTunnel.end();
};

const normalRequest = function (options, dataCallback, errorCallback) {
  const buffer = [];
  const protocol = (options.protocol === 'http') ? http : https;
  const requestConfig = options.requestConfig;
  const responseConfig = options.responseConfig;
  // remove "protocol" option from options, cos is not allowed by http/hppts node objects
  delete options.protocol;
  delete options.requestConfig;
  delete options.responseConfig;
  // add request options to request returned to calling method
  const request = protocol.request(options, res => {
    configureResponse(res, responseConfig, errorCallback); // configure response
    res.on('data', chunk => buffer.push(Buffer.from(chunk))); // concurrent data chunk handler
    res.on('end', () => handleEnd(options, res, buffer, dataCallback, errorCallback));
    res.on('error', errorCallback); // handler response errors
  });
  configureRequest(request, requestConfig, errorCallback);
  // handle request errors and handle them by request or general error handler
  request.on('error', errorCallback);
  // write POST/PUT data to request body;
  if (options.data) request.write(prepareData(options.data));
  request.end();
};

const encodeQueryFromArgs = args => {
  let result = '?';
  let counter = 1;
  for (const key in args) { // create enconded URL from args
    let keyValue = key + '=' + encodeURIComponent(args[key]);
    if (counter > 1) keyValue = '&'.concat(keyValue);
    result = result.concat(keyValue);
    counter++;
  }
  return result;
};

const createProxyPath = url => {
  // check url protocol to set path in request options
  if (url.protocol === 'https:') { // port is set, leave it, otherwise use default https 443
    return (url.host.indexOf(':') === -1 ? url.hostname + ':443' : url.host);
  } else return url.host;
};

const parsePathParameters = (args, url) => {
  let result = url;
  if (!args || !args.path) { return url; }
  for (const placeholder in args.path) {
    const regex = new RegExp('\\$\\{' + placeholder + '\\}', 'i');
    result = result.replace(regex, args.path[placeholder]);
  }
  return result;
};

function isObject (reqResOption) {
  return reqResOption !== null && typeof reqResOption === 'object';
}

const overrideClientConfig = (connectOptions, methodOptions) => {
  // check if we have particular request or response config set on this method invocation
  // and override general request/response config
  if (isObject(methodOptions.requestConfig)) {
    util._extend(connectOptions.requestConfig, methodOptions.requestConfig);
  }
  if (isObject(methodOptions.responseConfig)) {
    util._extend(connectOptions.responseConfig, methodOptions.responseConfig);
  }
};

const createProxyHeaders = (url, proxy, useProxyTunnel) => {
  const result = {};
  if (proxy.user && proxy.password) { // if proxy requires authentication, create Proxy-Authorization headers
    result['Proxy-Authorization'] = 'Basic ' + Buffer.from([proxy.user, proxy.password].join(':')).toString('base64');
  }
  if (!useProxyTunnel) result.host = url.host; // no tunnel proxy connection, we add the host to the headers
  return result;
};

// configure connect options based on url parameter parse
const createRequestOptions = (connectURL, method, args, options, useProxy, useProxyTunnel) => {
  const url = urlParser.parse(connectURL);
  const protocol = url.protocol.indexOf(':') === -1 ? url.protocol : url.protocol.substring(0, url.protocol.indexOf(':'));
  const defaultPort = protocol === 'http' ? 80 : 443;
  const requestOptions = {
    host: url.host.indexOf(':') === -1 ? url.host : url.host.substring(0, url.host.indexOf(':')),
    port: url.port === undefined ? defaultPort : url.port,
    path: url.path,
    ignore404: args.ignore404,
    ignoreError: args.ignoreError,
    protocol: protocol
  };
  if (useProxy) requestOptions.agent = false; // cannot use default agent in proxy mode
  if (options.user && options.password) {
    requestOptions.auth = [options.user, options.password].join(':');
  } else if (options.user && !options.password) { // some sites only needs user with no password to authenticate
    requestOptions.auth = options.user;
  }
  if (useProxy) { // configure proxy connection to establish a tunnel
    requestOptions.proxy = {
      host: options.proxy.host,
      port: options.proxy.port,
      method: useProxyTunnel ? 'CONNECT' : method, // if proxy tunnel use 'CONNECT' method, else get method from request,
      path: useProxyTunnel ? createProxyPath(url) : connectURL, // if proxy tunnel set proxy path else get request path,
      headers: createProxyHeaders(url, options.proxy, useProxyTunnel) // createProxyHeaders add correct headers depending of proxy connection type
    };
  }
  if (options.connection !== null && typeof options.connection === 'object') {
    for (const option in options.connection) requestOptions[option] = options.connection[option];
  }
  if (!useProxyTunnel) { // don't use tunnel to connect to proxy, direct request and delete proxy options
    for (const option in requestOptions.proxy) requestOptions[option] = requestOptions.proxy[option];
    delete requestOptions.proxy;
  }
  // add general request and response config to connect options
  requestOptions.requestConfig = options.requestConfig || {};
  requestOptions.responseConfig = options.responseConfig || {};
  requestOptions.method = method;
  if (typeof args === 'object' && args !== null) {
    requestOptions.requestConfig.timeout = typeof args.timeout === 'number'
      ? args.timeout
      : DEFAULT_TIMEOUT;
    // add headers and POST/PUT data to connect options to be passed with request
    if (args.headers) requestOptions.headers = args.headers;
    if (method === 'GET') delete args.data;
    if (typeof args.data !== 'undefined' && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.data = args.data;
      if (!requestOptions.hasOwnProperty('headers')) requestOptions.headers = {};
      // set Content length for some servers to work (nginx)
      requestOptions.headers['Content-Length'] = Buffer.byteLength((typeof args.data === 'string' ? args.data : JSON.stringify(args.data)), 'utf8');
    }
    // we have args, go and check if we have parameters
    if (args.parameters && Object.keys(args.parameters).length > 0) {
      // validate URL consistency, and fix it
      requestOptions.path += (requestOptions.path.charAt(url.length - 1) === '?' ? '?' : '');
      requestOptions.path = requestOptions.path.concat(encodeQueryFromArgs(args.parameters));
    }
    overrideClientConfig(requestOptions, args);
  }
  if (!requestOptions.requestConfig.hasOwnProperty('timeout')) requestOptions.requestConfig.timeout = DEFAULT_TIMEOUT;
  return requestOptions;
};

const Client = function (options) {
  const useProxy = !!options.proxy;
  const useProxyTunnel = (!useProxy || typeof options.proxy.tunnel === 'undefined') ? false : options.proxy.tunnel;
  const request = (method, url, args, dataCallback, errorCallback) => {
    const requestOptions = createRequestOptions(parsePathParameters(args, url), method, args, options, useProxy, useProxyTunnel);
    if (useProxy && useProxyTunnel) proxyRequest(requestOptions, dataCallback, errorCallback);
    else normalRequest(requestOptions, dataCallback, errorCallback); // normal connection and direct proxy connections (no tunneling)
  };

  this.close = () => {};
  this.get = (url, args, dataCallback, errorCallback) => request('GET', url, args, dataCallback, errorCallback);
  this.post = (url, args, dataCallback, errorCallback) => request('POST', url, args, dataCallback, errorCallback);
  this.put = (url, args, dataCallback, errorCallback) => request('PUT', url, args, dataCallback, errorCallback);
  this.delete = (url, args, dataCallback, errorCallback) => request('DELETE', url, args, dataCallback, errorCallback);
  this.patch = (url, args, dataCallback, errorCallback) => request('PATCH', url, args, dataCallback, errorCallback);
};
exports.Client = Client;
