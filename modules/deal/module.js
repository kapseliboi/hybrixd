// (C) 2020 hybrix / Rouke Pouw / Joachim de Koning
// hybrixd module - deal
// Module for making swap deals

// required libraries in this context
const compressUnifiedAddress = require('../../common/compress-unified-address');

// functions
function compress (proc, data) {
  proc.done(compressUnifiedAddress.encode(data));
}

// TODO: we return input address if decompression is not possible
//       right now to get deal engine to work without trouble, must fix!
function decompress (proc, address) {
  if(address.indexOf(':')>-1) {
    const encoded = address.split(':')[1]; // `${symbol}:${encoded}` -> encoded
    const decoded = compressUnifiedAddress.decode(encoded);
    if (decoded === null) return proc.done(address);
    else return proc.done(decoded);
  } else {
    proc.done(address);
  }
}

// exports
exports.compressUnifiedAddress = compress;
exports.decompressUnifiedAddress = decompress;
