DEBUG = false;

assets = {
  count: 0, // amount of assets
  init: [], // initialization status
  mode: {}, // mode of assets
  modehashes: {}, // mode hashes
  seed: {}, // cryptoseeds of assets
  keys: {}, // keys of assets
  addr: {}, // public addresses of assets
  cntr: {}, // stored contract pointer, location or address
  fact: {}, // factor of assets
  fees: {}, // fees of assets
  fsym: {}, // fees of assets
  base: {} // fees of assets
};

GL = {
  assets: [],
  assetnames: {},
  assetmodes: {},
  coinMarketCapTickers: [],
  powqueue: [],
  usercrypto: {},
  initCount: 0
};

var nacl;

// Don't move this yet, as the cur_step is needed by assetModesUrl. Synchronous coding!
nacl_factory.instantiate(function (naclinstance) {
  nacl = naclinstance;
}); // TODO
session_step = 1; // Session step number at the end of login. TODO
