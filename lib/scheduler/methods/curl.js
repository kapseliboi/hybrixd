const APIqueue = require('../../APIqueue/APIqueue');

/**
   * Use API queue to perform a curl call to an external host.
   * @param {String} [target=$host] - A string containing on of the following options.
   * - "[user[:password]@]host[:port]"
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
   * - ignore404=false: whether to fail when receiving 404 status
   * - ignoreError=false:  whether to fail when receiving error status (<100 || >=300)
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
    if (typeof method === 'undefined' && ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'].includes(argument)) {
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

  if (typeof querystring === 'undefined') querystring = '';
  if (typeof method === 'undefined') method = 'GET';
  if (typeof jumpOnSuccess === 'undefined') jumpOnSuccess = 1;
  if (typeof jumpOnFailure === 'undefined') jumpOnFailure = 1;

  if (jumpOnSuccess === jumpOnFailure) {
    global.hybrixd.logger(['warn', 'qrtz', 'curl'], 'No separate error handling for curl @ /p/' + p.getProcessID());
  }

  let properties;
  if (typeof target === 'undefined') { // use target from recipe
    properties = p.getRecipe(); // use base as default
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
  args.data = data;
  args.path = typeof querystring === 'undefined' ? '' : querystring;

  if (properties.hasOwnProperty('rejectUnauthorized') && !properties.rejectUnauthorized) {
    global.hybrixd.logger(['error', 'qrtz', 'curl'], 'module quartz: unauthorized TLS/SSL certificates ignored for ' + properties.symbol);
    args.rejectUnauthorized = false;
  }
  args.headers = (headers || {});

  // ensure the API request timeout is always shorter than the process timeout
  const requestTimeOut = properties.hasOwnProperty('timeout') ? (properties.timeout - 500) : undefined;

  // if host = {hostType: www.something.com} and overwriteProperties.host = hostType => host = www.something.com
  let host;
  if (!(properties.host instanceof Array) && typeof properties.host === 'object' && properties.host !== null) {
    if (overwriteProperties && overwriteProperties.hasOwnProperty('host') && properties.host.hasOwnProperty(overwriteProperties.host)) {
      host = properties.host[overwriteProperties.host];
    } else if (properties.host.hasOwnProperty('default')) {
      host = properties.host.default;
    } else {
      return this.fail('Could not determine host');
    }
  } else {
    host = properties.host;
  }

  const queueObject = {
    host,
    user: properties.user,
    pass: properties.pass,

    args: args,

    method: method,
    retry: properties.retry,
    throttle: properties.throttle,
    timeout: requestTimeOut,

    qrtzProcessStep: p,
    jumpOnSuccess,
    jumpOnFailure
  };

  if (overwriteProperties) { // overwrite connection properties
    if (overwriteProperties.hasOwnProperty('qrtzProcessStep')) { delete overwriteProperties.qrtzProcessStep; }
    if (overwriteProperties.hasOwnProperty('host')) { delete overwriteProperties.host; }
  } else { overwriteProperties = {}; }

  // Remove undefined values (needed to let APIqueue set defaults)
  const cleanQueueObject = Object.keys(Object.assign(queueObject, overwriteProperties)).reduce(
    function (cleanQueueObject, key) {
      if (typeof queueObject[key] !== 'undefined') {
        cleanQueueObject[key] = queueObject[key];
      }
      return cleanQueueObject;
    }, {});
  return APIqueue.add(cleanQueueObject);
};
