/**
   * Return or set the type of the data stream.
   * @category Array/String
   * @param {String} [type]  - Type to convert data stream variable to.
   * @example
   * type             // input: 'hello', returns: 'string'
   * type string      // makes the data type string
   */
exports.type = data => function (p, type) {
  let nextData;
  if (typeof type === 'undefined') {
    nextData = data instanceof Array
      ? 'array'
      : typeof data;
  } else {
    if (type === 'string') {
      nextData = String(data);
    } else if (type === 'number') {
      nextData = Number(data);
    } else if (type === 'array') {
      if (data instanceof Array) {
        nextData = data;
      } else if (typeof data === 'object' && data !== null) {
        nextData = Object.values(data);
      } else if (typeof data === 'string') {
        nextData = data.split();
      } else {
        nextData = [];
      }
    } else if (type === 'object') {
      if (data instanceof Array) {
        nextData = Object.fromEntries(data.map(x => [x, x]));
      } else if (typeof data === 'object' && data !== null) {
        nextData = data;
      } else {
        nextData = {};
      }
    }
  }
  p.next(nextData);
};
