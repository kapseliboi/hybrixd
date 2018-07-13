var U = utils;
var CommonUtils = {
  seedGenerator,
  activate
};

// creates a unique seed for deterministic asset code
deterministic_ = {
  mkDeterministicDetails: function (dcode, entry, submode, mode, keyGenBase) {
    var deterministic = CommonUtils.activate(LZString.decompressFromEncodedURIComponent(dcode));

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
  var seed = CommonUtils.seedGenerator(userKeys, keyGenBase);
  var keys = deterministic.keys({symbol: entry, seed, mode: submode});

  return {
    mode,
    seed,
    keys,
    address: deterministic.address(Object.assign(keys, {mode: submode}))
  };
}
