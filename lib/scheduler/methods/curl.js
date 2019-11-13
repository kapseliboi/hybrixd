const APIqueue = require('../../APIqueue/APIqueue');

/**
   * Use API queue to perform a curl call to an external host.
   * @param {String} target - A string containing on of the following options.
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
exports.curl = ydata => function (p, target, querystring, method, headers, overwritePropertiesOrOnSuccess, onSuccessOrOnFail, onFailOrNothing) {
  if (typeof method === 'undefined') { method = 'GET'; }

  if (['GET', 'POST', 'PUT', 'DELETE', 'HEAD'].indexOf(method) === -1) {
    this.fail(p, `Unknown method: '${method}'`);
    return;
  }
  if (typeof querystring !== 'undefined' && typeof querystring !== 'string') {
    this.fail(p, `Querystring must be a string, got '${typeof querystring}'`);
    return;
  }

  let jumpOnSuccess;
  let jumpOnFailure;
  let overwriteProperties;
  if (typeof overwritePropertiesOrOnSuccess !== 'undefined') {
    if (isNaN(overwritePropertiesOrOnSuccess)) {
      overwriteProperties = overwritePropertiesOrOnSuccess;
      jumpOnSuccess = onSuccessOrOnFail || 1;
      jumpOnFailure = onFailOrNothing || 1;
    } else {
      jumpOnSuccess = overwritePropertiesOrOnSuccess || 1;
      jumpOnFailure = onSuccessOrOnFail || 1;
    }
  } else {
    jumpOnSuccess = 1;
    jumpOnFailure = 1;
  }

  let properties;

  if (target.substr(0, 8) === 'asset://') { // target = "asset://base.mode"
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
  args['data'] = ydata;
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
