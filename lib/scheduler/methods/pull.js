/**
   * Pull elements from an array or input string. Indexes, a range or selection array of indexes can be entered.
   * @category Array/String
   * @param {String} [start] - Starting index to pull elements. When an array every individual number is used as an index.
   * @param {String} [end] - End range to pull elements.
   * @example
   * pull            // input: ['A','B','C'], output: ['B',C]
   * pull 1          // input: ['A','B','C'], output: ['A','C']
   * pull -1         // input: ['A','B','C'], output: ['A','B']
   * pull 1 3        // input: ['A','B','C'], output: ['A']
   * pull [1]        // input: ['A','B','C'], output: ['A','C']
   * pull [0,2]      // input: ['A','B','C'], output: ['B']
   */
exports.pull = ydata => function (p, start, end) {
  if (typeof start === 'number' && start < 0) { start = ydata.length + start; }
  if (typeof end === 'number' && end < 0) { end = ydata.length + end; }

  let result;
  if (typeof start === 'undefined' && typeof end === 'undefined') { // drop first element
    result = ydata.slice(1);
  } else if (typeof end === 'undefined') { // single index or selection
    if (typeof start === 'number') {
      if (typeof ydata === 'string') {
        result = ydata.substring(0, start) + ydata.substring(start + 1);
      } else {
        ydata.splice(start, 1);
        result = ydata;
      }
    } else {
      result = [];
      for (let i = 0; i < ydata.length; ++i) {
        if (start.indexOf(i) === -1 && start.indexOf(ydata.length + i) === -1) {
          result.push(ydata[i]);
        }
      }
      if (typeof ydata === 'string') {
        result = result.join('');
      }
    }
  } else { // range
    if (typeof ydata === 'string') {
      result = ydata.substring(0, start) + ydata.substring(end);
    } else {
      ydata.splice(start, end - start);
      result = ydata;
    }
  }

  this.next(p, 0, result);
};
