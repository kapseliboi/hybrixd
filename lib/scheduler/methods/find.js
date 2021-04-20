/**
   * Find a string in an array of objects, and return the object it was found in.
   * @category Array/String
   * @param {Object} needle - The object to find
   * @param {Number} [onFound=1] - Where to jump when the data is found
   * @param {Number} [onNotFound=1] - Where to jump when the data is not found
   * @example
   * find world 1 2          // input: 'hello world', jumps one if found, 2 if not found
   * find 'eth.'             // input: ['btc','eth','eth.wbtc','eth.hy','tomo','tomo.hy'], output: ['eth.wbtc','eth.hy']
   * find {'id':'abcd'}      // input: [{'id':'abcd'},{'id':'efgh'}], output: [{'id':'abcd'}]
   */
exports.find = ydata => function (p, needle, onFound, onNotFound) {
  let jumpTo = onNotFound;
  let matches = ydata;
  if (typeof ydata === 'string') {
    if (ydata.indexOf(needle) !== -1) {
      matches = needle;
      jumpTo = onFound;
    }
  } else if (ydata instanceof Array) {
    matches = [];
    const query = JSON.stringify(needle).replace(new RegExp('^[{"]*'), '').replace(new RegExp('[}"]*$'), '');
    for (let i = 0; i < ydata.length; i++) {
      if (JSON.stringify(ydata[i]).indexOf(query) !== -1) {
        matches.push(ydata[i]);
        jumpTo = onFound;
      }
    }
    if (matches.length === 0) matches = ydata;
  } else return p.fail('Expected string or array.');
  return p.jump(jumpTo || 1, matches);
};

exports.tests = {
  find1: [
    'data [{id:1,test:2},{id:3,test:4},{id:5,test:6}]',
    'find {id:5}',
    'data ${[0].test}',
    'flow 6 1 2',
    'done $OK',
    'fail'
  ],
  find2: [
    "data 'hello world'",
    'find hello 1 2',
    'done $OK',
    'fail'
  ],
  find3: [
    "data 'hello world'",
    'find foobar 2 1',
    'done $OK',
    'fail'
  ]
};
