// replace multiple strings
// example: replacebulk("testme",['es','me'],['1','2']); => "t1t2"
function replaceBulk (str, findArray, replaceArray) {
  let i; let regex = []; let map = {};
  for (i = 0; i < findArray.length; i++) {
    regex.push(findArray[i].replace(/([-[\]{}()*+?.\\^$|#,])/g, '\\$1'));
    map[findArray[i]] = replaceArray[i];
  }
  regex = regex.join('|');
  str = str.replace(new RegExp(regex, 'g'), function (matched) {
    return map[matched];
  });
  return str;
}

/**
   * Replace part or parts of a string. All matched occurrences are replaced.
   * @category Array/String
   * @param {String} [string] - The string to replace.
   * @param {String} [replace] - The value to replace all occurrences of string with.
   * @example
   *  repl                                      // input: 'Many apples for you.', returns: 'Manyapplesfor ou.'
   *  repl 'apples '                            // input: 'Many apples for you.', returns: 'Many for you.'
   *  repl 'apples' 'pears'                     // input: 'Many apples for you.', returns: 'Many pears for you.'
   *  repl ['apples','you'] ['pears','me']      // input: 'Many apples for you.', returns: 'Many pears for me.'
   *  repl ['apples','you'] 'foo'               // input: 'Many apples for you.', returns: 'Many foo for foo.'
   *  repl 'o' ['A','I']                        // input: 'Many apples for you.', returns: 'Many apples fAr yIu.'
   */
exports.repl = input => function (p, srch, repl) {
  let output;
  if (typeof srch === 'undefined') {
    srch = ' ';
    repl = '';
  }
  if (typeof repl === 'undefined') {
    repl = '';
  }
  if (typeof srch === 'string') {
    if (typeof repl === 'string') {
      output = input.split(srch).join(repl);
    } else {
      output = input;
      for (let i = 0; i < repl.length; i++) {
        output = output.replace(srch, repl[i]);
      }
    }
  } else {
    if (typeof repl === 'string') {
      output = input;
      for (let i = 0; i < srch.length; i++) {
        output = output.replace(srch[i], repl);
      }
    } else {
      output = replaceBulk(input, srch, repl);
    }
  }
  this.next(p, 0, output);
};
