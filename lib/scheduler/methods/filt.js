function subMatch (data, subKey, value) {
  if (subKey instanceof Array) {
    if (subKey.length === 0) return data === value;
    const key = subKey[0];
    if (data instanceof Array && key > 0 && key < data.length) return subMatch(data[key], subKey.slice(1), value);
    if (typeof data === 'object' && data !== null && data.hasOwnProperty(key)) return subMatch(data[key], subKey.slice(1), value);
    return false;
  } else if (subKey === '') return data === value;

  subKey = subKey.replace(/\[/g, '.')
    .replace(/\]/g, '');

  const subPath = subKey.split('.');
  return subMatch(data, subPath, value);
}

function filterValue (data, subKey, value) {
  let found = false;
  if (typeof data === 'string') {
    let result = '';
    for (let i = 0; i < data.length; ++i) {
      if (data[i] === value) {
        result += value;
        found = true;
      }
    }
    data = result;
  } else if (data instanceof Array) {
    data = data.filter(x => {
      if (subMatch(x, subKey, value)) {
        found = true;
        return true;
      } else return false;
    });
  } else if (typeof data === 'object') {
    for (const key in data) {
      if (subMatch(data[key], subKey, value)) found = true;
      else delete data[key];
    }
  }
  return {found, data};
}

function filterValues (data, key, values) {
  let found = false;
  if (typeof data === 'string') {
    let result = '';
    for (let i = 0; i < data.length; ++i) {
      if (values.indexOf(data[i]) !== -1) {
        result += data[i];
        found = true;
      }
    }
    data = result;
  } else if (data instanceof Array) {
    data = data.filter(x => {
      if (values.indexOf(x) !== -1) {
        return true;
      } else {
        found = true;
        return false;
      }
    });
  } else if (typeof data === 'object') {
    for (const key in data) {
      if (values.indexOf(data[key]) !== -1) {
        found = true;
      } else {
        delete data[key];
      }
    }
  }
  return {found, data};
}
/**
   * Filter all specified elements from an array, removing all other entries.
   * (Reversed function of excl.)
   * @category Array/String
   * @param {string} [property=''] - Filter on certain property
   * @param {object} value - Keep only specified value from string, array or object.
   * @param {Boolean} [multi=false] - Treat value input as list of values to filter.
   * @param {Integer} [onFound=1] - Jump this many steps when the value is found.
   * @param {Integer} [onNotFound=1] - Jump this many steps when the value is not found.
   * @example
   *  filt 'o'             // input: ['g','l','o','l','l','s','s','o'], output: ['o','o']
   *  filt [1,2]           // input: [1,2,[1,2]], output: [[1,2]]
   *  filt [1,2] true      // input: [1,2,[1,2]], output: [1,2]
   *  filt .a 1            // input: [{a:1,b:1},{a:2,b:2}], output: [{a:1,b:1}]
   */
exports.filt = data => function (p, value, ...args) {
  let key, multi, onFound, onNotFound;
  if (typeof value === 'string' && value.startsWith('.') && value.length > 1) {
    key = value.substr(1);
    [value, multi, onFound, onNotFound] = args;
  } else {
    key = '';
    [multi, onFound, onNotFound] = args;
  }

  if (typeof multi === 'number') { // shift parameters if multi is omitted
    onNotFound = onFound;
    onFound = multi;
    multi = false;
  }

  onFound = (isNaN(onFound) || onFound === 0) ? 1 : onFound;
  onNotFound = (isNaN(onNotFound) || onNotFound === 0) ? 1 : onNotFound;

  if (typeof data === 'number') data = data.toString();

  if ((typeof data !== 'object' || data === null) && typeof data !== 'string') {
    p.fail('filt expects string, number, array or object.');
    return;
  }
  let result;
  if (multi) {
    if (typeof data === 'string') {
      if (typeof value === 'number') value = value.toString();
      if (typeof value !== 'string' && !(value instanceof Array)) {
        p.fail('filt multi with string data expects string or array value.');
        return;
      }
    } else if (!(value instanceof Array)) {
      p.fail('filt multi expects array value.');
      return;
    }
    result = filterValues(data, key, value);
  } else {
    result = filterValue(data, key, value);
  }

  p.jump(result.found ? onFound : onNotFound, result.data);
};

exports.tests = {
  filt1: [
    'data gloves',
    'filt g',
    "flow 'g' 1 2",
    'done $OK',
    'fail'
  ],
  filt2: [
    'data [g,l,o,v,e,s]',
    'filt g',
    'jstr',
    "flow '[\"g\"]' 1 2",
    'done $OK',
    'fail'
  ],
  filt3: [
    'data gloves',
    'filt [g,s] true',
    "flow 'gs' 1 2",
    'done $OK',
    'fail'
  ],
  filt4: [
    'data [g,l,o,v,e,s]',
    'filt [g,s] true',
    'jstr',
    "flow '[\"g\",\"s\"]' 1 2",
    'done $OK',
    'fail'
  ]
};
