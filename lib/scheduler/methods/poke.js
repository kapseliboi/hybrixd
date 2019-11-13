const vars = require('../vars');
/**
   * Put data in a variable for later use. Use peek to retrieve. The data is stored in the root parent process under 'vars'. (You can see this poked data stored in global.hybrixd.proc[rootID].vars, but a better way to use this data is by using the command peek("varname").
   * @category Variables
   * @param {String} key - Variable name to get data from.
   * @param {String} [value=data] - The data to store in the variable. This is also stored in this subprocess data field.
   * @param {String} [default] - Used if the value and stream data are undefined.
   * @example
   *  poke key                //  sets the stream value in processor variable key (runtime, non persistant)
   *  poke key value          //  sets the value 'value' in processor variable key (runtime, non persistant)
   *  poke proc::key value    // sets value in processor variable key (runtime, non persistant)
   *  poke local::key value   // sets value in recipe local variable key (runtime, persisted in the .vars.json file)
   *  poke ::key value        // same as poke("local::key",value)
   *  poke btc::fee           // results in an error since fee is write protected
   *  poke btc::local::fee    // results in an error since fee is write protected
   *  poke [key1,key2,key3]   //  sets the stream array value in processor variables key1, key2 and key3 (runtime, non persistant)
   *  poke {a:a,b:b}          //  sets the stream array value in processor variables key1, key2 and key3 (runtime, non persistant)
   *  poke 2                  // results in an error since the command paramters are write protected
   */
exports.poke = data => function (p, key, pdata, ddata) {
  let qdata;
  if (typeof pdata === 'undefined') {
    if (typeof ddata === 'undefined') {
      qdata = data;
    } else {
      qdata = ddata;
    }
  } else {
    qdata = pdata;
  }

  if (key instanceof Array) {
    if (qdata instanceof Array && key.length === qdata.length) {
      for (let index = 0; index < key.length; ++index) {
        const result = vars.poke(p, key[index], qdata[index]);
        if (result.e > 0) {
          return this.fail(p, result.v);
        }
      }
      return this.next(p, 0, data);
    } else {
      return this.fail(p, 'Array Poke: number of variables does not match number of values');
    }
  } else if (typeof key === 'object' && key !== null) {
    if (typeof qdata === 'object' && qdata !== null) {
      for (let subKey in key) {
        const result = vars.poke(p, subKey, qdata[key[subKey]]);
        if (result.e > 0) {
          return this.fail(p, result.v);
        }
      }
      return this.next(p, 0, data);
    } else {
      return this.fail(p, 'Object Poke : expected object data.');
    }
  } else {
    if (typeof key !== 'string') {
      key = JSON.stringify(key);
    }

    const result = vars.poke(p, key, qdata);
    if (result.e > 0) {
      return this.fail(p, result.v);
    } else {
      return this.next(p, 0, data);
    }
  }
};
