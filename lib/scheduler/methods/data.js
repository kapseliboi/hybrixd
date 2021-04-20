/**
   * Set data stream to a value.
   * @category Process
   * @param {Object} object - Object to fill the data stream with.
   * @example
   * data test            // Fill the data stream with string 'test'.
   * data {key:'test'}    // Fill the data stream with object {key:'test'}.
   */
exports.data = () => function (p, data) {
  return p.next(data);
};

exports.tests = {
  data: [
    "data '$OK'",
    'done'
  ],
  spread1: [
    'data [1,2,...[3,4],5]',
    'join',
    "flow '12345' 1 2",
    "done '$OK'",
    'fail'
  ],
  spread2: [
    'data {a:1,...[1,2],b:2}',
    'jstr',
    "flow '{\"0\":1,\"1\":2,\"a\":1,\"b\":2}' 1 2",
    "done '$OK'",
    'fail'
  ]
};
