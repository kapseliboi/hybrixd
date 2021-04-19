/**
   * Gets data from a variable that was defined by poke. Used inside of other instructions.
   * @param {String} [key] - Variable name to get data from.
   * @param {Object} [default] - Fallback value in case result is undefined.
   * @category Variables
   * @example
   *  peek fee              // returns value in recipe variable fee (non mutable, based on the recipe .json file)
   *  peek userDefined      // given that the recipe does not have property userDefined returns value in processor variable userDefined (runtime, non persistant)
   *  peek proc::fee        // returns value in processor variable fee (runtime, non persistant)
   *  peek root::fee        // returns value in process root parent variable fee (runtime, non persistant)
   *  peek local::fee       // returns value in recipe local variable fee (runtime, persisted in the .vars.json file)
   *  peek btc::fee         // returns value in btc recipe variable fee (non mutable, based on the recipe btc.json file)
   *  peek btc::local::fee  // returns value in btc recipe variable fee (based on the recipe .btc.vars.json file)
   *  peek 2                // returns value of the second command path in the current process (non mutable)
   *  peek [key1,key2,key3] // returns an array containing the values of key1,key2,key3
   */
exports.peek = qdata => function (p, key, defaultData) {
  key = typeof key === 'undefined' ? qdata : key;
  if (key instanceof Array && qdata instanceof Array) {
    if (key.length === qdata.length) {
      const values = [];
      for (let index = 0; index < key.length; ++index) {
        const result = p.peek(key[index]);
        if (result.e > 0) {
          if (typeof defaultData !== 'undefined') values.push(defaultData);
          else return p.fail(result.v);
        } else if (typeof result.v === 'undefined' && typeof defaultData !== 'undefined') values.push(defaultData);
        else values.push(result.v);
      }
      return p.next(values);
    } else return p.fail('Nr of variables does not match nr of values');
  } else {
    if (key instanceof Array && key.length === 1) key = '[' + key[0] + ']';
    if (typeof key !== 'string') key = JSON.stringify(key);
    const result = p.peek(key);
    if (result.e > 0) {
      if (typeof defaultData !== 'undefined') p.next(defaultData);
      else return p.fail(result.v);
    } else if (typeof result.v === 'undefined' && typeof defaultData !== 'undefined') return p.next(defaultData);
    else return p.next(result.v);
  }
};

exports.tests = {
  peek1: [
    'data a',
    'poke b',
    'data x',
    'peek b',
    'flow a 1 2',
    "done '$OK'",
    'fail'
  ],
  peek2: [
    'data a',
    'poke local::b',
    'data x',
    'peek local::b',
    'flow a 1 2',
    "done '$OK'",
    'fail'
  ],
  peek3: [
    'peek OK',
    'flow OK 1 2',
    "done '$OK'",
    'fail'
  ],
  peek4: [
    'hook @fail',
    'peek nonExistingVariable',
    'fail',
    '@fail',
    "done '$OK'"
  ],
  peek5: [
    "data '$nonExistingVariable'",
    "flow 'undefined' 1 2",
    "done '$OK'",
    'fail'
  ],
  peek6: [
    'peek nonExistingVariable fallback',
    'flow fallback 1 2',
    "done '$OK'",
    'fail'
  ],
  peek7: [
    'data {a:1}',
    'peek [a]',
    'flow 1 1 2',
    "done '$OK'",
    'fail'
  ],
  peek8: [
    'data {a:1}',
    'peek .a',
    'flow 1 1 2',
    "done '$OK'",
    'fail'
  ],
  peek9: [
    "data {'a.b':1}",
    'peek [a.b]',
    'flow 1 1 2',
    "done '$OK'",
    'fail'
  ],
  peek10: [
    "data {'a.b':1}",
    'data ${.[a.b]}',
    'flow 1 1 2',
    "done '$OK'",
    'fail'
  ],
  peek11: [
    "data {a:{'a.b':1}}",
    'peek .a[a.b]',
    'flow 1 1 2',
    "done '$OK'",
    'fail'
  ]
};
