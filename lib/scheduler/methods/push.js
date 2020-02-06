function pushString (p, data, input, pos) {
  if (typeof pos === 'undefined') {
    p.next(data + input);
  } else {
    p.next(data.substr(0, pos) + input + data.substr(pos));
  }
}

function pushArray (p, data, input, pos) {
  if (typeof pos === 'undefined') {
    data.push(input);
  } else {
    data.splice(pos, 0, input);
  }
  p.next(data);
}

function pushObject (p, data, input, pos) {
  data[pos] = input;
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
   * push 'an' 8         // input: 'This is  apple', result: 'This is an apple'
   * push 3 c            // input: {a:1,b:2}, result: {a:1,b:2,c:3}
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
