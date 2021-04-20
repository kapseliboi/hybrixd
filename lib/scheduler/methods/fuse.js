/**
   * Append or splice new data onto array or string.
   * @category Array/String
   * @param {Object} data - Data to add to array.
   * @param {Number} [offset=length] - Offset to use.
   * @param {Number} [delete=0] - Amount of entries to delete.
   * @example
   * fuse 'woots!'       // input: 'A', result: 'Awoots!'
   * fuse 'an' 8         // input: 'This is  apple', result: 'This is an apple'
   * fuse 'an' 8 2       // input: 'This is  apple', result: 'This is anpple'
   * fuse ['c','d']      // input: ['a','b'], result: ['a','b','c','d']
   * fuse ['c','d'] 1    // input: ['a','b'], result: ['a','c','d','b']
   * fuse ['c','d'] 1 1  // input: ['a','b'], result: ['a','c','d']
   */
exports.fuse = ydata => function (p, input, offset, del) {
  if (typeof offset === 'string' && !isNaN(offset)) {
    offset = Number(offset);
  }
  if (typeof del === 'string' && !isNaN(del)) {
    del = Number(del);
  }

  if (typeof del === 'undefined') {
    del = 0;
  } else if (typeof del !== 'number' || del < 0) {
    this.fail(p, 'Fuse: expect offset to be non negative a number');
    return;
  }
  if (typeof ydata === 'string' && typeof input === 'string') {
    if (typeof offset === 'undefined') {
      ydata = ydata + input;
    } else if (typeof offset === 'number') {
      if (offset < 0 || offset > ydata.length) {
        this.fail(p, 'Fuse: offset out of bounds');
        return;
      } else {
        ydata = ydata.substr(0, offset) + input + ydata.substr(offset + del);
      }
    } else {
      this.fail(p, 'Fuse: expect offset to be a number');
      return;
    }
  } else if (ydata instanceof Array && input instanceof Array) {
    if (typeof offset === 'undefined') {
      ydata.splice(ydata.length - del, del, ...input);
    } else if (typeof offset === 'number') {
      if (offset < 0 || offset > ydata.length) {
        this.fail(p, 'Fuse: offset out of bounds');
        return;
      } else {
        ydata.splice(offset, del, ...input);
      }
    } else {
      this.fail(p, 'Fuse: expect offset to be a number');
      return;
    }
  } else {
    this.fail(p, 'Fuse: expect data and input types to match (both string or both array)');
    return;
  }
  this.next(p, 0, ydata);
};

exports.tests = {
  fuse1: [
    'data appel!',
    'fuse taart 5',
    "flow 'appeltaart!' 1 2",
    'done $OK',
    'fail'
  ],
  fuse2: [
    'data [1,2,3]',
    'fuse [4,5,6]',
    'pick 4',
    "flow '5' 1 2",
    'done $OK',
    'fail'
  ]
};
