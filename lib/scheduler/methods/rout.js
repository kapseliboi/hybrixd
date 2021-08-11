const {pushToApiQueue} = require('./curl.js');
const INTERVAL = 500;

function call (data, p, host, xpath, onSuccess, onFailure) {
  if (p.hasStopped()) return;
  pushToApiQueue(data, p, host, xpath, 'GET', {}, {ignoreError: true, timeout: p.getTimeOut()}, response => {
    if (p.hasStopped()) return;
    if (typeof response === 'object') {
      if (response.id === 'id') {
        if (response.hasOwnProperty('timeout')) p.setTimeOut(response.timeout);
        if (response.hasOwnProperty('progress')) p.setProgress(response.progress);
        setTimeout(() => call(null, p, host, `/p/${response.data}`, onSuccess, onFailure), INTERVAL);
      } else if (response.error === 0) return p.jump(onSuccess, response.data);
      else if (typeof onFailure === 'undefined') {
        p.help(response.help);
        return p.stop(response.error, null);
      } else return p.jump(onFailure, response.data);
    } else return p.jump(onSuccess, response);
  },
  error => p.fail(error)
  );
}

/**
   * Route a path through hybrixd and pass the result to the next step. /api/help for API information.
   * @param {String} path - Provide the routing path
   * @param {String} [host] - Provide the host, defaults to self
   * @param {String} [onSuccess=1] - Provide the host, defaults to self
   * @param {String} [onFailure] - Provide the host, defaults to self
   * @example
   * rout '/asset/dummy/balance/__dummyaddress__'    // retrieve the balance for the dummy asset
   * rout '/asset/dummy/fee' @success @failure       // retrieve the fee for the dummy asset, on success jump to @success, else jump to @failure
   */
exports.rout = data => function (p, xpath, ...args) {
  let host, onSuccess, onFailure;
  if (args.length === 0) onSuccess = 1;
  else if (typeof args[0] === 'string' || args[0] instanceof Array) [host, onSuccess, onFailure] = args;
  else [onSuccess, onFailure] = args;

  if (typeof onSuccess === 'undefined') onSuccess = 1;
  if (isNaN(onSuccess)) return p.fail('rout: expected jump for onSuccess.');
  if (isNaN(onFailure) && typeof onFailure !== 'undefined') return p.fail('rout: expected jump for onFailure.');
  if (host) return call(data, p, host, xpath, onSuccess, onFailure);
  else {
    return p.rout(xpath, data,
      data => p.jump(onSuccess, data),
      error => {
        if (typeof onFailure === 'undefined') return p.fail(error);
        else return p.jump(onFailure, error);
      },
      true);
  }
};

exports.tests = {
  rout0: [
    'rout /a/dummy/factor 1 3',
    'flow {8:1} 2',
    "done '$OK'",
    'fail'
  ],
  rout1: [
    'rout /a/non_existing_asset/factor 2 1',
    "done '$OK'",
    'fail $NOT_OK:$0:$'
  ],
  rout2: [
    'rout /s/web-wallet/non_existing_file 2 1',
    "done '$OK'",
    'fail'
  ],
  rout3: [
    '#fonts is a directory should fail but not crash',
    'rout /s/web-wallet/fonts 2 1',
    "done '$OK'",
    'fail'
  ]
};
