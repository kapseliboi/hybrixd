function excludeValue (data, value) {
  let found = false;
  if (typeof data === 'string') {
    found = data.indexOf(value) !== -1;
    data = data.replace(new RegExp(value, 'g'), '');
  } else if (data instanceof Array) {
    data = data.filter(x => {
      if (x !== value) {
        return true;
      } else {
        found = true;
        return false;
      }
    });
  } else if (typeof data === 'object') {
    for (const key in data) {
      if (data[key] === value) {
        delete data[key];
        found = true;
      }
    }
  }
  return {found, data};
}

function excludeValues (data, values) {
  let found = false;
  if (typeof data === 'string') {
    let result = '';
    for (let i = 0; i < data.length; ++i) {
      if (values.indexOf(data[i]) === -1) {
        result += data[i];
        found = true;
      }
    }
    data = result;
  } else if (data instanceof Array) {
    data = data.filter(x => {
      if (values.indexOf(x) === -1) {
        found = true;
        return true;
      } else {
        return false;
      }
    });
  } else if (typeof data === 'object') {
    for (const key in data) {
      if (values.indexOf(data[key]) === -1) {
        found = true;
        delete data[key];
      }
    }
  }
  return {found, data};
}
/**
   * Exclude elements from an array or input string based on their value.
   * Jump to a target based on success or failure.
   * (Reversed function of filt.)
   * @category Array/String
   * @param {object} value - Remove specified value from string, array or object.
   * @param {Boolean} [multi=false] - Treat value input as list of values to exclude.
   * @param {Integer} [onFound=1] - Jump this many steps when the value is found.
   * @param {Integer} [onNotFound=1] - Jump this many steps when the value is not found.
   * @example
   *  excl 'g'         // input: 'gloves', output: 'loves'
   *  excl 'g'         // input: ['g','l','o','v','e','s'], output: ['l','o','v','e','s']
   *  excl [1,2]           // input: [1,2,[1,2]], output: [1,2]
   *  excl [1,2] true      // input: [1,2,[1,2]], output: [[1,2]]
   */
exports.excl = data => function (p, value, multi, onFound, onNotFound) {
  onFound = (isNaN(onFound) || onFound === 0) ? 1 : onFound;
  onNotFound = (isNaN(onNotFound) || onNotFound === 0) ? 1 : onNotFound;

  if (typeof data === 'number') data = data.toString();

  if ((typeof data !== 'object' || data === null) && typeof data !== 'string') {
    p.fail('excl expects string, number, array or object.');
    return;
  }

  let result;
  if (multi) {
    if (typeof data === 'string') {
      if (typeof value === 'number') value = value.toString();
      if (typeof value !== 'string' && !(value instanceof Array)) {
        p.fail('excl multi with string data expects string or array value.');
        return;
      }
    } else if (!(value instanceof Array)) {
      p.fail('excl multi expects array value.');
      return;
    }
    result = excludeValues(data, value);
  } else {
    result = excludeValue(data, value);
  }
  if (result.found) {
    p.jump(onFound, result.data);
  } else {
    p.jump(onNotFound, result.data);
  }
};

exports.tests = {
  excl1: [
    'data gloves',
    'excl g',
    "flow 'loves' 1 2",
    'done $OK',
    'fail'
  ],
  excl2: [
    'data [g,l,o,v,e,s]',
    'excl g',
    'jstr',
    "flow '[\"l\",\"o\",\"v\",\"e\",\"s\"]' 1 2",
    'done $OK',
    'fail'
  ],
  excl3: [
    'data gloves',
    'excl [g,s] true',
    "flow 'love' 1 2",
    'done $OK',
    'fail'
  ],
  excl4: [
    'data [g,l,o,v,e,s]',
    'excl [g,s] true',
    'jstr',
    "flow '[\"l\",\"o\",\"v\",\"e\"]' 1 2",
    'done $OK',
    'fail'
  ]
};
