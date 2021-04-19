/**
   * Route a path through hybrixd and pass the result to the next step. /api/help for API information.
   * @param {String} path - Provide the routing path
   * @example
   * rout '/asset/dummy/balance/__dummyaddress__'    // retrieve the balance for the dummy asset
   * rout '/asset/dummy/fee' @success @failure       // retrieve the fee for the dummy asset, on success jump to @success, else jump to @failure
   */
exports.rout = data => function (p, xpath, onSuccess, onFailure) {
  if (typeof onSuccess === 'undefined') onSuccess = 1;
  if (isNaN(onSuccess)) return p.fail('rout: expected jump for onSuccess.');
  if (isNaN(onFailure) && typeof onFailure !== 'undefined') return p.fail('rout: expected jump for onFailure.');

  p.rout(xpath, data,
    data => p.jump(onSuccess, data),
    error => {
      if (typeof onFailure === 'undefined') return p.fail(error);
      else return p.jump(onFailure, error);
    },
    true);
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
