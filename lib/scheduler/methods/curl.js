const APIqueue = require('../../APIqueue/APIqueue');

/**
   * Use API queue to perform a curl call to an external host.
   * @param {String} [target] - A string containing on of the following options.
   * - "[user[:password]@]host[:port]"
   * - "asset://base[.mode]"
   * - "source://base[.mode]"
   * @param {String} [querystring=""] - A string containing the querypath. Example: "/road/cars?color=red"
   * @param {String} [method="GET"] - GET (default) ,POST or PUT.
   * @param {Object} [headers={}] - HTTP headers passed to call.
   * @param {Object} [overwriteProperties={}] - Properties to change the behaviour of curl.
   * - retry: max nr of retries allowed
   * - throttle: max amount of calls per second
   * - timeout: timeout of a curl call in seconds
   * - interval: try a new call if no response
   * - user:
   * - password:
   * - proxy:
   * - host:
   * - rejectUnauthorized: Whether to reject TLS unauthorized errors. (Defaults to true.)
   * @param {Integer} [onSuccess=1] - Amount of instructions lines to jump on success.
   * @param {Integer} [onFail=1] - Amount of instructions lines to jump on failure.
   */
exports.curl = data => function (p) {
  let target;
  let querystring;
  let method;
  let headers;
  let overwriteProperties;
  let jumpOnSuccess;
  let jumpOnFailure;

  for (let i = 1; i < arguments.length; ++i) {
    const argument = arguments[i];
    if (typeof method === 'undefined' && ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'].includes(argument)) {
      method = argument;
    } else if (typeof target === 'undefined' && typeof argument === 'string' && argument.includes('://')) {
      target = argument;
    } else if (typeof jumpOnSuccess === 'undefined' && typeof argument === 'number') {
      jumpOnSuccess = argument;
    } else if (typeof jumpOnFailure === 'undefined' && typeof argument === 'number') {
      jumpOnFailure = argument;
    } else if (typeof querystring === 'undefined' && typeof argument === 'string') {
      querystring = argument;
    } else if (typeof headers === 'undefined' && typeof argument === 'object' && argument !== null) {
      headers = argument;
    } else if (typeof overwriteProperties === 'undefined' && typeof argument === 'object' && argument !== null) {
      overwriteProperties = argument;
    }
  }

  if (typeof querystring === 'undefined') {
    querystring = '';
  }
  if (typeof method === 'undefined') {
    method = 'GET';
  }

  if (typeof jumpOnSuccess === 'undefined') {
    jumpOnSuccess = 1;
  }
  if (typeof jumpOnFailure === 'undefined') {
    jumpOnFailure = 1;
  }

  if (jumpOnSuccess === jumpOnFailure) {
    const rootProcessID = p.processID.split('.')[0];
    if (global.hybrixd.proc.hasOwnProperty(rootProcessID) && global.hybrixd.proc[rootProcessID].path instanceof Array) {
      console.log(' [!] Warning : No separate error handling for curl @ /' + global.hybrixd.proc[rootProcessID].path.join('/'));
    } else {
      console.log(' [!] Warning : No separate error handling for curl @ /p/' + p.processID);
    }
  }

  let properties;
  if (typeof target === 'undefined') { // use target from recipe
    const rootProcessID = p.processID.split('.')[0];
    if (global.hybrixd.proc.hasOwnProperty(rootProcessID)) {
      const recipe = global.hybrixd.proc[rootProcessID].recipe;
      if (recipe) {
        properties = recipe; // use base as default
      } else {
        this.fail(p, 'No recipe available for root process.');
        return;
      }
    }
  } else if (target.substr(0, 8) === 'asset://') { // target = "asset://base.mode"
    target = target.substring(8, target.length); // target = "base.mode"
    const base = target.split('.')[0]; // base = "base"
    properties = {};
    Object.assign(properties, global.hybrixd.asset[base]); // use base as default
    if (base !== target) { // extend with mode if required
      properties = Object.assign(properties, global.hybrixd.asset[target]);
    }
  } else if (target.substr(0, 9) === 'source://') { // target = "source://base.mode"
    target = target.substring(9, target.length); // target = "base.mode"
    const base = target.split('.')[0]; // base = "base"
    properties = {};
    Object.assign(properties, global.hybrixd.source[base]); // use base as default
    if (base !== target) { // extend with mode if required
      properties = Object.assign(properties, global.hybrixd.source[target]);
    }
  } else if (target.substr(0, 9) === 'engine://') { // target = "source://base.mode"
    target = target.substring(9, target.length); // target = "base.mode"
    const base = target.split('.')[0]; // base = "base"
    properties = {};
    Object.assign(properties, global.hybrixd.engine[base]); // use base as default
    if (base !== target) { // extend with mode if required
      properties = Object.assign(properties, global.hybrixd.engine[target]);
    }
  } else { // target = "user:password@host:port"
    const targetSplitOnAdd = target.split('@');
    properties = {};
    if (targetSplitOnAdd.length === 1) {
      properties.host = targetSplitOnAdd[0];
    } else {
      const protocolSplit = targetSplitOnAdd[0].split('/');
      const userSplitOnColon = protocolSplit[2].split(':');
      properties.user = userSplitOnColon[0];
      properties.pass = userSplitOnColon.length > 1 ? userSplitOnColon[1] : undefined;
      properties.host = protocolSplit[0] + '//' + targetSplitOnAdd[1];
    }
  }

  const args = {};
  args['data'] = data;
  args['path'] = typeof querystring === 'undefined' ? '' : querystring;

  if (properties.hasOwnProperty('rejectUnauthorized') && !properties['rejectUnauthorized']) {
    console.log(' [!] module quartz: unauthorized TLS/SSL certificates ignored for ' + properties.symbol);
    args['rejectUnauthorized'] = false;
  }
  args.headers = (headers || {});

  // ensure the API request timeout is always shorter than the process timeout
  const requestTimeOut = properties.hasOwnProperty('timeout') ? (properties.timeout - 500) : undefined;

  let queueObject = {
    host: properties.host,
    user: properties.user,
    pass: properties.pass,

    args: args,

    method: method,
    retry: properties.retry,
    throttle: properties.throttle,
    timeout: requestTimeOut,

    pid: p.processID,
    jumpOnSuccess,
    jumpOnFailure
  };

  if (overwriteProperties) { // overwrite connection properties
    if (overwriteProperties.hasOwnProperty('pid')) { delete overwriteProperties.pid; }
  } else { overwriteProperties = {}; }

  // Remove undefined values (needed to let APIqueue set defaults)
  let cleanQueueObject = Object.keys(Object.assign(queueObject, overwriteProperties)).reduce(
    function (cleanQueueObject, key) {
      if (typeof queueObject[key] !== 'undefined') {
        cleanQueueObject[key] = queueObject[key];
      }
      return cleanQueueObject;
    }, {});
  APIqueue.add(cleanQueueObject);
};
