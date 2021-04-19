function pushString (p, data, input, pos) {
  if (typeof pos === 'undefined') { // 'abc' -> 'abcX'
    p.next(data + input);
  } else if (pos instanceof Array) { // 'abc' -> 'abXcX'
    let cummulativePos = 0;
    for (const subPos of pos) {
      const offsetPos = subPos + cummulativePos;
      data = data.substr(0, offsetPos) + input + data.substr(offsetPos);
      cummulativePos += input.length;
    }
    p.next(data);
  } else if (!isNaN(pos)) { // 'abc' -> 'abXc'
    p.next(data.substr(0, pos) + input + data.substr(pos));
  } else {
    p.fail('push expects pos to be a number or array of numbers.');
  }
}

function pushArray (p, data, input, pos) {
  if (typeof pos === 'undefined') { // ['a','b',c'] -> ['a','b',c','X']
    data.push(input);
    p.next(data);
  } else if (pos instanceof Array) { // ['a','b',c'] -> ['a','b','X',c','X']
    let cummulativePos = 0;
    for (const subPos of pos) {
      const offsetPos = subPos + cummulativePos;
      data.splice(offsetPos, 0, input);
      cummulativePos += input.length;
    }
    p.next(data);
  } else if (!isNaN(pos)) { // ['a','b',c'] -> ['a','b','X',c']
    data.splice(pos, 0, input);
    p.next(data);
  } else {
    p.fail('push expects pos to be a number or array of numbers.');
  }
}

function pushObject (p, data, input, pos) {
  if (pos instanceof Array) {
    for (const subPos of pos) {
      data[subPos] = input;
    }
  } else {
    data[pos] = input;
  }
  p.next(data);
}

/**
   * Push new data into array or string.
   * @category Array/String
   * @param {Object} input - Data to add to array.
   * @param {Number} [offset=length] - Offset to use.
   * @example
   * push 0              // add 0 to data array
   * push 'woots!'       // input: ['A'], result: ['A','woots!']
   * push 'woots!'       // input: 'A', result: 'Awoots!'
   * push 'B' 1          // input: ['a','c'], result: ['a','B','c']
   * push 'B' [1,3]      // input: ['a','c'], result: ['a','B','c','B']
   * push 'an' 8         // input: 'This is  apple', result: 'This is an apple'
   * push 3 c            // input: {a:1,b:2}, result: {a:1,b:2,c:3}
   * push 3 [c,d]        // input: {a:1,b:2}, result: {a:1,b:2,c:3,d:3}
   */
exports.push = data => function (p, input, pos) {
  if (typeof data === 'string') {
    pushString(p, data, input, pos);
  } else if (data instanceof Array) {
    pushArray(p, data, input, pos);
  } else if (typeof data === 'object' && data !== null) {
    pushObject(p, data, input, pos);
  } else {
    p.fail('push expects data to be a string, object or array.');
  }
};

exports.tests = {
  push1: [
    'data abc',
    'push def',
    'flow abcdef 1 2',
    'done $OK',
    'fail'
  ],
  push2: [
    'data abc',
    'push X 1',
    'flow aXbc 1 2',
    'done $OK',
    'fail'
  ],
  push3: [
    'data [a,b,c]',
    'push X',
    'join',
    'flow abcX 1 2',
    'done $OK',
    'fail'
  ],
  push4: [
    'data [a,b,c]',
    'push X 1',
    'join',
    'flow aXbc 1 2',
    'done $OK',
    'fail'
  ],
  push5: [
    'data abc',
    'push X [1,3]',
    'flow aXbcX 1 2',
    'done $OK',
    'fail'
  ],
  push6: [
    'data [a,b,c]',
    'push X [1,3]',
    'join',
    'flow aXbcX 1 2',
    'done $OK',
    'fail'
  ]
};
