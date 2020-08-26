/**
   * Find a string in an array of objects, and return the object it was found in.
   * @category Array/String
   * @param {Object} needle - The object to find
   * @param {Number} [onFound=1] - Where to jump when the data is found
   * @param {Number} [onNotFound=1] - Where to jump when the data is not found
   * @example
   * find {'id':'abcd'}      // input: [{'id':'abcd'},{'id':'efgh'}], output: [{'id':'abcd'}]
   * find world 1 2          // input: 'hello world', jumps one if found, 2 if not found
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
