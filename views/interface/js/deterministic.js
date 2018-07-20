import { commonUtils } from './../../common/index.js';

import * as R from 'ramda';

// creates a unique seed for deterministic asset code
export var deterministic_ = {
  mkDeterministicDetails: function (dcode, entry, submode, mode, keyGenBase) {
    console.log('entry = ', entry);
    // TODO use regex
    var replaceAll = function (target, search, replacement) {
      var p = target.split(search);
      return p.join(replacement);
    };
    var code = LZString.decompressFromEncodedURIComponent(dcode);
    var code_ = replaceAll(code, '(typeof exports==="object"&&typeof module!=="undefined")', '(!(typeof exports==="object"&&typeof module!=="undefined"))');

    // deterministic[data.assetDetails['keygen-base']] = CommonUtils.activate(code);

    // var decompressedCode = LZString.decompressFromEncodedURIComponent(dcode);
    // var code = R.replace(/'(typeof exports==="object"&&typeof module!=="undefined")'/g, '(!(typeof exports==="object"&&typeof module!=="undefined"))', decompressedCode); // to comopensate for collision between webpack adn browserify
    var deterministic = commonUtils.activate(code_);

    var defaultDetails = {
      mode,
      seed: null,
      keys: null,
      address: null
    };

    return R.ifElse(
      R.isNil,
      R.always(defaultDetails),
      R.curry(generateDetails)(entry, keyGenBase, mode, submode)
    )(deterministic);
  }
};

function generateDetails (entry, keyGenBase, mode, submode, deterministic) {
  var userKeys = GL.usercrypto.user_keys;
  var seed = commonUtils.seedGenerator(userKeys, keyGenBase);
  var keys = deterministic.keys({symbol: entry, seed, mode: submode});

  return {
    mode,
    seed,
    keys,
    address: deterministic.address(Object.assign(keys, {mode: submode}))
  };
}
