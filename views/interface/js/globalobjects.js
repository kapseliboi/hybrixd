Decimal.set({ precision: 64 }); // make sure Decimal precision is set to 64!

pass_args = {};   // passes arguments between views - FIXME!

intervals = {};   // stores timing intervals

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

function bigNumberToString (obj, base) {
  // setup base
  base = base || 10

  // check if obj is type object, not an array and does not have BN properties
  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj) && !('lessThan' in obj)) {
    // move through plain object
    Object.keys(obj).forEach(function (key) {
      // recurively converty item
      obj[key] = bigNumberToString(obj[key], base)
    })
  }

  // obj is an array
  if (Array.isArray(obj)) {
    // convert items in array
    obj = obj.map(function (item) {
      // convert item to a string if bignumber
      return bigNumberToString(item, base)
    })
  }

  // if not an object bypass
  if (typeof obj !== 'object' || obj === null) return obj

  // if the object to does not have BigNumber properties, bypass
  if (!('toString' in obj) || !('lessThan' in obj)) return obj

  // if object has bignumber properties, convert to string with base
  return obj.toString(base)
}
