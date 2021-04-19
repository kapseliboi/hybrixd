function castToType (p, data, type) {
  if (type === 'string') return p.next(String(data));
  else if (type === 'number') return p.next(Number(data));
  else if (type === 'array') {
    if (data instanceof Array) return data;
    else if (typeof data === 'object' && data !== null) return p.next(Object.values(data));
    else if (typeof data === 'string') return p.next(data.split());
    else return p.fail('type: Could not transform ' + (typeof data) + ' to array.');
  } else if (type === 'object') {
    if (data instanceof Array) {
      let useEntries = true;
      for (const x of data) {
        if (!(x instanceof Array) || x.length !== 2) useEntries = false;
      }
      const entries = useEntries ? data : data.map(x => [x, x]);
      return p.next(Object.fromEntries(entries));
    } else if (typeof data === 'object' && data !== null) return p.next(data);
    else return p.fail('type: Could not transform ' + (typeof data) + ' to object.');
  } else return p.fail('type: unsupported type ', type);
}

const getType = x => x instanceof Array
  ? 'array'
  : typeof x;

function jumpBasedOnType (p, data, value, jumpPerType, onNoMatch) {
  const type = getType(value);
  if (jumpPerType.hasOwnProperty(type)) return p.jump(jumpPerType[type], data);
  return p.jump(onNoMatch || 1, data);
}

/**
   * Return or set the type of the data stream.
   * @category Flow
   * @param {String} [type]  - Type to convert data stream variable to.
   * @example
   * type                 // input: 'hello', returns: 'string'
   * type string          // makes the data type string
   * type string 1 2      // if data type is string, jump 1 step, else 2 steps
   * type {string:1} 2    // if data type is string, jump 1 step, else 2 steps
   * type var string 1 2  // if var type is string, jump 1 step, else 2 steps
   * type var {string:1} 2  // if var type is string, jump 1 step, else 2 steps
   */
exports.type = data => function (p, a, b, c, d) {
  if (typeof a === 'undefined') { // type
    return p.next(getType(data));
  } else if (typeof a === 'string' && !isNaN(b)) { // type string @onMatch [@onNoMatch]
    return jumpBasedOnType(p, data, data, {[a]: b}, c);
  } else if (typeof a === 'object' && a !== null) { // type {string:@onMatch} [@onNoMatch]
    return jumpBasedOnType(p, data, data, a, b);
  } else if (typeof a === 'string' && typeof b === 'string' && !isNaN(c)) { // type var string @onMatch [@onNoMatch]
    const result = p.peek(a);
    if (result.e) return p.fail(result.e);
    return jumpBasedOnType(p, data, result.v, {[b]: c}, d);
  } else if (typeof a === 'string' && typeof b === 'object' && b !== null) { // type var {string:@onMatch} @onNoMatch
    const result = p.peek(a);
    if (result.e) return p.fail(result.e);
    return jumpBasedOnType(p, data, result.v, b, c);
  } else if (typeof a === 'string' && typeof b === 'undefined') { // type string
    return castToType(p, data, a);
  } else {
    return p.fail('type: incorrect parameters');
  }
};

exports.types = {
  type1: [
    'data 1',
    'type',
    'flow number 1 2',
    "done '$OK'",
    'fail'
  ],
  type2: [
    'data [1,2]',
    'type',
    'flow array 1 2',
    "done '$OK'",
    'fail'
  ],
  type3: [
    'data [1,2]',
    'type array 1 2',
    "done '$OK'",
    'fail'
  ],
  type4: [
    'data [1,2]',
    'type {array:1} 2',
    "done '$OK'",
    'fail'
  ],
  type5: [
    'data [1,2]',
    'poke tmp',
    'type array 1 2',
    "done '$OK'",
    'fail'
  ],
  type6: [
    'data [1,2]',
    'poke tmp',
    'type tmp {array:1} 2',
    "done '$OK'",
    'fail'
  ]

};
