function filterValue (data, value) {
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
      if (x === value) {
        return true;
      } else {
        found = true;
        return false;
      }
    });
  } else if (typeof data === 'object') {
    for (let key in data) {
      if (data[key] === value) {
        found = true;
      } else {
        delete data[key];
      }
    }
  }
  return {found, data};
}

function filterValues (data, values) {
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
    for (let key in data) {
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
   * @param {object} value - Keep only specified value from string, array or object.
   * @param {Boolean} [multi=false] - Treat value input as list of values to filter.
   * @param {Integer} [onFound=1] - Jump this many steps when the value is found.
   * @param {Integer} [onNotFound=1] - Jump this many steps when the value is not found.
   * @example
   *  filt 'o'             // input: ['g','l','o','l','l','s','s','o'], output: ['o','o']
   *  filt [1,2]           // input: [1,2,[1,2]], output: [[1,2]]
   *  filt [1,2] true      // input: [1,2,[1,2]], output: [1,2]
   */
exports.filt = data => function (p, value, multi, onFound, onNotFound) {
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
    result = filterValues(data, value);
  } else {
    result = filterValue(data, value);
  }

  if (result.found) {
    p.jump(onFound, result.data);
  } else {
    p.jump(onNotFound, result.data);
  }
};
