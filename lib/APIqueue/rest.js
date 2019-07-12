// (C) 2015 Internet of Coins / Metasync
// hybrixd - rest.js
// Amended NPM REST library dependency for performing REST requests

let http = require('http');
let https = require('https');
let urlParser = require('url');
let util = require('util');
let events = require('events');
let zlib = require('zlib');

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
  let _httpRequest;

  let ClientRequest = function () {
    events.EventEmitter.call(this);
  };
  util.inherits(ClientRequest, events.EventEmitter);

  ClientRequest.prototype.end = function () {
    _httpRequest.end();
  };

  ClientRequest.prototype.setHttpRequest = function (req) {
    _httpRequest = req;
  };

  const Util = {

    createProxyPath: function (url) {
      let result = url.host;
      // check url protocol to set path in request options
      if (url.protocol === 'https:') {
        // port is set, leave it, otherwise use default https 443
        result = (url.host.indexOf(':') === -1 ? url.hostname + ':443' : url.host);
      }

      return result;
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
      let url = urlParser.parse(connectURL);

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
        // some sites only needs user with no password to authenticate
        result.auth = self.options.user;
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
        for (var option in self.connection) {
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
      let url = urlParser.parse(connectURL);

      let query = url.query.substring(1).split('&');

      let keyValue;

      let result = {};	// create decoded args from key value elements in query+
      for (let i = 0; i < query.length; i++) {
        keyValue = query[i].split('=');
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
      // no args passed
      if (typeof args === 'function') {
        callback = args;
      } else if (typeof args === 'object') {
        // add headers and POST/PUT data to connect options to be passed
        // with request
        if (args.headers) { options.headers = args.headers; }
        if (method === 'GET'){ delete args.data; }

        if (args.data !== undefined && method === 'POST') {
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
        }

        // override client config, by the moment just for request response config
        this.overrideClientConfig(options, args);
      }

      if (self.useProxy && self.useProxyTunnel) {
        ConnectManager.proxy(options, callback);
      } else {
        // normal connection and direct proxy connections (no tunneling)
        ConnectManager.normal(options, callback);
      }
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

  let Method = function (url, method) {
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
  };
  this.get = function (url, args, callback) {
    let clientRequest = new ClientRequest();
    Util.connect('GET', url, args, callback, clientRequest);
    return clientRequest;
  };

  this.post = function (url, args, callback) {
    let clientRequest = new ClientRequest();
    Util.connect('POST', url, args, callback, clientRequest);
    return clientRequest;
  };

  this.put = function (url, args, callback) {
    let clientRequest = new ClientRequest();
    Util.connect('PUT', url, args, callback, clientRequest);
    return clientRequest;
  };

  this.delete = function (url, args, callback) {
    let clientRequest = new ClientRequest();
    Util.connect('DELETE', url, args, callback, clientRequest);
    return clientRequest;
  };

  this.patch = function (url, args, callback) {
    let clientRequest = new ClientRequest();
    Util.connect('PATCH', url, args, callback, clientRequest);
    return clientRequest;
  };

  this.registerMethod = function (name, url, method) {
    // create method in method registry with preconfigured REST invocation
    // method
    this.methods[name] = new Method(url, method);
  };

  this.unregisterMethod = function (name) {
    delete this.methods[name];
  };

  // handle ConnectManager events
  ConnectManager.on('error', function (err) {
    self.emit('error', err);
  });

  // merge mime types with connect manager
  Util.mergeMimeTypes(self.mimetypes);
};

var ConnectManager = {
  'xmlctype': ['application/xml', 'application/xml;charset=utf-8'],
  'jsonctype': ['application/json', 'application/json;charset=utf-8'],
  'isXML': function (content) {
    let result = false;
    if (!content) { return result; }

    for (let i = 0; i < this.xmlctype.length; i++) {
      result = this.xmlctype[i].toLowerCase() === content.toLowerCase();
      if (result) { break; }
    }

    return result;
  },
  'isJSON': function (content) {
    let result = false;
    if (!content) { return result; }

    for (let i = 0; i < this.jsonctype.length; i++) {
      result = this.jsonctype[i].toLowerCase() === content.toLowerCase();
      if (result) { break; }
    }

    return result;
  },
  'isValidData': function (data) {
    return data !== undefined && (data.length !== undefined && data.length > 0);
  },
  'configureRequest': function (req, config, clientRequest) {
    if (config.timeout) {
      req.setTimeout(config.timeout, function () {
        clientRequest.emit('requestTimeout', req);
      });
    }

    if (config.noDelay) { req.setNoDelay(config.noDelay); }

    if (config.keepAlive) { req.setSocketKeepAlive(config.noDelay, config.keepAliveDelay || 0); }
  },
  'configureResponse': function (res, config, clientRequest) {
    if (config.timeout) {
      res.setTimeout(config.timeout, function () {
        clientRequest.emit('responseTimeout', res);
        res.close();
      });
    }
  },
  'handleEnd': function (res, buffer, callback) {
    let self = this;

    let content = res.headers['content-type'];

    let encoding = res.headers['content-encoding'];

    if (encoding !== undefined && encoding.indexOf('gzip') >= 0) {
      zlib.gunzip(Buffer.concat(buffer), function (er, gunzipped) {
        self.handleResponse(res, gunzipped, callback);
      });
    } else if (encoding !== undefined && encoding.indexOf('deflate') >= 0) {
      zlib.inflate(Buffer.concat(buffer), function (er, inflated) {
        self.handleResponse(res, inflated, callback);
      });
    } else {
      self.handleResponse(res, Buffer.concat(buffer).toString(), callback);
    }
  },
  'handleResponse': function (res, data, callback) {
    let content = res.headers['content-type'];
    if (this.isJSON(content)) {
      let jsonData;
      try {
        jsonData = this.isValidData(data) ? JSON.parse(data) : data;
      } catch (err) {
        // Something went wrong when parsing json. This can happen
        // for many reasons, including a bad implementation on the
        // server.
        jsonData = 'Error parsing response. response: [' +
          data + '], error: [' + err + ']';
      }
      callback(jsonData, res);
    } else {
      callback(data, res);
    }
  },
  'prepareData': function (data) {
    let result;
    if ((data instanceof Buffer) || (typeof data !== 'object')) {
      result = data;
    } else {
      result = JSON.stringify(data);
    }
    return result;
  },
  'proxy': function (options, callback) {
    // creare a new proxy tunnel, and use to connect to API URL
    let proxyTunnel = http.request(options.proxy);

    let self = this;
    proxyTunnel.on('connect', function (res, socket, head) {
      // set tunnel socket in request options, that's the tunnel itself
      options.socket = socket;

      let buffer = [];

      let protocol = (options.protocol == 'http') ? http : https;

      let clientRequest = options.clientRequest;

      let requestConfig = options.requestConfig;

      let responseConfig = options.responseConfig;								// remove "protocol" and "clientRequest" option from options, cos is not allowed by http/hppts node objects
      delete options.protocol;
      delete options.clientRequest;
      delete options.requestConfig;
      delete options.responseConfig;

      // add request options to request returned to calling method
      clientRequest.options = options;

      let request = protocol.request(options, function (res) {
        // configure response
        self.configureResponse(res, responseConfig, clientRequest);

        // concurrent data chunk handler
        res.on('data', function (chunk) {
          buffer.push(new Buffer(chunk));
        });

        res.on('end', function () {
          self.handleEnd(res, buffer, callback);
        });

        // handler response errors
        res.on('error', function (err) {
          if (clientRequest !== undefined && typeof clientRequest === 'object') {
            // add request as property of error
            err.request = clientRequest;
            err.response = res;
            // request error handler
            clientRequest.emit('error', err);
          } else {
            // general error handler
            self.emit('error', err);
          }
        });
      });								// configure request and add it to clientRequest				// and add it to request returned
      self.configureRequest(request, requestConfig, clientRequest);
      clientRequest.setHttpRequest(request);

      // write POST/PUT data to request body;
      if (options.data) { request.write(this.prepareData(options.data)); }

      // handle request errors and handle them by request or general error handler
      request.on('error', function (err) {
        if (clientRequest !== undefined && typeof clientRequest === 'object') {
          // add request as property of error
          err.request = clientRequest;

          // request error handler
          clientRequest.emit('error', err);
        } else {
          // general error handler
          self.emit('error', err);
        }
      });

      request.end();
    });

    // proxy tunnel error are only handled by general error handler
    proxyTunnel.on('error', function (e) {
      self.emit('error', e);
    });

    proxyTunnel.end();
  },
  'normal': function (options, callback) {

    let buffer = [];

    let protocol = (options.protocol === 'http') ? http : https;

    let clientRequest = options.clientRequest;

    let requestConfig = options.requestConfig;

    let responseConfig = options.responseConfig;

    let self = this;	// remove "protocol" and "clientRequest" option from options, cos is not allowed by http/hppts node objects
    delete options.protocol;
    delete options.clientRequest;
    delete options.requestConfig;
    delete options.responseConfig;

    // add request options to request returned to calling method
    clientRequest.options = options;

    let request = protocol.request(options, function (res) {
      // configure response
      self.configureResponse(res, responseConfig, clientRequest);

      // concurrent data chunk handler
      res.on('data', function (chunk) {
        buffer.push(new Buffer(chunk));
      });

      res.on('end', function () {
        self.handleEnd(res, buffer, callback);
      });

      // handler response errors
      res.on('error', function (err) {
        if (clientRequest !== undefined && typeof clientRequest === 'object') {
          // add request as property of error
          err.request = clientRequest;
          err.response = res;
          // request error handler
          clientRequest.emit('error', err);
        } else {
          // general error handler
          self.emit('error', err);
        }
      });
    }); // configure request and add it to clientRequest // and add it to request returned
    self.configureRequest(request, requestConfig, clientRequest);

    clientRequest.setHttpRequest(request);

    // handle request errors and handle them by request or general error handler
    request.on('error', function (err) {
      if (clientRequest !== undefined && typeof clientRequest === 'object') {
        // add request as property of error
        err.request = clientRequest;
        // request error handler
        clientRequest.emit('error', err);
      } else {
        // general error handler
        self.emit('error', err);
      }
    });

    // write POST/PUT data to request body;
    if (options.data) { request.write(this.prepareData(options.data)); }

    request.end();
  }
};// event handlers for client and ConnectManager
util.inherits(exports.Client, events.EventEmitter);
util._extend(ConnectManager, events.EventEmitter.prototype);
