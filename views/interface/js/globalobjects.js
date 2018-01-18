Decimal.set({ precision: 64 }); // make sure Decimal precision is set to 64!

pass_args = {};   // passes arguments between views - FIXME!

intervals = {};   // stores timing intervals

powqueue = [];    // queue to store proof of work hashes

assets = {
  count : 0,       // amount of assets
  init  : [],      // initialization status
  mode  : {},      // mode of assets
  modehashes : {}, // mode hashes
  seed  : {},      // cryptoseeds of assets
  keys  : {},      // keys of assets
  addr  : {},      // public addresses of assets
  cntr  : {},      // stored contract pointer, location or address
  fact  : {},      // factor of assets
  fees  : {}       // fees of assets
};

//
// global functions
//

logger = function(text) {
  console.log(text);
}
