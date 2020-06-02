// (C) 2015 Internet of Coins / hybrix / Rouke Pouw
// hybrixd - rest.js
// Amended NPM REST library dependency for performing REST requests

const http = require('http');
const https = require('https');
const urlParser = require('url');
const util = require('util');
const events = require('events');
const zlib = require('zlib');

const jsonctype = ['application/json', 'application/json;charset=utf-8'];

const isJSON = function (content) {
  let result = false;
  if (!content) { return result; }

  for (let i = 0; i < jsonctype.length; i++) {
    result = jsonctype[i].toLowerCase() === content.toLowerCase();
    if (result) { break; }
  }

  return result;
};
const isValidData = function (data) {
  return data !== undefined && (data.length !== undefined && data.length > 0);
};

const configureRequest = function (req, config, clientRequest, errorCallback) {
  if (config.timeout) {
    req.setTimeout(config.timeout, errorCallback);
  }

  if (config.noDelay) { req.setNoDelay(config.noDelay); }

  if (config.keepAlive) { req.setSocketKeepAlive(config.noDelay, config.keepAliveDelay || 0); }
};

const configureResponse = function (res, config, clientRequest, errorCallback) {
  if (config.timeout) {
    res.setTimeout(config.timeout, function () {
      errorCallback('Timeout');
      res.close();
    });
  }
};

const handleEnd = function (res, buffer, dataCallback, errorCallback) {
  if (res.statusCode >= 200 && res.statusCode < 300) {
    const encoding = res.headers['content-encoding'];
    if (encoding !== undefined && encoding.indexOf('gzip') >= 0) {
      zlib.gunzip(Buffer.concat(buffer), (er, gunzipped) => {
        handleResponse(res, gunzipped, dataCallback, errorCallback);
      });
    } else if (encoding !== undefined && encoding.indexOf('deflate') >= 0) {
      zlib.inflate(Buffer.concat(buffer), (er, inflated) => {
        handleResponse(res, inflated, dataCallback, errorCallback);
      });
    } else {
      handleResponse(res, Buffer.concat(buffer).toString(), dataCallback, errorCallback);
    }
  } else {
    errorCallback('Received status ' + res.statusCode + ' ' + buffer.toString().substr(0, 100));
  }
};

const handleResponse = function (res, data, dataCallback, errorCallback) {
  const content = res.headers['content-type'];
  if (isJSON(content)) {
    try {
      const jsonData = isValidData(data) ? JSON.parse(data) : data;
      dataCallback(jsonData);
    } catch (err) {
      // Something went wrong when parsing json. This can happen
      // for many reasons, including a bad implementation on the
      // server.
      errorCallback('Error parsing json. response: [' + data + '], error: [' + err + ']');
    }
  } else {
    dataCallback(data);
  }
};

const prepareData = function (data) {
  let result;
  if ((data instanceof Buffer) || (typeof data !== 'object')) {
    result = data;
  } else {
    result = JSON.stringify(data);
  }
  return result;
};

const proxy = function (options, dataCallback, errorCallback) {
  // creare a new proxy tunnel, and use to connect to API URL
  const proxyTunnel = http.request(options.proxy);

  proxyTunnel.on('connect', (res, socket, head) => {
    // set tunnel socket in request options, that's the tunnel itself
    options.socket = socket;

    const buffer = [];

    const protocol = (options.protocol === 'http') ? http : https;

    const clientRequest = options.clientRequest;

    const requestConfig = options.requestConfig;

    const responseConfig = options.responseConfig; // remove "protocol" and "clientRequest" option from options, cos is not allowed by http/hppts node objects
    delete options.protocol;
    delete options.clientRequest;
    delete options.requestConfig;
    delete options.responseConfig;

    // add request options to request returned to calling method
    clientRequest.options = options;

    const request = protocol.request(options, res => {
      // configure response
      configureResponse(res, responseConfig, clientRequest, errorCallback);

      // concurrent data chunk handler
      res.on('data', function (chunk) {
        buffer.push(Buffer.from(chunk));
      });

      res.on('end', function () {
        handleEnd(res, buffer, dataCallback, errorCallback);
      });

      // handler response errors
      res.on('error', errorCallback);
    }); // configure request and add it to clientRequest and add it to request returned
    configureRequest(request, requestConfig, clientRequest, errorCallback);
    clientRequest.setHttpRequest(request);

    // write POST/PUT data to request body;
    if (options.data) { request.write(prepareData(options.data)); }

    // handle request errors and handle them by request or general error handler
    request.on('error', errorCallback);

    request.end();
  });

  // proxy tunnel error are only handled by general error handler
  proxyTunnel.on('error', errorCallback);

  proxyTunnel.end();
};
const normal = function (options, dataCallback, errorCallback) {
  const buffer = [];

  const protocol = (options.protocol === 'http') ? http : https;

  const clientRequest = options.clientRequest;

  const requestConfig = options.requestConfig;

  const responseConfig = options.responseConfig;

  // remove "protocol" and "clientRequest" option from options, cos is not allowed by http/hppts node objects
  delete options.protocol;
  delete options.clientRequest;
  delete options.requestConfig;
  delete options.responseConfig;

  // add request options to request returned to calling method
  clientRequest.options = options;

  const request = protocol.request(options, res => {
    // configure response
    configureResponse(res, responseConfig, clientRequest, errorCallback);

    // concurrent data chunk handler
    res.on('data', function (chunk) {
      buffer.push(Buffer.from(chunk));
    });

    res.on('end', () => {
      handleEnd(res, buffer, dataCallback, errorCallback);
    });

    // handler response errors
    res.on('error', errorCallback);
  }); // configure request and add it to clientRequest // and add it to request returned
  configureRequest(request, requestConfig, clientRequest, errorCallback);

  clientRequest.setHttpRequest(request);

  // handle request errors and handle them by request or general error handler
  request.on('error', errorCallback);

  // write POST/PUT data to request body;
  if (options.data) { request.write(prepareData(options.data)); }

  request.end();
};

const ClientRequest = function (client) {
  events.EventEmitter.call(client);
  let _httpRequest;

  this.setHttpRequest = req => {
    _httpRequest = req;
  };

  this.end = () => {
    _httpRequest.end();
  };
};

const Client = function (options) {
  this.options = options || {};
  this.useProxy = Boolean(this.options.proxy || false);
  this.useProxyTunnel = (!this.useProxy || this.options.proxy.tunnel === undefined) ? false : this.options.proxy.tunnel;
  this.proxy = this.options.proxy;
  this.connection = this.options.connection || {};
  this.mimetypes = this.options.mimetypes || {};
  this.requestConfig = this.options.requestConfig || {};
  this.responseConfig = this.options.responseConfig || {};

  this.createProxyPath = function (url) {
    let result = url.host;
    // check url protocol to set path in request options
    if (url.protocol === 'https:') {
      // port is set, leave it, otherwise use default https 443
      result = (url.host.indexOf(':') === -1 ? url.hostname + ':443' : url.host);
    }

    return result;
  };
  this.createProxyHeaders = function (url) {
    let result = {};
    // if proxy requires authentication, create Proxy-Authorization headers
    if (this.proxy.user && this.proxy.password) {
      result['Proxy-Authorization'] = 'Basic ' + Buffer.from([this.proxy.user, this.proxy.password].join(':')).toString('base64');
    }
    // no tunnel proxy connection, we add the host to the headers
    if (!this.useProxyTunnel) { result.host = url.host; }

    return result;
  };
  this.createConnectOptions = function (connectURL, connectMethod) {
    const url = urlParser.parse(connectURL);

    const protocol = url.protocol.indexOf(':') === -1 ? url.protocol : url.protocol.substring(0, url.protocol.indexOf(':'));

    const defaultPort = protocol === 'http' ? 80 : 443;

    const result = {
      host: url.host.indexOf(':') === -1 ? url.host : url.host.substring(0, url.host.indexOf(':')),
      port: url.port === undefined ? defaultPort : url.port,
      path: url.path,
      protocol: protocol
    };

    if (this.useProxy) { result.agent = false; } // cannot use default agent in proxy mode

    if (this.options.user && this.options.password) {
      result.auth = [this.options.user, this.options.password].join(':');
    } else if (this.options.user && !this.options.password) {
      // some sites only needs user with no password to authenticate
      result.auth = this.options.user;
    }

    // configure proxy connection to establish a tunnel
    if (this.useProxy) {
      result.proxy = {
        host: this.proxy.host,
        port: this.proxy.port,
        method: this.useProxyTunnel ? 'CONNECT' : connectMethod, // if proxy tunnel use 'CONNECT' method, else get method from request,
        path: this.useProxyTunnel ? this.createProxyPath(url) : connectURL, // if proxy tunnel set proxy path else get request path,
        headers: this.createProxyHeaders(url) // createProxyHeaders add correct headers depending of proxy connection type
      };
    }

    if (this.connectionthis && typeof this.connection === 'object') {
      for (let option in this.connection) {
        result[option] = this.connection[option];
      }
    }

    // don't use tunnel to connect to proxy, direct request
    // and delete proxy options
    if (!this.useProxyTunnel) {
      for (let option in result.proxy) {
        result[option] = result.proxy[option];
      }

      delete result.proxy;
    }

    // add general request and response config to connect options

    result.requestConfig = this.requestConfig;
    result.responseConfig = this.responseConfig;

    return result;
  };
  this.decodeQueryFromURL = function (connectURL) {
    const url = urlParser.parse(connectURL);

    const query = url.query.substring(1).split('&');

    let keyValue;

    const result = {}; // create decoded args from key value elements in query+
    for (let i = 0; i < query.length; i++) {
      keyValue = query[i].split('=');
      result[keyValue[0]] = decodeURIComponent(keyValue[1]);
    }

    return result;
  };
  this.encodeQueryFromArgs = function (args) {
    let result = '?';

    let counter = 1;
    // create enconded URL from args
    for (let key in args) {
      let keyValue = key + '=' + encodeURIComponent(args[key]);
      if (counter > 1) { keyValue = '&'.concat(keyValue); }
      result = result.concat(keyValue);

      counter++;
    }

    return result;
  };
  this.parsePathParameters = function (args, url) {
    let result = url;
    if (!args || !args.path) { return url; }

    for (let placeholder in args.path) {
      let regex = new RegExp('\\$\\{' + placeholder + '\\}', 'i');
      result = result.replace(regex, args.path[placeholder]);
    }

    return result;
  };
  this.overrideClientConfig = function (connectOptions, methodOptions) {
    function validateReqResOptions (reqResOption) {
      return (reqResOption && typeof reqResOption === 'object');
    }
    // check if we have particular request or response config set on this method invocation
    // and override general request/response config
    if (validateReqResOptions(methodOptions.requestConfig)) {
      util._extend(connectOptions.requestConfig, methodOptions.requestConfig);
    }

    if (validateReqResOptions(methodOptions.responseConfig)) {
      util._extend(connectOptions.responseConfig, methodOptions.responseConfig);
    }
  };

  this.connect = function (method, url, args, dataCallback, errorCallback) {
    const clientRequest = new ClientRequest(this);

    // configure connect options based on url parameter parse
    const options = this.createConnectOptions(this.parsePathParameters(args, url), method);
    options.method = method;
    options.clientRequest = clientRequest;

    if (typeof args.timeout === 'number') options.requestConfig.timeout = args.timeout;

    // no args passed
    if (typeof args === 'object') {
      // add headers and POST/PUT data to connect options to be passed
      // with request
      if (args.headers) { options.headers = args.headers; }
      if (method === 'GET') { delete args.data; }

      if (args.data !== undefined && (method === 'POST' || method === 'PUT')) {
        options.data = args.data;
        if (options.headers === undefined) { options.headers = {}; }
        // set Content lentgh for some servers to work (nginx)
        options.headers['Content-Length'] = Buffer.byteLength((typeof args.data === 'string' ? args.data : JSON.stringify(args.data)), 'utf8');
      }
      // we have args, go and check if we have parameters
      if (args.parameters && Object.keys(args.parameters).length > 0) {
        // validate URL consistency, and fix it
        options.path += (options.path.charAt(url.length - 1) === '?' ? '?' : '');
        options.path = options.path.concat(this.encodeQueryFromArgs(args.parameters));
      }

      // override client config, by the moment just for request response config
      this.overrideClientConfig(options, args);
    }

    if (this.useProxy && this.useProxyTunnel) {
      proxy(options, dataCallback, errorCallback);
    } else {
      // normal connection and direct proxy connections (no tunneling)
      normal(options, dataCallback, errorCallback);
    }
  };

  this.get = function (url, args, dataCallback, errorCallback) {
    return this.connect('GET', url, args, dataCallback, errorCallback);
  };

  this.post = function (url, args, dataCallback, errorCallback) {
    return this.connect('POST', url, args, dataCallback, errorCallback);
  };

  this.put = function (url, args, dataCallback, errorCallback) {
    return this.connect('PUT', url, args, dataCallback, errorCallback);
  };

  this.delete = function (url, args, dataCallback, errorCallback) {
    return this.connect('DELETE', url, args, dataCallback, errorCallback);
  };

  this.patch = function (url, args, dataCallback, errorCallback) {
    return this.connect('PATCH', url, args, dataCallback, errorCallback);
  };
};

exports.Client = Client;
