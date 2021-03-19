/**
   * Test the data against the regex pattern
   * @category String
   * @param {String} [variable=data] - the variable to perform the regex on
   * @param {String} pattern - the regex pattern
   * @param {Integer} [onMatch=1]
   * @param {Integer} [onNoMatch=1]
   * @example
   * data 'applepie'
   * regx '^apple' 1 2      // match when start of the string contains 'apple'
   * done 'Match!'
   * done 'No Match'
   */
exports.regx = data => function (p, a, b, c, d) {
  let value, pattern, onMatch, onNoMatch;
  if (typeof a === 'string' && typeof b === 'string') { // use a var
    [pattern, onMatch, onNoMatch] = [b, c, d];
    const result = p.peek(a);
    if (result.e) return p.fail(`regx: could not peek variable '${a}'`);
    value = result.v;
  } else {
    [pattern, onMatch, onNoMatch] = [a, b, c];
    value = data;
  }

  const flags = '';// TODO add flags
  const pattern2 = pattern; // TODO escape regex characters
  let regex;
  try {
    regex = new RegExp(pattern2, flags);
  } catch (e) {
    return p.fail(`regx: '${e}'`);
  }
  if (regex.test(value)) return p.jump(onMatch || 1, data);
  else return p.jump(onNoMatch || 1, data);
};
