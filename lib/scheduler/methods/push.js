/**
   * Push new data into array or string.
   * @category Array/String
   * @param {Object} input            - Data to add to array
   * @param {Number} [offset=length]  - Offset to use
   * @example
   * push(0)             // add 0 to data array
   * push('woots!')      // input: ['A'], result: ['A','woots!']
   * push('woots!')      // input: 'A', result: 'Awoots!'
   * push('B',1)         // input: ['a','c'], result: ['a','B','c']
   * push(['B','E'],1)   // input: ['a','c'], result: ['a','B','E','c']
   * push('an',8)        // input: 'This is  apple', result: 'This is an apple'
   */
exports.push = ydata => function (p, input, pos) {
  let str = false;
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
    ydata.push(input);
  } else {
    if (pos.constructor === Array) {
      for (let i = pos.length - 1; i > -1; i--) {
        if (pos[i] < 0) {
          pos[i]++;
          if (pos[i] === 0) { pos[i] = ydata.length + 1; }
        }
      }
      pos = pos.sort();
      for (let i = pos.length - 1; i > -1; i--) {
        ydata.splice(pos[i], 0, input);
      }
    } else {
      if (pos < 0) {
        pos++;
        if (pos === 0) { pos = ydata.length + 1; }
      }
      ydata.splice(pos, 0, input);
    }
  }
  if (str) {
    ydata = ydata.join('');
  }
  global.hybrixd.proc[p.processID].data = ydata; // TODO why?
  this.next(p, 0, ydata);
};
