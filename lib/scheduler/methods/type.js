function castToType (data, type) {
  if (type === 'string') return String(data);
  else if (type === 'number') return Number(data);
  else if (type === 'array') {
    if (data instanceof Array) return data;
    else if (typeof data === 'object' && data !== null) return Object.values(data);
    else if (typeof data === 'string') return data.split();
    else return [];
  } else if (type === 'object') {
    if (data instanceof Array) return Object.fromEntries(data.map(x => [x, x]));
    else if (typeof data === 'object' && data !== null) return data;
    else return {};
  } else return undefined;
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
   * type string 1 2      //
   * type {string:1} 2    //
   * type var string 1 2  //
   * type var {string:1} 2  //
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
    return p.next(castToType(data, a));
  } else {
    return p.fail('type: incorrect parameters');
  }
};
