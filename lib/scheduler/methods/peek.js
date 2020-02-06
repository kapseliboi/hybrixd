/**
   * Gets data from a variable that was defined by poke. Used inside of other instructions.
   * @param {String} key - Variable name to get data from.
   * @param {Object} [default] - Fallback value in case result is undefined.
   * @category Variables
   * @example
   *  peek fee              // returns value in recipe variable fee (non mutable, based on the recipe .json file)
   *  peek userDefined      // given that the recipe does not have property userDefined returns value in processor variable userDefined (runtime, non persistant)
   *  peek proc::fee        // returns value in processor variable fee (runtime, non persistant)
   *  peek root::fee        // returns value in process root parent variable fee (runtime, non persistant)
   *  peek parent::fee      // returns value in process parent variable fee (runtime, non persistant)
   *  peek local::fee       // returns value in recipe local variable fee (runtime, persisted in the .vars.json file)
   *  peek ::fee            // same as peek local::fee
   *  peek btc::fee         // returns value in btc recipe variable fee (non mutable, based on the recipe btc.json file)
   *  peek btc::local::fee  // returns value in btc recipe variable fee (based on the recipe .btc.vars.json file)
   *  peek 2                // returns value of the second command path in the current process (non mutable)
   *  peek root::3          // returns value of the third command path in the root process (non mutable)
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
          return this.fail(p, result.v);
        } else if (typeof result.v === 'undefined' && typeof defaultData !== 'undefined') {
          values.push(defaultData);
        } else {
          values.push(result.v);
        }
      }
      return this.next(p, 0, values);
    } else {
      return this.fail(p, 'Nr of variables does not match nr of values');
    }
  } else {
    if (typeof key !== 'string') {
      key = JSON.stringify(key);
    }
    const result = p.peek(key);

    if (result.e > 0) {
      return this.fail(p, result.v);
    } else if (typeof result.v === 'undefined' && typeof defaultData !== 'undefined') {
      return this.next(p, 0, defaultData);
    } else {
      return this.next(p, 0, result.v);
    }
  }
};
