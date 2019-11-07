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
   * Regular expressions can be used by specifying regexModifier.
   * @category Array/String
   * @param {String} [string=' '] - The string to replace.
   * @param {String} [replace=''] - The value to replace all occurrences of string with.
   * @param {String} [regexModifier=false] - Modify replace to use regular expressions.
   * @example
   *  repl                                      // input: 'Many apples for you.', returns: 'Manyapplesfor ou.'
   *  repl 'apples '                            // input: 'Many apples for you.', returns: 'Many for you.'
   *  repl 'apples' 'pears'                     // input: 'Many apples for you.', returns: 'Many pears for you.'
   *  repl ['apples','you'] 'foo'               // bulk replacement mode -> input: 'Many apples for you.', returns: 'Many foo for foo.'
   *  repl ['apples','you'] ['pears','me']      // bulk replacement mode -> input: 'Many apples for you.', returns: 'Many pears for me.'
   *  repl 'o' ['A','I']                        // bulk replacement mode -> input: 'Many apples for you.', returns: 'Many apples fAr yIu.'
   *  repl 'apples' '' true                     // regex replacement mode -> input: 'Many apples for your apples.', returns: 'Many for your apples.'
   *  repl 'apples' '' g                        // regex replacement mode -> input: 'Many apples for your apples.', returns: 'Many  for your .'
   *  repl 'apples.$$' 'pears.' true            // regex replacement mode -> input: 'Many apples for your apples.', returns: 'Many apples for your pears.' (double $ to specify the actual $ sign, and not a variable)
   *  repl 'aPPles' 'pears' gi                  // regex replacement mode -> input: 'Many apples for your apples.', returns: 'Many pears for your pears.'
   */
exports.repl = input => function (p, srch, repl, modifiers) {
  let output;
  if (typeof srch === 'undefined') {
    srch = ' ';
  } else if (typeof srch !== 'string' && !(srch instanceof Array)) {
    return this.fail(p, 'repl: Expected search parameter to be a string or array!');
  }
  if (typeof repl === 'undefined') {
    repl = '';
  } else if (modifiers && typeof repl !== 'string') {
    return this.fail(p, 'repl: Expected regular expression replace parameter to be a string!');
  } else if (!modifiers && typeof repl !== 'string' && !(repl instanceof Array)) {
    return this.fail(p, 'repl: Expected replace parameter to be a string or array!');
  }

  if (modifiers) {
    if (typeof input === 'string') {
      if (typeof modifiers !== 'string') {
        modifiers = '';
      }
      output = input.replace(new RegExp(srch, modifiers), repl);
    } else {
      return this.fail(p, 'Input needs to be in string format.');
    }
  } else {
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
  }
  return this.next(p, 0, output);
};
