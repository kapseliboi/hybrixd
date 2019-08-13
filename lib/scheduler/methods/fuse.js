/**
   * Fuse or insert new data onto array or string.
   * @category Array/String
   * @param {Object} input - Data to add to array.
   * @param {Number} [offset=length] - Offset to use.
   * @param {Number} [delete=0] - Amount of entries to delete.
   * @example
   * fuse 0              // add 0 to data array
   * fuse 'woots!'       // input: 'A', result: 'Awoots!'
   * fuse 'B' 1          // input: ['a','c'], result: ['a','B','c']
   * fuse ['B','E'] 1    // input: ['a','c'], result: ['a','B','E','c']
   * fuse 'an' 8         // input: 'This is  apple', result: 'This is an apple'
   */
exports.fuse = ydata => function (p, input, pos, del) {
  let str;
  if (typeof ydata === 'string') {
    str = true;
    ydata = ydata.split('');
  } else if (Object.prototype.toString.call(ydata) !== '[object Array]') {
    if (typeof ydata === 'undefined' || ydata === null) {
      ydata = [];
    } else {
      ydata = [ ydata ];
    }
  }
  if (typeof pos === 'undefined') {
    if (input instanceof Array) {
      for (let i = 0; i < input.length; i++) {
        ydata.push(input[i]);
      }
    } else {
      ydata.push(input);
    }
  } else {
    if (del < 0) { pos = pos + del; del = -del; }
    if (input instanceof Array) {
      ydata.splice(pos, del, input[0]);
      for (let i = 1; i < input.length; i++) {
        ydata.splice(pos + i, 0, input[i]);
      }
    } else {
      ydata.splice(pos, del, input);
    }
  }
  if (str) {
    ydata = ydata.join('');
  }
  global.hybrixd.proc[p.processID].data = ydata;
  this.next(p, 0, ydata);
};
