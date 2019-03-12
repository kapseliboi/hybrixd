// (C) 2015 Internet of Coins / Metasync
// hybrixd - rest.js
// Amended NPM REST library dependency for performing REST requests

const http = require('http');
const https = require('https');
const urlParser = require('url');
const util = require('util');
const events = require('events');
const zlib = require('zlib');

exports.Client = function (options) {
  let self = this;
  self.options = options || {};
  self.useProxy = Boolean(self.options.proxy || false);
  self.useProxyTunnel = (!self.useProxy || self.options.proxy.tunnel === undefined) ? false : self.options.proxy.tunnel;
  self.proxy = self.options.proxy;
  self.connection = self.options.connection || {};
  self.mimetypes = self.options.mimetypes || {};
  self.requestConfig = self.options.requestConfig || {};
  self.responseConfig = self.options.responseConfig || {};

  this.methods = {};

  // Client Request to be passed to ConnectManager and returned
  // for each REST method invocation
  let ClientRequest = function () {
    events.EventEmitter.call(this);
    let _httpRequest;
  };
  util.inherits(ClientRequest, events.EventEmitter);

  ClientRequest.prototype.end = function () { _httpRequest.end(); };
  ClientRequest.prototype.setHttpRequest = function (req) { _httpRequest = req; };

  let Util = {
    createProxyPath: function (url) {
      const result = url.host;
      const port = url.host.indexOf(':') === -1 ? url.hostname + ':443' : url.host;

      return url.protocol === 'https:'
        ? port
        : result;
    },
    createProxyHeaders: function (url) {
      let result = {};
      // if proxy requires authentication, create Proxy-Authorization headers
      if (self.proxy.user && self.proxy.password) {
        result['Proxy-Authorization'] = 'Basic ' + new Buffer([self.proxy.user, self.proxy.password].join(':')).toString('base64');
      }
      // no tunnel proxy connection, we add the host to the headers
      if (!self.useProxyTunnel) { result.host = url.host; }

      return result;
    },
    createConnectOptions: function (connectURL, connectMethod) {
      debug('connect URL = ', connectURL);
      let url = urlParser.parse(connectURL);
      let path;
      let result = {};
      let protocol = url.protocol.indexOf(':') === -1 ? url.protocol : url.protocol.substring(0, url.protocol.indexOf(':'));
      let defaultPort = protocol === 'http' ? 80 : 443;

      result = {
        host: url.host.indexOf(':') === -1 ? url.host : url.host.substring(0, url.host.indexOf(':')),
        port: url.port === undefined ? defaultPort : url.port,
        path: url.path,
        protocol: protocol
      };

      if (self.useProxy) { result.agent = false; } // cannot use default agent in proxy mode

      if (self.options.user && self.options.password) {
        result.auth = [self.options.user, self.options.password].join(':');
      } else if (self.options.user && !self.options.password) {
        result.auth = self.options.user; // some sites only needs user with no password to authenticate
      }

      // configure proxy connection to establish a tunnel
      if (self.useProxy) {
        result.proxy = {
          host: self.proxy.host,
          port: self.proxy.port,
          method: self.useProxyTunnel ? 'CONNECT' : connectMethod, // if proxy tunnel use 'CONNECT' method, else get method from request,
          path: self.useProxyTunnel ? this.createProxyPath(url) : connectURL, // if proxy tunnel set proxy path else get request path,
          headers: this.createProxyHeaders(url) // createProxyHeaders add correct headers depending of proxy connection type
        };
      }

      if (self.connection && typeof self.connection === 'object') {
        for (let option in self.connection) {
          result[option] = self.connection[option];
        }
      }

      // don't use tunnel to connect to proxy, direct request
      // and delete proxy options
      if (!self.useProxyTunnel) {
        for (option in result.proxy) {
          result[option] = result.proxy[option];
        }

        delete result.proxy;
      }

      // add general request and response config to connect options

      result.requestConfig = self.requestConfig;
      result.responseConfig = self.responseConfig;

      return result;
    },
    decodeQueryFromURL: function (connectURL) {
      const url = urlParser.parse(connectURL);
      const query = url.query.substring(1).split('&');

      let result = {}; // create decoded args from key value elements in query+
      for (let i = 0; i < query.length; i++) {
        const keyValue = query[i].split('=');
        result[keyValue[0]] = decodeURIComponent(keyValue[1]);
      }

      return result;
    },
    encodeQueryFromArgs: function (args) {
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
    },
    parsePathParameters: function (args, url) {
      let result = url;
      if (!args || !args.path) { return url; }

      for (let placeholder in args.path) {
        let regex = new RegExp('\\$\\{' + placeholder + '\\}', 'i');
        result = result.replace(regex, args.path[placeholder]);
      }

      return result;
    },
    overrideClientConfig: function (connectOptions, methodOptions) {
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
    },
    connect: function (method, url, args, callback, clientRequest) {
      // configure connect options based on url parameter parse
      let options = this.createConnectOptions(this.parsePathParameters(args, url), method);
      options.method = method;
      options.clientRequest = clientRequest;
      debug('options pre connect', options);
      debug('args = ', args);
      debug('args.data = ', args !== undefined ? args.data : undefined);
      // no args passed
      if (typeof args === 'function') {
        callback = args;
      } else if (typeof args === 'object') {
        // add headers and POST/PUT data to connect options to be passed
        // with request
        if (args.headers) { options.headers = args.headers; }
        if (args.data !== undefined) {
          options.data = args.data;
          if (options.headers === undefined) { options.headers = {}; }
          // set Content lentgh for some servers to work (nginx)
          options.headers['Content-Length'] = Buffer.byteLength((typeof args.data === 'string' ? args.data : JSON.stringify(args.data)), 'utf8');
        }
        // we have args, go and check if we have parameters
        if (args.parameters && Object.keys(args.parameters).length > 0) {
          // validate URL consistency, and fix it
          options.path += (options.path.charAt(url.length - 1) === '?' ? '?' : '');
          options.path = options.path.concat(Util.encodeQueryFromArgs(args.parameters));
          debug('options.path after request parameters = ', options.path);
        }

        // override client config, by the moment just for request response config
        this.overrideClientConfig(options, args);
      }

      debug('FINAL SELF object  ====>', self);

      self.useProxy && self.useProxyTunnel
        ? ConnectManager.proxy(options, callback)
        : ConnectManager.normal(options, callback); // normal connection and direct proxy connections (no tunneling)
    },
    mergeMimeTypes: function (mimetypes) {
      // merge mime-types passed as options to client
      if (mimetypes && typeof mimetypes === 'object') {
        if (mimetypes.json && mimetypes.json instanceof Array && mimetypes.json.length > 0) {
          ConnectManager.jsonctype = mimetypes.json;
        } else if (mimetypes.xml && mimetypes.xml instanceof Array && mimetypes.xml.length > 0) {
          ConnectManager.xmlctype = mimetypes.xml;
        }
      }
    }
  };

  function Method (url, method) {
    let httpMethod = self[method.toLowerCase()];
    return function (args, callback) {
      let completeURL = url;
      // no args
      if (typeof args === 'function') {
        callback = args;
        args = {};
      } else if (typeof args === 'object') {
        // we have args, go and check if we have parameters
        if (args.parameters && Object.keys(args.parameters).length > 0) {
          // validate URL consistency, and fix it
          url += (url.charAt(url.length - 1) === '?' ? '?' : '');
          completeURL = url.concat(Util.encodeQueryFromArgs(args.parameters));
          // delete args parameters we don't need it anymore in registered
          // method invocation
          delete args.parameters;
        }
      }
      return httpMethod(completeURL, args, callback);
    };
  }

  this.get = connectMethod('GET', ClientRequest, Util);
  this.post = connectMethod('POST', ClientRequest, Util);
  this.put = connectMethod('PUT', ClientRequest, Util);
  this.delete = connectMethod('DELETE', ClientRequest, Util);
  this.patch = connectMethod('PATCH:', ClientRequest, Util);

  this.registerMethod = function (name, url, method) { this.methods[name] = new Method(url, method); }; // create method in method registry with preconfigured REST invocation method
  this.unregisterMethod = function (name) { delete this.methods[name]; };
  ConnectManager.on('error', function (err) { self.emit('error', err); }); // handle ConnectManager events

  // merge mime types with connect manager
  Util.mergeMimeTypes(self.mimetypes);
  debug('ConnectManager', ConnectManager);
};

let ConnectManager = {
  'xmlctype': ['application/xml', 'application/xml;charset=utf-8'],
  'jsonctype': ['application/json', 'application/json;charset=utf-8'],
  'isXML': checkFormatting('xmlctype'),
  'isJSON': checkFormatting('jsonctype'),
  'isValidData': data => data !== undefined && (data.length !== undefined && data.length > 0),
  'configureRequest': doConfiguration(false),
  'configureResponse': doConfiguration(true),
  'handleEnd': function (res, buffer, callback) {
    let self = this;
    let content = res.headers['content-type'];
    let encoding = res.headers['content-encoding'];

    debug('content-type: ', content);
    debug('content-encoding: ', encoding);

    if (encoding !== undefined && encoding.indexOf('gzip') >= 0) {
      debug('gunzip');
      zlib.gunzip(Buffer.concat(buffer), function (er, gunzipped) {
        self.handleResponse(res, gunzipped, callback);
      });
    } else if (encoding !== undefined && encoding.indexOf('deflate') >= 0) {
      debug('inflate');
      zlib.inflate(Buffer.concat(buffer), function (er, inflated) {
        self.handleResponse(res, inflated, callback);
      });
    } else {
      debug('not compressed');
      self.handleResponse(res, Buffer.concat(buffer).toString(), callback);
    }
  },
  'handleResponse': function (res, data, callback) {
    let content = res.headers['content-type'];
    debug('response content is ', content);
    if (this.isJSON(content)) {
      let jsonData;
      try {
        jsonData = this.isValidData(data) ? JSON.parse(data) : data;
      } catch (err) {
        jsonData = 'Error parsing response. response: [' + data + '], error: [' + err + ']'; // Something went wrong when parsing json. This can happen for many reasons, including a bad implementation on the server.
      }
      callback(jsonData, res);
    } else {
      callback(data, res);
    }
  },
  'prepareData': function (data) {
    return (data instanceof Buffer) || (typeof data !== 'object')
      ? data
      : JSON.stringify(data);
  },
  'proxy': function (options, cb) {
    debug('proxy options', options.proxy);
    let proxyTunnel = http.request(options.proxy); // creare a new proxy tunnel, and use to connect to API URL
    let self = this;

    proxyTunnel.on('connect', function (res, socket, head) {
      debug('proxy connected', socket);
      let buffer = [];
      let protocol = (options.protocol === 'http') ? http : https;
      let clientRequest = Object.assign(options.clientRequest, {options}); // add request options to request returned to calling method
      let requestConfig = options.requestConfig;
      let responseConfig = options.responseConfig; // remove "protocol" and "clientRequest" option from options, cos is not allowed by http/hppts node objects
      options.socket = socket; // set tunnel socket in request options, that's the tunnel itself
      delete options.protocol;
      delete options.clientRequest;
      delete options.requestConfig;
      delete options.responseConfig;

      let request = protocol.request(options, handleRequest(self, buffer, responseConfig, clientRequest, cb));								// configure request and add it to clientRequest				// and add it to request returned
      self.configureRequest(request, requestConfig, clientRequest);
      clientRequest.setHttpRequest(request);
      request.on('error', handleRequestError(clientRequest, self)); // handle request errors and handle them by request or general error handler
      if (options.data) { request.write(this.prepareData(options.data)); } // write POST/PUT data to request body;
      request.end();
    });
    proxyTunnel.on('error', function (e) { self.emit('error', e); }); // proxy tunnel error are only handled by general error handler
    proxyTunnel.end();
  },
  'normal': function (options, cb) {
    let buffer = [];
    let protocol = (options.protocol === 'http') ? http : https;
    let clientRequest = Object.assign(options.clientRequest, {options}); // add request options to request returned to calling method
    let requestConfig = options.requestConfig;
    let responseConfig = options.responseConfig;
    let self = this; // Remove "protocol" and "clientRequest" option from options, cos is not allowed by http/hppts node objects
    delete options.protocol;
    delete options.clientRequest;
    delete options.requestConfig;
    delete options.responseConfig;
    let request = protocol.request(options, handleRequest(self, buffer, responseConfig, clientRequest, cb)); // configure request and add it to clientRequest and add it to request returned

    debug('options pre connect', options);
    debug('clientRequest', clientRequest);
    debug('options data', options.data);

    self.configureRequest(request, requestConfig, clientRequest);
    clientRequest.setHttpRequest(request);
    request.on('error', handleRequestError(clientRequest, self)); // handle request errors and handle them by request or general error handler
    if (options.data) { request.write(this.prepareData(options.data)); } // write POST/PUT data to request body;
    request.end();
  }
};

function handleRequestError (clientRequest, self) {
  return function (e) {
    debug('request error', clientRequest);
    if (clientRequest !== undefined && typeof clientRequest === 'object') {
      e.request = clientRequest; // add request as property of error
      clientRequest.emit('error', e); // request error handler
    } else {
      self.emit('error', e); // general error handler
    }
  };
}

function handleRequest (self, buffer, responseConfig, clientRequest, cb) {
  return function (res) {
    self.configureResponse(res, responseConfig, clientRequest); // configure response
    res.on('data', function (chunk) { buffer.push(new Buffer(chunk)); }); // concurrent data chunk handler
    res.on('end', function () { self.handleEnd(res, buffer, cb); });
    res.on('error', handleResponseError(res, clientRequest)); // handler response errors
  };
}

function handleResponseError (res, clientRequest) {
  return function (e) {
    if (clientRequest !== undefined && typeof clientRequest === 'object') {
      // add request as property of error
      e.request = clientRequest;
      e.response = res;
      // request error handler
      clientRequest.emit('error', e);
    } else {
      // general error handler
      self.emit('error', e);
    }
  };
}

function doConfiguration (doClose) {
  return function (resOrReq, config, clientRequest) {
    if (config.timeout) {
      resOrReq.setTimeout(config.timeout, function () {
        clientRequest.emit('requestTimeout', resOrReq);

        if (doClose) {
          resOrReq.close();
        } else {
          if (config.noDelay) { resOrReq.setNoDelay(config.noDelay); }
          if (config.keepAlive) { resOrReq.setSocketKeepAlive(config.noDelay, config.keepAliveDelay || 0); }
        }
      });
    }
  };
}

function checkFormatting (type) {
  return function (content) {
    let result = false;
    if (!content) { return result; }

    for (let i = 0; i < this[type].length; i++) {
      result = this[type][i].toLowerCase() === content.toLowerCase();
      if (result) { break; }
    }

    return result;
  };
}

function connectMethod (method, ClientRequest, Util) {
  return function (url, args, callback) {
    let clientRequest = new ClientRequest();
    Util.connect(method, url, args, callback, clientRequest);
    return clientRequest;
  };
}

function debug () {
  if (!process.env.DEBUG) {
    return false;
  } else {
    const now = new Date();
    const header = now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds() + ' [NRC CLIENT]' + arguments.callee.caller.name + ' -> ';
    const args = Array.prototype.slice.call(arguments);

    args.splice(0, 0, header);
    console.log(...args);
  }
}

// event handlers for client and ConnectManager
util.inherits(exports.Client, events.EventEmitter);
util._extend(ConnectManager, events.EventEmitter.prototype);
