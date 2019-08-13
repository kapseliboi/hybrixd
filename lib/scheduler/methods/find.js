/**
   * Find a string in an array of objects, and return the object it was found in.
   * @category Array/String
   * @param {Object} needle - The object to find
   * @param {Number} [onFound=1] - Where to jump when the data is found
   * @param {Number} [onNotFound=1] - Where to jump when the data is not found
   * @example
   * find {'id':'abcd'}      // input: [{'id':'abcd'},{'id':'efgh'}], output: [{'id':'abcd'}]
   */
exports.find = ydata => function (p, needle, found, not_found) {
  let jumpTo = not_found;
  let matches = ydata;
  if (typeof ydata === 'string') {
    if (ydata.indexOf(needle) !== -1) {
      matches = needle;
      jumpTo = found;
    }
  } else if (ydata instanceof Array) {
    matches = [];
    const query = JSON.stringify(needle).replace(new RegExp('^[{]*'), '').replace(new RegExp('[}]*$'), '');
    for (let i = 0; i < ydata.length; i++) {
      if (JSON.stringify(ydata[i]).indexOf(query) !== -1) {
        matches.push(ydata[i]);
        jumpTo = found;
      }
    }
    if (matches.length === 0) { matches = ydata; }
  } else {
    this.fail(p, 'Expected string or array.');
    return;
  }
  this.jump(p, jumpTo || 1, matches);
};
